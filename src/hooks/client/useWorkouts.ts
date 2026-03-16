"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import { generateWorkoutData, WorkoutRecord } from "@/utils/mockDataGenerator";

export interface WorkoutStats {
  totalMin: number;
  sessions: number;
  totalCal: number;
  avgHR: number;
}

export interface UseWorkoutsReturn {
  records: WorkoutRecord[];
  stats: WorkoutStats;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for workout data – tRPC procedures:
 *   trpc.client.workouts.list  → records
 *   trpc.client.workouts.stats → stats
 */
export function useWorkouts(dateRange: DateRange): UseWorkoutsReturn {
  const { data: records, isLoading, isMock } = useMockQuery(
    () => generateWorkoutData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const stats = useMemo<WorkoutStats>(() => {
    if (records.length === 0) return { totalMin: 0, sessions: 0, totalCal: 0, avgHR: 0 };
    return {
      totalMin: records.reduce((s, r) => s + r.duration, 0),
      sessions: records.length,
      totalCal: records.reduce((s, r) => s + r.calories, 0),
      avgHR: Math.round(records.reduce((s, r) => s + r.heartRateAvg, 0) / records.length),
    };
  }, [records]);

  return { records, stats, isLoading, isMock };
}
