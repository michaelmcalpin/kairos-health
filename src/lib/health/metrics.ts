/**
 * Health metric catalog — every daily health number Everist reads, stores,
 * displays and scores. One entry per metric. Apple Health metrics carry the
 * HealthKit identifier, the unit to read in, and how to roll a day up.
 *
 * Self-contained (no imports) so the iOS app can carry an identical copy at
 * mobile/lib/health/metrics.ts (a web test keeps the two in sync).
 */

export type MetricGroup =
  | "activity" | "heart" | "sleep" | "vitals" | "respiratory" | "body"
  | "mobility" | "nutrition" | "mind" | "cycle" | "environment";

export const METRIC_GROUPS: Array<{ key: MetricGroup; title: string; blurb: string }> = [
  { key: "activity", title: "Activity", blurb: "How much you move each day." },
  { key: "heart", title: "Heart", blurb: "Heart rate, recovery and rhythm." },
  { key: "sleep", title: "Sleep", blurb: "How long and how deeply you sleep." },
  { key: "vitals", title: "Vitals", blurb: "Blood pressure, glucose and temperature." },
  { key: "respiratory", title: "Breathing", blurb: "Oxygen and breathing rate." },
  { key: "body", title: "Body", blurb: "Weight and body composition." },
  { key: "mobility", title: "Mobility", blurb: "How steady and quick you walk. Strong signs of healthy aging." },
  { key: "nutrition", title: "Nutrition", blurb: "Food and drink you log in Apple Health." },
  { key: "mind", title: "Mind", blurb: "Mindful minutes and readiness." },
  { key: "cycle", title: "Cycle", blurb: "Cycle tracking, if you log it." },
  { key: "environment", title: "Environment", blurb: "Noise and sunlight around you." },
];

/** How one day of samples becomes one number. */
export type DailyAgg = "sum" | "avg" | "min" | "max" | "latest";

/** Units the native module knows how to build. Keep in sync with the Swift `unitFor` map. */
export type HKUnitName =
  | "count" | "m" | "kcal" | "min" | "bpm" | "ms" | "%" | "vo2" | "degF" | "degC"
  | "mmHg" | "mg/dL" | "lb" | "in" | "m/s" | "g" | "mg" | "mcg" | "mL" | "dBASPL"
  | "IU" | "W" | "cm" | "L" | "L/min" | "count/min" | "uS";

export interface HealthKitSource {
  kind: "quantity" | "category";
  /** Full HealthKit identifier, e.g. HKQuantityTypeIdentifierStepCount. */
  id: string;
  /** Quantity only: unit to read values in. */
  unit?: HKUnitName;
  /** Quantity only: how to roll up a day. Cumulative types always sum. */
  agg?: DailyAgg;
  /**
   * Category only: how to turn samples into a daily number.
   * "minutes" = total duration; "count" = number of samples; "value" = max category value that day.
   */
  categoryAgg?: "minutes" | "count" | "value";
}

/** How a value maps to a 0–100 Physical sub-score. */
export type MetricTarget =
  | { kind: "higher"; good: number; poor: number }
  | { kind: "lower"; good: number; poor: number }
  | { kind: "range"; low: number; high: number; lowPoor: number; highPoor: number }
  /** Compared with the client's own 30-day baseline (e.g. HRV varies a lot by person). */
  | { kind: "baseline" };

export interface MetricDef {
  key: string;
  label: string;
  group: MetricGroup;
  /** Unit we store and display. */
  unit: string;
  decimals: number;
  /** Plain-words line shown on tap. */
  about: string;
  healthkit?: HealthKitSource;
  /** Scored into the Physical score when present, with this relative weight. */
  target?: MetricTarget;
  weight?: number;
  /** Convert a HealthKit value into the stored unit (e.g. m → mi). */
  convert?: "m_to_mi" | "m_to_in" | "mL_to_floz" | "ms_to_s" | "pct_frac_to_pct";
}

