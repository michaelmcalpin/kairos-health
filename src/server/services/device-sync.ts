/**
 * EVERIST Device Sync Service
 *
 * Fetches health data from connected device providers and inserts it
 * into the appropriate database tables.  Each provider has its own
 * fetch function that normalizes the API response into the app's
 * schema.  The top-level `syncProviderData` orchestrator is called
 * from the `syncNow` tRPC mutation.
 */

import { db, type Database } from "@/server/db";
import {
  deviceConnections,
  glucoseReadings,
  sleepSessions,
  heartRateReadings,
  hrvReadings,
  activitySummaries,
  bodyMeasurements,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { PROVIDERS, getProviderEnvKeys } from "@/lib/integrations/devices/providers";
import { logger } from "@/lib/middleware/logger";
import { decryptToken, encryptToken } from "@/lib/crypto";

// ─── Types ──────────────────────────────────────────────────────────────────

type DeviceProvider = "oura" | "apple_health" | "dexcom" | "garmin" | "whoop" | "withings" | "fitbit" | "hume";

interface SyncResult {
  provider: string;
  success: boolean;
  recordsSynced: number;
  errors: string[];
  /** Human-readable note when a provider doesn't support pull-based sync */
  note?: string;
}

interface NormalizedGlucose {
  timestamp: Date;
  valueMgdl: number;
  source: string;
  trendDirection?: string;
}

interface NormalizedSleep {
  date: string;
  bedtime?: string;
  wakeTime?: string;
  totalMinutes?: number;
  deepMinutes?: number;
  remMinutes?: number;
  lightMinutes?: number;
  awakeMinutes?: number;
  score?: number;
  source: string;
}

interface NormalizedHeartRate {
  timestamp: Date;
  bpm: number;
  source: string;
  activityContext?: string;
}

interface NormalizedHrv {
  timestamp: Date;
  rmssd: number;
  source: string;
}

interface NormalizedActivity {
  date: string;
  steps?: number;
  caloriesActive?: number;
  exerciseMinutes?: number;
  source: string;
}

interface NormalizedBodyMeasurement {
  date: string;
  weightLbs?: number;
  bodyFatPct?: number;
  source: string;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

/** ISO date string for N days ago */
function daysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().split("T")[0];
}

/** Today's ISO date */
function today(): string {
  return new Date().toISOString().split("T")[0];
}

/** Unix timestamp (seconds) for N days ago */
function unixDaysAgo(n: number): number {
  return Math.floor((Date.now() - n * 86_400_000) / 1000);
}

/** Fetch wrapper that throws on non-OK responses and includes status info */
async function apiFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const res = await fetch(url, options);
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    const err = new Error(`API ${res.status}: ${body.slice(0, 300)}`);
    (err as any).status = res.status;
    throw err;
  }
  return res;
}

/** Bearer-token Authorization header */
function bearerHeaders(token: string): Record<string, string> {
  return {
    Authorization: `Bearer ${token}`,
    Accept: "application/json",
  };
}

// ─── Token Refresh ──────────────────────────────────────────────────────────

/**
 * Attempt to refresh an OAuth access token using the stored refresh token.
 * Each provider has its own token endpoint and may differ slightly in params.
 * Returns the new access token, or throws on failure.
 */
