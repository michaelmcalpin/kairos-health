/**
 * Daily health metrics: storage, merging across sources, and summaries.
 *
 * `health_metric_daily` holds one value per metric/day/source (Apple Health,
 * Oura, …). Older device tables (sleep sessions, activity, HRV, glucose, blood
 * pressure, body measurements) are folded in so Garmin, WHOOP, Dexcom and
 * manual entries count too. When two sources report the same metric on the
 * same day we keep one, by a fixed priority, instead of averaging them.
 */
import { and, eq, gte, lte, inArray, sql } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import {
  healthMetricDaily, healthWorkouts, sleepSessions, activitySummaries, hrvReadings,
  glucoseReadings, bloodPressureReadings, bodyMeasurements,
} from "@/server/db/schema";
import { METRICS, METRIC_BY_KEY, METRIC_GROUPS, type MetricDef, type MetricGroup } from "@/lib/health/metrics";

type Database = typeof DB;

export interface DailyRow { date: string; metric: string; value: number }

/** Upsert daily rows for one source. Unknown metric keys are dropped. */
export async function upsertDailyMetrics(db: Database, clientId: string, source: string, rows: DailyRow[]): Promise<number> {
  const clean = rows.filter((r) => METRIC_BY_KEY[r.metric] && Number.isFinite(r.value) && /^\d{4}-\d{2}-\d{2}$/.test(r.date));
  // Last value wins for duplicate keys inside one payload.
  const dedup = new Map<string, DailyRow>();
  for (const r of clean) dedup.set(`${r.date}|${r.metric}`, r);
  const values = Array.from(dedup.values()).map((r) => ({
    clientId, date: r.date, metric: r.metric, value: r.value, unit: METRIC_BY_KEY[r.metric].unit.slice(0, 20), source,
  }));
  for (let i = 0; i < values.length; i += 500) {
    await db.insert(healthMetricDaily).values(values.slice(i, i + 500)).onConflictDoUpdate({
      target: [healthMetricDaily.clientId, healthMetricDaily.date, healthMetricDaily.metric, healthMetricDaily.source],
      set: { value: sql`excluded.value`, unit: sql`excluded.unit`, updatedAt: sql`now()` },
    });
  }
  return values.length;
}

export interface WorkoutRow {
  externalId: string; activity: string; startAt: string; endAt: string;
  durationMin?: number; energyKcal?: number; distanceM?: number; avgHr?: number; maxHr?: number;
}

export async function upsertWorkouts(db: Database, clientId: string, source: string, rows: WorkoutRow[]): Promise<number> {
  const values = rows
    .filter((w) => w.externalId && !isNaN(Date.parse(w.startAt)) && !isNaN(Date.parse(w.endAt)))
    .map((w) => ({
      clientId, source, externalId: w.externalId.slice(0, 80), activity: w.activity.slice(0, 60),
      startAt: new Date(w.startAt), endAt: new Date(w.endAt),
      durationMin: w.durationMin ?? null, energyKcal: w.energyKcal ?? null, distanceM: w.distanceM ?? null,
      avgHr: w.avgHr ?? null, maxHr: w.maxHr ?? null,
    }));
  for (let i = 0; i < values.length; i += 200) {
    await db.insert(healthWorkouts).values(values.slice(i, i + 200)).onConflictDoUpdate({
      target: [healthWorkouts.clientId, healthWorkouts.source, healthWorkouts.externalId],
      set: {
        activity: sql`excluded.activity`, startAt: sql`excluded.start_at`, endAt: sql`excluded.end_at`,
        durationMin: sql`excluded.duration_min`, energyKcal: sql`excluded.energy_kcal`, distanceM: sql`excluded.distance_m`,
        avgHr: sql`excluded.avg_hr`, maxHr: sql`excluded.max_hr`,
      },
    });
  }
  return values.length;
}

/** Ring first for recovery signals; phone/watch first for movement. */
const RECOVERY_FIRST = ["oura", "whoop", "apple_health", "garmin", "fitbit", "withings", "dexcom", "manual", "checkin"];
const MOVEMENT_FIRST = ["apple_health", "garmin", "fitbit", "oura", "whoop", "withings", "dexcom", "manual", "checkin"];
const RECOVERY_KEYS = new Set(["hrv", "resting_hr", "readiness", "temp_deviation", "respiratory_rate", "spo2"]);

export function sourceRank(metric: string, source: string): number {
  const def = METRIC_BY_KEY[metric];
  const order = def?.group === "sleep" || RECOVERY_KEYS.has(metric) ? RECOVERY_FIRST : MOVEMENT_FIRST;
  const i = order.indexOf(source);
  return i === -1 ? order.length : i;
}

/** metric → date → chosen { value, source } */
export type MetricSeries = Map<string, Map<string, { value: number; source: string }>>;

