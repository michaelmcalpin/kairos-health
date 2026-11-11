/**
 * Health data (all devices) — the client's own daily metrics, trends and
 * recent workouts. Coaches read the same summary via coach.clients.getClientHealthDataSummary.
 */
import { z } from "zod";

import { router, clientProcedure } from "@/server/trpc";
import { loadDailyMetrics, summarize, recentWorkouts } from "@/server/services/health-metrics";
import type { db as DB } from "@/server/db";

const today = () => new Date().toISOString().slice(0, 10);
function shift(d: string, delta: number) {
  const dt = new Date(d + "T00:00:00Z");
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

/** Shared by the client and coach routers. */
export async function healthDataSummary(db: typeof DB, clientId: string, endDate: string) {
  const series = await loadDailyMetrics(db, clientId, shift(endDate, -29), endDate);
  const groups = summarize(series, endDate);
  const since = new Date(shift(endDate, -29) + "T00:00:00Z");
  const workouts = await recentWorkouts(db, clientId, since, 30);
  return {
    endDate,
    groups,
    metricCount: groups.reduce((n, g) => n + g.metrics.length, 0),
    workouts: workouts.map((w) => ({
      id: w.id,
      activity: w.activity,
      startAt: w.startAt.toISOString(),
      durationMin: w.durationMin,
      energyKcal: w.energyKcal,
      distanceM: w.distanceM,
      avgHr: w.avgHr,
      maxHr: w.maxHr,
      source: w.source,
    })),
  };
}

/**
 * Daily series for a few metrics, merged across sources (same numbers as the
 * rest of the app). Days without data are left out — never filled with zero.
 */
export async function healthDataSeries(db: typeof DB, clientId: string, metrics: string[], days: number, endDate: string) {
  const series = await loadDailyMetrics(db, clientId, shift(endDate, -(days - 1)), endDate);
  const out: Record<string, Array<{ date: string; value: number; source: string }>> = {};
  for (const key of metrics) {
    const byDate = series.get(key);
    out[key] = byDate
      ? Array.from(byDate.entries())
        .map(([date, v]) => ({ date, value: v.value, source: v.source }))
        .sort((a, b) => (a.date < b.date ? -1 : 1))
      : [];
  }
  return { endDate, days, series: out };
}

export const clientHealthDataRouter = router({
  summary: clientProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(({ ctx, input }) => healthDataSummary(ctx.db, ctx.dbUserId, input?.date ?? today())),

  series: clientProcedure
    .input(z.object({
      metrics: z.array(z.string().max(40)).min(1).max(8),
      days: z.number().int().min(7).max(400).default(90),
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
    }))
    .query(({ ctx, input }) => healthDataSeries(ctx.db, ctx.dbUserId, input.metrics, input.days, input.date ?? today())),
});
