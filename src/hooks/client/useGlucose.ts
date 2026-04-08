"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface GlucoseReading {
  id: string;
  timestamp: Date;
  time: string;
  value: number;
  source: string;
  trendDirection: string | null;
}

export interface DailyGlucoseSummary {
  date: string;
  dateLabel: string;
  avg: number;
  min: number;
  max: number;
  count: number;
  timeInRange: number;
}

export interface WeeklyGlucoseSummary {
  weekStart: string;
  weekLabel: string;
  avg: number;
  avgGlucose: number;
  timeInRange: number;
}

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
  isError: boolean;
  refetch: () => void;
}

export function useGlucose(dateRange: DateRange): UseGlucoseReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const readingsQuery = trpc.clientPortal.glucose.list.useQuery({ startDate, endDate });
  const { data: rawReadings, isLoading: readingsLoading } = readingsQuery;

  const statsQuery = trpc.clientPortal.glucose.stats.useQuery({ startDate, endDate });
  const { data: rawStats, isLoading: statsLoading } = statsQuery;

  const dailyQuery = trpc.clientPortal.glucose.dailyAverages.useQuery({ startDate, endDate });
  const { data: rawDailyAverages, isLoading: dailyLoading } = dailyQuery;

  const readings = useMemo<GlucoseReading[]>(() => {
    if (!rawReadings) return [];
    return rawReadings.map((r) => {
      const ts = new Date(r.timestamp);
      return {
        id: r.id,
        timestamp: ts,
        time: `${String(ts.getHours()).padStart(2, "0")}:${String(ts.getMinutes()).padStart(2, "0")}`,
        value: r.valueMgdl,
        source: r.source ?? "manual",
        trendDirection: r.trendDirection,
      };
    });
  }, [rawReadings]);

  const dailySummaries = useMemo<DailyGlucoseSummary[]>(() => {
    if (!rawDailyAverages) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rawDailyAverages.map((d) => {
      const dateObj = new Date(d.date + "T12:00:00");
      return {
        date: d.date,
        dateLabel: days[dateObj.getDay()],
        avg: d.avg,
        min: d.min,
        max: d.max,
        count: d.count,
        timeInRange: d.avg >= 70 && d.avg <= 140 ? Math.round(Math.max(0, 100 - Math.abs(d.avg - 100) * 1.5)) : 0,
      };
    });
  }, [rawDailyAverages]);

  const weeklySummaries = useMemo<WeeklyGlucoseSummary[]>(() => {
    if (dailySummaries.length === 0) return [];

    const weekMap = new Map<string, { avgs: number[]; tirs: number[] }>();
    dailySummaries.forEach((day) => {
      const date = new Date(day.date + "T12:00:00");
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { avgs: [], tirs: [] });
      }
      const entry = weekMap.get(weekKey)!;
      entry.avgs.push(day.avg);
      entry.tirs.push(day.timeInRange);
    });

    const weeks: WeeklyGlucoseSummary[] = [];
    weekMap.forEach(({ avgs, tirs }, weekKey) => {
      const avgGlucose = Math.round(avgs.reduce((s, v) => s + v, 0) / avgs.length);
      const avgTir = Math.round(tirs.reduce((s, v) => s + v, 0) / tirs.length);
      const wsDate = new Date(weekKey + "T12:00:00");
      const month = wsDate.toLocaleString("en-US", { month: "short" });
      const day = wsDate.getDate();
      weeks.push({ weekStart: weekKey, weekLabel: `${month} ${day}`, avg: avgGlucose, avgGlucose, timeInRange: avgTir });
    });
    return weeks;
  }, [dailySummaries]);

  const stats = useMemo<GlucoseStats>(() => {
    if (!rawStats || !readings || readings.length === 0) {
      return { current: 0, avg: 0, max: 0, min: 0, timeInRange: 0 };
    }

    return {
      current: readings.length > 0 ? readings[readings.length - 1].value : 0,
      avg: rawStats.avg ?? 0,
      max: rawStats.max ?? 0,
      min: rawStats.min ?? 0,
      timeInRange: rawStats.timeInRange ?? 0,
    };
  }, [rawStats, readings]);

  return {
    readings,
    dailySummaries,
    weeklySummaries,
    stats,
    isLoading: readingsLoading || statsLoading || dailyLoading,
    isError: readingsQuery.isError || statsQuery.isError || dailyQuery.isError,
    refetch: () => { readingsQuery.refetch(); statsQuery.refetch(); dailyQuery.refetch(); },
  };
}
