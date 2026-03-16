import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import {
  clientProfiles,
  glucoseReadings,
  heartRateReadings,
  hrvReadings,
  sleepSessions,
  alerts,
  dailyCheckins,
  supplementProtocols,
  protocolItems,
  adherenceLogs,
} from "@/server/db/schema";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export const clientDashboardRouter = router({
  // Get dashboard overview KPIs
  getOverview: clientProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Get client profile
    const profile = await ctx.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, ctx.dbUserId),
    });

    // Latest glucose reading
    const latestGlucose = await ctx.db.query.glucoseReadings.findFirst({
      where: eq(glucoseReadings.clientId, ctx.dbUserId),
      orderBy: desc(glucoseReadings.timestamp),
    });

    // Latest heart rate
    const latestHR = await ctx.db.query.heartRateReadings.findFirst({
      where: eq(heartRateReadings.clientId, ctx.dbUserId),
      orderBy: desc(heartRateReadings.timestamp),
    });

    // Latest HRV
    const latestHRV = await ctx.db.query.hrvReadings.findFirst({
      where: eq(hrvReadings.clientId, ctx.dbUserId),
      orderBy: desc(hrvReadings.timestamp),
    });

    // Latest sleep session
    const latestSleep = await ctx.db.query.sleepSessions.findFirst({
      where: eq(sleepSessions.clientId, ctx.dbUserId),
      orderBy: desc(sleepSessions.date),
    });

    // Unread alerts count
    const unreadAlerts = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(
        and(
          eq(alerts.clientId, ctx.dbUserId),
          eq(alerts.status, "active")
        )
      );

    // Today's check-in
    const todayCheckin = await ctx.db.query.dailyCheckins.findFirst({
      where: and(
        eq(dailyCheckins.clientId, ctx.dbUserId),
        gte(dailyCheckins.date, twentyFourHoursAgo.toISOString().split("T")[0])
      ),
      orderBy: desc(dailyCheckins.date),
    });

    return {
      profile,
      kpis: {
        glucose: latestGlucose
          ? { value: latestGlucose.valueMgdl, unit: "mg/dL", timestamp: latestGlucose.timestamp }
          : null,
        heartRate: latestHR
          ? { value: latestHR.bpm, timestamp: latestHR.timestamp }
          : null,
        hrv: latestHRV
          ? { value: latestHRV.rmssd, timestamp: latestHRV.timestamp }
          : null,
        sleep: latestSleep
          ? {
              duration: latestSleep.totalMinutes,
              quality: latestSleep.score,
              timestamp: latestSleep.date,
            }
          : null,
        unreadAlerts: Number(unreadAlerts[0]?.count ?? 0),
        checkedInToday: !!todayCheckin,
        healthScore: null, // Computed metric — will be added in Sprint 2
      },
    };
  }),

  // Get recent activity feed
  getRecentActivity: clientProcedure
    .input(z.object({ limit: z.number().min(1).max(50).default(10) }))
    .query(async ({ ctx, input }) => {
      const recentAlerts = await ctx.db.query.alerts.findMany({
        where: eq(alerts.clientId, ctx.dbUserId),
        orderBy: desc(alerts.createdAt),
        limit: input.limit,
      });

      return recentAlerts.map((alert) => ({
        id: alert.id,
        type: alert.type,
        priority: alert.priority,
        title: alert.title,
        message: alert.message,
        status: alert.status,
        createdAt: alert.createdAt,
      }));
    }),

  // Get active protocol summary
  getActiveProtocol: clientProcedure.query(async ({ ctx }) => {
    const protocol = await ctx.db.query.supplementProtocols.findFirst({
      where: and(
        eq(supplementProtocols.clientId, ctx.dbUserId),
        eq(supplementProtocols.status, "active")
      ),
      orderBy: desc(supplementProtocols.createdAt),
    });

    if (!protocol) return null;

    const items = await ctx.db.query.protocolItems.findMany({
      where: eq(protocolItems.protocolId, protocol.id),
    });

    // Get today's adherence for this protocol
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAdherence = await ctx.db.query.adherenceLogs.findMany({
      where: and(
        eq(adherenceLogs.clientId, ctx.dbUserId),
        gte(adherenceLogs.date, today.toISOString().split("T")[0])
      ),
    });

    return {
      ...protocol,
      items,
      todayAdherence: {
        total: items.length,
        completed: todayAdherence.filter((a) => !a.skipped).length,
      },
    };
  }),
});
