/**
 * Shared chart theme. Metric hues come from the UX audit's chart palette and
 * are kept distinct from status colors, so a line's color never reads as
 * "good" or "bad" by accident. Status colors are used only for meaning
 * (in range / attention / out of range).
 */

export const METRIC_HUES = {
  sleep: "#8B93FF",
  recovery: "#34C6C4",
  activity: "#FF9F5A",
  glucose: "#E879A6",
  bloodPressure: "#6CC4F5",
  bodyComp: "#B79CFF",
} as const;

export type MetricHue = keyof typeof METRIC_HUES;

export const STATUS_COLORS = {
  optimal: "#3CCB8C",
  attention: "#F2B544",
  critical: "#F06A6A",
  info: "#8AA4FF",
} as const;

/** Chart chrome on the dark-navy surface. */
export const CHART_TOKENS = {
  grid: "rgba(169, 180, 196, 0.12)",
  axisText: "#A9B4C4",
  mutedText: "#74829A",
  guide: "rgba(169, 180, 196, 0.45)",
  tooltipBg: "rgba(10, 18, 36, 0.96)",
  /** Target band: the "in range" status color, very faint. */
  targetFill: "rgba(60, 203, 140, 0.09)",
  targetEdge: "rgba(60, 203, 140, 0.45)",
  /** Personal baseline band opacity applied to the metric hue. */
  baselineOpacity: 0.16,
  fontSize: 12,
  fontFamily: "Open Sans, ui-sans-serif, system-ui, sans-serif",
} as const;

/** Hue for a metric key from the health catalog. */
export function hueForMetric(key: string): string {
  if (key.startsWith("sleep") || key === "wrist_temp" || key === "temp_deviation" || key === "breathing_disturbances") return METRIC_HUES.sleep;
  if (["hrv", "resting_hr", "readiness", "respiratory_rate", "spo2", "hr_recovery", "vo2max", "walking_hr", "heart_rate_avg"].includes(key)) return METRIC_HUES.recovery;
  if (key === "glucose") return METRIC_HUES.glucose;
  if (key.startsWith("bp_")) return METRIC_HUES.bloodPressure;
  if (["weight", "body_fat", "lean_mass", "bmi", "waist"].includes(key)) return METRIC_HUES.bodyComp;
  return METRIC_HUES.activity;
}

/** A lighter tint of a hex color, for a second series of the same metric (e.g. diastolic). */
export function tint(hex: string, amount = 0.45): string {
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * amount);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}
