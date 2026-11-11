"use client";

/**
 * Client "Today" (route stays /dashboard).
 *
 * Leads with three score rings (Core LifeScore, Physical, Mental → tap for
 * contributors), one rule-based insight from the client's own numbers, and
 * today's plan as a checklist that writes the same adherence the coach sees.
 * New clients get a first-run card (what to connect / log first) instead of
 * a wall of empty metric tiles. Detailed metrics live under Body.
 */
import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Bell,
  CheckCircle2,
  ChevronRight,
  Circle,
  Lightbulb,
} from "lucide-react";

import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";
import { ScoreRings } from "@/components/today/ScoreRings";
import { TodayChecklist } from "@/components/today/TodayChecklist";
import { selectInsight, type InsightMetric } from "@/lib/today/insight";
import { firstRunSteps, isBrandNew, type FirstRunStep } from "@/lib/today/first-run";

function localDate(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function FirstRunCard({ steps, prominent }: { steps: FirstRunStep[]; prominent: boolean }) {
  const done = steps.filter((s) => s.done).length;
  return (
    <section className={cn("kairos-card p-5", prominent && "border-kairos-gold/40")} aria-label="Get started">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-heading font-bold text-lg text-white">
            {prominent ? "Welcome — let's get your scores started" : "Finish setting up"}
          </h2>
          <p className="text-sm text-kairos-silver-dark mt-0.5">
            Your scores fill in from real data only. Start with whichever is easiest.
          </p>
        </div>
        <span className="text-xs font-heading font-semibold text-kairos-gold shrink-0">
          {done} of {steps.length} done
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {steps.map((s) => (
          <li key={s.key}>
            <Link
              href={s.href}
              className={cn(
                "flex items-start gap-3 rounded-xl border border-kairos-border p-3 transition-colors",
                s.done ? "opacity-70" : "hover:border-kairos-gold/40",
              )}
            >
              {s.done ? (
                <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <Circle size={20} className="text-kairos-silver-dark shrink-0 mt-0.5" />
              )}
              <div className="min-w-0 flex-1">
                <p className={cn("text-sm font-semibold", s.done ? "text-kairos-silver-dark line-through" : "text-white")}>
                  {s.title}
                </p>
                {!s.done && <p className="text-xs text-kairos-silver-dark mt-0.5">{s.why}</p>}
              </div>
              {!s.done && (
                <span className="text-xs text-kairos-gold font-semibold flex items-center gap-0.5 shrink-0 mt-0.5">
                  {s.cta} <ChevronRight size={14} />
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export default function ClientToday() {
  const router = useRouter();
  const date = useMemo(() => localDate(), []);
  const hour = useMemo(() => new Date().getHours(), []);

  const score = trpc.clientPortal.lifeScore.getScore.useQuery({ date }, { staleTime: 60_000, retry: 1 });
  const health = trpc.clientPortal.healthData.summary.useQuery({ date }, { staleTime: 5 * 60_000, retry: 1 });
  const coach = trpc.clientPortal.settings.getMyCoach.useQuery(undefined, { staleTime: 5 * 60_000, retry: 1 });
  const onboarding = trpc.clientPortal.onboarding.getState.useQuery(undefined, { staleTime: 5 * 60_000, retry: false });
  const { data: alertsData } = trpc.clientPortal.alerts.list.useQuery(
    { status: "active", limit: 3, offset: 0 },
    { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  );

  // ── Insight (rule-based, from the client's own numbers) ──
  const insight = useMemo(() => {
    if (!health.data) return undefined;
    const metrics: InsightMetric[] = health.data.groups.flatMap((g) => g.metrics);
    return selectInsight({
      metrics,
      today: date,
      hour,
      strengths: score.data?.physical.strengths,
      focus: score.data?.physical.focus,
    });
  }, [health.data, score.data, date, hour]);

  // ── First-run checklist (only from facts we actually loaded) ──
  const factsReady = score.isSuccess && health.isSuccess;
  const facts = {
    hasHealthData: (health.data?.metricCount ?? 0) > 0,
    hasLabs: score.data?.physical.parts.some((p) => p.key === "labs" && p.score != null) ?? false,
    hasCoach: !!coach.data,
    hasCheckin: score.data?.mental.score != null,
    profileComplete: onboarding.data ? onboarding.data.completed : null,
  };
  const steps = firstRunSteps(facts);
  const setupIncomplete = factsReady && coach.isFetched && steps.some((s) => !s.done);
  const brandNew = factsReady && isBrandNew(facts);

  return (
    <div className="animate-fade-in space-y-6">
      <header>
        <h1 className="font-heading font-bold text-2xl text-white">Today</h1>
        <p className="text-sm font-body text-kairos-silver-dark mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </header>

      {brandNew && setupIncomplete && <FirstRunCard steps={steps} prominent />}

      <ScoreRings data={score.data} loading={score.isLoading} />

      {/* One honest, data-derived line. */}
      <section className="kairos-card p-4 flex items-start gap-3" aria-label="Today's insight">
        <Lightbulb size={18} className="text-kairos-gold shrink-0 mt-0.5" />
        <div className="min-w-0 flex-1">
          {health.isLoading || score.isLoading ? (
            <p className="text-sm text-kairos-silver-dark">Looking at your recent numbers…</p>
          ) : insight ? (
            <p className="text-sm text-white">{insight.text}</p>
          ) : (
            <p className="text-sm text-kairos-silver-dark">
              — No insight yet. We need about a week of sleep, heart or activity data to compare against your normal.
            </p>
          )}
        </div>
        {insight && (
          <Link href={insight.href} className="text-xs text-kairos-gold font-semibold flex items-center gap-0.5 shrink-0">
            Details <ChevronRight size={14} />
          </Link>
        )}
      </section>

      <TodayChecklist date={date} />

      {!brandNew && setupIncomplete && <FirstRunCard steps={steps} prominent={false} />}

      {/* Active health alerts (full list behind the top-bar icon). */}
      {alertsData && alertsData.alerts.length > 0 && (
        <section className="kairos-card p-5" aria-label="Health alerts">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-heading font-bold text-lg text-white flex items-center gap-2">
              <Bell size={18} className="text-kairos-gold" /> Alerts
            </h2>
            <Link href="/alerts" className="text-xs text-kairos-gold font-semibold flex items-center gap-0.5">
              View all ({alertsData.total}) <ChevronRight size={14} />
            </Link>
          </div>
          <ul className="space-y-2">
            {alertsData.alerts.map((alert) => (
              <li key={alert.id}>
                <button
                  onClick={() => router.push(`/alerts?id=${alert.id}`)}
                  className={cn(
                    "w-full text-left rounded-xl border border-kairos-border border-l-[3px] p-3 transition-colors hover:bg-kairos-card-hover/50",
                    alert.priority === "urgent" ? "border-l-red-500" : alert.priority === "action" ? "border-l-amber-500" : "border-l-blue-400",
                  )}
                >
                  <div className="flex items-start gap-3">
                    <AlertTriangle size={16} className="text-kairos-silver-dark mt-0.5 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-white truncate">{alert.title}</p>
                      {alert.message && <p className="text-xs text-kairos-silver-dark mt-0.5 line-clamp-2">{alert.message}</p>}
                    </div>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
