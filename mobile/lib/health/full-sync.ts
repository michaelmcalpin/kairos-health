/**
 * Full Apple Health read: every metric in the catalog (lib/health/metrics.ts),
 * sleep stages, and workouts, rolled up per local day and sent to the server.
 *
 * Uses the EveristHealthKit native module. When the module isn't in the build
 * (older binary, Android) this is a no-op and the legacy sync keeps working.
 */
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

import { API_URL } from "../constants";

import * as HK from "../../modules/everist-healthkit";
import { METRICS, HK_SLEEP_ANALYSIS, healthKitReadTypes, convertValue } from "./metrics";
import { deriveSleep, deriveCategoryDaily, workoutName, type DailyMetric } from "./derive";

/** Bump when the catalog gains new types so we ask for the new permissions once. */
const AUTH_VERSION = "hk-full-v1";
const AUTH_KEY = "everist_hk_full_auth";
const BACKFILL_KEY = "everist_hk_full_backfill";
const BACKFILL_DAYS = 90;
const ROUTINE_DAYS = 14;

export interface FullSyncPayload {
  metrics: DailyMetric[];
  sleep: Array<{ date: string; totalMinutes: number; deepMinutes?: number; remMinutes?: number; lightMinutes?: number; awakeMinutes?: number; bedtime?: string; wakeTime?: string }>;
  workouts: Array<{ externalId: string; activity: string; startAt: string; endAt: string; durationMin?: number; energyKcal?: number; distanceM?: number; avgHr?: number; maxHr?: number }>;
}

/** Resolve to `fallback` if `p` takes longer than `ms` (never spin forever). */
function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return Promise.race([p, new Promise<T>((r) => setTimeout(() => r(fallback), ms))]);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * One-line status to the server log (no health values — only counts and
 * outcomes) so Apple Health problems on a phone can be diagnosed remotely.
 */
export function reportHealthDiag(message: string): void {
  try {
    fetch(`${API_URL}/api/report-error`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: `[healthkit] ${message}`, url: "app://health", portal: `ios-${Platform.Version}`, timestamp: new Date().toISOString() }),
    }).catch(() => {});
  } catch {
    // diagnostics are best-effort
  }
}

export function isFullSyncAvailable(): boolean {
  return HK.isAvailable();
}

/** Ask for read access to every catalog type (only shows Apple's sheet when something is new). */
export async function ensureFullAuthorization(force = false): Promise<boolean> {
  if (!HK.isAvailable()) return false;
  const done = await SecureStore.getItemAsync(AUTH_KEY).catch(() => null);
  if (done === AUTH_VERSION && !force) return true;
  const { quantity, category } = healthKitReadTypes();
  // Give iOS a moment to finish closing any permission sheet that was just shown.
  await sleep(800);
  let outcome = "timeout";
  const ok = await withTimeout(
    HK.requestAuthorization(quantity, category).then((r) => { outcome = r ? "granted" : "not-granted"; return r; })
      .catch((e: unknown) => { outcome = `error: ${e instanceof Error ? e.message : String(e)}`; return false; }),
    45_000,
    false,
  );
  reportHealthDiag(`full auth ${outcome} (${quantity.length} quantity + ${category.length} category types, forced=${force})`);
  if (ok) await SecureStore.setItemAsync(AUTH_KEY, AUTH_VERSION).catch(() => {});
  return ok;
}

