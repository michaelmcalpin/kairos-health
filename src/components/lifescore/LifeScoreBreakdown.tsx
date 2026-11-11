"use client";

/**
 * Core LifeScore with its two halves: Physical (60%) and Mental (40%).
 * Physical shows its four parts (health data, labs, medications, genetics) and
 * the measures to work on. Mental shows Mind / Purpose / Relationships / Work.
 * Used by the client LifeScore page and the coach's client view.
 */
import { HeartPulse, Brain, Compass, Users, Briefcase, Activity, FlaskConical, Pill, Dna, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/utils/cn";

type Sentiment = "well" | "steady" | "struggling" | "no_data";

export interface LifeScoreBreakdownData {
  score: number | null;
  hasData?: boolean;
  physical?: {
    score: number | null;
    sentiment: Sentiment | string;
    parts: Array<{ key: string; label: string; score: number | null; weight: number; detail: string | null }>;
    focus?: Array<{ key: string; label: string; score: number }>;
    strengths?: Array<{ key: string; label: string; score: number }>;
  };
  mental?: { score: number | null; sentiment: Sentiment | string; practice?: { minPerDay: number; bonus: number } | null };
  dimensions: Array<{ dimension: string; score: number | null; sentiment: Sentiment | string }>;
}

const MENTAL = [
  { key: "mind", label: "Mind", Icon: Brain, color: "#8F7FD6" },
  { key: "purpose", label: "Purpose", Icon: Compass, color: "#7FB5E0" },
  { key: "relationships", label: "Relationships", Icon: Users, color: "#E78FB1" },
  { key: "work", label: "Work", Icon: Briefcase, color: "#E0A24A" },
];

const PART_ICON: Record<string, typeof Activity> = {
  health_data: Activity, labs: FlaskConical, medications: Pill, genetics: Dna,
};

const SENTIMENT: Record<string, { label: string; cls: string; Icon: typeof TrendingUp }> = {
  well: { label: "Going well", cls: "text-emerald-300", Icon: TrendingUp },
  steady: { label: "Steady", cls: "text-sky-300", Icon: Minus },
  struggling: { label: "Needs care", cls: "text-amber-300", Icon: TrendingDown },
  no_data: { label: "No data yet", cls: "text-gray-500", Icon: Minus },
};

function Ring({ score, size = 150, label }: { score: number | null; size?: number; label: string }) {
  const stroke = 12, r = (size - stroke) / 2, circ = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2b45" strokeWidth={stroke} fill="none" />
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#4A90D9" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`} transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-heading font-bold text-white">{score ?? "—"}</span>
        <span className="text-[11px] text-gray-500 mt-0.5">{label}</span>
      </div>
    </div>
  );
}

function Bar({ value, color }: { value: number | null; color: string }) {
  return (
    <div className="h-1.5 bg-kairos-royal-surface rounded-full overflow-hidden flex-1">
      <div className="h-full rounded-full transition-all duration-700" style={{ width: `${value ?? 0}%`, background: color }} />
    </div>
  );
}

function SideTile({ title, weight, score, sentiment, color }: { title: string; weight: number; score: number | null; sentiment: string; color: string }) {
  const s = SENTIMENT[sentiment] ?? SENTIMENT.no_data;
  return (
    <div className="rounded-xl bg-kairos-royal-surface p-3 border border-kairos-border">
      <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">{title} · {weight}%</p>
      <p className="text-3xl font-heading font-bold mt-1" style={{ color }}>{score ?? "—"}</p>
      <p className={cn("text-[11px] flex items-center gap-1", s.cls)}><s.Icon size={11} /> {s.label}</p>
    </div>
  );
}

export function LifeScoreBreakdown({ data, compact = false }: { data: LifeScoreBreakdownData; compact?: boolean }) {
  const dims = new Map(data.dimensions.map((d) => [d.dimension, d]));
  const physical = data.physical ?? {
    score: dims.get("body")?.score ?? null, sentiment: dims.get("body")?.sentiment ?? "no_data", parts: [],
  };
  const mental = data.mental ?? { score: null, sentiment: "no_data" };

  return (
    <div className="space-y-5">
      <div className="flex flex-col sm:flex-row items-center gap-5">
        <Ring score={data.score} label="Core LifeScore" size={compact ? 120 : 150} />
        <div className="grid grid-cols-2 gap-3 flex-1 w-full">
          <SideTile title="Physical" weight={60} score={physical.score} sentiment={physical.sentiment} color="#5DCAA5" />
          <SideTile title="Mental" weight={40} score={mental.score} sentiment={mental.sentiment} color="#8F7FD6" />
        </div>
      </div>

      <div className={cn("grid gap-5", compact ? "grid-cols-1" : "grid-cols-1 md:grid-cols-2")}>
        {/* Physical parts */}
        <div>
          <h3 className="text-xs font-heading font-bold text-[#5DCAA5] flex items-center gap-1.5 mb-2">
            <HeartPulse size={13} /> Physical
          </h3>
          <div className="space-y-2.5">
            {physical.parts.length === 0 && <p className="text-xs text-gray-500">No physical data yet.</p>}
            {physical.parts.map((p) => {
              const Icon = PART_ICON[p.key] ?? Activity;
              return (
                <div key={p.key}>
                  <div className="flex items-center gap-2">
                    <Icon size={13} className="text-gray-400 shrink-0" />
                    <span className="text-xs text-gray-300 w-40 shrink-0">{p.label}</span>
                    <Bar value={p.score} color="#5DCAA5" />
                    <span className="text-sm font-semibold text-white w-8 text-right">{p.score ?? "—"}</span>
                  </div>
                  <p className="text-[10px] text-gray-500 ml-5">
                    {p.detail ?? "No data yet"}{p.weight ? ` · ${p.weight}% of Physical` : ""}
                  </p>
                </div>
              );
            })}
          </div>
          {!!physical.focus?.length && (
            <div className="mt-3">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Work on</p>
              <div className="flex flex-wrap gap-1.5">
                {physical.focus.map((m) => (
                  <span key={m.key} className="text-[11px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">{m.label} · {m.score}</span>
                ))}
              </div>
            </div>
          )}
          {!!physical.strengths?.length && (
            <div className="mt-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-500 font-semibold mb-1">Strengths</p>
              <div className="flex flex-wrap gap-1.5">
                {physical.strengths.map((m) => (
                  <span key={m.key} className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">{m.label} · {m.score}</span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Mental areas */}
        <div>
          <h3 className="text-xs font-heading font-bold text-[#8F7FD6] flex items-center gap-1.5 mb-2">
            <Brain size={13} /> Mental
          </h3>
          <div className="space-y-2.5">
            {MENTAL.map((d) => {
              const r = dims.get(d.key);
              return (
                <div key={d.key} className="flex items-center gap-2">
                  <d.Icon size={13} style={{ color: d.color }} className="shrink-0" />
                  <span className="text-xs text-gray-300 w-28 shrink-0">{d.label}</span>
                  <Bar value={r?.score ?? null} color={d.color} />
                  <span className="text-sm font-semibold text-white w-8 text-right">{r?.score ?? "—"}</span>
                </div>
              );
            })}
          </div>
          {data.mental?.practice && data.mental.practice.bonus > 0 && (
            <p className="text-[11px] text-gray-400 mt-2">
              Mindful minutes: {data.mental.practice.minPerDay} a day, adding +{data.mental.practice.bonus} to Mind.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
