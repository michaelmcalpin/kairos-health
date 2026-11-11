/**
 * Where a lab value sits on its reference range, for the range-bar display.
 *
 * The track is split into low | in range | high. With both limits the
 * in-range zone fills the middle half of the track (25–75 %); with one limit
 * the track is split at that limit. Values beyond the track are pinned to the
 * ends (and `clamped` is set) so the dot never leaves the bar.
 */

export type RangeZone = "low" | "in" | "high";

export interface RangeLayout {
  /** Zone boundaries as % of the track. Low zone is [0, inStart], high is [inEnd, 100]. */
  inStart: number;
  inEnd: number;
}

export interface RangePosition extends RangeLayout {
  /** Dot position, 0–100 % of the track. */
  pct: number;
  zone: RangeZone;
  clamped: boolean;
}

const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));

/** Null when there is no usable range (no limits, or low ≥ high). */
export function rangeLayout(refLow: number | null | undefined, refHigh: number | null | undefined): RangeLayout | null {
  const lo = refLow ?? null;
  const hi = refHigh ?? null;
  if (lo == null && hi == null) return null;
  if (lo != null && hi != null) {
    if (!(hi > lo)) return null;
    // A range starting at 0 (e.g. LDL 0–100) has no "low" zone worth drawing.
    return lo <= 0 ? { inStart: 0, inEnd: 75 } : { inStart: 25, inEnd: 75 };
  }
  // One-sided: "≥ 60" or "< 130".
  return lo != null ? { inStart: 40, inEnd: 100 } : { inStart: 0, inEnd: 60 };
}

export function rangePosition(
  value: number,
  refLow: number | null | undefined,
  refHigh: number | null | undefined,
): RangePosition | null {
  if (!Number.isFinite(value)) return null;
  const layout = rangeLayout(refLow, refHigh);
  if (!layout) return null;
  const lo = refLow ?? null;
  const hi = refHigh ?? null;

  const zone: RangeZone = lo != null && value < lo ? "low" : hi != null && value > hi ? "high" : "in";
  let pct: number;

  if (lo != null && hi != null) {
    const width = hi - lo;
    if (layout.inStart === 0) {
      // 0-based range: 0 → 0 %, hi → 75 %, hi + width/3 → 100 %.
      pct = (Math.max(value, 0) / hi) * 75;
    } else {
      // lo − width/2 → 0 %, lo → 25 %, hi → 75 %, hi + width/2 → 100 %.
      pct = 25 + ((value - lo) / width) * 50;
    }
  } else if (lo != null) {
    // lo/2 → 0 %, lo → 40 %, 2·lo → 100 % (scale on |lo| so negatives still work).
    const span = Math.abs(lo) || 1;
    pct = value < lo ? 40 - ((lo - value) / (span / 2)) * 40 : 40 + ((value - lo) / span) * 60;
  } else {
    // 0 → 0 %, hi → 60 %, 1.67·hi → 100 %.
    const span = Math.abs(hi!) || 1;
    pct = value <= hi! ? (Math.max(value, 0) / span) * 60 : 60 + ((value - hi!) / (span * 0.67)) * 40;
  }

  const clamped = pct < 0 || pct > 100;
  pct = clamp(pct, 0, 100);
  // Keep the dot visually inside its own zone at the edges.
  if (zone === "in") pct = clamp(pct, layout.inStart, layout.inEnd);
  if (zone === "low") pct = Math.min(pct, Math.max(0, layout.inStart - 1));
  if (zone === "high") pct = Math.max(pct, Math.min(100, layout.inEnd + 1));
  return { ...layout, pct: Math.round(pct * 10) / 10, zone, clamped };
}

/** Plain-words reference range, e.g. "70–100 mg/dL", "≥ 60", "< 130 mg/dL". */
export function formatRange(refLow: number | null | undefined, refHigh: number | null | undefined, unit?: string | null): string | null {
  const u = unit ? ` ${unit}` : "";
  const n = (x: number) => x.toLocaleString("en-US", { maximumFractionDigits: 2 });
  if (refLow != null && refHigh != null) return `${n(refLow)}–${n(refHigh)}${u}`;
  if (refLow != null) return `≥ ${n(refLow)}${u}`;
  if (refHigh != null) return `≤ ${n(refHigh)}${u}`;
  return null;
}
