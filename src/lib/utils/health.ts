/**
 * KAIROS Health Calculation Utilities
 *
 * Core health metric calculations, scoring algorithms,
 * and threshold evaluations used across the platform.
 */

// ─── Glucose Analysis ───────────────────────────────────────────────────────

export interface GlucoseThresholds {
  low: number;      // default 70
  targetLow: number; // default 70
  targetHigh: number; // default 140
  high: number;      // default 180
}

export const DEFAULT_GLUCOSE_THRESHOLDS: GlucoseThresholds = {
  low: 70,
  targetLow: 70,
  targetHigh: 140,
  high: 180,
};

/** Calculate Time-In-Range (TIR) percentage */
export function timeInRange(
  readings: number[],
  thresholds = DEFAULT_GLUCOSE_THRESHOLDS
): number {
  if (readings.length === 0) return 0;
  const inRange = readings.filter(
    (v) => v >= thresholds.targetLow && v <= thresholds.targetHigh
  );
  return inRange.length / readings.length;
}

/** Calculate Glucose Management Indicator (GMI) from average glucose */
export function glucoseManagementIndicator(avgGlucose: number): number {
  // GMI = 3.31 + (0.02392 × average glucose in mg/dL)
  return 3.31 + 0.02392 * avgGlucose;
}

/** Calculate coefficient of variation (glucose variability) */
export function glucoseVariability(readings: number[]): number {
  if (readings.length < 2) return 0;
  const mean = readings.reduce((a, b) => a + b, 0) / readings.length;
  if (mean === 0) return 0;
  const variance = readings.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / readings.length;
  return (Math.sqrt(variance) / mean) * 100;
}

/** Classify glucose zone */
export function glucoseZone(
  value: number,
  thresholds = DEFAULT_GLUCOSE_THRESHOLDS
): "critical_low" | "low" | "optimal" | "elevated" | "high" | "critical_high" {
  if (value < 54) return "critical_low";
  if (value < thresholds.low) return "low";
  if (value <= thresholds.targetHigh) return "optimal";
  if (value <= thresholds.high) return "elevated";
  if (value <= 250) return "high";
  return "critical_high";
}

// ─── Sleep Scoring ──────────────────────────────────────────────────────────

export interface SleepMetrics {
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  efficiency?: number; // percent 0-100
}

/** Calculate a composite sleep score (0-100) */
export function sleepScore(metrics: SleepMetrics): number {
  // Weighted scoring based on sleep science research
  const totalHours = metrics.totalMinutes / 60;
  const deepPct = metrics.deepMinutes / metrics.totalMinutes;
  const remPct = metrics.remMinutes / metrics.totalMinutes;
  const efficiency = metrics.efficiency ?? ((metrics.totalMinutes - metrics.awakeMinutes) / metrics.totalMinutes) * 100;

  // Duration score (optimal: 7-9 hours)
  let durationScore: number;
  if (totalHours >= 7 && totalHours <= 9) durationScore = 100;
  else if (totalHours >= 6 && totalHours < 7) durationScore = 75;
  else if (totalHours > 9 && totalHours <= 10) durationScore = 80;
  else if (totalHours >= 5 && totalHours < 6) durationScore = 50;
  else durationScore = 25;

  // Deep sleep score (optimal: 15-25% of total)
  let deepScore: number;
  if (deepPct >= 0.15 && deepPct <= 0.25) deepScore = 100;
  else if (deepPct >= 0.10 && deepPct < 0.15) deepScore = 70;
  else if (deepPct > 0.25 && deepPct <= 0.30) deepScore = 80;
  else deepScore = 40;

  // REM score (optimal: 20-25% of total)
  let remScore: number;
  if (remPct >= 0.20 && remPct <= 0.25) remScore = 100;
  else if (remPct >= 0.15 && remPct < 0.20) remScore = 75;
  else if (remPct > 0.25 && remPct <= 0.30) remScore = 80;
  else remScore = 40;

  // Efficiency score
  let efficiencyScore: number;
  if (efficiency >= 90) efficiencyScore = 100;
  else if (efficiency >= 85) efficiencyScore = 80;
  else if (efficiency >= 80) efficiencyScore = 60;
  else efficiencyScore = 40;

  // Weighted composite
  const score =
    durationScore * 0.35 +
    deepScore * 0.25 +
    remScore * 0.20 +
    efficiencyScore * 0.20;

  return Math.round(Math.min(100, Math.max(0, score)));
}

// ─── HRV Analysis ───────────────────────────────────────────────────────────

/** Classify HRV relative to baseline */
export function hrvStatus(
  current: number,
  baseline: number
): "excellent" | "good" | "below_baseline" | "low" {
  const ratio = current / baseline;
  if (ratio >= 1.15) return "excellent";
  if (ratio >= 0.90) return "good";
  if (ratio >= 0.70) return "below_baseline";
  return "low";
}

/** Calculate 7-day HRV trend */
export function hrvTrend(values: number[]): "improving" | "stable" | "declining" {
  if (values.length < 3) return "stable";
  const recent = values.slice(-3);
  const earlier = values.slice(0, 3);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const earlierAvg = earlier.reduce((a, b) => a + b, 0) / earlier.length;
  const change = (recentAvg - earlierAvg) / earlierAvg;
  if (change > 0.05) return "improving";
  if (change < -0.05) return "declining";
  return "stable";
}

// ─── BMI & Body Composition ─────────────────────────────────────────────────

/** Calculate BMI from weight (lbs) and height (inches) */
export function calculateBMI(weightLbs: number, heightInches: number): number {
  return (weightLbs / (heightInches * heightInches)) * 703;
}

/** Classify BMI */
export function bmiCategory(bmi: number): "underweight" | "normal" | "overweight" | "obese" {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  return "obese";
}

// ─── Supplement Adherence ───────────────────────────────────────────────────

/** Calculate adherence percentage */
export function adherenceRate(taken: number, total: number): number {
  if (total === 0) return 0;
  return Math.min(1, taken / total);
}

/** Classify adherence level */
export function adherenceLevel(rate: number): "excellent" | "good" | "fair" | "poor" {
  if (rate >= 0.9) return "excellent";
  if (rate >= 0.75) return "good";
  if (rate >= 0.5) return "fair";
  return "poor";
}

// ─── Statistical Helpers ────────────────────────────────────────────────────

/** Calculate mean */
export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

/** Calculate standard deviation */
export function standardDeviation(values: number[]): number {
  if (values.length < 2) return 0;
  const avg = mean(values);
  const variance = values.reduce((sum, v) => sum + Math.pow(v - avg, 2), 0) / values.length;
  return Math.sqrt(variance);
}

/** Calculate percentile (linear interpolation) */
export function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
}

/** Calculate moving average */
export function movingAverage(values: number[], window: number): number[] {
  if (values.length < window) return values;
  const result: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    const slice = values.slice(i, i + window);
    result.push(mean(slice));
  }
  return result;
}