const q = (id: string, unit: HKUnitName, agg: DailyAgg): HealthKitSource =>
  ({ kind: "quantity", id: `HKQuantityTypeIdentifier${id}`, unit, agg });
const c = (id: string, categoryAgg: "minutes" | "count" | "value"): HealthKitSource =>
  ({ kind: "category", id: `HKCategoryTypeIdentifier${id}`, categoryAgg });

export const METRICS: MetricDef[] = [
  // ── Activity ──
  { key: "steps", label: "Steps", group: "activity", unit: "steps", decimals: 0, about: "Total steps for the day.", healthkit: q("StepCount", "count", "sum"), target: { kind: "higher", good: 9000, poor: 2000 }, weight: 2 },
  { key: "exercise_min", label: "Exercise minutes", group: "activity", unit: "min", decimals: 0, about: "Minutes of brisk activity or more.", healthkit: q("AppleExerciseTime", "min", "sum"), target: { kind: "higher", good: 30, poor: 0 }, weight: 2 },
  { key: "stand_min", label: "Stand minutes", group: "activity", unit: "min", decimals: 0, about: "Minutes you spent standing and moving.", healthkit: q("AppleStandTime", "min", "sum") },
  { key: "stand_hours", label: "Stand hours", group: "activity", unit: "hr", decimals: 0, about: "Hours in which you stood for at least a minute.", healthkit: c("AppleStandHour", "count"), target: { kind: "higher", good: 12, poor: 4 }, weight: 0.5 },
  { key: "move_min", label: "Move minutes", group: "activity", unit: "min", decimals: 0, about: "Minutes of movement (Apple Watch move goal in minutes).", healthkit: q("AppleMoveTime", "min", "sum") },
  { key: "active_kcal", label: "Active calories", group: "activity", unit: "kcal", decimals: 0, about: "Calories burned by moving, on top of resting burn.", healthkit: q("ActiveEnergyBurned", "kcal", "sum") },
  { key: "resting_kcal", label: "Resting calories", group: "activity", unit: "kcal", decimals: 0, about: "Calories your body burns at rest.", healthkit: q("BasalEnergyBurned", "kcal", "sum") },
  { key: "distance_walk_run", label: "Walking + running distance", group: "activity", unit: "mi", decimals: 1, about: "Distance on foot.", healthkit: q("DistanceWalkingRunning", "m", "sum"), convert: "m_to_mi" },
  { key: "distance_cycling", label: "Cycling distance", group: "activity", unit: "mi", decimals: 1, about: "Distance on a bike.", healthkit: q("DistanceCycling", "m", "sum"), convert: "m_to_mi" },
  { key: "distance_swimming", label: "Swimming distance", group: "activity", unit: "yd", decimals: 0, about: "Distance swum.", healthkit: q("DistanceSwimming", "m", "sum") },
  { key: "swim_strokes", label: "Swim strokes", group: "activity", unit: "strokes", decimals: 0, about: "Swimming strokes counted.", healthkit: q("SwimmingStrokeCount", "count", "sum") },
  { key: "flights", label: "Flights climbed", group: "activity", unit: "flights", decimals: 0, about: "Flights of stairs climbed.", healthkit: q("FlightsClimbed", "count", "sum") },
  { key: "wheelchair_pushes", label: "Wheelchair pushes", group: "activity", unit: "pushes", decimals: 0, about: "Pushes counted in wheelchair mode.", healthkit: q("PushCount", "count", "sum") },
  { key: "running_speed", label: "Running speed", group: "activity", unit: "mph", decimals: 1, about: "Average running speed.", healthkit: q("RunningSpeed", "m/s", "avg") },
  { key: "running_power", label: "Running power", group: "activity", unit: "W", decimals: 0, about: "Average running power.", healthkit: q("RunningPower", "W", "avg") },
  { key: "running_stride", label: "Running stride length", group: "activity", unit: "in", decimals: 0, about: "Average stride when running.", healthkit: q("RunningStrideLength", "m", "avg"), convert: "m_to_in" },
  { key: "running_vertical_osc", label: "Vertical oscillation", group: "activity", unit: "cm", decimals: 1, about: "How much you bounce when running.", healthkit: q("RunningVerticalOscillation", "cm", "avg") },
  { key: "running_ground_contact", label: "Ground contact time", group: "activity", unit: "ms", decimals: 0, about: "Time your foot touches the ground per step.", healthkit: q("RunningGroundContactTime", "ms", "avg") },
  { key: "cycling_speed", label: "Cycling speed", group: "activity", unit: "mph", decimals: 1, about: "Average cycling speed.", healthkit: q("CyclingSpeed", "m/s", "avg") },
  { key: "cycling_power", label: "Cycling power", group: "activity", unit: "W", decimals: 0, about: "Average cycling power.", healthkit: q("CyclingPower", "W", "avg") },
  { key: "cycling_cadence", label: "Cycling cadence", group: "activity", unit: "rpm", decimals: 0, about: "Pedal turns per minute.", healthkit: q("CyclingCadence", "count/min", "avg") },
  { key: "falls", label: "Falls", group: "activity", unit: "falls", decimals: 0, about: "Falls detected by Apple Watch.", healthkit: q("NumberOfTimesFallen", "count", "sum"), target: { kind: "lower", good: 0, poor: 2 }, weight: 1 },

  // ── Heart ──
  { key: "heart_rate_avg", label: "Average heart rate", group: "heart", unit: "bpm", decimals: 0, about: "Average heart rate across the day.", healthkit: q("HeartRate", "bpm", "avg") },
  { key: "heart_rate_max", label: "Highest heart rate", group: "heart", unit: "bpm", decimals: 0, about: "Highest heart rate that day.", healthkit: q("HeartRate", "bpm", "max") },
  { key: "resting_hr", label: "Resting heart rate", group: "heart", unit: "bpm", decimals: 0, about: "Heart rate at rest. Lower usually means a fitter heart.", healthkit: q("RestingHeartRate", "bpm", "avg"), target: { kind: "lower", good: 55, poor: 85 }, weight: 2 },
  { key: "walking_hr", label: "Walking heart rate", group: "heart", unit: "bpm", decimals: 0, about: "Average heart rate while walking.", healthkit: q("WalkingHeartRateAverage", "bpm", "avg") },
  { key: "hrv", label: "Heart rate variability", group: "heart", unit: "ms", decimals: 0, about: "Small changes between heartbeats. Higher than your normal usually means better recovery.", healthkit: q("HeartRateVariabilitySDNN", "ms", "avg"), target: { kind: "baseline" }, weight: 2 },
  { key: "hr_recovery", label: "Heart rate recovery", group: "heart", unit: "bpm", decimals: 0, about: "How fast your heart rate drops 1 minute after hard exercise. Bigger drops are better.", healthkit: q("HeartRateRecoveryOneMinute", "bpm", "avg"), target: { kind: "higher", good: 20, poor: 8 }, weight: 1 },
  { key: "vo2max", label: "Cardio fitness (VO2 max)", group: "heart", unit: "mL/kg/min", decimals: 1, about: "How well your body uses oxygen. One of the strongest signs of a long life.", healthkit: q("VO2Max", "vo2", "latest"), target: { kind: "higher", good: 45, poor: 25 }, weight: 2 },
  { key: "afib_burden", label: "AFib history", group: "heart", unit: "%", decimals: 1, about: "Share of time in atrial fibrillation (for people with AFib History turned on).", healthkit: q("AtrialFibrillationBurden", "%", "latest"), target: { kind: "lower", good: 0, poor: 5 }, weight: 1 },
  { key: "high_hr_events", label: "High heart rate alerts", group: "heart", unit: "alerts", decimals: 0, about: "Alerts for a high heart rate while resting.", healthkit: c("HighHeartRateEvent", "count") },
  { key: "low_hr_events", label: "Low heart rate alerts", group: "heart", unit: "alerts", decimals: 0, about: "Alerts for a low heart rate.", healthkit: c("LowHeartRateEvent", "count") },
  { key: "irregular_rhythm_events", label: "Irregular rhythm alerts", group: "heart", unit: "alerts", decimals: 0, about: "Alerts for an irregular heart rhythm.", healthkit: c("IrregularHeartRhythmEvent", "count"), target: { kind: "lower", good: 0, poor: 1 }, weight: 1 },
  { key: "perfusion_index", label: "Perfusion index", group: "heart", unit: "%", decimals: 1, about: "Blood flow strength at the sensor.", healthkit: q("PeripheralPerfusionIndex", "%", "avg") },

  // ── Sleep (derived from sleep analysis on the phone; Oura sends these directly) ──
  { key: "sleep_total_min", label: "Time asleep", group: "sleep", unit: "min", decimals: 0, about: "Total sleep last night. Most adults do best with 7–9 hours.", target: { kind: "range", low: 420, high: 540, lowPoor: 300, highPoor: 660 }, weight: 3 },
  { key: "sleep_in_bed_min", label: "Time in bed", group: "sleep", unit: "min", decimals: 0, about: "Time in bed, asleep or not." },
  { key: "sleep_deep_min", label: "Deep sleep", group: "sleep", unit: "min", decimals: 0, about: "The most restoring sleep stage.", target: { kind: "higher", good: 60, poor: 20 }, weight: 1 },
  { key: "sleep_rem_min", label: "REM sleep", group: "sleep", unit: "min", decimals: 0, about: "Dream sleep. Helps memory and mood.", target: { kind: "higher", good: 90, poor: 30 }, weight: 1 },
  { key: "sleep_core_min", label: "Core / light sleep", group: "sleep", unit: "min", decimals: 0, about: "Light sleep stage." },
  { key: "sleep_awake_min", label: "Awake in the night", group: "sleep", unit: "min", decimals: 0, about: "Time awake after falling asleep.", target: { kind: "lower", good: 20, poor: 90 }, weight: 0.5 },
  { key: "sleep_score", label: "Sleep score", group: "sleep", unit: "/100", decimals: 0, about: "Your ring or watch sleep score." },
  { key: "wrist_temp", label: "Sleeping wrist temperature", group: "sleep", unit: "°F", decimals: 1, about: "Wrist temperature while you sleep. Changes can mean illness or cycle shifts.", healthkit: q("AppleSleepingWristTemperature", "degF", "avg") },
  { key: "temp_deviation", label: "Temperature change", group: "sleep", unit: "°F", decimals: 1, about: "Night temperature vs your normal.", target: { kind: "range", low: -0.9, high: 0.9, lowPoor: -2.7, highPoor: 2.7 }, weight: 0.5 },
  { key: "breathing_disturbances", label: "Breathing disturbances", group: "sleep", unit: "/hr", decimals: 1, about: "Breathing interruptions per hour of sleep.", healthkit: q("AppleSleepingBreathingDisturbances", "count", "avg"), target: { kind: "lower", good: 5, poor: 30 }, weight: 1 },

  // ── Vitals ──
  { key: "bp_systolic", label: "Blood pressure (top)", group: "vitals", unit: "mmHg", decimals: 0, about: "Pressure when your heart beats.", healthkit: q("BloodPressureSystolic", "mmHg", "avg"), target: { kind: "range", low: 100, high: 120, lowPoor: 85, highPoor: 150 }, weight: 1.5 },
  { key: "bp_diastolic", label: "Blood pressure (bottom)", group: "vitals", unit: "mmHg", decimals: 0, about: "Pressure between beats.", healthkit: q("BloodPressureDiastolic", "mmHg", "avg"), target: { kind: "range", low: 60, high: 80, lowPoor: 50, highPoor: 95 }, weight: 1 },
  { key: "glucose", label: "Blood sugar", group: "vitals", unit: "mg/dL", decimals: 0, about: "Average blood sugar for the day.", healthkit: q("BloodGlucose", "mg/dL", "avg"), target: { kind: "range", low: 70, high: 105, lowPoor: 55, highPoor: 160 }, weight: 1 },
  { key: "body_temp", label: "Body temperature", group: "vitals", unit: "°F", decimals: 1, about: "Body temperature readings.", healthkit: q("BodyTemperature", "degF", "avg") },
  { key: "basal_body_temp", label: "Basal body temperature", group: "vitals", unit: "°F", decimals: 2, about: "Resting temperature on waking.", healthkit: q("BasalBodyTemperature", "degF", "avg") },
  { key: "insulin", label: "Insulin delivered", group: "vitals", unit: "IU", decimals: 1, about: "Insulin logged that day.", healthkit: q("InsulinDelivery", "IU", "sum") },
  { key: "blood_alcohol", label: "Blood alcohol", group: "vitals", unit: "%", decimals: 3, about: "Blood alcohol readings.", healthkit: q("BloodAlcoholContent", "%", "max") },
  { key: "alcoholic_drinks", label: "Alcoholic drinks", group: "vitals", unit: "drinks", decimals: 0, about: "Drinks logged.", healthkit: q("NumberOfAlcoholicBeverages", "count", "sum"), target: { kind: "lower", good: 0, poor: 3 }, weight: 0.5 },
  { key: "electrodermal", label: "Electrodermal activity", group: "vitals", unit: "µS", decimals: 1, about: "Skin conductance.", healthkit: q("ElectrodermalActivity", "uS", "avg") },
  { key: "readiness", label: "Readiness", group: "mind", unit: "/100", decimals: 0, about: "Your ring's readiness score: how ready your body is for the day.", target: { kind: "higher", good: 85, poor: 50 }, weight: 2 },

  // ── Breathing ──
  { key: "spo2", label: "Blood oxygen", group: "respiratory", unit: "%", decimals: 0, about: "Oxygen in your blood. 95% or more is typical.", healthkit: q("OxygenSaturation", "%", "avg"), target: { kind: "higher", good: 96, poor: 90 }, weight: 1, convert: "pct_frac_to_pct" },
  { key: "respiratory_rate", label: "Breathing rate", group: "respiratory", unit: "breaths/min", decimals: 1, about: "Breaths per minute, mostly measured during sleep.", healthkit: q("RespiratoryRate", "count/min", "avg"), target: { kind: "range", low: 12, high: 18, lowPoor: 8, highPoor: 24 }, weight: 1 },
  { key: "fvc", label: "Forced vital capacity", group: "respiratory", unit: "L", decimals: 2, about: "Lung capacity from a spirometer.", healthkit: q("ForcedVitalCapacity", "L", "latest") },
  { key: "fev1", label: "FEV1", group: "respiratory", unit: "L", decimals: 2, about: "Air blown out in the first second.", healthkit: q("ForcedExpiratoryVolume1", "L", "latest") },
  { key: "peak_flow", label: "Peak flow", group: "respiratory", unit: "L/min", decimals: 0, about: "Fastest breath out.", healthkit: q("PeakExpiratoryFlowRate", "L/min", "latest") },
  { key: "inhaler_uses", label: "Inhaler uses", group: "respiratory", unit: "puffs", decimals: 0, about: "Inhaler puffs logged.", healthkit: q("InhalerUsage", "count", "sum") },

  // ── Body ──
  { key: "weight", label: "Weight", group: "body", unit: "lb", decimals: 1, about: "Body weight.", healthkit: q("BodyMass", "lb", "latest") },
  { key: "bmi", label: "BMI", group: "body", unit: "", decimals: 1, about: "Body mass index.", healthkit: q("BodyMassIndex", "count", "latest") },
  { key: "body_fat", label: "Body fat", group: "body", unit: "%", decimals: 1, about: "Share of your weight that is fat.", healthkit: q("BodyFatPercentage", "%", "latest"), convert: "pct_frac_to_pct" },
  { key: "lean_mass", label: "Lean mass", group: "body", unit: "lb", decimals: 1, about: "Weight that is not fat.", healthkit: q("LeanBodyMass", "lb", "latest") },
  { key: "height", label: "Height", group: "body", unit: "in", decimals: 1, about: "Height.", healthkit: q("Height", "in", "latest") },
  { key: "waist", label: "Waist", group: "body", unit: "in", decimals: 1, about: "Waist size. A strong sign of belly fat.", healthkit: q("WaistCircumference", "in", "latest") },

  // ── Mobility ──
  { key: "walking_speed", label: "Walking speed", group: "mobility", unit: "mph", decimals: 1, about: "Your usual walking pace. Faster walking is linked to longer life.", healthkit: q("WalkingSpeed", "m/s", "avg"), target: { kind: "higher", good: 1.3, poor: 0.8 }, weight: 1 },
  { key: "walking_steadiness", label: "Walking steadiness", group: "mobility", unit: "%", decimals: 0, about: "How steady you are on your feet. Low means a higher fall risk.", healthkit: q("AppleWalkingSteadiness", "%", "latest"), target: { kind: "higher", good: 80, poor: 30 }, weight: 1, convert: "pct_frac_to_pct" },
  { key: "step_length", label: "Step length", group: "mobility", unit: "in", decimals: 0, about: "Length of each walking step.", healthkit: q("WalkingStepLength", "m", "avg"), convert: "m_to_in" },
  { key: "double_support", label: "Double support time", group: "mobility", unit: "%", decimals: 1, about: "Time both feet are on the ground. Lower is steadier.", healthkit: q("WalkingDoubleSupportPercentage", "%", "avg"), target: { kind: "lower", good: 28, poor: 40 }, weight: 0.5, convert: "pct_frac_to_pct" },
  { key: "walking_asymmetry", label: "Walking asymmetry", group: "mobility", unit: "%", decimals: 1, about: "How uneven your steps are. Lower is better.", healthkit: q("WalkingAsymmetryPercentage", "%", "avg"), target: { kind: "lower", good: 3, poor: 15 }, weight: 0.5, convert: "pct_frac_to_pct" },
  { key: "six_min_walk", label: "Six-minute walk", group: "mobility", unit: "yd", decimals: 0, about: "Estimated distance you could walk in 6 minutes.", healthkit: q("SixMinuteWalkTestDistance", "m", "latest") },
  { key: "stair_up_speed", label: "Stair speed: up", group: "mobility", unit: "ft/s", decimals: 1, about: "How fast you climb stairs.", healthkit: q("StairAscentSpeed", "m/s", "avg") },
  { key: "stair_down_speed", label: "Stair speed: down", group: "mobility", unit: "ft/s", decimals: 1, about: "How fast you go down stairs.", healthkit: q("StairDescentSpeed", "m/s", "avg") },

  // ── Nutrition ──
  { key: "diet_kcal", label: "Calories eaten", group: "nutrition", unit: "kcal", decimals: 0, about: "Food energy logged.", healthkit: q("DietaryEnergyConsumed", "kcal", "sum") },
  { key: "diet_protein", label: "Protein", group: "nutrition", unit: "g", decimals: 0, about: "Protein logged.", healthkit: q("DietaryProtein", "g", "sum") },
  { key: "diet_carbs", label: "Carbs", group: "nutrition", unit: "g", decimals: 0, about: "Carbohydrates logged.", healthkit: q("DietaryCarbohydrates", "g", "sum") },
  { key: "diet_fat", label: "Fat", group: "nutrition", unit: "g", decimals: 0, about: "Total fat logged.", healthkit: q("DietaryFatTotal", "g", "sum") },
  { key: "diet_sat_fat", label: "Saturated fat", group: "nutrition", unit: "g", decimals: 0, about: "Saturated fat logged.", healthkit: q("DietaryFatSaturated", "g", "sum") },
  { key: "diet_fiber", label: "Fiber", group: "nutrition", unit: "g", decimals: 0, about: "Fiber logged.", healthkit: q("DietaryFiber", "g", "sum") },
  { key: "diet_sugar", label: "Sugar", group: "nutrition", unit: "g", decimals: 0, about: "Sugar logged.", healthkit: q("DietarySugar", "g", "sum") },
  { key: "diet_sodium", label: "Sodium", group: "nutrition", unit: "mg", decimals: 0, about: "Salt (sodium) logged.", healthkit: q("DietarySodium", "mg", "sum") },
  { key: "diet_cholesterol", label: "Cholesterol (food)", group: "nutrition", unit: "mg", decimals: 0, about: "Cholesterol in food logged.", healthkit: q("DietaryCholesterol", "mg", "sum") },
  { key: "diet_potassium", label: "Potassium", group: "nutrition", unit: "mg", decimals: 0, about: "Potassium logged.", healthkit: q("DietaryPotassium", "mg", "sum") },
  { key: "diet_calcium", label: "Calcium", group: "nutrition", unit: "mg", decimals: 0, about: "Calcium logged.", healthkit: q("DietaryCalcium", "mg", "sum") },
  { key: "diet_magnesium", label: "Magnesium", group: "nutrition", unit: "mg", decimals: 0, about: "Magnesium logged.", healthkit: q("DietaryMagnesium", "mg", "sum") },
  { key: "diet_iron", label: "Iron", group: "nutrition", unit: "mg", decimals: 1, about: "Iron logged.", healthkit: q("DietaryIron", "mg", "sum") },
  { key: "diet_vit_d", label: "Vitamin D", group: "nutrition", unit: "mcg", decimals: 0, about: "Vitamin D logged.", healthkit: q("DietaryVitaminD", "mcg", "sum") },
  { key: "diet_vit_c", label: "Vitamin C", group: "nutrition", unit: "mg", decimals: 0, about: "Vitamin C logged.", healthkit: q("DietaryVitaminC", "mg", "sum") },
  { key: "diet_water", label: "Water", group: "nutrition", unit: "fl oz", decimals: 0, about: "Water logged.", healthkit: q("DietaryWater", "mL", "sum"), convert: "mL_to_floz" },
  { key: "diet_caffeine", label: "Caffeine", group: "nutrition", unit: "mg", decimals: 0, about: "Caffeine logged.", healthkit: q("DietaryCaffeine", "mg", "sum") },

  // ── Mind ──
  { key: "mindful_min", label: "Mindful minutes", group: "mind", unit: "min", decimals: 0, about: "Time spent in breathing or meditation sessions.", healthkit: c("MindfulSession", "minutes") },

  // ── Cycle ──
  { key: "menstrual_flow", label: "Period flow", group: "cycle", unit: "level", decimals: 0, about: "Logged period flow (1 light – 4 heavy).", healthkit: c("MenstrualFlow", "value") },
  { key: "spotting", label: "Spotting", group: "cycle", unit: "days", decimals: 0, about: "Days with spotting logged.", healthkit: c("IntermenstrualBleeding", "count") },
  { key: "ovulation_test", label: "Ovulation test", group: "cycle", unit: "result", decimals: 0, about: "Ovulation test result logged.", healthkit: c("OvulationTestResult", "value") },
  { key: "cervical_mucus", label: "Cervical mucus", group: "cycle", unit: "level", decimals: 0, about: "Cervical mucus quality logged.", healthkit: c("CervicalMucusQuality", "value") },

  // ── Environment ──
  { key: "daylight_min", label: "Time in daylight", group: "environment", unit: "min", decimals: 0, about: "Minutes outdoors in daylight. Helps sleep and mood.", healthkit: q("TimeInDaylight", "min", "sum"), target: { kind: "higher", good: 60, poor: 0 }, weight: 0.5 },
  { key: "env_noise", label: "Noise around you", group: "environment", unit: "dB", decimals: 0, about: "Average sound level around you.", healthkit: q("EnvironmentalAudioExposure", "dBASPL", "avg"), target: { kind: "lower", good: 70, poor: 85 }, weight: 0.25 },
  { key: "headphone_noise", label: "Headphone volume", group: "environment", unit: "dB", decimals: 0, about: "Average headphone sound level.", healthkit: q("HeadphoneAudioExposure", "dBASPL", "avg"), target: { kind: "lower", good: 70, poor: 85 }, weight: 0.25 },
  { key: "uv_exposure", label: "UV exposure", group: "environment", unit: "index", decimals: 0, about: "UV index exposure.", healthkit: q("UVExposure", "count", "max") },
  { key: "handwashing", label: "Handwashing", group: "environment", unit: "times", decimals: 0, about: "Handwashing events.", healthkit: c("HandwashingEvent", "count") },
  { key: "toothbrushing", label: "Toothbrushing", group: "environment", unit: "times", decimals: 0, about: "Toothbrushing events.", healthkit: c("ToothbrushingEvent", "count") },
];

