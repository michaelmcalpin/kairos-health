/**
 * KAIROS Health Data Aggregation
 *
 * Pre-computation utilities for dashboard summaries, weekly/monthly
 * rollups, and trend analysis. Designed to be called by cron jobs
 * or triggered after data ingestion.
 */

import { mean, standardDeviation, movingAverage } from "@/lib/utils/health";
import { timeInRange, glucoseManagementIndicator } from "@/lib/utils/health";
import { toDateString } from "@/lib/utils/date";

// ─── Glucose Summary ────────────────────────────────────────────────────────

export interface GlucoseDaySummary {
  date: string;
  avgGlucose: number;
  minGlucose: number;
  maxGlucose: number;
  stdDev: number;
  timeInRange: number;
  readingCount: number;
  gmi: number;
}

export interface GlucoseWeekSummary {
  weekStart: string;
  weekEnd: string;
  avgGlucose: number;
  timeInRange: number;
  gmi: number;
  cv: number;
  trendVsPrior: "improving" | "stable" | "declining";
  dailySummaries: GlucoseDaySummary[];
}

export function aggregateGlucoseDay(date: string, readings: number[]): GlucoseDaySummary {
  if (readings.length === 0) {
    return {
      date, avgGlucose: 0, minGlucose: 0, maxGlucose: 0,
      stdDev: 0, timeInRange: 0, readingCount: 0, gmi: 0,
    };
  }

  const avg = mean(readings);
  return {
    date,
    avgGlucose: Math.round(avg),
    minGlucose: Math.min(...readings),
    maxGlucose: Math.max(...readings),
    stdDev: Math.round(standardDeviation(readings) * 10) / 10,
    timeInRange: Math.round(timeInRange(readings) * 1000) / 1000,
    readingCount: readings.length,
    gmi: Math.round(glucoseManagementIndicator(avg) * 100) / 100,
  };
}

export function aggregateGlucoseWeek(
  weekStart: string,
  weekEnd: string,
  dailySummaries: GlucoseDaySummary[],
  priorWeekAvg?: number
): GlucoseWeekSummary {
  const allReadings = dailySummaries.flatMap((d) =>
    Array(d.readingCount).fill(d.avgGlucose)
  );
  const avgGlucose = mean(allReadings);
  const tir = mean(dailySummaries.map((d) => d.timeInRange));

  let trend: "improving" | "stable" | "declining" = "stable";
  if (priorWeekAvg !== undefined) {
    const change = (avgGlucose - priorWeekAvg) / priorWeekAvg;
    // For glucose, lower is usually better (closer to optimal range)
    if (change < -0.03) trend = "improving";
    else if (change > 0.03) trend = "declining";
  }

  return {
    weekStart,
    weekEnd,
    avgGlucose: Math.round(avgGlucose),
    timeInRange: Math.round(tir * 1000) / 1000,
    gmi: Math.round(glucoseManagementIndicator(avgGlucose) * 100) / 100,
    cv: Math.round(standardDeviation(allReadings) / (avgGlucose || 1) * 100 * 10) / 10,
    trendVsPrior: trend,
    dailySummaries,
  };
}

// ─── Sleep Summary ──────────────────────────────────────────────────────────

export interface SleepDaySummary {
  date: string;
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  score: number;
  efficiency: number;
}

export interface SleepWeekSummary {
  weekStart: string;
  weekEnd: string;
  avgTotalMinutes: number;
  avgDeepMinutes: number;
  avgRemMinutes: number;
  avgScore: number;
  avgEfficiency: number;
  consistency: number; // 0-100, how consistent bedtime/wake time
  trendVsPrior: "improving" | "stable" | "declining";
  dailySummaries: SleepDaySummary[];
}

export function aggregateSleepWeek(
  weekStart: string,
  weekEnd: string,
  dailySummaries: SleepDaySummary[],
  priorWeekAvgScore?: number
): SleepWeekSummary {
  const validDays = dailySummaries.filter((d) => d.totalMinutes > 0);

  if (validDays.length === 0) {
    return {
      weekStart, weekEnd,
      avgTotalMinutes: 0, avgDeepMinutes: 0, avgRemMinutes: 0,
      avgScore: 0, avgEfficiency: 0, consistency: 0,
      trendVsPrior: "stable", dailySummaries,
    };
  }

  const avgScore = mean(validDays.map((d) => d.score));
  const totalMins = validDays.map((d) => d.totalMinutes);

  // Consistency: based on std dev of total sleep minutes (lower = more consistent)
  const sd = standardDeviation(totalMins);
  const avgTotal = mean(totalMins);
  const cv = avgTotal > 0 ? sd / avgTotal : 0;
  const consistency = Math.round(Math.max(0, Math.min(100, (1 - cv) * 100)));

  let trend: "improving" | "stable" | "declining" = "stable";
  if (priorWeekAvgScore !== undefined) {
    const change = avgScore - priorWeekAvgScore;
    if (change > 3) trend = "improving";
    else if (change < -3) trend = "declining";
  }

  return {
    weekStart,
    weekEnd,
    avgTotalMinutes: Math.round(mean(totalMins)),
    avgDeepMinutes: Math.round(mean(validDays.map((d) => d.deepMinutes))),
    avgRemMinutes: Math.round(mean(validDays.map((d) => d.remMinutes))),
    avgScore: Math.round(avgScore),
    avgEfficiency: Math.round(mean(validDays.map((d) => d.efficiency))),
    consistency,
    trendVsPrior: trend,
    dailySummaries,
  };
}

// ─── Health Score (Composite) ───────────────────────────────────────────────

export interface DailyHealthScore {
  date: string;
  overall: number; // 0-100
  glucoseScore: number;
  sleepScore: number;
  activityScore: number;
  supplementScore: number;
  checkinScore: number;
}

export function computeDailyHealthScore(params: {
  glucoseTIR?: number;      // 0-1
  sleepScoreVal?: number;   // 0-100
  workoutMinutes?: number;
  supplementAdherence?: number; // 0-1
  checkinMood?: number;     // 1-10
}): DailyHealthScore {
  const scores = {
    glucoseScore: params.glucoseTIR !== undefined
      ? Math.round(params.glucoseTIR * 100)
      : 50,
    sleepScore: params.sleepScoreVal ?? 50,
    activityScore: params.workoutMinutes !== undefined
      ? Math.min(100, Math.round((params.workoutMinutes / 60) * 100))
      : 50,
    supplementScore: params.supplementAdherence !== undefined
      ? Math.round(params.supplementAdherence * 100)
      : 50,
    checkinScore: params.checkinMood !== undefined
      ? Math.round(params.checkinMood * 10)
      : 50,
  };

  // Weighted composite
  const overall = Math.round(
    scores.glucoseScore * 0.30 +
    scores.sleepScore * 0.25 +
    scores.activityScore * 0.20 +
    scores.supplementScore * 0.15 +
    scores.checkinScore * 0.10
  );

  return {
    date: toDateString(new Date()),
    overall: Math.min(100, Math.max(0, overall)),
    ...scores,
  };
}

// ─── Trend Line Generator ───────────────────────────────────────────────────

export interface TrendPoint {
  date: string;
  value: number;
  movingAvg?: number;
}

export function generateTrendLine(
  dataPoints: { date: string; value: number }[],
  windowSize = 7
): TrendPoint[] {
  const values = dataPoints.map((d) => d.value);
  const ma = movingAverage(values, windowSize);

  return dataPoints.map((point, i) => ({
    date: point.date,
    value: point.value,
    movingAvg: i >= windowSize - 1 ? Math.round(ma[i - (windowSize - 1)] * 10) / 10 : undefined,
  }));
}
