/**
 * Pure math behind the metric trend charts: personal baseline band, target
 * band, Day / Week / Month bucketing and the KPI strip. Missing days stay
 * null — a chart never draws a zero for "no data".
 */
import { METRIC_BY_KEY } from "@/lib/health/metrics";

export interface DailyPoint { date: string; value: number | null; source?: string | null }

export type TrendRange = "day" | "week" | "month";

export const RANGE_OPTIONS: Array<{ key: TrendRange; label: string; caption: string }> = [
  { key: "day", label: "Day", caption: "Daily values, last 30 days" },
  { key: "week", label: "Week", caption: "Weekly averages, last 12 weeks" },
  { key: "month", label: "Month", caption: "Monthly averages, last 12 months" },
];

/** Days of history each range needs (the Day view also covers the 30-day baseline). */
export const RANGE_DAYS: Record<TrendRange, number> = { day: 30, week: 84, month: 365 };

export function shiftDay(d: string, delta: number): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

const finite = (v: number | null | undefined): v is number => v != null && Number.isFinite(v);
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;

/** Linear-interpolated quantile of a sorted array (q in 0–1). */
export function quantile(sorted: number[], q: number): number {
  if (sorted.length === 0) return NaN;
  const pos = (sorted.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
}

export interface Band { low: number; high: number }
export interface Baseline extends Band { mean: number; n: number; method: "sd" | "iqr" }

/** Fewer days than this and there is no "normal" to show yet. */
export const MIN_BASELINE_DAYS = 7;

/**
 * The client's own 30-day normal: mean ± 1 SD (default) or p25–p75, over the
 * 30 days ending at `endDate`. Null with fewer than MIN_BASELINE_DAYS values.
 */
export function baselineBand(
  points: DailyPoint[],
  endDate: string,
  opts: { days?: number; method?: "sd" | "iqr"; minDays?: number } = {},
): Baseline | null {
  const days = opts.days ?? 30;
  const method = opts.method ?? "sd";
  const start = shiftDay(endDate, -(days - 1));
  const vals = points
    .filter((p) => p.date >= start && p.date <= endDate)
    .map((p) => p.value)
    .filter(finite);
  if (vals.length < (opts.minDays ?? MIN_BASELINE_DAYS)) return null;
  const m = mean(vals);
  if (method === "iqr") {
    const s = [...vals].sort((a, b) => a - b);
    return { low: quantile(s, 0.25), high: quantile(s, 0.75), mean: m, n: vals.length, method };
  }
  // Sample SD (n − 1).
  const sd = Math.sqrt(vals.reduce((a, v) => a + (v - m) ** 2, 0) / (vals.length - 1));
  return { low: m - sd, high: m + sd, mean: m, n: vals.length, method };
}

/** Target band from the metric catalog. One-sided targets leave the other side open (null). */
export function targetBand(metricKey: string): { low: number | null; high: number | null } | null {
  const t = METRIC_BY_KEY[metricKey]?.target;
  if (!t) return null;
  switch (t.kind) {
    case "range": return { low: t.low, high: t.high };
    case "higher": return { low: t.good, high: null };
    case "lower": return { low: null, high: t.good };
    default: return null;
  }
}

export interface Bucket {
  /** First day of the bucket (YYYY-MM-DD). */
  start: string;
  end: string;
  label: string;
  /** Mean of the days that have data; null when none do. */
  value: number | null;
  /** Days with data. */
  n: number;
  /** Source of the single value, Day view only. */
  source?: string | null;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const dayLabel = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

/** Monday of the ISO week containing `d`. */
export function weekStart(d: string): string {
  const dt = new Date(d + "T00:00:00Z");
  const dow = (dt.getUTCDay() + 6) % 7; // Mon = 0
  return shiftDay(d, -dow);
}

export function bucketSeries(points: DailyPoint[], range: TrendRange, endDate: string): Bucket[] {
  const byDate = new Map<string, DailyPoint>();
  for (const p of points) if (finite(p.value)) byDate.set(p.date, p);

  const agg = (start: string, end: string, label: string): Bucket => {
    const vals: number[] = [];
    for (let d = start; d <= end; d = shiftDay(d, 1)) {
      const v = byDate.get(d)?.value;
      if (finite(v)) vals.push(v);
    }
    return { start, end, label, value: vals.length ? mean(vals) : null, n: vals.length };
  };

  if (range === "day") {
    const out: Bucket[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = shiftDay(endDate, -i);
      const p = byDate.get(d);
      out.push({ start: d, end: d, label: dayLabel(d), value: p && finite(p.value) ? p.value : null, n: p ? 1 : 0, source: p?.source ?? null });
    }
    return out;
  }
  if (range === "week") {
    const out: Bucket[] = [];
    const last = weekStart(endDate);
    for (let i = 11; i >= 0; i--) {
      const s = shiftDay(last, -7 * i);
      const e = shiftDay(s, 6) > endDate ? endDate : shiftDay(s, 6);
      out.push(agg(s, e, dayLabel(s)));
    }
    return out;
  }
  const out: Bucket[] = [];
  const y = Number(endDate.slice(0, 4));
  const m = Number(endDate.slice(5, 7)) - 1;
  for (let i = 11; i >= 0; i--) {
    const dt = new Date(Date.UTC(y, m - i, 1));
    const s = dt.toISOString().slice(0, 10);
    const next = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 1));
    const lastDay = shiftDay(next.toISOString().slice(0, 10), -1);
    const e = lastDay > endDate ? endDate : lastDay;
    const label = MONTHS[dt.getUTCMonth()] + (dt.getUTCMonth() === 0 ? ` ${String(dt.getUTCFullYear()).slice(2)}` : "");
    out.push(agg(s, e, label));
  }
  return out;
}

