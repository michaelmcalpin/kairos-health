/**
 * EVERIST Microsoft / Outlook Calendar Integration (dependency-free)
 *
 * Microsoft Graph mirror of google-calendar.ts. Calendly-style busy-time
 * blocking for coaches: a coach connects their Outlook/Microsoft 365 calendar;
 * we read their busy intervals (getSchedule) and remove conflicting bookable
 * slots, and we can create events (Graph auto-emails invites to attendees) and
 * send client-facing mail FROM the coach's own mailbox (sendMail).
 *
 * Everything is ENV/connection-gated: if Microsoft isn't configured or a coach
 * hasn't connected, these helpers no-op (return null/empty) so nothing breaks.
 * Uses global fetch — no SDK dependency.
 *
 * SECURITY: never logs tokens. Functions catch their own errors and return
 * null/empty/{ success: false } rather than throwing to callers that shouldn't
 * crash.
 */

import { eq } from "drizzle-orm";
import type { db as Database } from "@/server/db";
import { calendarConnections } from "@/server/db/schema";
import { encryptToken, decryptToken } from "@/lib/crypto";

const GRAPH_BASE = "https://graph.microsoft.com/v1.0";

const MICROSOFT_SCOPES = [
  // Long-lived refresh tokens.
  "offline_access",
  // Read the signed-in user's profile (to fetch the account email).
  "User.Read",
  // Read/write the coach's calendar (busy times + create events).
  // Calendar-only — we do NOT request Mail.Send; client emails go via the
  // system sender.
  "Calendars.ReadWrite",
].join(" ");

// Refresh a bit before the actual expiry to avoid edge-of-expiry failures.
const EXPIRY_SKEW_MS = 60 * 1000;

type Db = typeof Database;
type CalendarConnection = typeof calendarConnections.$inferSelect;

export interface BusyInterval {
  start: string; // UTC ISO
  end: string; // UTC ISO
}

/** The Azure AD tenant to auth against. Defaults to the multi-tenant endpoint. */
function tenant(): string {
  return process.env.MICROSOFT_TENANT_ID || "common";
}

function authBase(): string {
  return `https://login.microsoftonline.com/${tenant()}/oauth2/v2.0`;
}

/** True when the Microsoft OAuth client credentials are present. */
export function isMicrosoftConfigured(): boolean {
  return Boolean(process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET);
}

/**
 * Build the Microsoft OAuth consent URL. `state` is an opaque/signed value
 * the callback validates; `redirectUri` must match a registered URI.
 */
export function getMicrosoftAuthUrl(state: string, redirectUri: string): string {
  const url = new URL(`${authBase()}/authorize`);
  url.searchParams.set("client_id", process.env.MICROSOFT_CLIENT_ID ?? "");
  url.searchParams.set("response_type", "code");
  url.searchParams.set("response_mode", "query");
  url.searchParams.set("redirect_uri", redirectUri);
  url.searchParams.set("scope", MICROSOFT_SCOPES);
  url.searchParams.set("state", state);
  return url.toString();
}