export async function refreshOAuthToken(
  provider: DeviceProvider,
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken?: string; expiresIn?: number }> {
  const providerConfig = PROVIDERS[provider];
  if (!providerConfig?.tokenUrl) {
    throw new Error(`No token URL configured for provider ${provider}`);
  }

  const envKeys = getProviderEnvKeys(provider);
  const clientId = process.env[envKeys.clientId];
  const clientSecret = process.env[envKeys.clientSecret];

  if (!clientId || !clientSecret) {
    throw new Error(`Missing OAuth credentials for ${provider}`);
  }

  // Withings uses a slightly different parameter (action=requesttoken)
  const isWithings = provider === "withings";

  const body: Record<string, string> = {
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
  };
  if (isWithings) {
    body.action = "requesttoken";
  }

  const res = await fetch(providerConfig.tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Token refresh failed for ${provider} (${res.status}): ${text.slice(0, 200)}`);
  }

  const data = await res.json();

  // Withings nests tokens inside body
  const tokenData = isWithings && data.body ? data.body : data;

  return {
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token ?? undefined,
    expiresIn: tokenData.expires_in ?? undefined,
  };
}

// ─── Provider: Oura ─────────────────────────────────────────────────────────

async function fetchOuraData(token: string): Promise<{
  sleep: NormalizedSleep[];
  heartRate: NormalizedHeartRate[];
  activity: NormalizedActivity[];
}> {
  const startDate = daysAgo(1);
  const endDate = today();
  const headers = bearerHeaders(token);

  // Fetch sleep, heart rate, and activity in parallel
  const [sleepRes, hrRes, activityRes] = await Promise.all([
    apiFetch(`https://api.ouraring.com/v2/usercollection/daily_sleep?start_date=${startDate}&end_date=${endDate}`, { headers }),
    apiFetch(`https://api.ouraring.com/v2/usercollection/heartrate?start_datetime=${startDate}T00:00:00&end_datetime=${endDate}T23:59:59`, { headers }),
    apiFetch(`https://api.ouraring.com/v2/usercollection/daily_activity?start_date=${startDate}&end_date=${endDate}`, { headers }),
  ]);

  const sleepData = await sleepRes.json();
  const hrData = await hrRes.json();
  const activityData = await activityRes.json();

  // Normalize sleep
  const sleep: NormalizedSleep[] = (sleepData.data ?? []).map((s: any) => ({
    date: s.day ?? startDate,
    totalMinutes: s.contributors?.total_sleep ? Math.round(s.contributors.total_sleep / 60) : undefined,
    deepMinutes: s.contributors?.deep_sleep ? Math.round(s.contributors.deep_sleep / 60) : undefined,
    remMinutes: s.contributors?.rem_sleep ? Math.round(s.contributors.rem_sleep / 60) : undefined,
    lightMinutes: s.contributors?.light_sleep ? Math.round(s.contributors.light_sleep / 60) : undefined,
    awakeMinutes: s.contributors?.awake_time ? Math.round(s.contributors.awake_time / 60) : undefined,
    score: s.score ?? undefined,
    source: "oura",
  }));

  // Normalize heart rate (sample up to 100 readings to avoid flooding)
  const hrSamples = (hrData.data ?? []).slice(0, 100);
  const heartRate: NormalizedHeartRate[] = hrSamples.map((hr: any) => ({
    timestamp: new Date(hr.timestamp),
    bpm: hr.bpm,
    source: "oura",
    activityContext: hr.source ?? undefined,
  }));

  // Normalize activity
  const activity: NormalizedActivity[] = (activityData.data ?? []).map((a: any) => ({
    date: a.day ?? startDate,
    steps: a.steps ?? undefined,
    caloriesActive: a.active_calories ?? undefined,
    exerciseMinutes: a.high_activity_time ? Math.round(a.high_activity_time / 60) : undefined,
    source: "oura",
  }));

  return { sleep, heartRate, activity };
}

// ─── Provider: WHOOP ────────────────────────────────────────────────────────

