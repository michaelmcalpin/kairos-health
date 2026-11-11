"use client";

import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode, type KeyboardEvent } from "react";

import { niceTicks, type Bucket } from "@/lib/charts/trend";
import { CHART_TOKENS } from "./theme";

/**
 * Line / bar trend chart with an optional personal-baseline band, target
 * band(s), period-average line and an accessible tooltip. Missing buckets
 * are gaps (lines break, no bar) — never zeros. With no data at all the
 * frame shows `empty` instead of bare axes.
 */

export interface TrendSeries {
  key: string;
  label: string;
  color: string;
  /** All series share the same bucket boundaries. Values in display units. */
  buckets: Bucket[];
}

export interface TrendBand { low: number | null; high: number | null; label?: string }

interface TrendChartProps {
  series: TrendSeries[];
  kind?: "line" | "bar";
  /** Personal 30-day normal (display units). Drawn in the first series' hue. */
  baseline?: { low: number; high: number } | null;
  targets?: TrendBand[];
  /** Value with unit, for tooltips. */
  formatValue: (v: number) => string;
  /** Compact axis label. Defaults to formatValue. */
  formatAxis?: (v: number) => string;
  /** Tooltip heading for a bucket (date or range). */
  formatBucket?: (b: Bucket) => string;
  height?: number;
  empty?: ReactNode;
  /** Screen-reader summary, e.g. "Average 7.2 h, up 4% vs your normal". */
  ariaSummary: string;
  showAverage?: boolean;
}

const PAD = { top: 12, right: 12, bottom: 28, left: 48 };
const SOURCE_LABELS: Record<string, string> = {
  apple_health: "Apple Health", oura: "Oura", whoop: "WHOOP", garmin: "Garmin", fitbit: "Fitbit",
  withings: "Withings", dexcom: "Dexcom", manual: "Logged by you", checkin: "Check-in", import: "Import",
};
export const sourceLabel = (s: string | null | undefined) => (s ? SOURCE_LABELS[s] ?? s.replace(/_/g, " ") : null);

/** Width of whichever element the returned callback ref is attached to. */
function useWidth<T extends HTMLElement>(fallback = 640) {
  const [w, setW] = useState(fallback);
  const ro = useRef<ResizeObserver | null>(null);
  const ref = useCallback((el: T | null) => {
    ro.current?.disconnect();
    ro.current = null;
    if (!el || typeof ResizeObserver === "undefined") return;
    const obs = new ResizeObserver((entries) => {
      const cw = entries[0]?.contentRect.width;
      if (cw && cw > 0) setW(Math.round(cw));
    });
    obs.observe(el);
    ro.current = obs;
  }, []);
  useEffect(() => () => ro.current?.disconnect(), []);
  return [ref, w] as const;
}