/** Exchange an authorization code for tokens. Returns null on failure. */
export async function exchangeMicrosoftCode(
  code: string,
  redirectUri: string,
): Promise<{
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
} | null> {
  try {
    const res = await fetch(`${authBase()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: redirectUri,
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      access_token?: string;
      refresh_token?: string;
      expires_in?: number;
      scope?: string;
    };
    if (!data.access_token) return null;
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in ?? 3600,
      // Space-separated list of granted scopes; used to detect Mail.Send.
      scope: data.scope ?? "",
    };
  } catch {
    return null;
  }
}

/** Refresh an access token using a stored refresh token. Null on failure. */
export async function refreshMicrosoftToken(
  refreshToken: string,
): Promise<{ access_token: string; refresh_token?: string; expires_in: number } | null> {
  try {
    const res = await fetch(`${authBase()}/token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        scope: MICROSOFT_SCOPES,
        client_id: process.env.MICROSOFT_CLIENT_ID ?? "",
        client_secret: process.env.MICROSOFT_CLIENT_SECRET ?? "",
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

/** Best-effort fetch of the connected Microsoft account email. Null on failure. */
export async function getMicrosoftUserEmail(accessToken: string): Promise<string | null> {
  try {
    const res = await fetch(`${GRAPH_BASE}/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { mail?: string; userPrincipalName?: string };
    return data.mail ?? data.userPrincipalName ?? null;
  } catch {
    return null;
  }
}

/**
 * Return a currently-valid access token for a connection, refreshing and
 * persisting a new one if expired. Returns null (and marks the connection
 * "expired") when refresh fails or no usable token exists.
 */
export async function getMicrosoftValidAccessToken(
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
    const refreshed = await refreshMicrosoftToken(refreshToken);
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
        // Microsoft rotates refresh tokens — persist a new one when returned.
        ...(refreshed.refresh_token
          ? { refreshTokenEnc: encryptToken(refreshed.refresh_token) }
          : {}),
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

/** Parse a Graph date/time ({ dateTime, timeZone }) to a UTC ISO string. */
function graphDateToUtcISO(dt?: { dateTime?: string; timeZone?: string }): string | null {
  if (!dt?.dateTime) return null;
  // getSchedule is requested with timeZone "UTC", so Graph returns UTC times,
  // but the dateTime string carries no offset. Append Z so Date parses as UTC.
  const raw = dt.dateTime;
  const hasZone = /[zZ]|[+-]\d{2}:?\d{2}$/.test(raw);
  const iso = hasZone ? raw : `${raw}Z`;
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return null;
  return new Date(ms).toISOString();
}

/**
 * Fetch busy intervals from the Graph getSchedule API for a mailbox between
 * two ISO instants. Returns an empty array on any failure (fail-open).
 */
export async function getMicrosoftBusyIntervals(
  accessToken: string,
  email: string,
  timeMinISO: string,
  timeMaxISO: string,
): Promise<BusyInterval[]> {
  try {
    const res = await fetch(`${GRAPH_BASE}/me/calendar/getSchedule`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        schedules: [email],
        startTime: { dateTime: timeMinISO, timeZone: "UTC" },
        endTime: { dateTime: timeMaxISO, timeZone: "UTC" },
        availabilityViewInterval: 30,
      }),
    });
    if (!res.ok) return [];
    const data = (await res.json()) as {
      value?: {
        scheduleItems?: {
          status?: string;
          start?: { dateTime?: string; timeZone?: string };
          end?: { dateTime?: string; timeZone?: string };
        }[];
      }[];
    };
    const items = data.value?.[0]?.scheduleItems ?? [];
    // Treat busy / tentative / out-of-office as unavailable.
    const busyStatuses = new Set(["busy", "tentative", "oof"]);
    const out: BusyInterval[] = [];
    for (const item of items) {
      if (!item.status || !busyStatuses.has(item.status)) continue;
      const start = graphDateToUtcISO(item.start);
      const end = graphDateToUtcISO(item.end);
      if (start && end) out.push({ start, end });
    }
    return out;
  } catch {
    return [];
  }
}

/**
 * Create an event on the coach's Outlook calendar. Graph auto-sends invites to
 * attendees. Returns { id } or null.
 *
 * Exported for the booking flow — call after a successful booking to place the
 * appointment on the coach's calendar and notify the client.
 */
export async function createMicrosoftEvent(
  accessToken: string,
  event: {
    subject: string;
    bodyHtml?: string;
    startISO: string;
    endISO: string;
    timeZone: string;
    attendeeEmails?: string[];
  },
): Promise<{ id: string } | null> {
  try {
    const res = await fetch(`${GRAPH_BASE}/me/events`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        subject: event.subject,
        body: { contentType: "HTML", content: event.bodyHtml ?? "" },
        start: { dateTime: event.startISO, timeZone: event.timeZone },
        end: { dateTime: event.endISO, timeZone: event.timeZone },
        attendees: (event.attendeeEmails ?? []).map((address) => ({
          emailAddress: { address },
          type: "required",
        })),
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { id?: string };
    if (!data.id) return null;
    return { id: data.id };
  } catch {
    return null;
  }
}

export interface SendOutlookMailMessage {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  icsContent?: string;
  icsFilename?: string;
}

export interface SendOutlookMailResult {
  success: boolean;
  error?: string;
}

/**
 * Send an email via the coach's Outlook mailbox (Graph sendMail). `accessToken`
 * must be a valid token with the Mail.Send scope; the message is sent FROM the
 * coach's connected account. Optionally attaches an .ics calendar invite.
 * Never throws — returns { success, error? }.
 */
export async function sendOutlookMail(
  accessToken: string,
  msg: SendOutlookMailMessage,
): Promise<SendOutlookMailResult> {
  try {
    const attachments = msg.icsContent
      ? [
          {
            "@odata.type": "#microsoft.graph.fileAttachment",
            name: msg.icsFilename ?? "invite.ics",
            contentType: "text/calendar; method=REQUEST",
            contentBytes: Buffer.from(msg.icsContent, "utf-8").toString("base64"),
          },
        ]
      : [];

    const res = await fetch(`${GRAPH_BASE}/me/sendMail`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        message: {
          subject: msg.subject,
          body: { contentType: "HTML", content: msg.html ?? msg.text ?? "" },
          toRecipients: [{ emailAddress: { address: msg.to } }],
          attachments,
        },
        saveToSentItems: true,
      }),
    });
    if (!res.ok) {
      // Read a short status hint without logging any token or message body.
      return { success: false, error: `outlook send failed: ${res.status}` };
    }
    return { success: true };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "unknown error" };
  }
}
