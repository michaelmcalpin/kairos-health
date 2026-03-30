"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface WorkoutRecord {
  id: string;
  sessionId: string | null;
  date: Date;
  dateLabel: string;
  type: string;
  exercisesCompleted: Array<{
    exerciseId: string;
    sets: Array<{
      weight: number;
      reps: number;
      rpe?: number;
    }>;
  }>;
  notes: string | null;
  duration: number;
  calories: number;
  heartRateAvg: number;
}

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
}

export function useWorkouts(dateRange: DateRange): UseWorkoutsReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: rawLogs, isLoading: logsLoading } = trpc.clientPortal.workouts.list.useQuery({
    startDate,
    endDate,
  });

  const { data: rawStats, isLoading: statsLoading } = trpc.clientPortal.workouts.stats.useQuery({
    startDate,
    endDate,
  });

  const records = useMemo<WorkoutRecord[]>(() => {
    if (!rawLogs) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rawLogs.map((w) => {
      const dateObj = new Date(w.date + "T12:00:00");
      return {
        id: w.id,
        sessionId: w.sessionId,
        date: dateObj,
        dateLabel: days[dateObj.getDay()],
        type: (w as Record<string, unknown>).type as string ?? "Strength",
        exercisesCompleted: w.exercisesCompleted ?? [],
        notes: w.notes,
        duration: (w as Record<string, unknown>).durationMinutes as number ?? 0,
        calories: (w as Record<string, unknown>).caloriesBurned as number ?? 0,
        heartRateAvg: (w as Record<string, unknown>).heartRateAvg as number ?? 0,
      };
    });
  }, [rawLogs]);

  const stats = useMemo<WorkoutStats>(() => {
    if (!rawStats || records.length === 0) {
      return { totalMin: 0, sessions: 0, totalCal: 0, avgHR: 0 };
    }

    return {
      totalMin: records.reduce((s, r) => s + r.duration, 0),
      sessions: rawStats.totalWorkouts,
      totalCal: records.reduce((s, r) => s + r.calories, 0),
      avgHR: Math.round(records.reduce((s, r) => s + r.heartRateAvg, 0) / Math.max(records.length, 1)),
    };
  }, [rawStats, records]);

  return { records, stats, isLoading: logsLoading || statsLoading };
}
