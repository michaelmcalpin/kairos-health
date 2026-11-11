/**
 * Today's one-line insight — rule-based, no AI, never invents data.
 *
 * Picks the single most notable thing from the client's own numbers:
 *   1. a fresh reading (last night / today) that differs clearly from the
 *      client's own normal (the rest of their last 30 days);
 *   2. otherwise their 7-day step average vs their 30-day normal;
 *   3. otherwise their strongest / weakest LifeScore measure;
 *   4. otherwise null, and the UI says why there's nothing to show.
 *
 * Time of day changes only the wording (greeting), never which fact is shown.
 */

/** The subset of MetricSummary (server/services/health-metrics) this needs. */
export interface InsightMetric {
  key: string;
  label: string;
  unit: string;
  decimals: number;
  latest: number | null;
  latestDate: string | null;
  avg7: number | null;
  avg30: number | null;
  /** Last 30 days, oldest first; null where no data. */
  series: Array<number | null>;
}

export interface InsightScoreRef { key: string; label: string; score: number }

export interface InsightInput {
  metrics: InsightMetric[];
  /** "YYYY-MM-DD", the client's local date. */
  today: string;
  /** Local hour 0–23. */
  hour: number;
  strengths?: InsightScoreRef[];
  focus?: InsightScoreRef[];
}

export interface Insight {
  /** Full sentence for display. */
  text: string;
  /** Which rule produced it (for tests / analytics). */
  kind: "deviation" | "steps_trend" | "strength" | "focus";
  metricKey: string | null;
  /** Where "see more" should go. */
  href: string;
}

export type DayPart = "morning" | "afternoon" | "evening";

export function dayPart(hour: number): DayPart {
  if (hour >= 4 && hour < 12) return "morning";
  if (hour >= 12 && hour < 18) return "afternoon";
  return "evening";
}

const GREETING: Record<DayPart, string> = {
  morning: "Good morning.",
  afternoon: "Good afternoon.",
  evening: "Good evening.",
};

/** Minimum days of history before we talk about "your normal". */
export const MIN_BASELINE_DAYS = 7;

interface Rule {
  key: string;
  /** Relative change needed to be worth mentioning. */
  threshold: number;
  /** Page with the detail. */
  href: string;
  /** How fresh the reading must be (days before today, inclusive). */
  maxAgeDays: number;
  format: (v: number) => string;
  /** Sentence for this metric. `when` is e.g. "last night". */
  sentence: (latest: string, normal: string, when: string, pct: number) => string;
}

const hours = (min: number) => `${(min / 60).toFixed(1)} h`;
const whole = (unit: string) => (v: number) => `${Math.round(v)} ${unit}`;

const RULES: Rule[] = [
  {
    key: "sleep_total_min", threshold: 0.1, href: "/sleep", maxAgeDays: 1, format: hours,
    sentence: (l, n, when) => `Sleep ${l} ${when} vs ${n} your normal.`,
  },
  {
    key: "hrv", threshold: 0.12, href: "/sleep", maxAgeDays: 1, format: whole("ms"),
    sentence: (l, n, when, pct) => `HRV ${l} ${when}, ${Math.abs(pct)}% ${pct > 0 ? "above" : "below"} your normal of ${n}.`,
  },
  {
    key: "resting_hr", threshold: 0.06, href: "/health-data", maxAgeDays: 1, format: whole("bpm"),
    sentence: (l, n, when) => `Resting heart rate ${l} ${when} vs ${n} your normal.`,
  },
];

function shiftDay(d: string, delta: number): string {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to + "T00:00:00Z") - Date.parse(from + "T00:00:00Z")) / 86400000);
}

/** Mean of the series excluding the most recent value; null if too little history. */
export function baselineExcludingLatest(series: Array<number | null>): number | null {
  let lastIdx = -1;
  for (let i = series.length - 1; i >= 0; i--) {
    if (series[i] != null) { lastIdx = i; break; }
  }
  if (lastIdx < 0) return null;
  const rest = series.filter((v, i): v is number => v != null && i !== lastIdx);
  if (rest.length < MIN_BASELINE_DAYS) return null;
  return rest.reduce((a, b) => a + b, 0) / rest.length;
}

