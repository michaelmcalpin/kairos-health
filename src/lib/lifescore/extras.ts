/**
 * Extra LifeScore inputs that are scored against the client's own plan,
 * not a fixed target:
 *
 *  - Workouts      sessions per week (last 4 weeks) and variety of activities.
 *  - Body goals    progress on an active weight / body-fat goal, by pace when
 *                  the goal has a target date.
 *  - Nutrition     protein and calories vs the coach's meal-plan targets, on
 *                  days food was actually logged.
 *  - Mindfulness   mindful minutes give a small bonus to the Mind area
 *                  (never a penalty: not meditating isn't "low mental health").
 *
 * Each returns null when there is nothing to judge, so missing data never
 * counts as a low score. Pure functions; loading happens in physical.ts.
 */
import type { MetricScore } from "./physical";

const clamp = (n: number) => Math.round(Math.max(0, Math.min(100, n)));
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null);

function shift(d: string, delta: number) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** A scored extra plus its weight inside the Health data part. */
export interface WeightedScore extends MetricScore { weight: number; detail?: string }

// ── Workouts ───────────────────────────────────────────────────────────────

export interface WorkoutInput { activity: string; startAt: Date | string; durationMin: number | null }

export const WORKOUT_GOOD_PER_WEEK = 4;

/**
 * 80% frequency (0 → 0, 4+ per week → 100) + 20% variety (1 type → 0,
 * 3+ types → 100) over the 28 days to endDate. Workouts under 10 minutes
 * don't count. Only scored for people who record workouts at all (any in
 * the last 60 days); otherwise exercise minutes already cover activity.
 */
export function scoreWorkouts(workouts: WorkoutInput[], endDate: string): WeightedScore | null {
  const end = new Date(endDate + "T23:59:59Z").getTime();
  const from28 = new Date(shift(endDate, -27) + "T00:00:00Z").getTime();
  const from60 = new Date(shift(endDate, -59) + "T00:00:00Z").getTime();
  const at = (w: WorkoutInput) => new Date(w.startAt).getTime();
  const real = workouts.filter((w) => (w.durationMin ?? 0) >= 10 && at(w) <= end);
  if (!real.some((w) => at(w) >= from60)) return null;

  const recent = real.filter((w) => at(w) >= from28);
  const perWeek = recent.length / 4;
  const types = new Set(recent.map((w) => w.activity.toLowerCase())).size;
  const freq = Math.min(1, perWeek / WORKOUT_GOOD_PER_WEEK) * 100;
  const variety = types <= 1 ? 0 : Math.min(1, (types - 1) / 2) * 100;
  return {
    key: "workouts_per_week",
    label: "Workouts per week",
    value: Math.round(perWeek * 10) / 10,
    score: clamp(freq * 0.8 + variety * 0.2),
    weight: 2,
    detail: `${perWeek.toFixed(1)} a week, ${types} type${types === 1 ? "" : "s"} (4 weeks)`,
  };
}

// ── Body composition goals ─────────────────────────────────────────────────

export interface BodyGoalInput {
  category: string;              // "weight" | "body_fat" | …
  title: string;
  targetValue: number;
  targetUnit: string;
  targetDirection: string;       // increase | decrease | maintain | reach
  startValue: number;
  currentValue: number;
  startDate: string;
  targetDate: string | null;
}

/** Goal category → stored device metric. */
const BODY_METRIC: Record<string, string> = { weight: "weight", body_fat: "body_fat" };

/** Device value (stored in lb / %) in the goal's unit. */
function toGoalUnit(category: string, value: number, unit: string): number {
  if (category === "weight" && /kg|kilo/i.test(unit)) return value * 0.45359237;
  return value;
}

/**
 * Score one goal. Progress p = share of the way from start to target
 * (negative = moved the wrong way).
 *  - Maintain: 100 within 2% of target, 0 at 8% away.
 *  - With a target date: 30 at the start, 100 when on pace or ahead.
 *  - Without one: 50 at the start, 100 when reached.
 * Going the wrong way drops toward 0.
 */
export function scoreBodyGoal(goal: BodyGoalInput, current: number, today: string): number | null {
  const { startValue: start, targetValue: target } = goal;
  if (!Number.isFinite(current) || !Number.isFinite(target)) return null;

  if (goal.targetDirection === "maintain" || start === target) {
    const off = Math.abs(current - target) / Math.max(Math.abs(target), 1e-6);
    return clamp(100 - Math.max(0, off - 0.02) / 0.06 * 100);
  }
  const p = (current - start) / (target - start);
  if (p >= 1) return 100;

  let expected: number | null = null;
  if (goal.targetDate && goal.targetDate > goal.startDate) {
    const t0 = Date.parse(goal.startDate), t1 = Date.parse(goal.targetDate), now = Date.parse(today);
    expected = Math.max(0, Math.min(1, (now - t0) / (t1 - t0)));
  }
  if (p < 0) {
    const floor = expected != null && expected > 0.05 ? 30 : 50;
    return clamp(floor * (1 + p));
  }
  if (expected != null && expected > 0.05) return clamp(30 + 70 * Math.min(1, p / expected));
  return clamp(50 + 50 * p);
}