export function TrendChart({
  series, kind = "line", baseline, targets = [], formatValue, formatAxis, formatBucket,
  height = 220, empty, ariaSummary, showAverage = true,
}: TrendChartProps) {
  const [wrapRef, width] = useWidth<HTMLDivElement>();
  const [hover, setHover] = useState<number | null>(null);
  const n = series[0]?.buckets.length ?? 0;
  const hasData = series.some((s) => s.buckets.some((b) => b.value != null));

  const geo = useMemo(() => {
    const vals: number[] = [];
    for (const s of series) for (const b of s.buckets) if (b.value != null) vals.push(b.value);
    if (baseline) vals.push(baseline.low, baseline.high);
    for (const t of targets) { if (t.low != null) vals.push(t.low); if (t.high != null) vals.push(t.high); }
    let min = vals.length ? Math.min(...vals) : 0;
    let max = vals.length ? Math.max(...vals) : 1;
    if (kind === "bar") min = Math.min(0, min);
    const span = max - min || Math.abs(max) || 1;
    if (kind !== "bar") min -= span * 0.08;
    max += span * 0.08;
    const ticks = niceTicks(min, max, 4);
    const lo = Math.min(min, ticks[0] ?? min);
    const hi = Math.max(max, ticks[ticks.length - 1] ?? max);
    const innerW = Math.max(10, width - PAD.left - PAD.right);
    const innerH = height - PAD.top - PAD.bottom;
    const slot = innerW / Math.max(1, n);
    const x = (i: number) => PAD.left + slot * i + slot / 2;
    const y = (v: number) => PAD.top + innerH - ((v - lo) / (hi - lo || 1)) * innerH;
    return { ticks: ticks.filter((t) => t >= lo && t <= hi), lo, hi, innerW, innerH, slot, x, y };
  }, [series, baseline, targets, kind, width, height, n]);

  const avg = useMemo(() => {
    const v = series[0]?.buckets.map((b) => b.value).filter((x): x is number => x != null) ?? [];
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  }, [series]);

  const axis = formatAxis ?? formatValue;
  const labelEvery = Math.max(1, Math.ceil(n / Math.max(2, Math.floor(geo.innerW / 72))));
  const bucketTitle = (b: Bucket) => formatBucket?.(b) ?? (b.start === b.end ? b.label : `${b.label} – ${b.end.slice(5)}`);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * width;
    const i = Math.floor((px - PAD.left) / geo.slot);
    setHover(i >= 0 && i < n ? i : null);
  };
  const onKey = (e: KeyboardEvent<SVGSVGElement>) => {
    if (e.key === "ArrowRight") { e.preventDefault(); setHover((h) => Math.min(n - 1, (h ?? n - 2) + 1)); }
    if (e.key === "ArrowLeft") { e.preventDefault(); setHover((h) => Math.max(0, (h ?? n) - 1)); }
    if (e.key === "Escape") setHover(null);
  };

  if (!hasData) {
    return (
      <div ref={wrapRef} className="relative rounded-kairos-sm border border-dashed border-kairos-border flex items-center justify-center text-center px-6"
        style={{ height }}>
        <span className="sr-only">{ariaSummary}</span>
        <div className="max-w-sm">{empty ?? <p className="text-sm text-kairos-silver-dark">No data yet.</p>}</div>
      </div>
    );
  }

  const band = (low: number | null, high: number | null) => {
    const top = geo.y(high ?? geo.hi);
    const bottom = geo.y(low ?? geo.lo);
    return { y: Math.min(top, bottom), h: Math.abs(bottom - top) };
  };

  // Line segments broken at gaps.
  const paths = series.map((s) => {
    let d = "";
    let pen = false;
    s.buckets.forEach((b, i) => {
      if (b.value == null) { pen = false; return; }
      d += `${pen ? "L" : "M"}${geo.x(i).toFixed(1)},${geo.y(b.value).toFixed(1)}`;
      pen = true;
    });
    return d;
  });

  const barW = Math.max(2, Math.min(28, (geo.slot * 0.7) / series.length));
  const hovered = hover != null ? series.map((s) => ({ s, b: s.buckets[hover] })) : null;
  const tipLeft = hover != null ? (geo.x(hover) / width) * 100 : 0;

  return (
    <div ref={wrapRef} className="relative w-full select-none">
      <svg
        width="100%" height={height} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none"
        role="img" aria-label={ariaSummary} tabIndex={0}
        className="block focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded-kairos-sm"
        onMouseMove={onMove} onMouseLeave={() => setHover(null)} onKeyDown={onKey} onBlur={() => setHover(null)}
      >
        {/* Grid + y axis */}
        {geo.ticks.map((t) => (
          <g key={t}>
            <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t)} y2={geo.y(t)} stroke={CHART_TOKENS.grid} strokeWidth={1} />
            <text x={PAD.left - 8} y={geo.y(t) + 4} textAnchor="end" fontSize={CHART_TOKENS.fontSize} fill={CHART_TOKENS.mutedText} fontFamily={CHART_TOKENS.fontFamily}>
              {axis(t)}
            </text>
          </g>
        ))}

        {/* Target band(s) */}
        {targets.map((t, i) => {
          if (t.low == null && t.high == null) return null;
          const { y, h } = band(t.low, t.high);
          return (
            <g key={`t${i}`}>
              <rect x={PAD.left} width={geo.innerW} y={y} height={h} fill={CHART_TOKENS.targetFill} />
              {t.low != null && <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t.low)} y2={geo.y(t.low)} stroke={CHART_TOKENS.targetEdge} strokeDasharray="3 4" strokeWidth={1} />}
              {t.high != null && <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(t.high)} y2={geo.y(t.high)} stroke={CHART_TOKENS.targetEdge} strokeDasharray="3 4" strokeWidth={1} />}
            </g>
          );
        })}

        {/* Personal baseline band */}
        {baseline && (() => {
          const { y, h } = band(baseline.low, baseline.high);
          return <rect x={PAD.left} width={geo.innerW} y={y} height={Math.max(1, h)} fill={series[0]?.color} opacity={CHART_TOKENS.baselineOpacity} rx={2} />;
        })()}

        {/* Period average */}
        {showAverage && avg != null && (
          <line x1={PAD.left} x2={width - PAD.right} y1={geo.y(avg)} y2={geo.y(avg)} stroke={series[0]?.color} strokeOpacity={0.6} strokeDasharray="6 5" strokeWidth={1} />
        )}

        {/* Hover guide */}
        {hover != null && (
          <line x1={geo.x(hover)} x2={geo.x(hover)} y1={PAD.top} y2={PAD.top + geo.innerH} stroke={CHART_TOKENS.guide} strokeWidth={1} />
        )}

        {/* Data */}
        <g className="motion-safe:animate-fade-in">
          {kind === "bar"
            ? series.map((s, si) => s.buckets.map((b, i) => b.value == null ? null : (
                <rect key={`${s.key}${i}`}
                  x={geo.x(i) - (barW * series.length) / 2 + si * barW} width={barW - 1}
                  y={Math.min(geo.y(b.value), geo.y(Math.max(0, geo.lo)))}
                  height={Math.max(1, Math.abs(geo.y(Math.max(0, geo.lo)) - geo.y(b.value)))}
                  rx={2} fill={s.color} opacity={hover == null || hover === i ? 0.95 : 0.55} />
              )))
            : series.map((s, si) => (
                <g key={s.key}>
                  <path d={paths[si]} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                  {s.buckets.map((b, i) => b.value == null ? null : (
                    <circle key={i} cx={geo.x(i)} cy={geo.y(b.value)} r={hover === i ? 4.5 : n > 40 ? 0 : 2.5}
                      fill={s.color} stroke="#0b1428" strokeWidth={hover === i ? 2 : 0} />
                  ))}
                  {/* Isolated points (no neighbours) stay visible even when dots are hidden. */}
                  {n > 40 && s.buckets.map((b, i) => b.value != null && s.buckets[i - 1]?.value == null && s.buckets[i + 1]?.value == null
                    ? <circle key={`iso${i}`} cx={geo.x(i)} cy={geo.y(b.value)} r={2.5} fill={s.color} /> : null)}
                </g>
              ))}
        </g>

        {/* X axis labels */}
        {series[0]?.buckets.map((b, i) => (i % labelEvery === 0 || i === n - 1) && (i === n - 1 || n - 1 - i >= labelEvery / 2) ? (
          <text key={i} x={geo.x(i)} y={height - 8} textAnchor="middle" fontSize={CHART_TOKENS.fontSize} fill={CHART_TOKENS.mutedText} fontFamily={CHART_TOKENS.fontFamily}>
            {b.label}
          </text>
        ) : null)}
      </svg>

      {hovered && hover != null && (
        <div
          className="pointer-events-none absolute top-0 z-10 rounded-kairos-sm border border-kairos-border px-3 py-2 shadow-lg text-xs"
          style={{ left: `${tipLeft}%`, transform: `translateX(${tipLeft > 60 ? "-105%" : "8px"})`, background: CHART_TOKENS.tooltipBg }}
          role="status"
        >
          <p className="font-heading font-semibold text-white mb-1 whitespace-nowrap">{bucketTitle(hovered[0].b)}</p>
          {hovered.map(({ s, b }) => (
            <p key={s.key} className="flex items-center gap-1.5 whitespace-nowrap text-kairos-silver">
              <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: s.color }} aria-hidden />
              {series.length > 1 && <span className="text-kairos-silver-dark">{s.label}:</span>}
              <span className="text-white font-semibold">{b.value != null ? formatValue(b.value) : "No data"}</span>
            </p>
          ))}
          {hovered[0].b.start === hovered[0].b.end
            ? sourceLabel(hovered[0].b.source) && <p className="text-kairos-silver-dark mt-0.5">Source: {sourceLabel(hovered[0].b.source)}</p>
            : hovered[0].b.n > 0 && <p className="text-kairos-silver-dark mt-0.5">Average of {hovered[0].b.n} day{hovered[0].b.n === 1 ? "" : "s"}</p>}
        </div>
      )}
    </div>
  );
}