async function fetchWhoopData(token: string): Promise<{
  sleep: NormalizedSleep[];
  heartRate: NormalizedHeartRate[];
  hrv: NormalizedHrv[];
  activity: NormalizedActivity[];
}> {
  const headers = bearerHeaders(token);
  const startDate = daysAgo(1);

  // Fetch sleep, recovery, and workout in parallel
  const [sleepRes, recoveryRes, workoutRes] = await Promise.all([
    apiFetch(`https://api.prod.whoop.com/developer/v1/activity/sleep?start=${startDate}T00:00:00.000Z&limit=10`, { headers }),
    apiFetch(`https://api.prod.whoop.com/developer/v1/recovery?start=${startDate}T00:00:00.000Z&limit=10`, { headers }),
    apiFetch(`https://api.prod.whoop.com/developer/v1/activity/workout?start=${startDate}T00:00:00.000Z&limit=10`, { headers }),
  ]);

  const sleepData = await sleepRes.json();
  const recoveryData = await recoveryRes.json();
  const workoutData = await workoutRes.json();

  // Normalize sleep
  const sleep: NormalizedSleep[] = (sleepData.records ?? []).map((s: any) => {
    const start = s.start ? new Date(s.start) : null;
    const end = s.end ? new Date(s.end) : null;
    const totalMs = start && end ? end.getTime() - start.getTime() : undefined;
    return {
      date: start ? start.toISOString().split("T")[0] : startDate,
      bedtime: start ? `${String(start.getHours()).padStart(2, "0")}:${String(start.getMinutes()).padStart(2, "0")}` : undefined,
      wakeTime: end ? `${String(end.getHours()).padStart(2, "0")}:${String(end.getMinutes()).padStart(2, "0")}` : undefined,
      totalMinutes: totalMs ? Math.round(totalMs / 60000) : undefined,
      deepMinutes: s.score?.stage_summary?.total_slow_wave_sleep_time_milli
        ? Math.round(s.score.stage_summary.total_slow_wave_sleep_time_milli / 60000)
        : undefined,
      remMinutes: s.score?.stage_summary?.total_rem_sleep_time_milli
        ? Math.round(s.score.stage_summary.total_rem_sleep_time_milli / 60000)
        : undefined,
      lightMinutes: s.score?.stage_summary?.total_light_sleep_time_milli
        ? Math.round(s.score.stage_summary.total_light_sleep_time_milli / 60000)
        : undefined,
      awakeMinutes: s.score?.stage_summary?.total_awake_time_milli
        ? Math.round(s.score.stage_summary.total_awake_time_milli / 60000)
        : undefined,
      score: s.score?.sleep_performance_percentage ?? undefined,
      source: "whoop",
    };
  });

  // Extract HRV and resting HR from recovery
  const hrv: NormalizedHrv[] = [];
  const heartRate: NormalizedHeartRate[] = [];
  for (const r of recoveryData.records ?? []) {
    const ts = r.created_at ? new Date(r.created_at) : new Date();
    if (r.score?.hrv_rmssd_milli != null) {
      hrv.push({
        timestamp: ts,
        rmssd: r.score.hrv_rmssd_milli,
        source: "whoop",
      });
    }
    if (r.score?.resting_heart_rate != null) {
      heartRate.push({
        timestamp: ts,
        bpm: Math.round(r.score.resting_heart_rate),
        source: "whoop",
        activityContext: "resting",
      });
    }
  }

  // Normalize workouts as activity
  const activity: NormalizedActivity[] = (workoutData.records ?? []).map((w: any) => {
    const start = w.start ? new Date(w.start) : null;
    const end = w.end ? new Date(w.end) : null;
    const durationMs = start && end ? end.getTime() - start.getTime() : undefined;
    return {
      date: start ? start.toISOString().split("T")[0] : startDate,
      caloriesActive: w.score?.kilojoule ? Math.round(w.score.kilojoule * 0.239006) : undefined,
      exerciseMinutes: durationMs ? Math.round(durationMs / 60000) : undefined,
      source: "whoop",
    };
  });

  return { sleep, heartRate, hrv, activity };
}

// ─── Provider: Dexcom ───────────────────────────────────────────────────────

async function fetchDexcomData(token: string): Promise<{
  glucose: NormalizedGlucose[];
}> {
  const headers = bearerHeaders(token);
  const startDate = `${daysAgo(1)}T00:00:00`;
  const endDate = `${today()}T23:59:59`;

  const res = await apiFetch(
    `https://api.dexcom.com/v3/users/self/egvs?startDate=${startDate}&endDate=${endDate}`,
    { headers },
  );
  const data = await res.json();

  const glucose: NormalizedGlucose[] = (data.records ?? []).map((r: any) => ({
    timestamp: new Date(r.displayTime ?? r.systemTime),
    valueMgdl: r.value ?? r.glucoseValue,
    source: "dexcom",
    trendDirection: r.trend ?? r.trendArrow ?? undefined,
  }));

  return { glucose };
}

// ─── Provider: Withings ─────────────────────────────────────────────────────

