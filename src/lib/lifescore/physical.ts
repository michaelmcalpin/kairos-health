/**
 * LifeScore™ Physical score (0–100).
 *
 * Four parts, each 0–100, blended by weight. A part with no data drops out
 * and the rest re-balance, so missing data never counts as a low score.
 *
 *   Health data   55%  Daily numbers from Oura, Apple Health and other devices
 *                      (sleep, heart, activity, vitals, mobility), workouts,
 *                      progress on weight / body-fat goals, protein and
 *                      calories vs the coach's meal plan (see extras.ts),
 *                      plus how the client says their body feels.
 *   Labs          20%  Latest result per biomarker vs its reference range.
 *   Medications   15%  Taking prescribed medicines, supplements and peptides as planned.
 *   Genetics      10%  Follow-through, not "good vs bad genes": for each changed
 *                      gene, were its linked labs checked in the past year and are
 *                      they in range? Two-copy changes count double.
 */
import { and, eq, gte, lte, inArray, desc } from "drizzle-orm";

import type { db as DB } from "@/server/db";
import {
  labResults, biomarkerValues, biomarkerDefinitions, geneticProfiles, geneticMarkers,
  supplementProtocols, protocolItems, adherenceLogs, healthGoals, mealPlans, mealLogs,
} from "@/server/db/schema";
import { METRICS, scoreMetric } from "@/lib/health/metrics";
import { loadDailyMetrics, recentWorkouts, type MetricSeries } from "@/server/services/health-metrics";
import {
  scoreWorkouts, scoreBodyGoals, scoreNutrition,
  type WeightedScore, type NutritionDay, type MacroTargets,
} from "./extras";
import { interpretMarkers } from "@/lib/genetics/interpret";

export type PhysicalPartKey = "health_data" | "labs" | "medications" | "genetics";

export const PHYSICAL_WEIGHTS: Record<PhysicalPartKey, number> = {
  health_data: 55, labs: 20, medications: 15, genetics: 10,
};

export const PHYSICAL_LABELS: Record<PhysicalPartKey, string> = {
  health_data: "Health data", labs: "Labs", medications: "Medications & supplements", genetics: "Genetics follow-through",
};

export interface PhysicalPart {
  key: PhysicalPartKey;
  label: string;
  score: number | null;
  /** Normalized weight among parts that have data (0–100). */
  weight: number;
  /** Short plain-words line, e.g. "12 of 15 labs in range". */
  detail: string | null;
}

export interface MetricScore { key: string; label: string; value: number; score: number }

export interface PhysicalResult {
  score: number | null;
  /** Health-data sub-score over the 30-day baseline window (for sentiment). */
  baselineHealthScore: number | null;
  parts: PhysicalPart[];
  /** Scored health metrics, lowest first, so the UI can show what to work on. */
  metrics: MetricScore[];
}

const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function shift(d: string, delta: number) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

// ── Health data ────────────────────────────────────────────────────────────

/**
 * Score every target-bearing metric: its average over the window, against its
 * target (or the client's own 30-day normal for HRV-style metrics).
 */
export function scoreHealthData(series: MetricSeries, endDate: string, windowDays: number): { score: number | null; metrics: MetricScore[]; weightSum: number } {
  const from = shift(endDate, -(windowDays - 1));
  const baseFrom = shift(endDate, -29);
  const metrics: MetricScore[] = [];
  let wSum = 0;
  let sSum = 0;
  for (const def of METRICS) {
    if (!def.target || !def.weight) continue;
    const byDate = series.get(def.key);
    if (!byDate) continue;
    const win: number[] = [];
    const base: number[] = [];
    byDate.forEach((v, d) => {
      if (d >= from && d <= endDate) win.push(v.value);
      if (d >= baseFrom && d <= endDate) base.push(v.value);
    });
    const avg = mean(win);
    if (avg == null) continue;
    const s = scoreMetric(def, avg, mean(base));
    if (s == null) continue;
    metrics.push({ key: def.key, label: def.label, value: avg, score: clamp(s) });
    wSum += def.weight;
    sSum += s * def.weight;
  }
  metrics.sort((a, b) => a.score - b.score);
  return { score: wSum > 0 ? clamp(sSum / wSum) : null, metrics, weightSum: wSum };
}

