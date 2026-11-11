"use client";

/**
 * Today's plan as a checklist (audit H6). Reads clientPortal.today.getToday
 * and ticks via clientPortal.today.toggleComplete — supplements/medications
 * write adherence_logs and everything else daily_checklist_completions, the
 * same tables the coach adherence dashboard reads (computeAdherence).
 * Ticks are optimistic and roll back on error.
 */
import { useState } from "react";
import Link from "next/link";
import { Check, ChevronRight, ExternalLink, Loader2, Timer } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";
import { applyToggle, isCheckinItem } from "@/lib/today/checklist";

const SECTION_LINK: Record<string, { href: string; label: string }> = {
  supplements: { href: "/supplements", label: "Supplements" },
  medications: { href: "/medications", label: "Medications" },
  peptides: { href: "/peptides", label: "Peptides" },
  meals: { href: "/nutrition", label: "Nutrition" },
  workout: { href: "/workouts", label: "Workouts" },
  fasting: { href: "/fasting", label: "Fasting" },
  appointments: { href: "/appointments", label: "Appointments" },
};

function formatStart(iso: string | null | undefined, fallback: string | null): string | null {
  if (iso) {
    const d = new Date(iso);
    if (!Number.isNaN(d.getTime())) return d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  }
  return fallback;
}

export function TodayChecklist({ date }: { date: string }) {
  const utils = trpc.useUtils();
  const input = { date };
  const { data, isLoading, isError, refetch } = trpc.clientPortal.today.getToday.useQuery(input, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });
  const [error, setError] = useState<string | null>(null);

  const toggle = trpc.clientPortal.today.toggleComplete.useMutation({
    onMutate: async (vars) => {
      setError(null);
      await utils.clientPortal.today.getToday.cancel(input);
      const prev = utils.clientPortal.today.getToday.getData(input);
      if (prev) utils.clientPortal.today.getToday.setData(input, applyToggle(prev, vars.key, vars.done));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.clientPortal.today.getToday.setData(input, ctx.prev);
      setError("Couldn't save that tick. Please try again.");
    },
    onSettled: () => {
      void utils.clientPortal.today.getToday.invalidate(input);
      // Adherence feeds the Physical score.
      void utils.clientPortal.lifeScore.getScore.invalidate();
    },
  });

  if (isLoading) {
    return (
      <section className="kairos-card p-5 flex items-center gap-2 text-sm text-kairos-silver-dark">
        <Loader2 size={16} className="animate-spin" /> Loading today&apos;s plan…
      </section>
    );
  }
  if (isError || !data) {
    return (
      <section className="kairos-card p-5 text-sm text-kairos-silver-dark">
        Couldn&apos;t load today&apos;s plan.{" "}
        <button onClick={() => refetch()} className="text-kairos-gold font-semibold">Retry</button>
      </section>
    );
  }

  const { done, total } = data.progress;
  const pct = total > 0 ? Math.round((done / total) * 100) : 0;
  // The LifeScore check-in section is always present; "nothing planned" means
  // nothing else is.
  const planned = data.sections.filter((s) => s.key !== "lifescore");

  return (
    <section className="kairos-card p-5" aria-label="Today's plan">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-heading font-bold text-lg text-white">Today&apos;s plan</h2>
        <span className="text-xs font-heading font-semibold text-kairos-gold">
          {done} of {total} done
        </span>
      </div>
      <div className="mt-2 h-1.5 bg-kairos-royal-surface rounded-full overflow-hidden" aria-hidden="true">
        <div className="h-full bg-kairos-gold rounded-full transition-all" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-sm text-kairos-silver mt-3">{data.advice}</p>
      {error && <p className="text-xs text-red-400 mt-2" role="alert">{error}</p>}

      {planned.length === 0 && (
        <p className="text-sm text-kairos-silver-dark mt-4">
          Your coach hasn&apos;t added a protocol yet. Supplements, workouts and meals they assign will show up here
          to tick off.
        </p>
      )}

      <div className="mt-4 space-y-4">
        {data.sections.map((section) => {
          const more = SECTION_LINK[section.key];
          return (
            <div key={section.key}>
              <div className="flex items-center justify-between mb-1.5">
                <h3 className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">
                  {section.label}
                </h3>
                {more && (
                  <Link href={more.href} className="text-xs text-kairos-gold flex items-center gap-0.5">
                    {more.label} <ChevronRight size={12} />
                  </Link>
                )}
              </div>
              <ul className="space-y-1">
                {section.items.map((item) => {
                  const time = item.kind === "appointment" ? formatStart(item.startAtUtc, item.time) : null;
                  const meta = [time, item.subtitle].filter(Boolean).join(" · ");

                  // Informational rows (fasting window).
                  if (!item.completable) {
                    return (
                      <li key={item.key} className="flex items-center gap-3 px-2 py-2 rounded-lg">
                        <Timer size={18} className="text-orange-400 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-sm text-white">{item.title}</p>
                          {meta && <p className="text-xs text-kairos-silver-dark">{meta}</p>}
                        </div>
                      </li>
                    );
                  }

                  // LifeScore check-in: done by submitting it, so link there.
                  if (isCheckinItem(item.key)) {
                    return (
                      <li key={item.key}>
                        <Link
                          href="/lifescore"
                          className="flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-kairos-card-hover/50"
                        >
                          <span
                            className={cn(
                              "w-5 h-5 rounded-md border flex items-center justify-center shrink-0",
                              item.done ? "bg-kairos-gold border-kairos-gold text-kairos-royal" : "border-kairos-silver-dark",
                            )}
                            aria-hidden="true"
                          >
                            {item.done && <Check size={14} />}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className={cn("text-sm", item.done ? "text-kairos-silver-dark line-through" : "text-white")}>
                              {item.title}
                            </p>
                            <p className="text-xs text-kairos-silver-dark">
                              {item.done ? "Done for today" : "Takes about a minute"}
                            </p>
                          </div>
                          {!item.done && <span className="text-xs text-kairos-gold font-semibold">Check in</span>}
                        </Link>
                      </li>
                    );
                  }

                  return (
                    <li key={item.key} className="flex items-center gap-1">
                      <button
                        type="button"
                        role="checkbox"
                        aria-checked={item.done}
                        onClick={() =>
                          toggle.mutate({ date, key: item.key, done: !item.done, protocolItemId: item.protocolItemId })
                        }
                        className="flex-1 flex items-center gap-3 px-2 py-2 rounded-lg text-left hover:bg-kairos-card-hover/50 min-w-0"
                      >
                        <span
                          className={cn(
                            "w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors",
                            item.done ? "bg-kairos-gold border-kairos-gold text-kairos-royal" : "border-kairos-silver-dark",
                          )}
                          aria-hidden="true"
                        >
                          {item.done && <Check size={14} />}
                        </span>
                        <div className="min-w-0">
                          <p className={cn("text-sm truncate", item.done ? "text-kairos-silver-dark line-through" : "text-white")}>
                            {item.title}
                          </p>
                          {meta && <p className="text-xs text-kairos-silver-dark truncate">{meta}</p>}
                        </div>
                      </button>
                      {item.link && (
                        <a
                          href={item.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-kairos-gold flex items-center gap-1 px-2 py-2 shrink-0"
                        >
                          {item.kind === "appointment" ? "Join" : "Demo"} <ExternalLink size={12} />
                        </a>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          );
        })}
      </div>
    </section>
  );
}
