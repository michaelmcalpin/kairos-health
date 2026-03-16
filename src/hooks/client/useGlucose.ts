"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import {
  generateGlucoseData,
  aggregateGlucoseDaily,
  aggregateGlucoseWeekly,
  GlucoseReading,
  DailyGlucoseSummary,
  WeeklyGlucoseSummary,
} from "@/utils/mockDataGenerator";

export interface GlucoseStats {
  current: number;
  avg: number;
  max: number;
  min: number;
  timeInRange: number;
}

export interface UseGlucoseReturn {
  readings: GlucoseReading[];
  dailySummaries: DailyGlucoseSummary[];
  weeklySummaries: WeeklyGlucoseSummary[];
  stats: GlucoseStats;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for glucose data – tRPC procedures:
 *   trpc.client.glucose.list      → readings
 *   trpc.client.glucose.stats     → stats
 *   trpc.client.glucose.dailyAverages → dailySummaries
 */
export function useGlucose(dateRange: DateRange): UseGlucoseReturn {
  const { data: readings, isLoading, isMock } = useMockQuery(
    () => generateGlucoseData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const dailySummaries = useMemo(() => aggregateGlucoseDaily(readings), [readings]);
  const weeklySummaries = useMemo(() => aggregateGlucoseWeekly(dailySummaries), [dailySummaries]);

  const stats = useMemo<GlucoseStats>(() => {
    const values = readings.map((r) => r.value);
    if (values.length === 0) return { current: 0, avg: 0, max: 0, min: 0, timeInRange: 0 };
    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    const inRange = values.filter((v) => v >= 70 && v <= 140).length;
    return {
      current: values[values.length - 1],
      avg,
      max: Math.max(...values),
      min: Math.min(...values),
      timeInRange: Math.round((inRange / values.length) * 100),
    };
  }, [readings]);

  return { readings, dailySummaries, weeklySummaries, stats, isLoading, isMock };
}
