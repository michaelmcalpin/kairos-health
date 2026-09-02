/**
 * useAdherence — the client's recent daily-task completion history.
 *
 * Powers the "adherence strip" (today's %, a row of day dots, and a streak)
 * above the home checklist. Today's number itself should come from
 * useToday().data.progress so it always matches the checklist exactly; this
 * hook supplies the short history + streak.
 */

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

export type AdherenceDay = { date: string; done: number; total: number; pct: number | null };
export type AdherenceData = {
  days: AdherenceDay[];
  todayPct: number | null;
  streak: number;
};

export function useAdherence(days = 7) {
  const query = trpc.clientPortal.today.getAdherence.useQuery({ days }, DEFAULT_QUERY_OPTIONS);
  return {
    data: query.data as AdherenceData | undefined,
    isLoading: query.isLoading,
    isError: query.isError,
    refetch: query.refetch,
  };
}
