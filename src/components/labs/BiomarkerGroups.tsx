"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, ChevronRight, TrendingDown, TrendingUp, Minus } from "lucide-react";

import type { MarkerGroup, MarkerTrend } from "@/lib/labs/trends";
import { formatRange } from "@/lib/labs/range";
import { TrendChart } from "@/components/charts/TrendChart";
import { STATUS_COLORS } from "@/components/charts/theme";
import { RangeBar, LabStatus } from "./RangeBar";

/** Lab hue: neutral info blue so trend lines never read as a status. */
const LAB_LINE = STATUS_COLORS.info;

const fmtVal = (v: number) => v.toLocaleString("en-US", { maximumFractionDigits: 2 });
const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const shortDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", year: "2-digit" });

/** Tiny trend of a marker across panels; last point emphasized. */
export function LabSparkline({ values, width = 96, height = 28 }: { values: number[]; width?: number; height?: number }) {
  if (values.length < 2) return null;
  const min = Math.min(...values), max = Math.max(...values);
  const span = max - min || 1;
  const pts = values.map((v, i) => ({ x: 3 + (i / (values.length - 1)) * (width - 6), y: 3 + (1 - (v - min) / span) * (height - 6) }));
  const last = pts[pts.length - 1];
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <polyline points={pts.map((p) => `${p.x},${p.y}`).join(" ")} fill="none" stroke={LAB_LINE} strokeWidth={1.5} strokeLinejoin="round" strokeOpacity={0.8} />
      <circle cx={last.x} cy={last.y} r={3} fill={LAB_LINE} />
    </svg>
  );
}

function Change({ m }: { m: MarkerTrend }) {
  if (!m.previous) return null;
  const d = m.latest.value - m.previous.value;
  if (m.previous.unit && m.latest.unit && m.previous.unit !== m.latest.unit) return null;
  const Icon = Math.abs(d) < 1e-9 ? Minus : d > 0 ? TrendingUp : TrendingDown;
  return (
    <span className="inline-flex items-center gap-1 text-xs text-kairos-silver-dark">
      <Icon size={12} aria-hidden /> {d > 0 ? "+" : ""}{fmtVal(d)} since {shortDate(m.previous.date)}
    </span>
  );
}

export function MarkerTrendChart({ m }: { m: MarkerTrend }) {
  const buckets = m.points.map((p) => ({ start: p.date.slice(0, 10), end: p.date.slice(0, 10), label: shortDate(p.date), value: p.value, n: 1 }));
  const unit = m.unit ? ` ${m.unit}` : "";
  return (
    <TrendChart
      series={[{ key: m.code, label: m.name, color: LAB_LINE, buckets }]}
      targets={m.refLow != null || m.refHigh != null ? [{ low: m.refLow, high: m.refHigh }] : []}
      formatValue={(v) => `${fmtVal(v)}${unit}`}
      formatAxis={(v) => fmtVal(v)}
      formatBucket={(b) => fmtDate(b.start + "T12:00:00")}
      showAverage={false}
      height={180}
      ariaSummary={`${m.name}: ${m.points.length} results from ${fmtDate(m.points[0].date)} to ${fmtDate(m.latest.date)}, latest ${fmtVal(m.latest.value)}${unit}.`}
    />
  );
}

export function BiomarkerGroups({
  groups, detailExtra,
}: {
  groups: MarkerGroup[];
  /** Extra content inside an opened marker (e.g. an AI explanation button). */
  detailExtra?: (m: MarkerTrend) => ReactNode;
}) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className="space-y-6">
      {groups.map((g) => (
        <section key={g.key} aria-labelledby={`labgrp-${g.key}`}>
          <h3 id={`labgrp-${g.key}`} className="font-heading font-semibold text-white mb-2 flex items-center gap-2">
            {g.label} <span className="text-xs font-normal text-kairos-silver-dark">({g.markers.length})</span>
          </h3>
          <ul className="divide-y divide-kairos-border rounded-kairos-sm border border-kairos-border overflow-hidden">
            {g.markers.map((m) => {
              const isOpen = open === m.code;
              const range = formatRange(m.refLow, m.refHigh, m.unit);
              return (
                <li key={m.code} className="bg-white/[0.015]">
                  <button type="button" onClick={() => setOpen(isOpen ? null : m.code)} aria-expanded={isOpen}
                    className="w-full text-left px-4 py-3 grid grid-cols-1 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_minmax(0,1.4fr)_auto] gap-x-4 gap-y-2 items-center hover:bg-white/[0.03] transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-400">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{m.name}</p>
                      <p className="text-xs text-kairos-silver-dark">{range ? `Reference ${range}` : "No reference range"} · {fmtDate(m.latest.date)}</p>
                    </div>
                    <div>
                      <p className="text-white">
                        <span className="font-heading text-lg font-semibold">{fmtVal(m.latest.value)}</span>
                        {m.unit && <span className="ml-1 text-xs text-kairos-silver-dark">{m.unit}</span>}
                      </p>
                      <LabStatus status={m.status} flagged={m.flagged} />
                    </div>
                    <div className="min-w-0">
                      <RangeBar value={m.latest.value} refLow={m.refLow} refHigh={m.refHigh} unit={m.unit} previous={m.previous?.value ?? null} />
                      <Change m={m} />
                    </div>
                    <div className="flex items-center gap-2 justify-end">
                      <LabSparkline values={m.points.map((p) => p.value)} />
                      {isOpen ? <ChevronDown size={16} className="text-kairos-silver-dark" aria-hidden /> : <ChevronRight size={16} className="text-kairos-silver-dark" aria-hidden />}
                    </div>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 space-y-3">
                      {m.points.length >= 2 ? (
                        <MarkerTrendChart m={m} />
                      ) : (
                        <p className="text-sm text-kairos-silver-dark">One result so far. A trend appears after the next panel with this marker.</p>
                      )}
                      <table className="w-full text-xs">
                        <thead><tr className="text-kairos-silver-dark text-left"><th className="py-1 font-medium">Date</th><th className="py-1 font-medium">Value</th><th className="py-1 font-medium">Reference</th></tr></thead>
                        <tbody>
                          {[...m.points].reverse().map((p) => (
                            <tr key={p.resultId} className="text-kairos-silver border-t border-kairos-border/60">
                              <td className="py-1">{fmtDate(p.date)}</td>
                              <td className="py-1 text-white">{fmtVal(p.value)}{p.unit ? ` ${p.unit}` : ""}</td>
                              <td className="py-1">{formatRange(p.refLow, p.refHigh, p.unit) ?? "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {detailExtra?.(m)}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
