"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import { generateFastingData, FastingRecord } from "@/utils/mockDataGenerator";

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
  isMock: boolean;
}

/**
 * Hook for fasting data – tRPC procedures:
 *   trpc.client.fasting.listLogs → records
 *   trpc.client.fasting.stats    → stats
 */
export function useFasting(dateRange: DateRange): UseFastingReturn {
  const { data: records, isLoading, isMock } = useMockQuery(
    () => generateFastingData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const stats = useMemo<FastingStats>(() => {
    if (records.length === 0) return { totalFasts: 0, completed: 0, completionRate: 0, avgDuration: 0, streak: 0 };
    const completed = records.filter((r) => r.completed).length;
    // Calculate streak from latest consecutive completed fasts
    let streak = 0;
    for (let i = records.length - 1; i >= 0; i--) {
      if (records[i].completed) streak++;
      else break;
    }
    return {
      totalFasts: records.length,
      completed,
      completionRate: Math.round((completed / records.length) * 100),
      avgDuration: parseFloat((records.reduce((s, r) => s + r.fastDuration, 0) / records.length).toFixed(1)),
      streak,
    };
  }, [records]);

  return { records, stats, isLoading, isMock };
}
