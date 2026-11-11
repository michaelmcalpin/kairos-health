"use client";

import { useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

import { trpc } from "@/lib/trpc";
import {
  baselineBand, bucketSeries, targetBand, trendStats, RANGE_DAYS, RANGE_OPTIONS,
  type DailyPoint, type TrendRange,
} from "@/lib/charts/trend";
import { METRIC_BY_KEY } from "@/lib/health/metrics";
import { TrendChart, type TrendSeries } from "./TrendChart";
import { CHART_TOKENS, hueForMetric, tint } from "./theme";

/**
 * Chart-first header for a metric page: Day / Week / Month trend of the
 * merged daily series (Apple Health, Oura, devices and manual entries — the
 * same numbers as the rest of the app), with the client's 30-day baseline
 * band, the catalog target band, and a KPI strip. Empty state never draws
 * zeros; it says how to get data in.
 */

export interface TrendLineSpec { key: string; label?: string; color?: string }

export interface TrendViewSpec {
  id: string;
  label: string;
  lines: TrendLineSpec[];
  kind?: "line" | "bar";
  /** Display conversion from the stored unit (e.g. sleep minutes → hours). */
  factor?: number;
  unit?: string;
  decimals?: number;
  /** Hide the catalog target band for this view. */
  noTarget?: boolean;
}

export interface EmptyAction { label: string; href?: string; onClick?: () => void }

interface MetricTrendCardProps {
  title: string;
  /** One-line context under the title. */
  subtitle?: string;
  views: TrendViewSpec[];
  empty: { message: string; actions?: EmptyAction[] };
  /** Extra controls in the header (e.g. a "Log" icon button). */
  headerAction?: ReactNode;
  initialRange?: TrendRange;
  height?: number;
}

const localToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const fmtNum = (v: number, decimals: number) =>
  v.toLocaleString("en-US", { maximumFractionDigits: decimals, minimumFractionDigits: 0 });

const fmtDate = (d: string) =>
  new Date(d + "T12:00:00").toLocaleDateString("en-US", { month: "short", day: "numeric" });

export function MetricTrendCard({ title, subtitle, views, empty, headerAction, initialRange = "day", height }: MetricTrendCardProps) {
  const [range, setRange] = useState<TrendRange>(initialRange);
  const [viewId, setViewId] = useState(views[0]?.id);
  const view = views.find((v) => v.id === viewId) ?? views[0];
  const endDate = useMemo(localToday, []);

  const allKeys = useMemo(() => Array.from(new Set(views.flatMap((v) => v.lines.map((l) => l.key)))).slice(0, 8), [views]);
  const q = trpc.clientPortal.healthData.series.useQuery(
    { metrics: allKeys, days: Math.max(30, RANGE_DAYS[range]), date: endDate },
    { staleTime: 60_000, placeholderData: (prev) => prev, retry: false },
  );

  const model = useMemo(() => {
    const factor = view.factor ?? 1;
    const def = METRIC_BY_KEY[view.lines[0].key];
    const unit = view.unit ?? def?.unit ?? "";
    const decimals = view.decimals ?? def?.decimals ?? 0;
    const lines = view.lines.map((l, i) => {
      const raw = q.data?.series[l.key] ?? [];
      const points: DailyPoint[] = raw.map((p) => ({ date: p.date, value: p.value * factor, source: p.source }));
      const t = view.noTarget ? null : targetBand(l.key);
      const color = l.color ?? (i === 0 ? hueForMetric(l.key) : tint(hueForMetric(l.key)));
      return {
        key: l.key,
        label: l.label ?? METRIC_BY_KEY[l.key]?.label ?? l.key,
        color,
        points,
        target: t ? { low: t.low != null ? t.low * factor : null, high: t.high != null ? t.high * factor : null } : null,
      };
    });
    const series: TrendSeries[] = lines.map((l) => ({ key: l.key, label: l.label, color: l.color, buckets: bucketSeries(l.points, range, endDate) }));
    const baseline = baselineBand(lines[0].points, endDate);
    const stats = lines.map((l) => trendStats(l.points, endDate, l.target));
    const fmt = (v: number) => `${fmtNum(v, decimals)}${unit ? ` ${unit}` : ""}`;
    return { lines, series, baseline, stats, unit, decimals, fmt };
  }, [q.data, view, range, endDate]);

  const { lines, series, baseline, stats, unit, decimals, fmt } = model;
  const joined = (pick: (i: number) => number | null) => {
    const vals = lines.map((_, i) => pick(i));
    if (vals.every((v) => v == null)) return null;
    return vals.map((v) => (v == null ? "—" : fmtNum(v, decimals))).join(" / ");
  };
  const primary = stats[0];
  const vsBaseline = baseline && primary.avg7 != null && baseline.mean
    ? Math.round(((primary.avg7 - baseline.mean) / Math.abs(baseline.mean)) * 100)
    : null;

  const ariaSummary = primary.avg30 == null
    ? `${title}: no data in the last 30 days.`
    : `${title}: 30-day average ${fmt(primary.avg30)}${primary.latest != null && primary.latestDate ? `, latest ${fmt(primary.latest)} on ${fmtDate(primary.latestDate)}` : ""}${baseline ? `, your normal range ${fmt(baseline.low)} to ${fmt(baseline.high)}` : ""}.`;

  const targetLine = lines.find((l) => l.target)?.target;
  const caption = RANGE_OPTIONS.find((r) => r.key === range)?.caption;

  const kpis: Array<{ label: string; value: string | null; hint?: string }> = [
    { label: "Latest", value: joined((i) => stats[i].latest), hint: primary.latestDate ? fmtDate(primary.latestDate) : undefined },
    { label: "7-day average", value: joined((i) => stats[i].avg7), hint: vsBaseline != null ? `${vsBaseline > 0 ? "+" : ""}${vsBaseline}% vs your normal` : undefined },
    { label: "Your 30-day normal", value: baseline ? `${fmtNum(baseline.low, decimals)}–${fmtNum(baseline.high, decimals)}` : null, hint: baseline ? `${lines.length > 1 ? `${lines[0].label} · ` : ""}${baseline.n} days of data` : primary.daysWithData30 > 0 ? `Needs 7 days (${primary.daysWithData30} so far)` : undefined },
    targetLine
      ? { label: "Days in target", value: primary.inTargetPct != null ? `${primary.inTargetPct}%` : null, hint: "Last 30 days" }
      : { label: "Days logged", value: primary.daysWithData30 > 0 ? String(primary.daysWithData30) : null, hint: "Last 30 days" },
  ];

  return (
    <section className="kairos-card space-y-4" aria-labelledby={`trend-${view.id}-title`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 id={`trend-${view.id}-title`} className="font-heading font-semibold text-lg text-white">{title}</h2>
          {subtitle && <p className="text-sm text-kairos-silver-dark mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {views.length > 1 && (
            <div className="flex rounded-kairos-sm border border-kairos-border overflow-hidden" role="group" aria-label="Metric">
              {views.map((v) => (
                <button key={v.id} type="button" onClick={() => setViewId(v.id)} aria-pressed={v.id === view.id}
                  className={`px-3 py-1.5 text-xs font-medium transition-colors ${v.id === view.id ? "bg-white/10 text-white" : "text-kairos-silver-dark hover:text-white"}`}>
                  {v.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex rounded-kairos-sm border border-kairos-border overflow-hidden" role="group" aria-label="Time range">
            {RANGE_OPTIONS.map((r) => (
              <button key={r.key} type="button" onClick={() => setRange(r.key)} aria-pressed={r.key === range} title={r.caption}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${r.key === range ? "bg-white/10 text-white" : "text-kairos-silver-dark hover:text-white"}`}>
                {r.label}
              </button>
            ))}
          </div>
          {headerAction}
        </div>
      </div>

      <div className="relative">
        {q.isLoading ? (
          <div className="flex items-center justify-center rounded-kairos-sm border border-kairos-border" style={{ height: height ?? 220 }}>
            <Loader2 className="animate-spin text-kairos-silver-dark" aria-label="Loading chart" />
          </div>
        ) : q.error ? (
          <div className="flex items-center justify-center rounded-kairos-sm border border-kairos-border text-sm text-kairos-silver-dark" style={{ height: height ?? 220 }}>
            Couldn&apos;t load this chart. Please try again.
          </div>
        ) : (
          <TrendChart
            series={series}
            kind={view.kind}
            baseline={baseline}
            targets={lines.map((l) => l.target).filter((t): t is NonNullable<typeof t> => !!t)}
            formatValue={fmt}
            formatAxis={(v) => fmtNum(v, v !== 0 && Math.abs(v) < 10 ? Math.min(1, decimals) : 0)}
            height={height}
            ariaSummary={ariaSummary}
            empty={
              <div className="space-y-2">
                <p className="text-sm text-white">No data yet — {empty.message}</p>
                {empty.actions && empty.actions.length > 0 && (
                  <div className="flex flex-wrap justify-center gap-3">
                    {empty.actions.map((a) => a.href ? (
                      <Link key={a.label} href={a.href} className="text-sm text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline">{a.label}</Link>
                    ) : (
                      <button key={a.label} type="button" onClick={a.onClick} className="text-sm text-sky-300 hover:text-sky-200 underline-offset-2 hover:underline">{a.label}</button>
                    ))}
                  </div>
                )}
              </div>
            }
          />
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-kairos-silver-dark">
        {lines.map((l) => (
          <span key={l.key} className="flex items-center gap-1.5"><span className="w-3 h-0.5 rounded" style={{ background: l.color }} aria-hidden />{l.label}</span>
        ))}
        {baseline && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm" style={{ background: lines[0].color, opacity: CHART_TOKENS.baselineOpacity * 2 }} aria-hidden />
            Your 30-day normal{lines.length > 1 ? ` (${lines[0].label.toLowerCase()})` : ""}
          </span>
        )}
        {targetLine && (
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-sm border border-dashed" style={{ background: CHART_TOKENS.targetFill, borderColor: CHART_TOKENS.targetEdge }} aria-hidden />
            Target {lines.filter((l) => l.target).map((l) => {
              const t = l.target!;
              return t.low != null && t.high != null ? `${fmtNum(t.low, decimals)}–${fmtNum(t.high, decimals)}` : t.low != null ? `≥ ${fmtNum(t.low, decimals)}` : `≤ ${fmtNum(t.high!, decimals)}`;
            }).join(" / ")}{unit ? ` ${unit}` : ""}
          </span>
        )}
        <span className="flex items-center gap-1.5"><span className="w-3 border-t border-dashed" style={{ borderColor: lines[0].color }} aria-hidden />Period average</span>
        {caption && <span className="ml-auto">{caption}</span>}
      </div>

      {/* KPIs */}
      <dl className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="rounded-kairos-sm border border-kairos-border bg-white/[0.02] px-3 py-2.5">
            <dt className="text-xs text-kairos-silver-dark">{k.label}</dt>
            <dd className="mt-0.5">
              <span className="font-heading text-lg font-semibold text-white">{k.value ?? "—"}</span>
              {k.value != null && unit && k.label !== "Days in target" && k.label !== "Days logged" && (
                <span className="ml-1 text-xs text-kairos-silver-dark">{unit}</span>
              )}
              {k.hint && <span className="block text-xs text-kairos-silver-dark">{k.hint}</span>}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
