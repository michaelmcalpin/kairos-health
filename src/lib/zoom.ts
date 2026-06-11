/**
 * Zoom Server-to-Server OAuth Helper
 *
 * Uses the Server-to-Server OAuth flow (account_credentials grant) to
 * create and delete Zoom meetings on behalf of the account.
 *
 * Required env vars:
 *   ZOOM_ACCOUNT_ID
 *   ZOOM_CLIENT_ID
 *   ZOOM_CLIENT_SECRET
 *
 * If any are missing, exported functions return null instead of throwing,
 * so callers can gracefully degrade when Zoom is not configured.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface ZoomTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number; // seconds
}

interface CreateMeetingParams {
  topic: string;
  startTime: string; // ISO 8601
  duration: number; // minutes
  agenda?: string;
}

interface CreateMeetingResult {
  joinUrl: string;
  startUrl: string;
  meetingId: number;
  password: string;
}

// ─── Configuration ──────────────────────────────────────────────────────────

function getZoomConfig() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  if (!accountId || !clientId || !clientSecret) {
    return null;
  }

  return { accountId, clientId, clientSecret };
}

// ─── Token Cache ────────────────────────────────────────────────────────────

let cachedToken: string | null = null;
let tokenExpiresAt = 0; // epoch ms

const TOKEN_BUFFER_MS = 5 * 60 * 1000; // refresh 5 min before expiry

async function getAccessToken(): Promise<string | null> {
  const config = getZoomConfig();
  if (!config) return null;

  // Return cached token if still valid
  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const { accountId, clientId, clientSecret } = config;
  const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const url = `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${accountId}`;

  const res = await fetchWithRetry(url, {
    method: "POST",
    headers: {
      Authorization: `Basic ${credentials}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[Zoom] Token request failed: ${res.status} ${body}`);
    return null;
  }

  const data: ZoomTokenResponse = await res.json();

  cachedToken = data.access_token;
  // Cache until expiry minus buffer
  tokenExpiresAt = Date.now() + data.expires_in * 1000 - TOKEN_BUFFER_MS;

  return cachedToken;
}

// ─── Retry Utility ──────────────────────────────────────────────────────────

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 1000; // 1s, 2s, 4s

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  label: string = "Zoom API",
): Promise<Response> {
  let lastResponse: Response | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, init);

    if (res.ok || !RETRYABLE_STATUS_CODES.has(res.status)) {
      return res;
    }

    lastResponse = res;

    if (attempt < MAX_RETRIES) {
      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt);
      console.warn(
        `[${label}] Status ${res.status}, retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // All retries exhausted — return last response so caller can inspect
  return lastResponse!;
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Create a Zoom meeting via the REST API.
 *
 * Returns null if Zoom is not configured (missing env vars) or if the
 * API call fails after retries.
 */
export async function createZoomMeeting(
  params: CreateMeetingParams,
): Promise<CreateMeetingResult | null> {
  const token = await getAccessToken();
  if (!token) return null;

  try {
    const res = await fetchWithRetry(
      "https://api.zoom.us/v2/users/me/meetings",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          topic: params.topic,
          type: 2, // Scheduled meeting
          start_time: params.startTime,
          duration: params.duration,
          timezone: "UTC",
          agenda: params.agenda ?? "",
          settings: {
            join_before_host: true,
            waiting_room: false,
            auto_recording: "none",
          },
        }),
      },
      "Zoom Create Meeting",
    );

    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(`[Zoom] Create meeting failed: ${res.status} ${body}`);
      return null;
    }

    const data = await res.json();

    return {
      joinUrl: data.join_url,
      startUrl: data.start_url,
      meetingId: data.id,
      password: data.password ?? "",
    };
  } catch (err) {
    console.error("[Zoom] Create meeting error:", err);
    return null;
  }
}

/**
 * Delete (cancel) a Zoom meeting.
 *
 * Returns true if successfully deleted, false otherwise.
 * Returns false (not throws) if Zoom is not configured.
 */
export async function deleteZoomMeeting(meetingId: number | string): Promise<boolean> {
  const token = await getAccessToken();
  if (!token) return false;

  try {
    const res = await fetchWithRetry(
      `https://api.zoom.us/v2/meetings/${meetingId}`,
      {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
      "Zoom Delete Meeting",
    );

    // 204 = success, 404 = already deleted (both fine)
    if (res.status === 204 || res.status === 404) {
      return true;
    }

    const body = await res.text().catch(() => "");
    console.error(`[Zoom] Delete meeting failed: ${res.status} ${body}`);
    return false;
  } catch (err) {
    console.error("[Zoom] Delete meeting error:", err);
    return false;
  }
}