function whenLabel(key: string, latestDate: string, today: string): string {
  const age = daysBetween(latestDate, today);
  if (key.startsWith("sleep") || key === "hrv") return age <= 1 ? "last night" : `on ${latestDate}`;
  return age === 0 ? "today" : age === 1 ? "yesterday" : `on ${latestDate}`;
}

interface Candidate { insight: Omit<Insight, "text">; body: string; magnitude: number }

function deviationCandidates(input: InsightInput): Candidate[] {
  const out: Candidate[] = [];
  const byKey = new Map(input.metrics.map((m) => [m.key, m]));
  for (const rule of RULES) {
    const m = byKey.get(rule.key);
    if (!m || m.latest == null || !m.latestDate) continue;
    const age = daysBetween(m.latestDate, input.today);
    if (age < 0 || age > rule.maxAgeDays) continue;
    const normal = baselineExcludingLatest(m.series);
    if (normal == null || normal === 0) continue;
    const rel = (m.latest - normal) / Math.abs(normal);
    if (Math.abs(rel) < rule.threshold) continue;
    const pct = Math.round(rel * 100);
    out.push({
      insight: { kind: "deviation", metricKey: m.key, href: rule.href },
      body: rule.sentence(rule.format(m.latest), rule.format(normal), whenLabel(m.key, m.latestDate, input.today), pct),
      // Rank by how far past its own threshold each metric is.
      magnitude: Math.abs(rel) / rule.threshold,
    });
  }
  return out.sort((a, b) => b.magnitude - a.magnitude);
}

function stepsCandidate(input: InsightInput): Candidate | null {
  const m = input.metrics.find((x) => x.key === "steps");
  if (!m || m.avg7 == null || !m.latestDate) return null;
  if (daysBetween(m.latestDate, input.today) > 2) return null;
  const all = m.series.filter((v): v is number => v != null);
  if (all.length < MIN_BASELINE_DAYS + 3) return null;
  // Normal = the days before the last week.
  const older = m.series.slice(0, Math.max(0, m.series.length - 7)).filter((v): v is number => v != null);
  if (older.length < MIN_BASELINE_DAYS) return null;
  const normal = older.reduce((a, b) => a + b, 0) / older.length;
  if (normal <= 0) return null;
  const rel = (m.avg7 - normal) / normal;
  if (Math.abs(rel) < 0.15) return null;
  const fmt = (v: number) => Math.round(v).toLocaleString("en-US");
  return {
    insight: { kind: "steps_trend", metricKey: "steps", href: "/workouts" },
    body: `Steps this week average ${fmt(m.avg7)} a day vs ${fmt(normal)} your normal.`,
    magnitude: Math.abs(rel) / 0.15,
  };
}

/** Choose today's insight, or null when the data can't support one. */
export function selectInsight(input: InsightInput): Insight | null {
  const greet = GREETING[dayPart(input.hour)];
  const pick = deviationCandidates(input)[0] ?? stepsCandidate(input);
  if (pick) return { ...pick.insight, text: `${greet} ${pick.body}` };

  const strength = input.strengths?.[0];
  if (strength) {
    return {
      kind: "strength", metricKey: strength.key, href: "/lifescore",
      text: `${greet} Your strongest area this week: ${strength.label} (score ${strength.score}).`,
    };
  }
  const focus = input.focus?.[0];
  if (focus) {
    return {
      kind: "focus", metricKey: focus.key, href: "/lifescore",
      text: `${greet} The area with most room to improve this week: ${focus.label} (score ${focus.score}).`,
    };
  }
  return null;
}

// Re-exported for tests that build series.
export const _internal = { shiftDay, daysBetween };
