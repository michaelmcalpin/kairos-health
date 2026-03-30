"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface DailyGlucoseSummary {
  date: string;
  avg: number;
  min: number;
  max: number;
  count: number;
}

export interface SleepRecord {
  id: string;
  date: string;
  total: number;
  deep: number;
  rem: number;
  light: number;
  awake: number;
  score: number;
  source: string;
}

export interface SupplementRecord {
  id: string;
  date: string;
  supplementName: string;
  adherence: number;
}

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
}

export function useDashboard(dateRange: DateRange): UseDashboardReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: overviewData, isLoading: overviewLoading } = trpc.clientPortal.dashboard.getOverview.useQuery();

  const { data: dailySummariesData, isLoading: summariesLoading } =
    trpc.clientPortal.dashboard.getDailySummaries.useQuery({
      startDate,
      endDate,
    });

  const glucoseSummaries = useMemo<DailyGlucoseSummary[]>(() => {
    if (!dailySummariesData) return [];
    return dailySummariesData.map((d) => ({
      date: d.date,
      avg: d.glucose.avg,
      min: d.glucose.min,
      max: d.glucose.max,
      count: d.glucose.timeInRange,
    }));
  }, [dailySummariesData]);

  const sleepRecords = useMemo<SleepRecord[]>(() => {
    if (!dailySummariesData) return [];
    return dailySummariesData
      .filter((d) => d.sleep !== null)
      .map((d) => ({
        id: `sleep-${d.date}`,
        date: d.date,
        total: d.sleep?.totalHrs ?? 0,
        deep: 0,
        rem: 0,
        light: 0,
        awake: 0,
        score: d.sleep?.score ?? 0,
        source: "unknown",
      }));
  }, [dailySummariesData]);

  const supplementRecords = useMemo<SupplementRecord[]>(() => {
    if (!dailySummariesData) return [];
    return dailySummariesData
      .filter((d) => d.adherence !== null)
      .map((d) => ({
        id: `supplement-${d.date}`,
        date: d.date,
        supplementName: "Protocol",
        adherence: d.adherence ?? 0,
      }));
  }, [dailySummariesData]);

  const kpis = useMemo<DashboardKPIs>(() => {
    if (!dailySummariesData || !overviewData) {
      return { avgGlucose: 0, avgSleepHrs: 0, avgSleepScore: 0, avgAdherence: 0, healthScore: 0 };
    }

    const glucoseValues = glucoseSummaries.map((g) => g.avg);
    const avgGlucose = glucoseValues.length > 0 ? Math.round(glucoseValues.reduce((s, v) => s + v, 0) / glucoseValues.length) : 0;

    const sleepValues = sleepRecords.map((s) => s.total);
    const avgSleepHrs = sleepValues.length > 0 ? parseFloat((sleepValues.reduce((s, v) => s + v, 0) / sleepValues.length).toFixed(1)) : 0;

    const sleepScores = sleepRecords.map((s) => s.score);
    const avgSleepScore = sleepScores.length > 0 ? Math.round(sleepScores.reduce((s, v) => s + v, 0) / sleepScores.length) : 0;

    const adherenceValues = supplementRecords.map((s) => s.adherence);
    const avgAdherence = adherenceValues.length > 0 ? Math.round(adherenceValues.reduce((s, v) => s + v, 0) / adherenceValues.length) : 0;

    const healthScore = Math.min(
      100,
      Math.round((avgSleepScore * 0.3) + (avgAdherence * 0.3) + (Math.max(0, 100 - Math.abs(avgGlucose - 95)) * 0.4))
    );

    return { avgGlucose, avgSleepHrs, avgSleepScore, avgAdherence, healthScore };
  }, [glucoseSummaries, sleepRecords, supplementRecords, dailySummariesData, overviewData]);

  return {
    glucoseSummaries,
    sleepRecords,
    supplementRecords,
    kpis,
    isLoading: overviewLoading || summariesLoading,
  };
}
