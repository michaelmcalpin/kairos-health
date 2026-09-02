/**
 * EVERIST numeric display helpers.
 *
 * Ensures no health metric ever renders with a long floating-point tail.
 * These are DISPLAY-LAYER ONLY helpers — never use them to mutate stored data
 * or tRPC payloads.
 *
 * Precision guidance (see also the metric-specific helpers below):
 *   0 dp  → heart rate, HRV, steps, calories, glucose, BP, SpO2, respiratory
 *           rate, sleep score, health score, any percentage or count.
 *   1 dp  → weight, body-fat %, lean mass, BMI, sleep hours, body temperature,
 *           VO2max, body measurements, distance.
 *   2 dp  → only genuinely small values where precision matters (ketones, some
 *           lab biomarkers). Never more than 2.
 */

export const DASH = "—";

type Nullable = number | string | null | undefined;

function toFiniteNumber(n: Nullable): number | null {
  if (n === null || n === undefined || n === "") return null;
  const num = typeof n === "number" ? n : Number(n);
  return Number.isFinite(num) ? num : null;
}

/**
 * Round a value to `dp` decimal places (default 0) and return it as a NUMBER.
 * Returns {@link DASH} ("—") for null / undefined / NaN / Infinity so that
 * existing empty-state rendering is preserved.
 *
 * round(172.4000001, 1) → 172.4
 * round(42.83333, 0)    → 43
 * round(null)           → "—"
 */
export function round(n: Nullable, dp = 0): number | string {
  const num = toFiniteNumber(n);
  if (num === null) return DASH;
  const clamped = Math.min(Math.max(dp, 0), 2);
  const factor = 10 ** clamped;
  return Math.round(num * factor) / factor;
}

/**
 * Format a value to a string with AT MOST `dp` decimals (default 0), grouped
 * with thousands separators. Trailing zeros are trimmed (172.0 → "172").
 * Returns {@link DASH} for null / NaN.
 */
export function fmt(n: Nullable, dp = 0): string {
  const num = toFiniteNumber(n);
  if (num === null) return DASH;
  const clamped = Math.min(Math.max(dp, 0), 2);
  return num.toLocaleString("en-US", { maximumFractionDigits: clamped });
}

/**
 * Round a value of UNKNOWN shape (e.g. AI-parsed JSON that may be a number OR a
 * preformatted string like "120/80" or "98.6 °F"). Only values that are a bare
 * number are re-rounded; anything else is returned via String() untouched so we
 * never mangle composite strings. Returns {@link DASH} for null / undefined.
 */
export function fmtLoose(v: unknown, dp = 0): string {
  if (v === null || v === undefined) return DASH;
  if (typeof v === "number") {
    return Number.isFinite(v) ? String(round(v, dp)) : DASH;
  }
  const s = String(v).trim();
  if (/^-?\d*\.?\d+$/.test(s)) return String(round(Number(s), dp));
  return String(v);
}

// ─── Metric-specific helpers ─────────────────────────────────────────────────

/** Weight (lbs/kg): 1 dp. */
export const fmtWeight = (n: Nullable) => fmt(n, 1);

/** Percentage (body-fat, adherence, etc.). Pass dp=1 for body-fat/lean. */
export const fmtPct = (n: Nullable, dp = 0) => {
  const s = fmt(n, dp);
  return s === DASH ? DASH : `${s}%`;
};

/** Whole-number metric (HR, HRV, glucose, steps, calories, scores, counts). */
export const fmtInt = (n: Nullable) => fmt(n, 0);

/** Body measurement (inches/cm), BMI, VO2max, temperature: 1 dp. */
export const fmtMeasure = (n: Nullable) => fmt(n, 1);