async function fetchWithingsData(token: string): Promise<{
  body: NormalizedBodyMeasurement[];
  sleep: NormalizedSleep[];
}> {
  const headers = bearerHeaders(token);
  const startTs = unixDaysAgo(1);
  const endTs = Math.floor(Date.now() / 1000);

  // Fetch weight/body composition (meastype 1=weight, 6=fat ratio, 8=fat mass)
  // and sleep data in parallel
  const [measRes, sleepRes] = await Promise.all([
    apiFetch(
      `https://wbsapi.withings.net/measure?action=getmeas&meastype=1,6&startdate=${startTs}&enddate=${endTs}`,
      { headers, method: "POST" },
    ),
    apiFetch(
      `https://wbsapi.withings.net/v2/sleep?action=getsummary&startdateymd=${daysAgo(1)}&enddateymd=${today()}`,
      { headers, method: "POST" },
    ),
  ]);

  const measData = await measRes.json();
  const sleepData = await sleepRes.json();

  // Normalize body measurements
  // Withings returns measuregrps → each has measures with type + value + unit
  const bodyMap = new Map<string, NormalizedBodyMeasurement>();
  for (const grp of measData.body?.measuregrps ?? []) {
    const grpDate = new Date(grp.date * 1000).toISOString().split("T")[0];
    const existing = bodyMap.get(grpDate) ?? { date: grpDate, source: "withings" };
    for (const m of grp.measures ?? []) {
      const realValue = m.value * Math.pow(10, m.unit);
      if (m.type === 1) {
        // Weight in kg → convert to lbs
        existing.weightLbs = Math.round(realValue * 2.20462 * 10) / 10;
      } else if (m.type === 6) {
        // Fat ratio (percentage)
        existing.bodyFatPct = Math.round(realValue * 10) / 10;
      }
    }
    bodyMap.set(grpDate, existing);
  }
  const body = Array.from(bodyMap.values());

  // Normalize sleep
  const sleep: NormalizedSleep[] = (sleepData.body?.series ?? []).map((s: any) => ({
    date: s.date ?? daysAgo(1),
    totalMinutes: s.data?.totalsleepduration ? Math.round(s.data.totalsleepduration / 60) : undefined,
    deepMinutes: s.data?.deepsleepduration ? Math.round(s.data.deepsleepduration / 60) : undefined,
    remMinutes: s.data?.remsleepduration ? Math.round(s.data.remsleepduration / 60) : undefined,
    lightMinutes: s.data?.lightsleepduration ? Math.round(s.data.lightsleepduration / 60) : undefined,
    awakeMinutes: s.data?.wakeupcount != null ? undefined : undefined,
    source: "withings",
  }));

  return { body, sleep };
}

// ─── Provider: Fitbit ───────────────────────────────────────────────────────

async function fetchFitbitData(token: string): Promise<{
  sleep: NormalizedSleep[];
  activity: NormalizedActivity[];
  heartRate: NormalizedHeartRate[];
}> {
  const headers = bearerHeaders(token);
  const dateStr = today();

  // Fetch activity, sleep, and heart rate in parallel
  const [activityRes, sleepRes, hrRes] = await Promise.all([
    apiFetch(`https://api.fitbit.com/1/user/-/activities/date/${dateStr}.json`, { headers }),
    apiFetch(`https://api.fitbit.com/1.2/user/-/sleep/date/${dateStr}.json`, { headers }),
    apiFetch(`https://api.fitbit.com/1/user/-/activities/heart/date/${dateStr}/1d.json`, { headers }),
  ]);

  const activityData = await activityRes.json();
  const sleepData = await sleepRes.json();
  const hrData = await hrRes.json();

  // Normalize activity
  const summary = activityData.summary ?? {};
  const activity: NormalizedActivity[] = [{
    date: dateStr,
    steps: summary.steps ?? undefined,
    caloriesActive: summary.activityCalories ?? summary.caloriesOut ?? undefined,
    exerciseMinutes: (summary.fairlyActiveMinutes ?? 0) + (summary.veryActiveMinutes ?? 0) || undefined,
    source: "fitbit",
  }];

  // Normalize sleep
  const sleep: NormalizedSleep[] = (sleepData.sleep ?? []).map((s: any) => {
    const levels = s.levels?.summary ?? {};
    return {
      date: s.dateOfSleep ?? dateStr,
      bedtime: s.startTime ? new Date(s.startTime).toTimeString().slice(0, 5) : undefined,
      wakeTime: s.endTime ? new Date(s.endTime).toTimeString().slice(0, 5) : undefined,
      totalMinutes: s.duration ? Math.round(s.duration / 60000) : s.minutesAsleep ?? undefined,
      deepMinutes: levels.deep?.minutes ?? undefined,
      remMinutes: levels.rem?.minutes ?? undefined,
      lightMinutes: levels.light?.minutes ?? undefined,
      awakeMinutes: levels.wake?.minutes ?? s.minutesAwake ?? undefined,
      score: s.efficiency ?? undefined,
      source: "fitbit",
    };
  });

  // Normalize resting heart rate
  const heartRate: NormalizedHeartRate[] = [];
  const hrZones = hrData["activities-heart"] ?? [];
  for (const day of hrZones) {
    if (day.value?.restingHeartRate) {
      heartRate.push({
        timestamp: new Date(`${day.dateTime}T12:00:00`),
        bpm: day.value.restingHeartRate,
        source: "fitbit",
        activityContext: "resting",
      });
    }
  }

  return { sleep, activity, heartRate };
}

// ─── Database Insertion ─────────────────────────────────────────────────────

