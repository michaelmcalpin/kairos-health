/**
 * Hooks for the Guided/Full "today" home:
 *  - useToday(): today's advice + grouped checklist with optimistic one-tap complete.
 *  - useViewMode(): read/write the guided|full home preference.
 */

import { useEffect } from "react";
import { trpc, DEFAULT_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";
import { scheduleMeetingReminders } from "@/lib/notifications";

export type TodayItem = {
  key: string;
  kind: "task" | "appointment" | "peptide" | "supplement" | "medication" | "meal" | "workout" | "fasting";
  title: string;
  subtitle: string | null;
  time: string | null;
  completable: boolean;
  done: boolean;
  protocolItemId: string | null;
  link?: string | null;
  // Absolute UTC instant for meetings — rendered in the device timezone.
  startAtUtc?: string | null;
};
export type TodaySection = { key: string; label: string; items: TodayItem[] };
export type TodayData = {
  date: string;
  advice: string;
  sections: TodaySection[];
  progress: { done: number; total: number };
};

export function localDate(): string {
  // Client-LOCAL calendar date (not UTC) — avoids marking tomorrow's checklist
  // as today's for users behind/ahead of UTC.
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * Today's plan for a given calendar date (defaults to the client's local today).
 * Pass an explicit YYYY-MM-DD to view/edit another day — the Protocols tab uses
 * this to step back/forward through days (preview tomorrow, complete yesterday).
 * Both getToday and toggleComplete are keyed by this date server-side.
 */
export function useToday(dateArg?: string) {
  const date = dateArg ?? localDate();
  const utils = trpc.useUtils();
  const query = trpc.clientPortal.today.getToday.useQuery({ date }, DEFAULT_QUERY_OPTIONS);

  const toggle = trpc.clientPortal.today.toggleComplete.useMutation({
    onMutate: async (vars: { key: string; done: boolean }) => {
      await utils.clientPortal.today.getToday.cancel({ date });
      const prev = utils.clientPortal.today.getToday.getData({ date }) as TodayData | undefined;
      if (prev) {
        const next: TodayData = {
          ...prev,
          sections: prev.sections.map((s) => ({
            ...s,
            items: s.items.map((it) => (it.key === vars.key ? { ...it, done: vars.done } : it)),
          })),
        };
        const doneCount = next.sections.reduce(
          (n, s) => n + s.items.filter((i) => i.completable && i.done).length,
          0,
        );
        next.progress = { done: doneCount, total: prev.progress.total };
        utils.clientPortal.today.getToday.setData({ date }, next);
      }
      return { prev };
    },
    onError: (_e: unknown, _vars: unknown, context: { prev?: TodayData } | undefined) => {
      if (context?.prev) utils.clientPortal.today.getToday.setData({ date }, context.prev);
    },
    onSettled: () => {
      utils.clientPortal.today.getToday.invalidate({ date });
    },
  });

  // Schedule a local "meeting in 5 minutes" reminder for each of today's coach
  // meetings whenever today's data changes. Only for the REAL today — we don't
  // want to schedule reminders while previewing another day on the Protocols tab.
  useEffect(() => {
    const data = query.data as TodayData | undefined;
    if (!data || date !== localDate()) return;
    const meetings = data.sections
      .filter((s) => s.key === "appointments")
      .flatMap((s) => s.items)
      .filter((it) => !!it.time)
      .map((it) => ({
        id: it.key,
        title: it.title,
        date: data.date,
        startTime: it.time as string,
        // Absolute instant when available — fires the reminder at the correct
        // moment regardless of the coach's vs the device's timezone.
        startAtUtc: it.startAtUtc ?? null,
        link: it.link ?? null,
      }));
    void scheduleMeetingReminders(meetings);
  }, [query.data, date]);

  const toggleItem = (item: TodayItem) => {
    if (!item.completable) return;
    toggle.mutate({
      date,
      key: item.key,
      done: !item.done,
      protocolItemId: item.protocolItemId ?? undefined,
    });
  };

  return {
    data: query.data as TodayData | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
    toggleItem,
  };
}

export function useViewMode() {
  const utils = trpc.useUtils();
  const query = trpc.clientPortal.settings.getViewMode.useQuery(undefined, STATIC_QUERY_OPTIONS);
  const mutation = trpc.clientPortal.settings.setViewMode.useMutation({
    onMutate: (vars: { mode: "guided" | "full" }) => {
      utils.clientPortal.settings.getViewMode.setData(undefined, { mode: vars.mode });
    },
    onSettled: () => utils.clientPortal.settings.getViewMode.invalidate(),
  });

  const mode: "guided" | "full" = query.data?.mode ?? "guided";
  return {
    mode,
    isLoading: query.isLoading,
    setMode: (m: "guided" | "full") => mutation.mutate({ mode: m }),
    toggle: () => mutation.mutate({ mode: mode === "guided" ? "full" : "guided" }),
  };
}
