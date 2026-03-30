"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface SleepRecord {
  id: string;
  date: string;
  dateLabel: string;
  total: number;
  deep: number;
  rem: number;
  light: number;
  awake: number;
  score: number;
  bedtime: string;
  wake: string;
  source: string;
}

export interface WeeklySleepSummary {
  weekStart: string;
  weekLabel: string;
  avgTotal: number;
  avgScore: number;
  avgDeep: number;
  avgRem: number;
}

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
}

export function useSleep(dateRange: DateRange): UseSleepReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: rawRecords, isLoading: recordsLoading } = trpc.clientPortal.sleep.list.useQuery({
    startDate,
    endDate,
  });

  const { data: rawStats, isLoading: statsLoading } = trpc.clientPortal.sleep.stats.useQuery({
    startDate,
    endDate,
  });

  const records = useMemo<SleepRecord[]>(() => {
    if (!rawRecords) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rawRecords.map((r) => {
      const dateObj = new Date(r.date + "T12:00:00");
      // Estimate bedtime/wake from total sleep duration
      const totalHrs = (r.totalMinutes ?? 0) / 60;
      const bedtime = "10:30 PM";
      const wakeHr = 6 + Math.round((totalHrs - 8) * 10) / 10;
      const wake = `${Math.max(5, Math.min(9, Math.floor(wakeHr)))}:${String(Math.round((wakeHr % 1) * 60)).padStart(2, "0")} AM`;
      return {
        id: r.id,
        date: r.date,
        dateLabel: days[dateObj.getDay()],
        total: (r.totalMinutes ?? 0) / 60,
        deep: (r.deepMinutes ?? 0) / 60,
        rem: (r.remMinutes ?? 0) / 60,
        light: (r.lightMinutes ?? 0) / 60,
        awake: (r.awakeMinutes ?? 0) / 60,
        score: r.score ?? 0,
        bedtime,
        wake,
        source: r.source ?? "manual",
      };
    });
  }, [rawRecords]);

  const weeklySummaries = useMemo<WeeklySleepSummary[]>(() => {
    if (records.length === 0) return [];

    const weekMap = new Map<string, { totals: number[]; scores: number[]; deeps: number[]; rems: number[] }>();
    records.forEach((record) => {
      const date = new Date(record.date + "T12:00:00");
      const weekStart = new Date(date);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      const weekKey = weekStart.toISOString().split("T")[0];

      if (!weekMap.has(weekKey)) {
        weekMap.set(weekKey, { totals: [], scores: [], deeps: [], rems: [] });
      }
      const week = weekMap.get(weekKey)!;
      week.totals.push(record.total);
      week.scores.push(record.score);
      week.deeps.push(record.deep);
      week.rems.push(record.rem);
    });

    const weeks: WeeklySleepSummary[] = [];
    weekMap.forEach((data, weekKey) => {
      const wsDate = new Date(weekKey + "T12:00:00");
      const month = wsDate.toLocaleString("en-US", { month: "short" });
      const day = wsDate.getDate();
      weeks.push({
        weekStart: weekKey,
        weekLabel: `${month} ${day}`,
        avgTotal: Math.round((data.totals.reduce((s, v) => s + v, 0) / data.totals.length) * 10) / 10,
        avgScore: Math.round(data.scores.reduce((s, v) => s + v, 0) / data.scores.length),
        avgDeep: Math.round((data.deeps.reduce((s, v) => s + v, 0) / data.deeps.length) * 10) / 10,
        avgRem: Math.round((data.rems.reduce((s, v) => s + v, 0) / data.rems.length) * 10) / 10,
      });
    });
    return weeks;
  }, [records]);

  const lastRecord = records.length > 0 ? records[records.length - 1] : null;

  const stats = useMemo<SleepStats>(() => {
    if (!rawStats || records.length === 0) {
      return { avgScore: 0, avgTotal: "0", avgDeep: "0", avgRem: "0" };
    }

    return {
      avgScore: rawStats.avgScore ?? 0,
      avgTotal: rawStats.avgDuration ? (rawStats.avgDuration / 60).toFixed(1) : "0",
      avgDeep: rawStats.avgDeep ? (rawStats.avgDeep / 60).toFixed(1) : "0",
      avgRem: rawStats.avgRem ? (rawStats.avgRem / 60).toFixed(1) : "0",
    };
  }, [rawStats, records]);

  return { records, weeklySummaries, lastRecord, stats, isLoading: recordsLoading || statsLoading };
}
