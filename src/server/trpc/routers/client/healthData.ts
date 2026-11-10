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

export const clientHealthDataRouter = router({
  summary: clientProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(({ ctx, input }) => healthDataSummary(ctx.db, ctx.dbUserId, input?.date ?? today())),
});
