"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import {
  generateSleepData,
  aggregateSleepWeekly,
  SleepRecord,
  WeeklySleepSummary,
} from "@/utils/mockDataGenerator";

export interface SleepStats {
  avgScore: number;
  avgTotal: string;
  avgDeep: string;
  avgRem: string;
}

export interface UseSleepReturn {
  records: SleepRecord[];
  weeklySummaries: WeeklySleepSummary[];
  lastRecord: SleepRecord | null;
  stats: SleepStats;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for sleep data – tRPC procedures:
 *   trpc.client.sleep.list   → records
 *   trpc.client.sleep.stats  → stats
 *   trpc.client.sleep.latest → lastRecord
 */
export function useSleep(dateRange: DateRange): UseSleepReturn {
  const { data: records, isLoading, isMock } = useMockQuery(
    () => generateSleepData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const weeklySummaries = useMemo(() => aggregateSleepWeekly(records), [records]);
  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  const stats = useMemo<SleepStats>(() => {
    if (records.length === 0) return { avgScore: 0, avgTotal: "0", avgDeep: "0", avgRem: "0" };
    return {
      avgScore: Math.round(records.reduce((s, d) => s + d.score, 0) / records.length),
      avgTotal: (records.reduce((s, d) => s + d.total, 0) / records.length).toFixed(1),
      avgDeep: (records.reduce((s, d) => s + d.deep, 0) / records.length).toFixed(1),
      avgRem: (records.reduce((s, d) => s + d.rem, 0) / records.length).toFixed(1),
    };
  }, [records]);

  return { records, weeklySummaries, lastRecord, stats, isLoading, isMock };
}
