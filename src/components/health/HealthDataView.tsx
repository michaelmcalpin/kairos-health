"use client";

/**
 * Every daily health number from Apple Health, Oura and other devices,
 * grouped by body system: latest value, 7- and 30-day averages, a 30-day
 * sparkline, and the trend. Plus recent workouts.
 * Used by the client Health Data page and the coach's client view.
 */
import { useState } from "react";
import { TrendingUp, TrendingDown, Minus, Dumbbell, Info } from "lucide-react";

import { cn } from "@/utils/cn";

export interface MetricSummaryView {
  key: string; label: string; unit: string; decimals: number; about: string;
  latest: number | null; latestDate: string | null; avg7: number | null; avg30: number | null;
  trendPct: number | null; better: string | null; source: string | null; series: Array<number | null>;
}
export interface HealthDataSummaryView {
  endDate: string;
  metricCount: number;
  groups: Array<{ key: string; title: string; blurb: string; metrics: MetricSummaryView[] }>;
  workouts: Array<{ id: string; activity: string; startAt: string; durationMin: number | null; energyKcal: number | null; distanceM: number | null; avgHr: number | null; maxHr: number | null; source: string }>;
}

const SOURCE_LABEL: Record<string, string> = {
  apple_health: "Apple Health", oura: "Oura", garmin: "Garmin", whoop: "WHOOP", fitbit: "Fitbit",
  withings: "Withings", dexcom: "Dexcom", manual: "Manual", checkin: "Check-in",
};

function fmt(m: MetricSummaryView, v: number | null): string {
  if (v == null) return "—";
  if (m.unit === "min" && m.key.startsWith("sleep_") && v >= 60) return `${Math.floor(v / 60)}h ${Math.round(v % 60)}m`;
  return v.toLocaleString("en-US", { maximumFractionDigits: m.decimals });
}

/** Is this trend good news? Depends on whether higher or lower is better. */
function trendTone(m: MetricSummaryView): "good" | "bad" | "flat" {
  if (m.trendPct == null || Math.abs(m.trendPct) < 3) return "flat";
  const up = m.trendPct > 0;
  if (m.better === "higher" || m.better === "baseline") return up ? "good" : "bad";
  if (m.better === "lower") return up ? "bad" : "good";
  return "flat";
}

function Sparkline({ series, tone }: { series: Array<number | null>; tone: "good" | "bad" | "flat" }) {
  const pts = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return <div className="h-8" />;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const w = 120, h = 32, span = max - min || 1;
  const d = pts.map((p, j) => `${j ? "L" : "M"}${((p.i / (series.length - 1)) * w).toFixed(1)},${(h - 2 - ((p.v - min) / span) * (h - 4)).toFixed(1)}`).join(" ");
  const color = tone === "good" ? "#5DCAA5" : tone === "bad" ? "#E0A24A" : "#7FB5E0";
  return (
    <svg width={w} height={h} className="overflow-visible" aria-hidden>
      <path d={d} fill="none" stroke={color} strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function MetricCard({ m }: { m: MetricSummaryView }) {
  const [about, setAbout] = useState(false);
  const tone = trendTone(m);
  const TIcon = m.trendPct == null || Math.abs(m.trendPct) < 3 ? Minus : m.trendPct > 0 ? TrendingUp : TrendingDown;
  return (
    <div className="rounded-xl border border-kairos-border bg-gray-800/20 p-3">
      <div className="flex items-start justify-between gap-2">
        <button type="button" onClick={() => setAbout((a) => !a)} className="text-left text-xs text-gray-300 font-semibold flex items-center gap-1 hover:text-white">
          {m.label} <Info size={11} className="text-gray-500" />
        </button>
        <span className={cn("text-xs flex items-center gap-0.5",
          tone === "good" ? "text-emerald-300" : tone === "bad" ? "text-amber-300" : "text-gray-500")}>
          <TIcon size={12} />{m.trendPct != null && Math.abs(m.trendPct) >= 3 ? `${Math.abs(m.trendPct)}%` : ""}
        </span>
      </div>
      <div className="flex items-end justify-between gap-2 mt-1">
        <p className="text-xl font-heading font-bold text-white">
          {fmt(m, m.latest)}{m.unit && !(m.unit === "min" && m.key.startsWith("sleep_") && (m.latest ?? 0) >= 60) && <span className="text-xs text-gray-400 font-normal ml-1">{m.unit}</span>}
        </p>
        <Sparkline series={m.series} tone={tone} />
      </div>
      <p className="text-xs text-gray-500 mt-1">
        7-day {fmt(m, m.avg7)} · 30-day {fmt(m, m.avg30)}{m.source ? ` · ${SOURCE_LABEL[m.source] ?? m.source}` : ""}
      </p>
      {about && <p className="text-xs text-gray-400 mt-1.5 leading-relaxed">{m.about}</p>}
    </div>
  );
}

export function HealthDataView({ data }: { data: HealthDataSummaryView }) {
  const [group, setGroup] = useState<string>("all");
  if (data.metricCount === 0 && data.workouts.length === 0) {
    return (
      <div className="kairos-card text-center py-10">
        <p className="text-sm text-gray-300">No device data yet.</p>
        <p className="text-xs text-gray-500 mt-1">Connect Apple Health in the iOS app, or connect Oura, to see your numbers here.</p>
      </div>
    );
  }
  const shown = group === "all" ? data.groups : data.groups.filter((g) => g.key === group);
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-1.5">
        {[{ key: "all", title: `All (${data.metricCount})` }, ...data.groups.map((g) => ({ key: g.key, title: `${g.title} (${g.metrics.length})` }))].map((g) => (
          <button key={g.key} type="button" onClick={() => setGroup(g.key)}
            className={cn("text-xs px-3 py-1.5 rounded-full border transition-colors",
              group === g.key ? "bg-kairos-gold text-kairos-royal-dark border-kairos-gold font-semibold" : "border-kairos-border text-gray-300 hover:bg-kairos-card-hover")}>
            {g.title}
          </button>
        ))}
      </div>

      {shown.map((g) => (
        <section key={g.key} className="kairos-card">
          <h3 className="text-base font-heading font-bold text-kairos-gold">{g.title}</h3>
          <p className="text-xs text-gray-400 mb-3">{g.blurb}</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {g.metrics.map((m) => <MetricCard key={m.key} m={m} />)}
          </div>
        </section>
      ))}

      {(group === "all" || group === "activity") && data.workouts.length > 0 && (
        <section className="kairos-card">
          <h3 className="text-base font-heading font-bold text-kairos-gold flex items-center gap-2"><Dumbbell size={15} /> Workouts</h3>
          <p className="text-xs text-gray-400 mb-3">Recorded by your watch, phone or ring in the last 30 days.</p>
          <div className="divide-y divide-kairos-border">
            {data.workouts.map((w) => (
              <div key={w.id} className="py-2 flex items-center justify-between gap-3 text-xs">
                <div>
                  <p className="text-sm text-white font-semibold">{w.activity}</p>
                  <p className="text-gray-500">{new Date(w.startAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <div className="text-right text-gray-300">
                  <p>{w.durationMin != null ? `${Math.round(w.durationMin)} min` : ""}{w.energyKcal != null ? ` · ${Math.round(w.energyKcal)} kcal` : ""}</p>
                  <p className="text-gray-500">
                    {w.distanceM != null && w.distanceM > 0 ? `${(w.distanceM / 1609.344).toFixed(2)} mi` : ""}
                    {w.avgHr != null ? `${w.distanceM ? " · " : ""}avg ${Math.round(w.avgHr)} bpm` : ""}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