export const METRIC_BY_KEY: Record<string, MetricDef> = Object.fromEntries(METRICS.map((m) => [m.key, m]));

/** Apple Health types we read but store somewhere other than a single metric. */
export const HK_SLEEP_ANALYSIS = "HKCategoryTypeIdentifierSleepAnalysis";

/** Everything to request read access for. */
export function healthKitReadTypes(): { quantity: string[]; category: string[] } {
  const quantity = new Set<string>();
  const category = new Set<string>([HK_SLEEP_ANALYSIS]);
  for (const m of METRICS) {
    if (!m.healthkit) continue;
    (m.healthkit.kind === "quantity" ? quantity : category).add(m.healthkit.id);
  }
  return { quantity: Array.from(quantity), category: Array.from(category) };
}

/** Convert a raw HealthKit value into the stored/display unit. */
export function convertValue(m: MetricDef, v: number): number {
  switch (m.convert) {
    case "m_to_mi": return v / 1609.344;
    case "m_to_in": return v * 39.3701;
    case "mL_to_floz": return v / 29.5735;
    case "ms_to_s": return v / 1000;
    // HealthKit reads "%" as a 0–1 fraction.
    case "pct_frac_to_pct": return v <= 1.5 ? v * 100 : v;
    default: break;
  }
  if (m.unit === "mph" && m.healthkit?.unit === "m/s") return v * 2.23694;
  if (m.unit === "ft/s" && m.healthkit?.unit === "m/s") return v * 3.28084;
  if (m.unit === "yd" && m.healthkit?.unit === "m") return v * 1.09361;
  if (m.unit === "%" && m.healthkit?.unit === "%" && v <= 1.5) return v * 100;
  return v;
}