/** Add plan-based extras (workouts, body goals, nutrition) to the device score. */
export function blendExtras(
  base: { score: number | null; metrics: MetricScore[]; weightSum: number },
  extras: WeightedScore[],
): { score: number | null; metrics: MetricScore[] } {
  let wSum = base.score != null ? base.weightSum : 0;
  let sSum = base.score != null ? base.score * base.weightSum : 0;
  for (const e of extras) { wSum += e.weight; sSum += e.score * e.weight; }
  const metrics = [...base.metrics, ...extras.map(({ key, label, value, score }) => ({ key, label, value, score }))]
    .sort((a, b) => a.score - b.score);
  return { score: wSum > 0 ? clamp(sSum / wSum) : null, metrics };
}

/** Latest value per metric within the series (for slow-moving body measures). */
export function latestValues(series: MetricSeries, keys: string[], endDate: string): Map<string, number> {
  const out = new Map<string, number>();
  for (const k of keys) {
    const byDate = series.get(k);
    if (!byDate) continue;
    let best: string | null = null;
    byDate.forEach((_, d) => { if (d <= endDate && (best == null || d > best)) best = d; });
    if (best) out.set(k, byDate.get(best)!.value);
  }
  return out;
}

// ── Labs ───────────────────────────────────────────────────────────────────

export interface LabValue { code: string; name: string; value: number; refLow: number | null; refHigh: number | null; status: string | null }

/** 100 inside the reference range, falling off the further outside it is. */
export function scoreLab(l: LabValue): number | null {
  const { value, refLow, refHigh } = l;
  if (refLow != null || refHigh != null) {
    const lo = refLow ?? -Infinity;
    const hi = refHigh ?? Infinity;
    if (value >= lo && value <= hi) return 100;
    const width = refLow != null && refHigh != null && refHigh > refLow
      ? refHigh - refLow
      : Math.max(Math.abs(refHigh ?? refLow ?? value) * 0.25, 1e-6);
    const dist = value < lo ? lo - value : value - hi;
    return clamp(100 - (dist / width) * 200);
  }
  const s = (l.status ?? "").toLowerCase();
  if (!s) return null;
  if (/optimal|normal|in.?range|ok/.test(s)) return 100;
  if (/border/.test(s)) return 65;
  if (/critical|panic/.test(s)) return 10;
  if (/high|low|abnormal|out/.test(s)) return 35;
  return null;
}

/** Keyword families that link a gene's recommended lab text to a biomarker. */
const LAB_FAMILIES: Array<[string, RegExp]> = [
  ["homocysteine", /homocyst/], ["b12", /\bb12\b|cobalamin|holotrans/], ["mma", /\bmma\b|methylmalon/],
  ["folate", /folate|folic/], ["crp", /\bcrp\b|hs.?crp|c.?reactive/], ["il6", /\bil.?6\b/],
  ["glucose", /glucose/], ["insulin", /insulin|homa/], ["a1c", /a1c/], ["triglycerides", /triglycer/],
  ["apob", /apo.?b/], ["lpa", /lp\s?\(a\)|lipoprotein.?\(a\)|\blpa\b/], ["ldl", /\bldl/],
  ["vitamin_d", /vitamin.?d|25.?oh|\bvit.?d\b/], ["ferritin", /ferritin|\biron\b/],
  ["thyroid", /\btsh\b|thyroid|free.?t[34]|\bft[34]\b|reverse.?t3|\brt3\b/],
  ["testosterone", /testosterone/], ["shbg", /shbg/], ["estrogen", /estr/],
  ["omega3", /omega/], ["magnesium", /magnesium/], ["glutathione", /glutathione/],
  ["liver", /liver|\balt\b|\bast\b|\bggt\b/], ["kidney", /kidney|creatinine|egfr|\bbmp\b|\bbun\b/],
  ["cbc", /\bcbc\b|\bwbc\b|platelet|hematocrit|eosinophil|lymphocyte/], ["sed_rate", /sed(imentation)?.?rate|\besr\b/],
];

export function labFamilies(text: string): string[] {
  const t = text.toLowerCase().replace(/_/g, " ");
  return LAB_FAMILIES.filter(([, re]) => re.test(t)).map(([k]) => k);
}

