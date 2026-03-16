"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import {
  generateGlucoseData,
  aggregateGlucoseDaily,
  generateSleepData,
  generateSupplementData,
  DailyGlucoseSummary,
  SleepRecord,
  SupplementRecord,
} from "@/utils/mockDataGenerator";

export interface DashboardKPIs {
  avgGlucose: number;
  avgSleepHrs: number;
  avgSleepScore: number;
  avgAdherence: number;
  healthScore: number;
}

export interface UseDashboardReturn {
  glucoseSummaries: DailyGlucoseSummary[];
  sleepRecords: SleepRecord[];
  supplementRecords: SupplementRecord[];
  kpis: DashboardKPIs;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for client dashboard – tRPC procedures:
 *   trpc.client.dashboard.getOverview       → kpis
 *   trpc.client.dashboard.getRecentActivity → recent alerts
 *   trpc.client.dashboard.getActiveProtocol → protocol items
 */
export function useDashboard(dateRange: DateRange): UseDashboardReturn {
  const { data: glucoseReadings } = useMockQuery(
    () => generateGlucoseData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const glucoseSummaries = useMemo(() => aggregateGlucoseDaily(glucoseReadings), [glucoseReadings]);

  const { data: sleepRecords } = useMockQuery(
    () => generateSleepData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const { data: supplementRecords, isLoading, isMock } = useMockQuery(
    () => generateSupplementData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const kpis = useMemo<DashboardKPIs>(() => {
    const glucoseValues = glucoseReadings.map((r) => r.value);
    const avgGlucose = glucoseValues.length > 0
      ? Math.round(glucoseValues.reduce((s, v) => s + v, 0) / glucoseValues.length)
      : 0;
    const avgSleepHrs = sleepRecords.length > 0
      ? parseFloat((sleepRecords.reduce((s, d) => s + d.total, 0) / sleepRecords.length).toFixed(1))
      : 0;
    const avgSleepScore = sleepRecords.length > 0
      ? Math.round(sleepRecords.reduce((s, d) => s + d.score, 0) / sleepRecords.length)
      : 0;
    const avgAdherence = supplementRecords.length > 0
      ? Math.round(supplementRecords.reduce((s, d) => s + d.adherence, 0) / supplementRecords.length)
      : 0;
    const healthScore = Math.min(100, Math.round(
      (avgSleepScore * 0.3) + (avgAdherence * 0.3) + (Math.max(0, 100 - Math.abs(avgGlucose - 95)) * 0.4)
    ));

    return { avgGlucose, avgSleepHrs, avgSleepScore, avgAdherence, healthScore };
  }, [glucoseReadings, sleepRecords, supplementRecords]);

  return { glucoseSummaries, sleepRecords, supplementRecords, kpis, isLoading, isMock };
}