export function mergeRows(rows: Array<DailyRow & { source: string }>): MetricSeries {
  const out: MetricSeries = new Map();
  for (const r of rows) {
    if (!Number.isFinite(r.value)) continue;
    let byDate = out.get(r.metric);
    if (!byDate) out.set(r.metric, (byDate = new Map()));
    const prev = byDate.get(r.date);
    if (!prev || sourceRank(r.metric, r.source) < sourceRank(r.metric, prev.source)) {
      byDate.set(r.date, { value: r.value, source: r.source });
    }
  }
  return out;
}

const day = (d: Date) => d.toISOString().slice(0, 10);

/** Load every daily metric for a client in [from, to], merged across sources and legacy tables. */
export async function loadDailyMetrics(db: Database, clientId: string, from: string, to: string): Promise<MetricSeries> {
  const fromTs = new Date(from + "T00:00:00Z");
  const toTs = new Date(to + "T23:59:59Z");
  const safe = <T,>(p: Promise<T[]>) => p.catch(() => [] as T[]);

  const [daily, sleep, activity, hrv, glucose, bp, body] = await Promise.all([
    safe(db.select().from(healthMetricDaily).where(and(
      eq(healthMetricDaily.clientId, clientId), gte(healthMetricDaily.date, from), lte(healthMetricDaily.date, to)))),
    safe(db.select().from(sleepSessions).where(and(
      eq(sleepSessions.clientId, clientId), gte(sleepSessions.date, from), lte(sleepSessions.date, to)))),
    safe(db.select().from(activitySummaries).where(and(
      eq(activitySummaries.clientId, clientId), gte(activitySummaries.date, from), lte(activitySummaries.date, to)))),
    safe(db.select().from(hrvReadings).where(and(
      eq(hrvReadings.clientId, clientId), gte(hrvReadings.timestamp, fromTs), lte(hrvReadings.timestamp, toTs)))),
    safe(db.select().from(glucoseReadings).where(and(
      eq(glucoseReadings.clientId, clientId), gte(glucoseReadings.timestamp, fromTs), lte(glucoseReadings.timestamp, toTs)))),
    safe(db.select().from(bloodPressureReadings).where(and(
      eq(bloodPressureReadings.clientId, clientId), gte(bloodPressureReadings.date, from), lte(bloodPressureReadings.date, to)))),
    safe(db.select().from(bodyMeasurements).where(and(
      eq(bodyMeasurements.clientId, clientId), gte(bodyMeasurements.date, from), lte(bodyMeasurements.date, to)))),
  ]);

  const rows: Array<DailyRow & { source: string }> = daily.map((r) => ({ date: r.date, metric: r.metric, value: r.value, source: r.source }));
  const add = (date: string, metric: string, value: number | null | undefined, source: string | null) => {
    if (value == null || !Number.isFinite(value)) return;
    rows.push({ date, metric, value, source: source ?? "manual" });
  };

  for (const s of sleep) {
    add(s.date, "sleep_total_min", s.totalMinutes, s.source);
    add(s.date, "sleep_deep_min", s.deepMinutes, s.source);
    add(s.date, "sleep_rem_min", s.remMinutes, s.source);
    add(s.date, "sleep_core_min", s.lightMinutes, s.source);
    add(s.date, "sleep_awake_min", s.awakeMinutes, s.source);
    add(s.date, "sleep_score", s.score, s.source);
  }
  for (const a of activity) {
    add(a.date, "steps", a.steps, a.source);
    add(a.date, "active_kcal", a.caloriesActive, a.source);
    add(a.date, "exercise_min", a.exerciseMinutes, a.source);
    add(a.date, "stand_hours", a.standHours, a.source);
    add(a.date, "flights", a.flightsClimbed, a.source);
    if (a.distanceMeters != null) add(a.date, "distance_walk_run", a.distanceMeters / 1609.344, a.source);
  }
  // Per-sample tables → daily averages per source.
  const avgBy = <T,>(items: T[], key: (t: T) => string, val: (t: T) => number | null) => {
    const acc = new Map<string, { sum: number; n: number }>();
    for (const it of items) {
      const v = val(it);
      if (v == null || !Number.isFinite(v)) continue;
      const k = key(it);
      const a = acc.get(k) ?? { sum: 0, n: 0 };
      a.sum += v; a.n += 1; acc.set(k, a);
    }
    return acc;
  };
  for (const [k, a] of Array.from(avgBy(hrv, (h) => `${day(h.timestamp)}|${h.source ?? "manual"}`, (h) => h.rmssd))) {
    const [d, src] = k.split("|"); add(d, "hrv", a.sum / a.n, src);
  }
  for (const [k, a] of Array.from(avgBy(glucose, (g) => `${day(g.timestamp)}|${g.source ?? "manual"}`, (g) => g.valueMgdl))) {
    const [d, src] = k.split("|"); add(d, "glucose", a.sum / a.n, src);
  }
  for (const [k, a] of Array.from(avgBy(bp, (b) => `${b.date}|${b.source ?? "manual"}`, (b) => b.systolic))) {
    const [d, src] = k.split("|"); add(d, "bp_systolic", a.sum / a.n, src);
  }
  for (const [k, a] of Array.from(avgBy(bp, (b) => `${b.date}|${b.source ?? "manual"}`, (b) => b.diastolic))) {
    const [d, src] = k.split("|"); add(d, "bp_diastolic", a.sum / a.n, src);
  }
  for (const b of body) {
    add(b.date, "weight", b.weightLbs, b.source);
    add(b.date, "body_fat", b.bodyFatPct, b.source);
    add(b.date, "lean_mass", b.leanMassLbs, b.source);
    add(b.date, "bmi", b.bmi, b.source);
    add(b.date, "waist", b.waistInches, b.source);
  }
  return mergeRows(rows);
}