export function scoreLabs(labs: LabValue[]): { score: number | null; inRange: number; total: number } {
  const scores = labs.map(scoreLab).filter((s): s is number => s != null);
  return {
    score: scores.length ? clamp(mean(scores)!) : null,
    inRange: scores.filter((s) => s === 100).length,
    total: scores.length,
  };
}

// ── Genetics follow-through ────────────────────────────────────────────────

export interface ChangedGene { gene: string; strength: "one" | "two"; labs: string[] }

/**
 * For each changed gene: half credit for having its linked labs checked,
 * half for those labs being in range. Genes with no linkable lab are skipped.
 */
export function scoreGenetics(genes: ChangedGene[], labs: LabValue[]): { score: number | null; covered: number; linked: number } {
  const byFamily = new Map<string, number[]>();
  for (const l of labs) {
    const s = scoreLab(l);
    if (s == null) continue;
    for (const f of labFamilies(`${l.code} ${l.name}`)) {
      const arr = byFamily.get(f) ?? [];
      arr.push(s);
      byFamily.set(f, arr);
    }
  }
  let wSum = 0, sSum = 0, linked = 0, covered = 0;
  for (const g of genes) {
    const fams = Array.from(new Set(g.labs.flatMap(labFamilies)));
    if (fams.length === 0) continue;
    linked++;
    const tested = fams.filter((f) => byFamily.has(f));
    if (tested.length > 0) covered++;
    const coverage = tested.length / fams.length;
    const inRange = tested.length ? mean(tested.map((f) => mean(byFamily.get(f)!)!))! / 100 : 0;
    const w = g.strength === "two" ? 2 : 1;
    wSum += w;
    sSum += w * (50 * coverage + 50 * inRange);
  }
  return { score: wSum > 0 ? clamp(sSum / wSum) : null, covered, linked };
}

// ── Medications & supplements ──────────────────────────────────────────────

export interface AdherenceInput {
  items: Array<{ id: string; frequency: string | null }>;
  logs: Array<{ protocolItemId: string; date: string; takenAt: Date | null; skipped: boolean | null }>;
  days: string[];
}

const DAILY_RE = /daily|day|\bam\b|\bpm\b|morning|evening|night|bed|bid|tid|twice|three times|every \d+ ?h|with (meals|food)/i;

/**
 * Daily items: doses taken ÷ days. Other schedules (weekly peptides, as
 * needed): taken ÷ logged, so an unlogged non-daily day isn't a miss.
 */
export function scoreAdherence({ items, logs, days }: AdherenceInput): { score: number | null; taken: number; expected: number } {
  if (items.length === 0) return { score: null, taken: 0, expected: 0 };
  const daySet = new Set(days);
  let taken = 0, expected = 0;
  for (const it of items) {
    const mine = logs.filter((l) => l.protocolItemId === it.id && daySet.has(l.date));
    const tookDays = new Set(mine.filter((l) => l.takenAt && !l.skipped).map((l) => l.date)).size;
    const isDaily = !it.frequency || DAILY_RE.test(it.frequency);
    taken += tookDays;
    expected += isDaily ? days.length : new Set(mine.map((l) => l.date)).size;
  }
  if (expected === 0) return { score: null, taken, expected };
  return { score: clamp((taken / expected) * 100), taken, expected };
}

// ── Combine ────────────────────────────────────────────────────────────────

export function combineParts(parts: Array<Omit<PhysicalPart, "weight">>): { score: number | null; parts: PhysicalPart[] } {
  const scored = parts.filter((p) => p.score != null);
  const total = scored.reduce((s, p) => s + PHYSICAL_WEIGHTS[p.key], 0);
  const score = total > 0
    ? clamp(scored.reduce((s, p) => s + (p.score as number) * PHYSICAL_WEIGHTS[p.key], 0) / total)
    : null;
  return {
    score,
    parts: parts.map((p) => ({
      ...p,
      weight: p.score != null && total > 0 ? Math.round((PHYSICAL_WEIGHTS[p.key] / total) * 100) : 0,
    })),
  };
}