async function insertGlucose(database: Database, userId: string, records: NormalizedGlucose[]): Promise<number> {
  if (records.length === 0) return 0;
  // Insert in batches of 100
  let inserted = 0;
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    await database.insert(glucoseReadings).values(
      batch.map((r) => ({
        clientId: userId,
        timestamp: r.timestamp,
        valueMgdl: r.valueMgdl,
        source: r.source,
        trendDirection: r.trendDirection ?? null,
      })),
    );
    inserted += batch.length;
  }
  return inserted;
}

async function insertSleep(database: Database, userId: string, records: NormalizedSleep[]): Promise<number> {
  if (records.length === 0) return 0;
  await database.insert(sleepSessions).values(
    records.map((r) => ({
      clientId: userId,
      date: r.date,
      bedtime: r.bedtime ?? null,
      wakeTime: r.wakeTime ?? null,
      totalMinutes: r.totalMinutes ?? null,
      deepMinutes: r.deepMinutes ?? null,
      remMinutes: r.remMinutes ?? null,
      lightMinutes: r.lightMinutes ?? null,
      awakeMinutes: r.awakeMinutes ?? null,
      score: r.score ?? null,
      source: r.source,
    })),
  );
  return records.length;
}

async function insertHeartRate(database: Database, userId: string, records: NormalizedHeartRate[]): Promise<number> {
  if (records.length === 0) return 0;
  for (let i = 0; i < records.length; i += 100) {
    const batch = records.slice(i, i + 100);
    await database.insert(heartRateReadings).values(
      batch.map((r) => ({
        clientId: userId,
        timestamp: r.timestamp,
        bpm: r.bpm,
        source: r.source,
        activityContext: r.activityContext ?? null,
      })),
    );
  }
  return records.length;
}

async function insertHrv(database: Database, userId: string, records: NormalizedHrv[]): Promise<number> {
  if (records.length === 0) return 0;
  await database.insert(hrvReadings).values(
    records.map((r) => ({
      clientId: userId,
      timestamp: r.timestamp,
      rmssd: r.rmssd,
      source: r.source,
    })),
  );
  return records.length;
}

async function insertActivity(database: Database, userId: string, records: NormalizedActivity[]): Promise<number> {
  if (records.length === 0) return 0;
  await database.insert(activitySummaries).values(
    records.map((r) => ({
      clientId: userId,
      date: r.date,
      steps: r.steps ?? null,
      caloriesActive: r.caloriesActive ?? null,
      exerciseMinutes: r.exerciseMinutes ?? null,
      source: r.source,
    })),
  );
  return records.length;
}

async function insertBodyMeasurements(database: Database, userId: string, records: NormalizedBodyMeasurement[]): Promise<number> {
  if (records.length === 0) return 0;
  await database.insert(bodyMeasurements).values(
    records.map((r) => ({
      clientId: userId,
      date: r.date,
      weightLbs: r.weightLbs ?? null,
      bodyFatPct: r.bodyFatPct ?? null,
      source: r.source,
    })),
  );
  return records.length;
}

// ─── Token refresh + retry wrapper ──────────────────────────────────────────

/**
 * Execute a provider fetch function.  If it throws a 401, attempt to refresh
 * the token and retry once.  On successful refresh the new tokens are
 * persisted to the database.
 */
async function fetchWithTokenRefresh<T>(
  provider: DeviceProvider,
  connectionId: string,
  accessToken: string,
  refreshToken: string | null,
  fetchFn: (token: string) => Promise<T>,
): Promise<{ data: T; tokenRefreshed: boolean }> {
  try {
    const data = await fetchFn(accessToken);
    return { data, tokenRefreshed: false };
  } catch (err: any) {
    if (err?.status !== 401 || !refreshToken) {
      throw err;
    }

    // Attempt token refresh
    logger.info("device-sync", `Token expired for ${provider}, refreshing...`);
    const refreshed = await refreshOAuthToken(provider, refreshToken);

    // Persist new tokens (encrypted)
    const updatePayload: Record<string, any> = {
      accessTokenEnc: encryptToken(refreshed.accessToken),
    };
    if (refreshed.refreshToken) {
      updatePayload.refreshTokenEnc = encryptToken(refreshed.refreshToken);
    }
    if (refreshed.expiresIn) {
      updatePayload.tokenExpiresAt = new Date(Date.now() + refreshed.expiresIn * 1000);
    }
    await db
      .update(deviceConnections)
      .set(updatePayload)
      .where(eq(deviceConnections.id, connectionId));

    // Retry with new token
    const data = await fetchFn(refreshed.accessToken);
    return { data, tokenRefreshed: true };
  }
}

