"use client";

/**
 * Today hero: three score rings — Core LifeScore, Physical, Mental. Tapping a
 * ring opens its contributors (LifeScoreBreakdown focused on that score).
 * Missing scores show "—" with a reason, never 0.
 */
import { useState } from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";

import { cn } from "@/utils/cn";
import {
  LifeScoreBreakdown,
  type LifeScoreBreakdownData,
  type LifeScoreFocus,
} from "@/components/lifescore/LifeScoreBreakdown";

const SENTIMENT_LABEL: Record<string, string> = {
  well: "Going well",
  steady: "Steady",
  struggling: "Needs care",
};

const RING_COLOR: Record<LifeScoreFocus, string> = {
  core: "#4A90D9",
  physical: "#5DCAA5",
  mental: "#8F7FD6",
};

function Ring({ score, color, size = 104 }: { score: number | null; color: string; size?: number }) {
  const stroke = 9;
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2b45" strokeWidth={stroke} fill="none" />
        {score != null && (
          <circle
            cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
            strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            className="transition-all duration-700"
          />
        )}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-3xl font-heading font-bold text-white">{score ?? "—"}</span>
      </div>
    </div>
  );
}

const MENTAL_LABEL: Record<string, string> = { mind: "Mind", purpose: "Purpose", relationships: "Relationships", work: "Work" };

/** One short "why" line under each ring, from the score result only. */
function whyLine(focus: LifeScoreFocus, d: LifeScoreBreakdownData): string {
  if (focus === "core") {
    if (d.score == null) return "Connect a device or do a check-in to start your score.";
    const sides = [d.physical?.sentiment, d.mental?.sentiment].filter((s): s is string => !!s && s !== "no_data");
    const key = sides.includes("struggling") ? "struggling" : sides.length > 0 && sides.every((s) => s === "well") ? "well" : "steady";
    return `${SENTIMENT_LABEL[key]} · 60% Physical, 40% Mental`;
  }
  if (focus === "physical") {
    const p = d.physical;
    if (!p || p.score == null) return "Connect a device or add labs to see this.";
    const strength = p.strengths?.[0];
    const work = p.focus?.[0];
    if (work) return `Work on: ${work.label}`;
    if (strength) return `Strongest: ${strength.label}`;
    return SENTIMENT_LABEL[p.sentiment] ?? "Steady";
  }
  const m = d.mental;
  if (!m || m.score == null) return "Do a LifeScore check-in to see this.";
  const scored = d.dimensions
    .filter((x) => x.dimension in MENTAL_LABEL && x.score != null)
    .sort((a, b) => (a.score as number) - (b.score as number));
  const low = scored[0];
  if (low && scored.length > 1 && (low.score as number) < 60) return `Lowest: ${MENTAL_LABEL[low.dimension]}`;
  return SENTIMENT_LABEL[m.sentiment] ?? "Steady";
}

export function ScoreRings({ data, loading }: { data: LifeScoreBreakdownData | undefined; loading: boolean }) {
  const [open, setOpen] = useState<LifeScoreFocus | null>(null);

  const rings: Array<{ key: LifeScoreFocus; label: string; score: number | null }> = [
    { key: "core", label: "Core LifeScore", score: data?.score ?? null },
    { key: "physical", label: "Physical", score: data?.physical?.score ?? null },
    { key: "mental", label: "Mental", score: data?.mental?.score ?? null },
  ];

  return (
    <section className="kairos-card p-5" aria-label="Your scores">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {rings.map((r) => {
          const selected = open === r.key;
          return (
            <button
              key={r.key}
              type="button"
              onClick={() => setOpen(selected ? null : r.key)}
              aria-expanded={selected}
              aria-controls="today-score-contributors"
              disabled={loading || !data}
              className={cn(
                "flex sm:flex-col items-center gap-4 sm:gap-2 rounded-xl p-3 text-left sm:text-center border transition-colors",
                selected ? "border-kairos-gold/50 bg-kairos-gold/5" : "border-transparent hover:border-kairos-border",
              )}
            >
              <Ring score={loading ? null : r.score} color={RING_COLOR[r.key]} />
              <div className="min-w-0">
                <p className="text-sm font-heading font-semibold text-white">{r.label}</p>
                <p className="text-xs text-kairos-silver-dark">
                  {loading ? "Loading…" : data ? whyLine(r.key, data) : "Score unavailable right now."}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      {open && data && (
        <div id="today-score-contributors" className="mt-5 border-t border-kairos-border pt-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-heading font-semibold text-white">
              {open === "core" ? "What makes up your Core LifeScore" : open === "physical" ? "Physical contributors" : "Mental contributors"}
            </h3>
            <Link href="/lifescore" className="text-xs text-kairos-gold font-semibold flex items-center gap-1">
              Trend & check-in <ChevronRight size={14} />
            </Link>
          </div>
          <LifeScoreBreakdown data={data} focus={open} hideRing compact={open !== "core"} />
        </div>
      )}
    </section>
  );
}
