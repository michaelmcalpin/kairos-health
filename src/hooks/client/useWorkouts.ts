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
      const exercises = (w.exercisesCompleted ?? []) as Array<{ exerciseId: string; sets: Array<{ weight: number; reps: number; rpe?: number }> }>;

      // Check if this is a quick-log entry (metadata stored as JSON in notes)
      const isQuickLog = exercises.length === 1 && exercises[0]?.exerciseId?.startsWith("quick_log:");
      let type = "Strength";
      let duration = 0;
      let calories = 0;
      let heartRateAvg = 0;

      if (isQuickLog && w.notes) {
        try {
          const meta = JSON.parse(w.notes);
          type = meta.type ? meta.type.charAt(0).toUpperCase() + meta.type.slice(1) : "Other";
          duration = meta.durationMinutes ?? 0;
          calories = meta.caloriesBurned ?? 0;
          heartRateAvg = meta.avgHeartRate ?? 0;
        } catch {
          // Not valid JSON — fall through to defaults
        }
      } else {
        // Regular workout — estimate duration from set count
        const totalSets = exercises.reduce((s, ex) => s + (ex.sets?.length ?? 0), 0);
        duration = totalSets * 3; // rough ~3min per set
      }

      return {
        id: w.id,
        sessionId: w.sessionId,
        date: dateObj,
        dateLabel: days[dateObj.getDay()],
        type,
        exercisesCompleted: exercises,
        notes: w.notes,
        duration,
        calories,
        heartRateAvg,
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