// ─── Main Orchestrator ──────────────────────────────────────────────────────

/**
 * Sync data from a connected provider.
 *
 * @param userId       The internal user UUID (clientId in most tables)
 * @param provider     The provider key (oura, whoop, dexcom, etc.)
 * @param accessToken  The stored OAuth access token
 * @param refreshToken The stored OAuth refresh token (may be null)
 * @param connectionId The device_connections row ID (for token updates)
 */
export async function syncProviderData(
  userId: string,
  provider: string,
  accessToken: string,
  refreshToken: string | null,
  connectionId: string,
): Promise<SyncResult> {
  const result: SyncResult = {
    provider,
    success: false,
    recordsSynced: 0,
    errors: [],
  };

  try {
    // Decrypt tokens (handles both encrypted and legacy plaintext values)
    accessToken = decryptToken(accessToken);
    if (refreshToken) refreshToken = decryptToken(refreshToken);

    const typedProvider = provider as DeviceProvider;

    switch (typedProvider) {
      // ── Oura ──
      case "oura": {
        const { data } = await fetchWithTokenRefresh(
          typedProvider, connectionId, accessToken, refreshToken,
          fetchOuraData,
        );
        const counts = await Promise.all([
          insertSleep(db, userId, data.sleep),
          insertHeartRate(db, userId, data.heartRate),
          insertActivity(db, userId, data.activity),
        ]);
        result.recordsSynced = counts.reduce((a, b) => a + b, 0);
        result.success = true;
        break;
      }

      // ── WHOOP ──
      case "whoop": {
        const { data } = await fetchWithTokenRefresh(
          typedProvider, connectionId, accessToken, refreshToken,
          fetchWhoopData,
        );
        const counts = await Promise.all([
          insertSleep(db, userId, data.sleep),
          insertHeartRate(db, userId, data.heartRate),
          insertHrv(db, userId, data.hrv),
          insertActivity(db, userId, data.activity),
        ]);
        result.recordsSynced = counts.reduce((a, b) => a + b, 0);
        result.success = true;
        break;
      }

      // ── Dexcom ──
      case "dexcom": {
        const { data } = await fetchWithTokenRefresh(
          typedProvider, connectionId, accessToken, refreshToken,
          fetchDexcomData,
        );
        result.recordsSynced = await insertGlucose(db, userId, data.glucose);
        result.success = true;
        break;
      }

      // ── Withings ──
      case "withings": {
        const { data } = await fetchWithTokenRefresh(
          typedProvider, connectionId, accessToken, refreshToken,
          fetchWithingsData,
        );
        const counts = await Promise.all([
          insertBodyMeasurements(db, userId, data.body),
          insertSleep(db, userId, data.sleep),
        ]);
        result.recordsSynced = counts.reduce((a, b) => a + b, 0);
        result.success = true;
        break;
      }

      // ── Fitbit ──
      case "fitbit": {
        const { data } = await fetchWithTokenRefresh(
          typedProvider, connectionId, accessToken, refreshToken,
          fetchFitbitData,
        );
        const counts = await Promise.all([
          insertSleep(db, userId, data.sleep),
          insertActivity(db, userId, data.activity),
          insertHeartRate(db, userId, data.heartRate),
        ]);
        result.recordsSynced = counts.reduce((a, b) => a + b, 0);
        result.success = true;
        break;
      }

      // ── Garmin (push-based, no pull API) ──
      case "garmin": {
        result.success = true;
        result.note = "Garmin uses a push-based model (webhooks). Data is synced automatically when Garmin sends updates.";
        break;
      }

      // ── Hume (voice/emotion analysis, not periodic health data) ──
      case "hume": {
        result.success = true;
        result.note = "Hume AI provides voice/emotion analysis on demand, not periodic health data. No data to pull.";
        break;
      }

      // ── Apple Health (native HealthKit, not API-based) ──
      case "apple_health": {
        result.success = true;
        result.note = "Apple Health data is synced from the mobile app via HealthKit. Use the iOS app to sync.";
        break;
      }

      default: {
        result.errors.push(`Unknown provider: ${provider}`);
        break;
      }
    }
  } catch (err: any) {
    const message = err instanceof Error ? err.message : String(err);
    result.errors.push(message);
    logger.error("device-sync", `Sync failed for ${provider}`, { error: message, userId });
  }

  return result;
}
