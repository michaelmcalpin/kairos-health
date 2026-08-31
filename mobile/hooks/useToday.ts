/**
 * Hooks for the Guided/Full "today" home:
 *  - useToday(): today's advice + grouped checklist with optimistic one-tap complete.
 *  - useViewMode(): read/write the guided|full home preference.
 */

import { trpc, DEFAULT_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";

export type TodayItem = {
  key: string;
  kind: "task" | "appointment" | "peptide" | "supplement" | "medication" | "meal" | "workout" | "fasting";
  title: string;
  subtitle: string | null;
  time: string | null;
  completable: boolean;
  done: boolean;
  protocolItemId: string | null;
};
export type TodaySection = { key: string; label: string; items: TodayItem[] };
export type TodayData = {
  date: string;
  advice: string;
  sections: TodaySection[];
  progress: { done: number; total: number };
};

function localDate(): string {
  return new Date().toISOString().slice(0, 10);
}

export function useToday() {
  const date = localDate();
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
