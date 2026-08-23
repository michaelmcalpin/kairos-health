/**
 * EVERIST Google Calendar Integration (dependency-free)
 *
 * Calendly-style busy-time blocking for coaches. A coach connects their
 * Google Calendar; we read their busy intervals (freeBusy) and remove
 * conflicting bookable slots, and we can create events (which emails
 * Google invites to attendees).
 *
 * Everything is ENV/connection-gated: if Google isn't configured or a
 * coach hasn't connected, these helpers no-op (return null/empty) so
 * nothing breaks. Uses global fetch — no googleapis dependency.
 *
 * SECURITY: never logs tokens. Functions catch their own errors and
 * return null/empty rather than throwing to callers that shouldn't crash.
 */

import { eq } from "drizzle-orm";
import type { db as Database } from "@/server/db";
import { calendarConnections } from "@/server/db/schema";
import { encryptToken, decryptToken } from "@/lib/crypto";

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
const GOOGLE_TOKEN_URL = "https://oauth2.googleapis.com/token";
const GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v2/userinfo";
const GOOGLE_FREEBUSY_URL = "https://www.googleapis.com/calendar/v3/freeBusy";

const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.events",
  "https://www.googleapis.com/auth/calendar.readonly",
].join(" ");

// Refresh a bit before the actual expiry to avoid edge-of-expiry failures.
const EXPIRY_SKEW_MS = 60 * 1000;

type Db = typeof Database;
type CalendarConnection = typeof calendarConnections.$inferSelect;

export interface BusyInterval {
  start: string; // UTC ISO
  end: string; // UTC ISO
}

/** True when the Google OAuth client credentials are present. */
export function isGoogleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

/**
 * Build the Google OAuth consent URL. `state` is an opaque/signed value
 * the callback validates; `redirectUri` must match a registered URI.
 */
export function getGoogleAuthUrl(state: string, redirectUri: string): string {
  const url = new URL(GOOGLE_AUTH_URL);
  url.searchParams.set("client_id", process.env.GOOGLE_CLIENT_ID ?? "");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("response_type", "code");
  url.searchParams.set("scope", GOOGLE_SCOPES);
  url.searchParams.set("access_type", "offline");
  url.searchParams.set("prompt", "consent");
  url.searchParams.set("include_granted_scopes", "true");
  url.searchParams.set("state", state);
  return url.toString();
}

/** Exchange an authorization code for tokens. Returns null on failure. */
export async function exchangeCodeForTokens(
  code: string,
  redirectUri: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
    };
    if (!data.access_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in ?? 3600,
    };
  } catch {
    return null;
  }
}

/** Refresh an access token using a stored refresh token. Null on failure. */
export async function refreshGoogleToken(
  refreshToken: string,
): Promise<{ access_token: string; expires_in: number } | null> {
  try {
    const res = await fetch(GOOGLE_TOKEN_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: process.env.GOOGLE_CLIENT_ID ?? "",
        client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { access_token?: string; expires_in?: number };
    if (!data.access_token) return null;
    return { access_token: data.access_token, expires_in: data.expires_in ?? 3600 };
  } catch {
    return null;
  }
}

/** Best-effort fetch of the connected Google account email. Null on failure. */
export async function getUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(GOOGLE_USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { email?: string };
    return data.email ?? null;
  } catch {
    return null;
  }
}

/**
 * Return a currently-valid access token for a connection, refreshing and
 * persisting a new one if expired. Returns null (and marks the connection
 * "expired") when refresh fails or no usable token exists.
 */
export async function getValidAccessToken(
  db: Db,
  connection: CalendarConnection,
): Promise<string | null> {
  try {
    const now = Date.now();
    const expiresAtMs = connection.expiresAt ? new Date(connection.expiresAt).getTime() : 0;

    // Token still valid — decrypt and return it.
    if (connection.accessTokenEnc && expiresAtMs > now + EXPIRY_SKEW_MS) {
      return decryptToken(connection.accessTokenEnc);
    }

    // Need to refresh.
    if (!connection.refreshTokenEnc) {
      await db
        .update(calendarConnections)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(calendarConnections.id, connection.id));
      return null;
    }

    const refreshToken = decryptToken(connection.refreshTokenEnc);
    const refreshed = await refreshGoogleToken(refreshToken);
    if (!refreshed) {
      await db
        .update(calendarConnections)
        .set({ status: "expired", updatedAt: new Date() })
        .where(eq(calendarConnections.id, connection.id));
      return null;
    }

    const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000);
    await db
      .update(calendarConnections)
      .set({
        accessTokenEnc: encryptToken(refreshed.access_token),
        expiresAt: newExpiresAt,
        status: "connected",
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, connection.id));

    return refreshed.access_token;
  } catch {
    return null;
  }
}

/**
 * Fetch busy intervals from the Google freeBusy API for a calendar between
 * two ISO instants. Returns an empty array on any failure (fail-open).
 */
export async function getBusyIntervals(
  accessToken: string,
  calendarId: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<BusyInterval[]> {
  try {
    const res = await fetch(GOOGLE_FREEBUSY_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        timeMin: timeMinISO,
        timeMax: timeMaxISO,
        items: [{ id: calendarId || "primary" }],
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      calendars?: Record<string, { busy?: { start: string; end: string }[] }>;
    };
    const cal = data.calendars?.[calendarId || "primary"];
    if (!cal?.busy) return [];
    return cal.busy
      .filter((b) => b.start && b.end)
      .map((b) => ({ start: b.start, end: b.end }));
  } catch {
    return [];
  }
}

/**
 * Create an event on the coach's Google Calendar. With sendUpdates=all,
 * Google emails invites to attendees. Returns { id, htmlLink } or null.
 *
 * Exported for the booking flow — call after a successful booking to place
 * the appointment on the coach's calendar and notify the client.
 */
export async function createCalendarEvent(
  accessToken: string,
  calendarId: string,
  event: {
    summary: string;
    description?: string;
    startISO: string;
    endISO: string;
    timeZone: string;
    attendeeEmails?: string[];
  },
): Promise<{ id: string; htmlLink: string } | null> {
  try {
    const cal = encodeURIComponent(calendarId || "primary");
    const url = `https://www.googleapis.com/calendar/v3/calendars/${cal}/events?sendUpdates=all`;
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        summary: event.summary,
        description: event.description ?? "",
        start: { dateTime: event.startISO, timeZone: event.timeZone },
        end: { dateTime: event.endISO, timeZone: event.timeZone },
        attendees: (event.attendeeEmails ?? []).map((email) => ({ email })),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string; htmlLink?: string };
    if (!data.id) return null;
    return { id: data.id, htmlLink: data.htmlLink ?? "" };
  } catch {
    return null;
  }
}