/**
 * Map one value to 0–100 against its target. `baseline` is the client's own
 * 30-day average, used by "baseline" targets.
 */
export function scoreMetric(m: MetricDef, value: number, baseline?: number | null): number | null {
  const t = m.target;
  if (!t || !Number.isFinite(value)) return null;
  const lerp = (x: number, from: number, to: number) => {
    if (from === to) return x >= to ? 100 : 0;
    return Math.max(0, Math.min(100, ((x - from) / (to - from)) * 100));
  };
  switch (t.kind) {
    case "higher": return lerp(value, t.poor, t.good);
    case "lower": return lerp(-value, -t.poor, -t.good);
    case "range":
      if (value >= t.low && value <= t.high) return 100;
      return value < t.low ? lerp(value, t.lowPoor, t.low) : lerp(-value, -t.highPoor, -t.high);
    case "baseline": {
      if (!baseline || baseline <= 0) return null;
      // At your normal → 75. 20% above → 100. 30% below → 30.
      const ratio = value / baseline;
      return Math.max(0, Math.min(100, 75 + (ratio - 1) * 150));
    }
  }
}

export function formatMetric(m: MetricDef, v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return "—";
  if (m.unit === "min" && m.group === "sleep" && v >= 60) {
    const h = Math.floor(v / 60);
    const mm = Math.round(v % 60);
    return `${h}h ${mm}m`;
  }
  const n = v.toLocaleString("en-US", { maximumFractionDigits: m.decimals, minimumFractionDigits: 0 });
  return m.unit ? `${n} ${m.unit}` : n;
}
