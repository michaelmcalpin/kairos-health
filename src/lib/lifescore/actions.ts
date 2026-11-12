/**
 * "How to raise your LifeScore" — concrete actions, each with an estimate of
 * how many Core points it could add, computed from the same weights the score
 * uses (Core = 60% Physical + 40% Mental; see physical.ts and score.ts).
 *
 * Estimates are "up to": the points gained if that one measure reached its
 * target (or, for a mental area, rose 15 points), everything else unchanged.
 * Pure: no DB access, so it is easy to test and the result ships with the score.
 */
import { METRIC_BY_KEY, formatMetric, type MetricDef } from "@/lib/health/metrics";
import type { PhysicalPart } from "./physical";

export interface LifeScoreAction {
  key: string;
  area: "physical" | "mental";
  title: string;
  detail: string;
  /** Estimated Core points, rounded; null when it can't be estimated (e.g. missing data). */
  gain: number | null;
  href: string;
}

export interface ActionInput {
  physicalScore: number | null;
  mentalScore: number | null;
  parts: PhysicalPart[];
  /** Scored health measures with their weight inside the Health data part. */
  metrics: Array<{ key: string; label: string; value: number; score: number; weight: number }>;
  healthWeightSum: number;
  /** Health data part is 85% devices + 15% how the body feels when check-ins exist. */
  feelBlended: boolean;
  /** Mental areas with their score and raw coach weight. */
  mentalAreas: Array<{ dimension: string; score: number | null; weight: number }>;
  mindful: { minPerDay: number; bonus: number } | null;
  mindfulMaxBonus: number;
  /** Days with at least one LifeScore rating in the last 7. */
  checkinDays7: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

/** Plain-words wording for common measures; `v` is the formatted current value. */
const METRIC_COPY: Record<string, { title: string; detail: (v: string) => string; href: string }> = {
  sleep_total_min: { title: "Sleep 7–9 hours a night", detail: (v) => `You're averaging ${v}. A steady bedtime and wake time is the quickest way up.`, href: "/sleep" },
  sleep_deep_min: { title: "Get more deep sleep", detail: (v) => `${v} a night now. Less alcohol and screens late, a cool dark room, and exercise earlier in the day help.`, href: "/sleep" },
  sleep_rem_min: { title: "Protect REM sleep", detail: (v) => `${v} a night now. A full night (REM comes late) and less late alcohol help most.`, href: "/sleep" },
  sleep_awake_min: { title: "Fewer wake-ups in the night", detail: (v) => `Awake ${v} a night. Cut late caffeine and fluids; keep the room cool and dark.`, href: "/sleep" },
  steps: { title: "Walk 9,000+ steps a day", detail: (v) => `You average ${v}. A 20-minute walk adds about 2,000.`, href: "/workouts" },
  exercise_min: { title: "Exercise 30 minutes a day", detail: (v) => `You average ${v} a day. Brisk walking counts.`, href: "/workouts" },
  stand_hours: { title: "Stand and move every hour", detail: (v) => `${v} a day now; aim for 12.`, href: "/workouts" },
  resting_hr: { title: "Lower your resting heart rate", detail: (v) => `${v} now. Regular cardio, good sleep and less alcohol bring it down over weeks.`, href: "/vitals" },
  hrv: { title: "Raise your HRV with recovery", detail: (v) => `${v} vs your normal. Sleep, hydration, easier days after hard ones and breathing practice help.`, href: "/sleep" },
  vo2max: { title: "Build cardio fitness (VO2 max)", detail: (v) => `${v} now. Two cardio sessions a week, one with hard intervals, raise it most.`, href: "/workouts" },
  readiness: { title: "Recover to raise readiness", detail: (v) => `Readiness ${v}. Sleep and lighter days after hard training lift it.`, href: "/sleep" },
  bp_systolic: { title: "Bring blood pressure under 120/80", detail: (v) => `Top number ${v}. Less salt, more walking and good sleep help; talk to your care team.`, href: "/vitals" },
  bp_diastolic: { title: "Bring blood pressure under 120/80", detail: (v) => `Bottom number ${v}. Less salt, more walking and good sleep help; talk to your care team.`, href: "/vitals" },
  glucose: { title: "Steady your blood sugar", detail: (v) => `Average ${v}. A walk after meals and protein/fiber first help.`, href: "/vitals" },
  alcoholic_drinks: { title: "Drink less alcohol", detail: (v) => `${v} a day on average. Fewer drinks also improve sleep and HRV.`, href: "/health-data" },
  daylight_min: { title: "Get an hour of daylight", detail: (v) => `${v} a day now. Morning light also helps sleep.`, href: "/health-data" },
  workouts_per_week: { title: "Work out 4 times a week, mixing types", detail: (v) => `${v} a week now. Mix cardio, strength and mobility.`, href: "/workouts" },
  nutrition_protein: { title: "Hit your protein target", detail: (v) => `About ${v} g a day now vs your plan. Add protein to breakfast first.`, href: "/nutrition" },
  nutrition_calories: { title: "Eat close to your calorie target", detail: (v) => `About ${v} kcal a day vs your plan.`, href: "/nutrition" },
  goal_weight: { title: "Keep moving toward your weight goal", detail: (v) => `${v} now. Steady, small weekly changes score best.`, href: "/goals" },
  goal_body_fat: { title: "Keep moving toward your body-fat goal", detail: (v) => `${v}% now. Strength training and protein help most.`, href: "/goals" },
};

function targetText(def: MetricDef): string {
  const t = def.target;
  if (!t || t.kind === "baseline") return "Aim for your own normal or better.";
  const f = (v: number) => formatMetric(def, v);
  if (t.kind === "higher") return `Aim for ${f(t.good)} or more.`;
  if (t.kind === "lower") return `Aim for ${f(t.good)} or less.`;
  return `Aim for ${f(t.low)}–${f(t.high)}.`;
}

const MENTAL_COPY: Record<string, { title: string; detail: string }> = {
  mind: { title: "Care for your Mind", detail: "Rest, time outdoors, a breathing practice — then rate how it went." },
  purpose: { title: "Reconnect with Purpose", detail: "Pick one meaningful goal for this week and take the first small step." },
  relationships: { title: "Invest in Relationships", detail: "Plan time with someone who matters to you this week." },
  work: { title: "Ease Work strain", detail: "Protect a block of focus time and take real breaks." },
};

export function buildLifeScoreActions(i: ActionInput): LifeScoreAction[] {
  const actions: LifeScoreAction[] = [];
  const physShare = i.physicalScore == null ? 0 : i.mentalScore == null ? 1 : 0.6;
  const mentShare = i.mentalScore == null ? 0 : i.physicalScore == null ? 1 : 0.4;
  const part = (k: string) => i.parts.find((p) => p.key === k);
  const healthW = (part("health_data")?.weight ?? 0) / 100;

  // ── Physical: each measure below target ──
  for (const m of i.metrics) {
    if (m.score >= 85 || i.healthWeightSum <= 0) continue;
    const gain = (100 - m.score) * (m.weight / i.healthWeightSum) * (i.feelBlended ? 0.85 : 1) * healthW * physShare;
    const def = METRIC_BY_KEY[m.key];
    const copy = METRIC_COPY[m.key];
    const value = def ? formatMetric(def, m.value) : String(r1(m.value));
    actions.push({
      key: `metric:${m.key}`,
      area: "physical",
      title: copy?.title ?? `Improve ${m.label.toLowerCase()}`,
      detail: copy ? copy.detail(value) : `${m.label}: ${value} now. ${def ? targetText(def) : ""}`.trim(),
      gain: r1(gain),
      href: copy?.href ?? "/health-data",
    });
  }

  // ── Physical parts ──
  const labs = part("labs");
  if (labs && labs.score == null) {
    actions.push({ key: "part:labs:add", area: "physical", title: "Add recent lab results", detail: "Labs make up 20% of your Physical score. Upload a recent panel or ask your care team to order one.", gain: null, href: "/labs" });
  } else if (labs?.score != null && labs.score < 90) {
    actions.push({ key: "part:labs", area: "physical", title: "Work on out-of-range labs", detail: `${labs.detail ?? "Some labs are out of range"}. Ask your care team what to change, then recheck.`, gain: r1((100 - labs.score) * (labs.weight / 100) * physShare), href: "/labs" });
  }
  const meds = part("medications");
  if (meds?.score != null && meds.score < 90) {
    actions.push({ key: "part:medications", area: "physical", title: "Take your protocol as planned", detail: `${meds.detail ?? "Some doses were missed"}. Tick items off on Today as you take them.`, gain: r1((100 - meds.score) * (meds.weight / 100) * physShare), href: "/dashboard" });
  }
  const gen = part("genetics");
  if (gen?.score != null && gen.score < 80) {
    actions.push({ key: "part:genetics", area: "physical", title: "Check the labs your genetics point to", detail: `${gen.detail ?? "Some gene-linked labs haven't been checked"}. Ask your care team to add them to your next panel.`, gain: r1((100 - gen.score) * (gen.weight / 100) * physShare), href: "/genetics" });
  }

  // ── Mental ──
  if (i.checkinDays7 < 5) {
    actions.push({
      key: "mental:checkin", area: "mental", title: "Check in every day",
      detail: i.mentalScore == null
        ? "Your Mental score comes from daily ratings of Mind, Purpose, Relationships and Work. One minute a day starts it."
        : `You checked in ${i.checkinDays7} of the last 7 days. Daily ratings keep your Mental score accurate and help your coach help you.`,
      gain: null, href: "/lifescore",
    });
  }
  const totalW = i.mentalAreas.reduce((s, a) => s + (a.score != null ? a.weight : 0), 0);
  for (const a of i.mentalAreas) {
    if (a.score == null || a.score >= 75 || totalW <= 0) continue;
    const copy = MENTAL_COPY[a.dimension];
    if (!copy) continue;
    const lift = Math.min(15, 100 - a.score);
    actions.push({
      key: `mental:${a.dimension}`, area: "mental", title: copy.title,
      detail: `${copy.detail} (${a.dimension.charAt(0).toUpperCase() + a.dimension.slice(1)} is ${a.score}/100.)`,
      gain: r1(lift * (a.weight / totalW) * mentShare), href: "/lifescore",
    });
  }
  const mind = i.mentalAreas.find((a) => a.dimension === "mind");
  const mindfulLeft = i.mindfulMaxBonus - (i.mindful?.bonus ?? 0);
  if (mind?.score != null && totalW > 0 && mindfulLeft > 0.5) {
    actions.push({
      key: "mental:mindful", area: "mental", title: "Practice mindfulness 10 minutes a day",
      detail: i.mindful
        ? `You average ${i.mindful.minPerDay} mindful minutes a day. Breathing or meditation sessions logged in Apple Health add up to +${i.mindfulMaxBonus} to Mind.`
        : `Log breathing or meditation sessions in Apple Health (Mindfulness). 10 minutes a day adds up to +${i.mindfulMaxBonus} to Mind.`,
      gain: r1(mindfulLeft * (mind.weight / totalW) * mentShare), href: "/lifescore",
    });
  }

  // Biggest estimated gains first; actions without an estimate go after,
  // except "check in every day" when there's no Mental score yet (it unlocks 40%).
  return actions
    .filter((a) => a.gain == null || a.gain >= 0.5)
    .sort((a, b) => {
      const pin = (x: LifeScoreAction) => (x.key === "mental:checkin" && i.mentalScore == null ? 1 : 0);
      if (pin(a) !== pin(b)) return pin(b) - pin(a);
      return (b.gain ?? -1) - (a.gain ?? -1);
    });
}