/** Read the window from Apple Health. Pure read; nothing is sent. */
export async function readFullPayload(): Promise<FullSyncPayload | null> {
  if (!HK.isAvailable()) {
    reportHealthDiag("native module not available in this build");
    return null;
  }
  await ensureFullAuthorization();

  const backfilled = await SecureStore.getItemAsync(BACKFILL_KEY).catch(() => null);
  const days = backfilled ? ROUTINE_DAYS : BACKFILL_DAYS;
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  start.setHours(0, 0, 0, 0);

  const metrics: DailyMetric[] = [];

  // Quantity metrics: one native statistics query each, in small parallel batches.
  const quantityDefs = METRICS.filter((m) => m.healthkit?.kind === "quantity");
  for (let i = 0; i < quantityDefs.length; i += 8) {
    const batch = quantityDefs.slice(i, i + 8);
    const results = await Promise.all(batch.map((m) =>
      HK.dailyStatistics(m.healthkit!.id, m.healthkit!.unit!, m.healthkit!.agg ?? "avg", start, end),
    ));
    batch.forEach((m, j) => {
      for (const r of results[j]) {
        const value = convertValue(m, r.value);
        if (Number.isFinite(value)) metrics.push({ date: r.date, metric: m.key, value: Math.round(value * 1000) / 1000 });
      }
    });
  }

  // Category metrics (alerts, mindful minutes, stand hours, cycle).
  const categoryDefs = METRICS.filter((m) => m.healthkit?.kind === "category");
  const categoryResults = await Promise.all(categoryDefs.map((m) => HK.categorySamples(m.healthkit!.id, start, end, 5000)));
  categoryDefs.forEach((m, j) => {
    metrics.push(...deriveCategoryDaily(m.key, m.healthkit!.id, m.healthkit!.categoryAgg ?? "count", categoryResults[j]));
  });

  // Sleep stages → daily sleep metrics + a sleep session row per night.
  const sleepSamples = await HK.categorySamples(HK_SLEEP_ANALYSIS, start, end, 20000);
  const sleepMetrics = deriveSleep(sleepSamples);
  metrics.push(...sleepMetrics.map(({ date, metric, value }) => ({ date, metric, value })));
  const nights = new Map<string, FullSyncPayload["sleep"][number]>();
  for (const s of sleepMetrics) {
    const n = nights.get(s.date) ?? { date: s.date, totalMinutes: 0 };
    if (s.metric === "sleep_total_min") { n.totalMinutes = s.value; n.bedtime = s.bedtime; n.wakeTime = s.wakeTime; }
    if (s.metric === "sleep_deep_min") n.deepMinutes = s.value;
    if (s.metric === "sleep_rem_min") n.remMinutes = s.value;
    if (s.metric === "sleep_core_min") n.lightMinutes = s.value;
    if (s.metric === "sleep_awake_min") n.awakeMinutes = s.value;
    nights.set(s.date, n);
  }

  // Workouts.
  const rawWorkouts = await HK.workouts(start, end, 300);
  const workouts = rawWorkouts.map((w) => ({
    externalId: w.id,
    activity: workoutName(w.activityType),
    startAt: new Date(w.start).toISOString(),
    endAt: new Date(w.end).toISOString(),
    durationMin: w.durationMin,
    energyKcal: w.energyKcal,
    distanceM: w.distanceM,
    avgHr: w.avgHr,
    maxHr: w.maxHr,
  }));

  const distinct = new Set(metrics.map((m) => m.metric)).size;
  reportHealthDiag(`read ${metrics.length} daily values across ${distinct} metrics, ${nights.size} nights, ${workouts.length} workouts (${days} days)`);
  return { metrics, sleep: Array.from(nights.values()).filter((n) => n.totalMinutes > 0), workouts };
}

/** Mark the first big backfill as done (call after the server accepted it). */
export async function markBackfilled(): Promise<void> {
  await SecureStore.setItemAsync(BACKFILL_KEY, new Date().toISOString()).catch(() => {});
}

/** Split for upload (the server caps each call). */
export function chunkPayload(p: FullSyncPayload, size = 2000): FullSyncPayload[] {
  const chunks: FullSyncPayload[] = [];
  for (let i = 0; i < Math.max(p.metrics.length, 1); i += size) {
    chunks.push({ metrics: p.metrics.slice(i, i + size), sleep: [], workouts: [] });
  }
  chunks[0].sleep = p.sleep;
  chunks[0].workouts = p.workouts;
  return chunks;
}