/** Load everything and compute the Physical score as of endDate. */
export async function computePhysical(
  db: typeof DB,
  clientId: string,
  endDate: string,
  opts: { windowDays: number; feelScores: number[]; series?: MetricSeries },
): Promise<PhysicalResult & { extras: WeightedScore[] }> {
  const yearAgo = new Date(endDate + "T00:00:00Z");
  yearAgo.setUTCFullYear(yearAgo.getUTCFullYear() - 1);
  const days14: string[] = [];
  for (let i = 0; i < 14; i++) days14.push(shift(endDate, -i));

  const safe = <T,>(p: Promise<T>, fallback: T) => p.catch(() => fallback);

  const sinceWorkouts = new Date(shift(endDate, -59) + "T00:00:00Z");
  const [series, labRows, defs, profile, protocols, workouts, goals, plan, meals] = await Promise.all([
    opts.series ? Promise.resolve(opts.series) : safe(loadDailyMetrics(db, clientId, shift(endDate, -89), endDate), new Map() as MetricSeries),
    safe(db.select({
      code: biomarkerValues.biomarkerCode, value: biomarkerValues.value, refLow: biomarkerValues.refLow,
      refHigh: biomarkerValues.refHigh, status: biomarkerValues.status, receivedAt: labResults.receivedAt,
    }).from(biomarkerValues)
      .innerJoin(labResults, eq(biomarkerValues.resultId, labResults.id))
      .where(and(eq(labResults.clientId, clientId), gte(labResults.receivedAt, yearAgo)))
      .orderBy(desc(labResults.receivedAt)), []),
    safe(db.select({ code: biomarkerDefinitions.code, name: biomarkerDefinitions.name }).from(biomarkerDefinitions), []),
    safe(db.select().from(geneticProfiles).where(eq(geneticProfiles.clientId, clientId))
      .orderBy(desc(geneticProfiles.createdAt)).limit(1).then((r) => r[0]), undefined),
    safe(db.select({ id: supplementProtocols.id }).from(supplementProtocols)
      .where(and(eq(supplementProtocols.clientId, clientId), eq(supplementProtocols.status, "active"))), []),
    safe(recentWorkouts(db, clientId, sinceWorkouts, 300), []),
    safe(db.select().from(healthGoals)
      .where(and(eq(healthGoals.clientId, clientId), eq(healthGoals.status, "active"), inArray(healthGoals.category, ["weight", "body_fat"]))), []),
    safe(db.select({ macroTargets: mealPlans.macroTargets }).from(mealPlans)
      .where(and(eq(mealPlans.clientId, clientId), eq(mealPlans.status, "active")))
      .orderBy(desc(mealPlans.createdAt)).limit(1).then((r) => r[0]), undefined),
    safe(db.select({ date: mealLogs.date, calories: mealLogs.totalCalories, protein: mealLogs.totalProtein }).from(mealLogs)
      .where(and(eq(mealLogs.clientId, clientId), gte(mealLogs.date, shift(endDate, -6)), lte(mealLogs.date, endDate))), []),
  ]);

  // Plan-based extras: workouts, body goals, nutrition vs meal plan.
  const nutritionDays = nutritionByDay(series, meals, endDate);
  const extras: WeightedScore[] = [
    ...[scoreWorkouts(workouts, endDate)].filter((x): x is WeightedScore => x != null),
    ...scoreBodyGoals(goals, latestValues(series, ["weight", "body_fat"], endDate), endDate),
    ...scoreNutrition(plan?.macroTargets as MacroTargets | null | undefined, nutritionDays, endDate),
  ];

  // Health data (+ how the body feels, from check-ins).
  const health = blendExtras(scoreHealthData(series, endDate, opts.windowDays), extras);
  const baselineHealth = blendExtras(scoreHealthData(series, endDate, 30), extras);
  const feel = mean(opts.feelScores);
  let healthScore = health.score;
  if (feel != null) healthScore = healthScore == null ? clamp(feel) : clamp(healthScore * 0.85 + feel * 0.15);

  // Labs: latest value per biomarker in the past year.
  const nameByCode = new Map(defs.map((d) => [d.code, d.name]));
  const latest = new Map<string, LabValue>();
  for (const r of labRows) {
    if (latest.has(r.code)) continue;
    latest.set(r.code, { code: r.code, name: nameByCode.get(r.code) ?? r.code, value: r.value, refLow: r.refLow, refHigh: r.refHigh, status: r.status });
  }
  const labs = Array.from(latest.values());
  const labScore = scoreLabs(labs);

  // Genetics follow-through.
  let genetics: { score: number | null; covered: number; linked: number } = { score: null, covered: 0, linked: 0 };
  if (profile) {
    const markers = await safe(db.select().from(geneticMarkers).where(eq(geneticMarkers.profileId, profile.id)), []);
    const changed: ChangedGene[] = interpretMarkers(markers.map((m) => ({
      gene: m.gene, rsId: m.rsId, section: m.section, mutation: m.mutation, pathway: m.pathway, function: m.function,
      clinicalPriority: m.clinicalPriority, symptoms: m.symptoms, supplementProtocol: m.supplementProtocol,
      peptideSupport: m.peptideSupport, dietStrategy: m.dietStrategy, lifestyleStrategy: m.lifestyleStrategy, labTests: m.labTests,
    })))
      .filter((g) => g.strength === "one" || g.strength === "two")
      .map((g) => ({ gene: g.gene, strength: g.strength as "one" | "two", labs: g.labs }));
    genetics = scoreGenetics(changed, labs);
  }

  // Medication & supplement adherence (last 14 days).
  let adherence: { score: number | null; taken: number; expected: number } = { score: null, taken: 0, expected: 0 };
  if (protocols.length > 0) {
    const items = await safe(db.select({ id: protocolItems.id, frequency: protocolItems.frequency }).from(protocolItems)
      .where(inArray(protocolItems.protocolId, protocols.map((p) => p.id))), []);
    const logs = items.length
      ? await safe(db.select({ protocolItemId: adherenceLogs.protocolItemId, date: adherenceLogs.date, takenAt: adherenceLogs.takenAt, skipped: adherenceLogs.skipped })
        .from(adherenceLogs)
        .where(and(eq(adherenceLogs.clientId, clientId), gte(adherenceLogs.date, days14[days14.length - 1]))), [])
      : [];
    adherence = scoreAdherence({ items, logs, days: days14 });
  }

  const combined = combineParts([
    {
      key: "health_data", label: PHYSICAL_LABELS.health_data, score: healthScore,
      detail: health.metrics.length
        ? `${health.metrics.length - extras.length} device measures${extras.length ? ` + ${extras.map((e) => e.label.toLowerCase()).join(", ")}` : ""}`
        : feel != null ? "From your check-ins" : null,
    },
    {
      key: "labs", label: PHYSICAL_LABELS.labs, score: labScore.score,
      detail: labScore.total ? `${labScore.inRange} of ${labScore.total} labs in range` : null,
    },
    {
      key: "medications", label: PHYSICAL_LABELS.medications, score: adherence.score,
      detail: adherence.expected ? `${adherence.taken} of ${adherence.expected} doses taken (14 days)` : null,
    },
    {
      key: "genetics", label: PHYSICAL_LABELS.genetics, score: genetics.score,
      detail: genetics.linked ? `Labs checked for ${genetics.covered} of ${genetics.linked} changed genes` : null,
    },
  ]);

  return {
    score: combined.score,
    baselineHealthScore: baselineHealth.score,
    parts: combined.parts,
    metrics: health.metrics,
    extras,
  };
}

/**
 * Daily calories + protein for the last 7 days: in-app meal logs when the
 * client logged meals that day, otherwise what Apple Health has.
 */
export function nutritionByDay(
  series: MetricSeries,
  meals: Array<{ date: string; calories: number | null; protein: number | null }>,
  endDate: string,
): NutritionDay[] {
  const fromApp = new Map<string, { calories: number; protein: number }>();
  for (const m of meals) {
    const d = fromApp.get(m.date) ?? { calories: 0, protein: 0 };
    d.calories += m.calories ?? 0;
    d.protein += m.protein ?? 0;
    fromApp.set(m.date, d);
  }
  const out: NutritionDay[] = [];
  for (let i = 0; i < 7; i++) {
    const date = shift(endDate, -i);
    const app = fromApp.get(date);
    if (app && app.calories > 0) { out.push({ date, calories: app.calories, protein: app.protein || null }); continue; }
    const kcal = series.get("diet_kcal")?.get(date)?.value ?? null;
    const protein = series.get("diet_protein")?.get(date)?.value ?? null;
    if (kcal != null || protein != null) out.push({ date, calories: kcal, protein });
  }
  return out;
}
