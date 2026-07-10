/**
 * useCheckin -- Custom hooks for daily check-in / daily log.
 *
 * Tries to fetch check-in data from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - checkin.getToday    -> today's check-in (if submitted)
 *   - checkin.submit      -> submit a new daily check-in
 *   - checkin.update      -> update an existing check-in
 *   - checkin.getHistory  -> historical check-in data
 */

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { REALTIME_QUERY_OPTIONS } from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface DailyCheckin {
  id: string;
  date: string;
  weight?: number;
  sleepHours?: number;
  mood?: number;
  energy?: number;
  stress?: number;
  notes?: string;
  symptoms?: string[];
  medications?: string[];
  exerciseMinutes?: number;
  waterOz?: number;
  createdAt?: string;
  updatedAt?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SAMPLE_TODAY_CHECKIN: DailyCheckin | null = null;

export const SAMPLE_CHECKIN_HISTORY: DailyCheckin[] = [
  {
    id: "ck-1",
    date: "2026-07-09",
    weight: 178.4,
    sleepHours: 7.4,
    mood: 7,
    energy: 7,
    stress: 4,
    exerciseMinutes: 45,
    waterOz: 64,
    notes: "Good energy this morning",
  },
  {
    id: "ck-2",
    date: "2026-07-08",
    weight: 178.8,
    sleepHours: 6.9,
    mood: 6,
    energy: 5,
    stress: 6,
    exerciseMinutes: 30,
    waterOz: 48,
  },
  {
    id: "ck-3",
    date: "2026-07-07",
    weight: 179.1,
    sleepHours: 7.8,
    mood: 8,
    energy: 8,
    stress: 3,
    exerciseMinutes: 60,
    waterOz: 80,
    notes: "Slept great, intense workout",
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useTodayCheckin -- get today's check-in (if exists)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useTodayCheckin() {
  const query = trpc.clientPortal.checkin.getToday.useQuery(
    undefined,
    REALTIME_QUERY_OPTIONS,
  );

  const checkin: DailyCheckin | null = query.data
    ? mapApiCheckin(query.data)
    : SAMPLE_TODAY_CHECKIN;

  return {
    checkin,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSubmitCheckin -- mutation to submit daily check-in
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useSubmitCheckin() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.checkin.submit.useMutation({
    onSuccess: () => {
      utils.clientPortal.checkin.getToday.invalidate();
      utils.clientPortal.checkin.getHistory.invalidate();
    },
  });

  const submit = (input: {
    date?: string;
    weight?: number;
    sleepHours?: number;
    mood?: number;
    energy?: number;
    stress?: number;
    notes?: string;
    symptoms?: string[];
    medications?: string[];
    exerciseMinutes?: number;
    waterOz?: number;
  }) => {
    return mutation.mutateAsync(input);
  };

  return {
    submit,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useUpdateCheckin -- mutation to update an existing check-in
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useUpdateCheckin() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.checkin.update.useMutation({
    onSuccess: () => {
      utils.clientPortal.checkin.getToday.invalidate();
      utils.clientPortal.checkin.getHistory.invalidate();
    },
  });

  const update = (input: {
    id: string;
    weight?: number;
    sleepHours?: number;
    mood?: number;
    energy?: number;
    stress?: number;
    notes?: string;
    symptoms?: string[];
    medications?: string[];
    exerciseMinutes?: number;
    waterOz?: number;
  }) => {
    return mutation.mutateAsync(input);
  };

  return {
    update,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useCheckinHistory -- historical check-in data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useCheckinHistory(options?: {
  startDate?: string;
  endDate?: string;
  limit?: number;
}) {
  const query = trpc.clientPortal.checkin.getHistory.useQuery(
    {
      startDate: options?.startDate,
      endDate: options?.endDate,
      limit: options?.limit,
    },
    DEFAULT_QUERY_OPTIONS,
  );

  const history: DailyCheckin[] = query.data
    ? (query.data as any[]).map(mapApiCheckin)
    : SAMPLE_CHECKIN_HISTORY;

  return {
    history,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapApiCheckin(raw: any): DailyCheckin {
  return {
    id: raw.id,
    date: raw.date ?? "",
    weight: raw.weight ?? undefined,
    sleepHours: raw.sleepHours ?? undefined,
    mood: raw.mood ?? undefined,
    energy: raw.energy ?? undefined,
    stress: raw.stress ?? undefined,
    notes: raw.notes ?? undefined,
    symptoms: raw.symptoms ?? undefined,
    medications: raw.medications ?? undefined,
    exerciseMinutes: raw.exerciseMinutes ?? undefined,
    waterOz: raw.waterOz ?? undefined,
    createdAt: raw.createdAt ?? undefined,
    updatedAt: raw.updatedAt ?? undefined,
  };
}
