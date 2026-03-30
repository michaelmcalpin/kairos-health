"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface FastingRecord {
  date: Date;
  dateLabel: string;
  fastDuration: number;
  targetDuration: number;
  completed: boolean;
  startTime: string;
  endTime: string;
}

export interface FastingStats {
  totalFasts: number;
  completed: number;
  completionRate: number;
  avgDuration: number;
  streak: number;
}

export interface UseFastingReturn {
  records: FastingRecord[];
  stats: FastingStats;
  isLoading: boolean;
}

export function useFasting(dateRange: DateRange): UseFastingReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: rawLogs, isLoading: logsLoading } = trpc.clientPortal.fasting.listLogs.useQuery(
    { startDate, endDate }
  );

  const { data: rawStats, isLoading: statsLoading } = trpc.clientPortal.fasting.stats.useQuery(
    { startDate, endDate }
  );

  const records = useMemo<FastingRecord[]>(() => {
    if (!rawLogs) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    return rawLogs.map((log) => {
      const dateObj = new Date(log.date + "T12:00:00");
      const dateLabel = days[dateObj.getDay()];

      const startHour = log.startedAt ? new Date(log.startedAt).getHours() : 20;
      const startMinutes = log.startedAt ? new Date(log.startedAt).getMinutes() : 0;

      let fastDuration = 0;
      let endHour = startHour;
      let endMinutes = startMinutes;

      if (log.startedAt && log.endedAt) {
        const start = new Date(log.startedAt);
        const end = new Date(log.endedAt);
        fastDuration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        endHour = end.getHours();
        endMinutes = end.getMinutes();
      }

      const startTimeStr = `${String(startHour).padStart(2, "0")}:${String(startMinutes).padStart(2, "0")}`;
      const endTimeStr = `${String(endHour).padStart(2, "0")}:${String(endMinutes).padStart(2, "0")}`;

      return {
        date: dateObj,
        dateLabel,
        fastDuration: Math.round(fastDuration * 10) / 10,
        targetDuration: 16,
        completed: log.completed ?? false,
        startTime: startTimeStr,
        endTime: endTimeStr,
      };
    });
  }, [rawLogs]);

  const stats = useMemo<FastingStats>(() => {
    if (!rawStats) return { totalFasts: 0, completed: 0, completionRate: 0, avgDuration: 0, streak: 0 };

    // Calculate streak from records
    let streak = 0;
    if (records.length > 0) {
      const sorted = [...records].sort((a, b) => b.date.getTime() - a.date.getTime());
      for (const r of sorted) {
        if (r.completed) streak++;
        else break;
      }
    }

    return {
      totalFasts: rawStats.totalFasts,
      completed: rawStats.completedFasts,
      completionRate: Math.round(rawStats.completionRate),
      avgDuration: rawStats.avgDurationMinutes ? Math.round((rawStats.avgDurationMinutes / 60) * 10) / 10 : 0,
      streak,
    };
  }, [rawStats, records]);

  return { records, stats, isLoading: logsLoading || statsLoading };
}
