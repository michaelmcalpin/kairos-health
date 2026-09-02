/**
 * Hume Health API client — Band + Body Pod body-composition & vitals.
 *
 * NOTE: This is a corrected scaffold. The previous version targeted Hume *AI*
 * (voice/emotion), which is a different company and does not return body data.
 *
 * The real Hume Health partner API (base URL, auth model, endpoints, response
 * shape) is pending. Until it's wired, `fetchHumeHealthData` returns [] so the
 * device sync no-ops gracefully. When the spec is available, fill in the single
 * marked request block and the field mapping — everything downstream (storage
 * into body_measurements, cron, initial-sync-on-connect) is already in place.
 *
 * Hume Health: https://humehealth.com  ·  Clinics: https://humehealthprofessionals.com
 */

import { env } from "@/lib/config/env";

/** One normalized body-composition reading, ready for body_measurements. */
export interface HumeHealthReading {
  /** Measurement date, YYYY-MM-DD (client-local). */
  date: string;
  weightLbs?: number | null;
  bodyFatPct?: number | null;
  leanMassLbs?: number | null;
  bmi?: number | null;
}

/** True once credentials are present (auth model TBD: API key vs OAuth). */
export function isHumeHealthConfigured(): boolean {
  return Boolean(env.HUME_API_KEY || (env.HUME_CLIENT_ID && env.HUME_CLIENT_SECRET));
}

export interface FetchHumeHealthParams {
  /** Per-user OAuth access token, if Hume Health uses per-user OAuth. */
  accessToken?: string | null;
  /** External identifier for the member in Hume (email or Hume patient id). */
  externalUserId?: string | null;
  /** Only fetch readings on/after this time. */
  since?: Date;
}

/**
 * Fetch recent body-composition readings from Hume Health.
 *
 * Returns [] until the real endpoint/auth is wired (see file header), so callers
 * degrade gracefully. Do NOT fabricate data here.
 */
export async function fetchHumeHealthData(
  _params: FetchHumeHealthParams,
): Promise<HumeHealthReading[]> {
  // ── PENDING REAL API SPEC ────────────────────────────────────────────────
  // Replace this block once Hume Health's docs are in hand:
  //   const res = await fetch(`${env.HUME_API_BASE}/<endpoint>?...`, {
  //     headers: { "X-Hume-Api-Key": env.HUME_API_KEY }  // or Bearer accessToken
  //   });
  //   const json = await res.json();
  //   return json.<rows>.map((r) => ({
  //     date: r.<date>.slice(0, 10),
  //     weightLbs: r.<weight_lb> ?? null,
  //     bodyFatPct: r.<body_fat_pct> ?? null,
  //     leanMassLbs: r.<lean_mass_lb> ?? null,
  //     bmi: r.<bmi> ?? null,
  //   }));
  // ─────────────────────────────────────────────────────────────────────────
  return [];
}

/**
 * Refresh an expired Hume OAuth token (only used if Hume Health turns out to be
 * per-user OAuth; harmless otherwise). Endpoint pending confirmation.
 */
export async function refreshHumeToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await fetch("https://platform.hume.ai/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.HUME_CLIENT_ID,
      client_secret: env.HUME_CLIENT_SECRET,
    }),
  });
  if (!response.ok) {
    throw new Error(`Hume token refresh failed: ${response.status}`);
  }
  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in ?? 3600,
  };
}