/**
 * Score active weight / body-fat goals using the latest device reading in
 * the window, or the goal's own current value when no device has one.
 */
export function scoreBodyGoals(
  goals: BodyGoalInput[],
  latestByMetric: Map<string, number>,
  today: string,
): WeightedScore[] {
  const out: WeightedScore[] = [];
  for (const g of goals) {
    const metric = BODY_METRIC[g.category];
    if (!metric) continue;
    const device = latestByMetric.get(metric);
    const current = device != null ? toGoalUnit(g.category, device, g.targetUnit) : g.currentValue;
    const s = scoreBodyGoal(g, current, today);
    if (s == null) continue;
    out.push({
      key: `goal_${g.category}`,
      label: g.category === "weight" ? "Weight goal" : "Body fat goal",
      value: Math.round(current * 10) / 10,
      score: s,
      weight: 2,
      detail: `${g.title}: ${current.toFixed(1)} now, aiming for ${g.targetValue} ${g.targetUnit}`.trim(),
    });
  }
  return out;
}

// ── Nutrition vs coach targets ─────────────────────────────────────────────

export interface MacroTargets { calories?: number | null; protein?: number | null; proteinG?: number | null }
export interface NutritionDay { date: string; calories: number | null; protein: number | null }

export const MIN_LOGGED_DAYS = 3;

/** Protein: 100 at 90%+ of target, 0 at 50%. Calories: 100 within ±10%, 0 at ±35%. */
export function scoreProteinDay(protein: number, target: number): number {
  return clamp(((protein / target - 0.5) / 0.4) * 100);
}
export function scoreCalorieDay(calories: number, target: number): number {
  const off = Math.abs(calories / target - 1);
  return clamp(100 - (Math.max(0, off - 0.1) / 0.25) * 100);
}

/**
 * Score the last 7 days against the plan. Only days with food logged count,
 * and at least 3 such days are needed (one logged snack isn't a diet).
 */
export function scoreNutrition(targets: MacroTargets | null | undefined, days: NutritionDay[], endDate: string): WeightedScore[] {
  if (!targets) return [];
  const from = shift(endDate, -6);
  const logged = days.filter((d) => d.date >= from && d.date <= endDate && (d.calories ?? 0) > 200);
  if (logged.length < MIN_LOGGED_DAYS) return [];

  const out: WeightedScore[] = [];
  const proteinTarget = targets.protein ?? targets.proteinG ?? null;
  if (proteinTarget && proteinTarget > 0) {
    const vals = logged.filter((d) => d.protein != null);
    if (vals.length >= MIN_LOGGED_DAYS) {
      const avg = mean(vals.map((d) => d.protein!))!;
      out.push({
        key: "nutrition_protein", label: "Protein vs target", value: Math.round(avg),
        score: clamp(mean(vals.map((d) => scoreProteinDay(d.protein!, proteinTarget)))!), weight: 1.5,
        detail: `${Math.round(avg)} g a day vs ${proteinTarget} g target (${vals.length} logged days)`,
      });
    }
  }
  if (targets.calories && targets.calories > 0) {
    const avg = mean(logged.map((d) => d.calories!))!;
    out.push({
      key: "nutrition_calories", label: "Calories vs target", value: Math.round(avg),
      score: clamp(mean(logged.map((d) => scoreCalorieDay(d.calories!, targets.calories!)))!), weight: 1,
      detail: `${Math.round(avg)} kcal a day vs ${targets.calories} target (${logged.length} logged days)`,
    });
  }
  return out;
}

// ── Mindfulness bonus for the Mind area ────────────────────────────────────

export const MINDFUL_MAX_BONUS = 6;
export const MINDFUL_GOOD_MIN = 10;

/**
 * Average mindful minutes a day over the 7 days to endDate → 0…+6 points on
 * Mind (10+ minutes a day = full bonus). Null when the person has logged no
 * mindful sessions in the past 30 days.
 */
export function mindfulBonus(byDate: Map<string, number> | undefined, endDate: string): { minPerDay: number; bonus: number } | null {
  if (!byDate || byDate.size === 0) return null;
  const from30 = shift(endDate, -29);
  let any = false;
  byDate.forEach((v, d) => { if (d >= from30 && d <= endDate && v > 0) any = true; });
  if (!any) return null;
  let total = 0;
  for (let i = 0; i < 7; i++) total += byDate.get(shift(endDate, -i)) ?? 0;
  const minPerDay = total / 7;
  const bonus = Math.round(Math.min(1, minPerDay / MINDFUL_GOOD_MIN) * MINDFUL_MAX_BONUS * 10) / 10;
  return { minPerDay: Math.round(minPerDay * 10) / 10, bonus };
}