// ── Summaries for display ──────────────────────────────────────────────────

export interface MetricSummary {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  about: string;
  latest: number | null;
  latestDate: string | null;
  avg7: number | null;
  avg30: number | null;
  /** Change of the 7-day average vs the 30-day average, in %. */
  trendPct: number | null;
  better: "higher" | "lower" | "range" | "baseline" | null;
  source: string | null;
  /** Last 30 days, oldest first; null where no data. */
  series: Array<number | null>;
}

export interface GroupSummary { key: MetricGroup; title: string; blurb: string; metrics: MetricSummary[] }

function shiftDay(d: string, delta: number): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

/** Summaries for every metric with data in the last 30 days, grouped for display. */
export function summarize(series: MetricSeries, endDate: string): GroupSummary[] {
  const dates: string[] = [];
  for (let i = 29; i >= 0; i--) dates.push(shiftDay(endDate, -i));
  const last7 = new Set(dates.slice(-7));

  const summaries: MetricSummary[] = [];
  for (const def of METRICS) {
    const byDate = series.get(def.key);
    if (!byDate || byDate.size === 0) continue;
    const points = dates.map((d) => byDate.get(d)?.value ?? null);
    if (points.every((p) => p == null)) continue;
    let latestDate: string | null = null;
    for (const d of dates) if (byDate.has(d)) latestDate = d;
    const all = points.filter((p): p is number => p != null);
    const wk = dates.filter((d) => last7.has(d)).map((d) => byDate.get(d)?.value).filter((v): v is number => v != null);
    const avg7 = mean(wk);
    const avg30 = mean(all);
    summaries.push({
      key: def.key, label: def.label, unit: def.unit, decimals: def.decimals, about: def.about,
      latest: latestDate ? byDate.get(latestDate)!.value : null,
      latestDate,
      avg7, avg30,
      trendPct: avg7 != null && avg30 ? Math.round(((avg7 - avg30) / Math.abs(avg30)) * 1000) / 10 : null,
      better: def.target?.kind ?? null,
      source: latestDate ? byDate.get(latestDate)!.source : null,
      series: points,
    });
  }
  return METRIC_GROUPS
    .map((g) => ({ ...g, metrics: summaries.filter((s) => METRIC_BY_KEY[s.key].group === g.key) }))
    .filter((g) => g.metrics.length > 0);
}

export async function recentWorkouts(db: Database, clientId: string, since: Date, limit = 30) {
  return db.select().from(healthWorkouts)
    .where(and(eq(healthWorkouts.clientId, clientId), gte(healthWorkouts.startAt, since)))
    .orderBy(sql`${healthWorkouts.startAt} desc`)
    .limit(limit)
    .catch(() => [] as Array<typeof healthWorkouts.$inferSelect>);
}

/** Replace a source's sleep sessions for the given nights (stages included). */
export async function replaceSleepSessions(
  db: Database, clientId: string, source: string,
  nights: Array<{ date: string; totalMinutes: number; deepMinutes?: number; remMinutes?: number; lightMinutes?: number; awakeMinutes?: number; bedtime?: string; wakeTime?: string; score?: number }>,
): Promise<number> {
  if (nights.length === 0) return 0;
  const dates = Array.from(new Set(nights.map((n) => n.date)));
  await db.delete(sleepSessions).where(and(
    eq(sleepSessions.clientId, clientId), eq(sleepSessions.source, source), inArray(sleepSessions.date, dates)));
  await db.insert(sleepSessions).values(nights.map((n) => ({
    clientId, date: n.date, source,
    totalMinutes: Math.round(n.totalMinutes),
    deepMinutes: n.deepMinutes != null ? Math.round(n.deepMinutes) : null,
    remMinutes: n.remMinutes != null ? Math.round(n.remMinutes) : null,
    lightMinutes: n.lightMinutes != null ? Math.round(n.lightMinutes) : null,
    awakeMinutes: n.awakeMinutes != null ? Math.round(n.awakeMinutes) : null,
    bedtime: n.bedtime ?? null, wakeTime: n.wakeTime ?? null, score: n.score ?? null,
  })));
  return nights.length;
}

export type { MetricDef };
