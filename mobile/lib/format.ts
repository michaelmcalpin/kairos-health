/**
 * format — tiny display-layer number formatting helpers.
 *
 * Health metrics arrive from the API / HealthKit as raw floats (e.g. weight
 * 172.4000001, HRV 42.8333, sleep 7.41666). These helpers round them for
 * display ONLY — they never touch stored data or API payloads.
 *
 * Precision rules (see PRODUCT spec): default 0 decimals, never exceed 2.
 *   0 dp: heart rate, HRV, steps, calories, glucose, blood pressure, SpO2,
 *         respiratory rate, sleep score, health score, any %, any count.
 *   1 dp: weight, body-fat %, lean mass, BMI, sleep hours, temperature,
 *         VO2max, body measurements, distance.
 *   2 dp: only precision-sensitive small values (ketones, some labs).
 */

const EM_DASH = "—";

/** True for null, undefined, or non-finite numbers (NaN / Infinity). */
function isBlank(n: unknown): boolean {
  return n == null || (typeof n === "number" && !Number.isFinite(n));
}

/**
 * Round a number to `dp` decimal places (default 0), returning a `number`.
 * Returns `null` for null/undefined/NaN so callers can branch. Never exceeds
 * 2 decimal places even if a larger `dp` is passed.
 */
export function round(n: number | null | undefined, dp = 0): number | null {
  if (isBlank(n)) return null;
  const places = Math.min(Math.max(0, Math.trunc(dp)), 2);
  const factor = 10 ** places;
  return Math.round((n as number) * factor) / factor;
}

/**
 * Format a number to `dp` decimal places (default 0) as a display string.
 * Returns an em dash ("—") for null/undefined/NaN. Trailing zeros are
 * dropped (7.0 → "7", 7.4 → "7.4"). Never exceeds 2 decimal places.
 */
export function fmt(n: number | null | undefined, dp = 0): string {
  const r = round(n, dp);
  if (r == null) return EM_DASH;
  // Number() drops any trailing zeros from toFixed for a clean display.
  const places = Math.min(Math.max(0, Math.trunc(dp)), 2);
  return String(Number(r.toFixed(places)));
}
