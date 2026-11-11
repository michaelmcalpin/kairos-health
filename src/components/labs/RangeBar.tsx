"use client";

import { ArrowDown, ArrowUp, CheckCircle2, Minus, AlertOctagon } from "lucide-react";

import { rangePosition, rangeLayout, formatRange } from "@/lib/labs/range";
import { STATUS_COLORS } from "@/components/charts/theme";

/**
 * Lab range bar: a track split into low | in range | high, a dot for the
 * value and a ghost dot for the previous result. Renders a plain "No
 * reference range" note when the marker has none (no guessed status).
 */
export function RangeBar({
  value, refLow, refHigh, unit, previous, className = "",
}: {
  value: number;
  refLow: number | null;
  refHigh: number | null;
  unit?: string | null;
  previous?: number | null;
  className?: string;
}) {
  const pos = rangePosition(value, refLow, refHigh);
  const layout = rangeLayout(refLow, refHigh);
  if (!pos || !layout) {
    return <p className={`text-xs text-kairos-silver-dark ${className}`}>No reference range on this report</p>;
  }
  const prev = previous != null ? rangePosition(previous, refLow, refHigh) : null;
  const range = formatRange(refLow, refHigh, unit);
  const zoneBg = (z: "low" | "in" | "high") => z === "in" ? `${STATUS_COLORS.optimal}40` : `${STATUS_COLORS.attention}30`;

  return (
    <div className={className}>
      <div className="relative h-2.5 rounded-full overflow-visible" role="img"
        aria-label={`${value}${unit ? ` ${unit}` : ""} — ${pos.zone === "in" ? "in range" : pos.zone === "low" ? "below range" : "above range"}${range ? ` (reference ${range})` : ""}${previous != null ? `; previous ${previous}` : ""}`}>
        <div className="absolute inset-0 flex rounded-full overflow-hidden">
          {layout.inStart > 0 && <div style={{ width: `${layout.inStart}%`, background: zoneBg("low") }} />}
          <div style={{ width: `${layout.inEnd - layout.inStart}%`, background: zoneBg("in") }} />
          {layout.inEnd < 100 && <div style={{ width: `${100 - layout.inEnd}%`, background: zoneBg("high") }} />}
        </div>
        {prev && (
          <span className="absolute top-1/2 w-2.5 h-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/60 bg-transparent"
            style={{ left: `${prev.pct}%` }} title={`Previous: ${previous}`} aria-hidden />
        )}
        <span className="absolute top-1/2 w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white shadow ring-2 ring-[#0b1428]"
          style={{ left: `${pos.pct}%` }} aria-hidden />
      </div>
      <div className="relative h-4 mt-1 text-xs text-kairos-silver-dark">
        {refLow != null && layout.inStart > 0 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${layout.inStart}%` }}>{refLow}</span>
        )}
        {refHigh != null && layout.inEnd < 100 && (
          <span className="absolute -translate-x-1/2" style={{ left: `${layout.inEnd}%` }}>{refHigh}</span>
        )}
      </div>
    </div>
  );
}

/** Status in words with an icon — never color alone. Null status = no range. */
export function LabStatus({ status, flagged }: { status: string | null; flagged?: boolean }) {
  const base = "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium border";
  const chip = (() => {
    switch (status) {
      case "normal":
      case "optimal":
        return <span className={base} style={{ color: STATUS_COLORS.optimal, borderColor: `${STATUS_COLORS.optimal}55` }}><CheckCircle2 size={12} aria-hidden /> In range</span>;
      case "high":
        return <span className={base} style={{ color: STATUS_COLORS.attention, borderColor: `${STATUS_COLORS.attention}55` }}><ArrowUp size={12} aria-hidden /> High</span>;
      case "low":
        return <span className={base} style={{ color: STATUS_COLORS.attention, borderColor: `${STATUS_COLORS.attention}55` }}><ArrowDown size={12} aria-hidden /> Low</span>;
      case "critical":
        return <span className={base} style={{ color: STATUS_COLORS.critical, borderColor: `${STATUS_COLORS.critical}55` }}><AlertOctagon size={12} aria-hidden /> Critical</span>;
      default:
        return <span className={`${base} text-kairos-silver-dark border-kairos-border`}><Minus size={12} aria-hidden /> No range</span>;
    }
  })();
  return (
    <span className="inline-flex items-center gap-1.5 flex-wrap">
      {chip}
      {flagged && (
        <span className={base} style={{ color: STATUS_COLORS.info, borderColor: `${STATUS_COLORS.info}55` }}>Flagged by coach</span>
      )}
    </span>
  );
}
