"use client";

/**
 * "Your LifeScore, explained" — opened by tapping any score ring.
 * What the score is made of (Physical and Mental), every measure behind it,
 * and the actions that would raise it most, with estimated points.
 */
import Link from "next/link";
import { ArrowLeft, ArrowRight, HeartPulse, Brain, TrendingUp, Info } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { LifeScoreBreakdown, type LifeScoreBreakdownData } from "@/components/lifescore/LifeScoreBreakdown";
import { ScoreRing } from "@/components/today/ScoreRings";

interface Action { key: string; area: "physical" | "mental"; title: string; detail: string; gain: number | null; href: string }
type Score = LifeScoreBreakdownData & {
  actions?: Action[];
  physical?: LifeScoreBreakdownData["physical"] & { measures?: Array<{ key: string; label: string; score: number }> };
};

function GainBadge({ gain }: { gain: number | null }) {
  if (gain == null) {
    return <span className="text-xs font-semibold px-2 py-1 rounded-full bg-kairos-gold/10 text-kairos-gold whitespace-nowrap">Unlocks more of your score</span>;
  }
  return (
    <span className="text-xs font-semibold px-2 py-1 rounded-full bg-success/15 text-success whitespace-nowrap">
      up to +{gain >= 10 ? Math.round(gain) : gain} pts
    </span>
  );
}

function ActionList({ actions, empty }: { actions: Action[]; empty: string }) {
  if (actions.length === 0) return <p className="text-sm text-kairos-silver-dark">{empty}</p>;
  return (
    <ul className="space-y-2">
      {actions.map((a) => (
        <li key={a.key}>
          <Link href={a.href} className="flex items-start gap-3 rounded-xl border border-kairos-border p-3 hover:border-kairos-gold/40 transition-colors group">
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm font-heading font-semibold text-white">{a.title}</p>
                <GainBadge gain={a.gain} />
              </div>
              <p className="text-sm text-kairos-silver-dark mt-1">{a.detail}</p>
            </div>
            <ArrowRight size={16} className="text-kairos-silver-dark group-hover:text-kairos-gold mt-1 shrink-0" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function scoreColor(s: number) {
  return s >= 85 ? "#4A9D5B" : s >= 70 ? "#5DCAA5" : s >= 50 ? "#D4A843" : "#E07070";
}

export default function LifeScoreExplainedPage() {
  const q = trpc.clientPortal.lifeScore.getScore.useQuery(undefined, { retry: false });
  const data = q.data as Score | undefined;
  const actions = data?.actions ?? [];
  const physicalActions = actions.filter((a) => a.area === "physical");
  const mentalActions = actions.filter((a) => a.area === "mental");
  const measures = data?.physical?.measures ?? [];

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link href="/dashboard" className="text-sm text-kairos-silver-dark hover:text-white inline-flex items-center gap-1">
          <ArrowLeft size={14} /> Today
        </Link>
        <h1 className="text-2xl font-heading font-bold text-white mt-2">Your LifeScore, explained</h1>
        <p className="text-sm text-kairos-silver-dark mt-1">
          Your Core LifeScore is 60% Physical and 40% Mental, averaged over the last 7 days so one rough day never sinks it.
          Anything you haven&apos;t tracked is left out, never counted as zero.
        </p>
      </div>

      {q.isLoading && <div className="kairos-card p-6 text-sm text-kairos-silver-dark">Loading your score…</div>}
      {q.isError && <div className="kairos-card p-6 text-sm text-kairos-silver-dark">Your score couldn&apos;t load right now. Try again in a moment.</div>}

      {data && (
        <>
          {/* Hero */}
          <section className="kairos-card p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 items-center">
            {([
              ["Core LifeScore", data.score, "#4A90D9", "#core"],
              ["Physical", data.physical?.score ?? null, "#5DCAA5", "#physical"],
              ["Mental", data.mental?.score ?? null, "#8F7FD6", "#mental"],
            ] as const).map(([label, score, color, href]) => (
              <a key={label} href={href} className="flex sm:flex-col items-center gap-4 sm:gap-2 rounded-xl p-2 hover:bg-white/5">
                <ScoreRing score={score} color={color} size={label === "Core LifeScore" ? 112 : 96} />
                <p className="text-sm font-heading font-semibold text-white">{label}</p>
              </a>
            ))}
          </section>

          {/* Top actions */}
          <section id="core" className="kairos-card p-5 space-y-3">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-kairos-gold" /> How to raise your score
            </h2>
            <ActionList actions={actions.slice(0, 5)} empty="You're at or near target on everything we track. Keep doing what you're doing — and keep checking in." />
            <p className="text-xs text-kairos-silver-dark flex items-start gap-1.5">
              <Info size={14} className="shrink-0 mt-0.5" />
              Points are estimates: what your Core LifeScore could gain if that one thing reached its target, with everything else the same.
              Better sleep, more movement, daily check-ins and following your protocol all add up.
            </p>
          </section>

          {/* Physical */}
          <section id="physical" className="kairos-card p-5 space-y-4 scroll-mt-24">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <HeartPulse size={18} className="text-[#5DCAA5]" /> Physical · {data.physical?.score ?? "—"}
            </h2>
            <p className="text-sm text-kairos-silver-dark">
              Built from your device data (sleep, heart, activity, vitals, workouts, plan goals), your labs, how well you follow your protocol, and follow-through on your genetics.
            </p>
            <LifeScoreBreakdown data={data} focus="physical" hideRing />
            {measures.length > 0 && (
              <div>
                <h3 className="text-sm font-heading font-semibold text-white mb-2">Every measure in your score</h3>
                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-2">
                  {measures.map((m) => (
                    <li key={m.key} className="flex items-center gap-2">
                      <span className="text-sm text-kairos-silver flex-1 truncate">{m.label}</span>
                      <span className="w-24 h-1.5 rounded-full bg-white/10 overflow-hidden">
                        <span className="block h-full rounded-full" style={{ width: `${m.score}%`, background: scoreColor(m.score) }} />
                      </span>
                      <span className="text-sm font-semibold text-white w-8 text-right">{m.score}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div>
              <h3 className="text-sm font-heading font-semibold text-white mb-2">To raise Physical</h3>
              <ActionList actions={physicalActions} empty="Nothing stands out — your physical measures are at or near target." />
            </div>
          </section>

          {/* Mental */}
          <section id="mental" className="kairos-card p-5 space-y-4 scroll-mt-24">
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Brain size={18} className="text-[#8F7FD6]" /> Mental · {data.mental?.score ?? "—"}
            </h2>
            <p className="text-sm text-kairos-silver-dark">
              Built from your daily 1–5 ratings of Mind, Purpose, Relationships and Work, gently adjusted by your private reflections.
              Mindful minutes from Apple Health add a small bonus to Mind. Your coach sees scores and trends, never what you write.
            </p>
            <LifeScoreBreakdown data={data} focus="mental" hideRing />
            <div>
              <h3 className="text-sm font-heading font-semibold text-white mb-2">To raise Mental</h3>
              <ActionList actions={mentalActions} empty="Your mental areas look strong. Keep up your daily check-ins." />
            </div>
            <Link href="/lifescore" className="inline-flex items-center gap-1 text-sm font-semibold text-kairos-gold">
              Do today&apos;s check-in <ArrowRight size={14} />
            </Link>
          </section>
        </>
      )}
    </div>
  );
}