export interface TrendStats {
  latest: number | null;
  latestDate: string | null;
  avg7: number | null;
  avg30: number | null;
  /** Share of the last 30 days with data that were inside the target band, 0–100. */
  inTargetPct: number | null;
  daysWithData30: number;
}

export function trendStats(points: DailyPoint[], endDate: string, target?: { low: number | null; high: number | null } | null): TrendStats {
  const s30 = shiftDay(endDate, -29);
  const s7 = shiftDay(endDate, -6);
  const inWin = points.filter((p) => finite(p.value) && p.date <= endDate);
  const last30 = inWin.filter((p) => p.date >= s30).map((p) => p.value as number);
  const last7 = inWin.filter((p) => p.date >= s7).map((p) => p.value as number);
  let latest: DailyPoint | null = null;
  for (const p of inWin) if (!latest || p.date > latest.date) latest = p;
  let inTargetPct: number | null = null;
  if (target && (target.low != null || target.high != null) && last30.length) {
    const hit = last30.filter((v) => (target.low == null || v >= target.low) && (target.high == null || v <= target.high)).length;
    inTargetPct = Math.round((hit / last30.length) * 100);
  }
  return {
    latest: latest ? (latest.value as number) : null,
    latestDate: latest?.date ?? null,
    avg7: last7.length ? mean(last7) : null,
    avg30: last30.length ? mean(last30) : null,
    inTargetPct,
    daysWithData30: last30.length,
  };
}

/** ~`count` evenly spaced "nice" ticks covering [min, max]. */
export function niceTicks(min: number, max: number, count = 4): number[] {
  if (!Number.isFinite(min) || !Number.isFinite(max)) return [];
  if (min === max) { min -= 1; max += 1; }
  const raw = (max - min) / Math.max(1, count);
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((k) => k * mag).find((s) => s >= raw) ?? 10 * mag;
  const start = Math.floor(min / step) * step;
  const out: number[] = [];
  for (let i = 0; i < 50; i++) {
    const v = Math.round((start + i * step) * 1e6) / 1e6;
    out.push(v);
    if (v >= max) break;
  }
  return out;
}
