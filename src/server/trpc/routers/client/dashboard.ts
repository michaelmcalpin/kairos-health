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
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

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

    // Latest check-in (for weight, calories, steps)
    const latestCheckin = await ctx.db.query.dailyCheckins.findFirst({
      where: eq(dailyCheckins.clientId, ctx.dbUserId),
      orderBy: desc(dailyCheckins.date),
    });

    // Today's check-in specifically
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
        weight: latestCheckin?.weight
          ? { value: latestCheckin.weight, date: latestCheckin.date }
          : null,
        sleep: latestSleep
          ? {
              duration: latestSleep.totalMinutes,
              quality: latestSleep.score,
              timestamp: latestSleep.date,
            }
          : null,
        calories: latestCheckin?.totalCalories
          ? { value: latestCheckin.totalCalories, date: latestCheckin.date }
          : null,
        heartRate: latestHR
          ? { value: latestHR.bpm, timestamp: latestHR.timestamp }
          : null,
        glucose: latestGlucose
          ? { value: latestGlucose.valueMgdl, unit: "mg/dL", timestamp: latestGlucose.timestamp }
          : null,
        hrv: latestHRV
          ? { value: latestHRV.rmssd, timestamp: latestHRV.timestamp }
          : null,
        steps: latestCheckin?.steps
          ? { value: latestCheckin.steps, date: latestCheckin.date }
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

  // Get daily summaries for a date range (glucose, sleep, adherence per day)
  getDailySummaries: clientProcedure
    .input(
      z.object({
        startDate: z.string(), // YYYY-MM-DD
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      // Glucose daily averages + time-in-range
      const glucoseDaily = await ctx.db
        .select({
          date: sql<string>`DATE(${glucoseReadings.timestamp})`.as("date"),
          avg: sql<number>`ROUND(AVG(${glucoseReadings.valueMgdl}))`.as("avg"),
          min: sql<number>`MIN(${glucoseReadings.valueMgdl})`.as("min"),
          max: sql<number>`MAX(${glucoseReadings.valueMgdl})`.as("max"),
          count: sql<number>`COUNT(*)`.as("count"),
          inRangeCount: sql<number>`COUNT(*) FILTER (WHERE ${glucoseReadings.valueMgdl} BETWEEN 70 AND 140)`.as("in_range"),
        })
        .from(glucoseReadings)
        .where(
          and(
            eq(glucoseReadings.clientId, ctx.dbUserId),
            gte(glucoseReadings.timestamp, new Date(startDate)),
            lte(glucoseReadings.timestamp, new Date(endDate + "T23:59:59"))
          )
        )
        .groupBy(sql`DATE(${glucoseReadings.timestamp})`)
        .orderBy(sql`DATE(${glucoseReadings.timestamp})`);

      // Sleep per day
      const sleepDaily = await ctx.db.query.sleepSessions.findMany({
        where: and(
          eq(sleepSessions.clientId, ctx.dbUserId),
          gte(sleepSessions.date, startDate),
          lte(sleepSessions.date, endDate)
        ),
        orderBy: sleepSessions.date,
      });

      // Adherence per day: count logged vs total protocol items
      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.clientId, ctx.dbUserId),
          eq(supplementProtocols.status, "active")
        ),
        orderBy: desc(supplementProtocols.createdAt),
      });

      let adherenceDaily: { date: string; taken: number; total: number }[] = [];
      if (protocol) {
        const items = await ctx.db.query.protocolItems.findMany({
          where: eq(protocolItems.protocolId, protocol.id),
        });
        const totalItems = items.length;

        const adherenceRows = await ctx.db
          .select({
            date: adherenceLogs.date,
            taken: sql<number>`COUNT(*) FILTER (WHERE ${adherenceLogs.skipped} = false)`.as("taken"),
          })
          .from(adherenceLogs)
          .where(
            and(
              eq(adherenceLogs.clientId, ctx.dbUserId),
              gte(adherenceLogs.date, startDate),
              lte(adherenceLogs.date, endDate)
            )
          )
          .groupBy(adherenceLogs.date)
          .orderBy(adherenceLogs.date);

        adherenceDaily = adherenceRows.map((r) => ({
          date: r.date,
          taken: Number(r.taken),
          total: totalItems,
        }));
      }

      // Build date map
      const sleepMap = new Map(sleepDaily.map((s) => [s.date, s]));
      const adherenceMap = new Map(adherenceDaily.map((a) => [a.date, a]));

      const summaries = glucoseDaily.map((g) => {
        const dateStr = String(g.date);
        const sleep = sleepMap.get(dateStr);
        const adh = adherenceMap.get(dateStr);
        const timeInRange = g.count > 0 ? Math.round((Number(g.inRangeCount) / Number(g.count)) * 100) : 0;

        return {
          date: dateStr,
          dateLabel: new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
          glucose: { avg: Number(g.avg), min: Number(g.min), max: Number(g.max), timeInRange },
          sleep: sleep?.totalMinutes
            ? { totalHrs: parseFloat((sleep.totalMinutes / 60).toFixed(1)), score: sleep.score }
            : null,
          adherence: adh
            ? Math.round((adh.taken / Math.max(adh.total, 1)) * 100)
            : null,
        };
      });

      return summaries;
    }),

  // Get computed health score
  getHealthScore: clientProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const sevenDaysStr = sevenDaysAgo.toISOString().split("T")[0];

    const [avgGlucoseResult, avgSleepResult, latestHrv] = await Promise.all([
      ctx.db
        .select({ avg: sql<number>`ROUND(AVG(${glucoseReadings.valueMgdl}))` })
        .from(glucoseReadings)
        .where(
          and(
            eq(glucoseReadings.clientId, ctx.dbUserId),
            gte(glucoseReadings.timestamp, sevenDaysAgo)
          )
        ),
      ctx.db
        .select({ avg: sql<number>`ROUND(AVG(${sleepSessions.score}))` })
        .from(sleepSessions)
        .where(
          and(
            eq(sleepSessions.clientId, ctx.dbUserId),
            gte(sleepSessions.date, sevenDaysStr)
          )
        ),
      ctx.db.query.hrvReadings.findFirst({
        where: eq(hrvReadings.clientId, ctx.dbUserId),
        orderBy: desc(hrvReadings.timestamp),
      }),
    ]);

    // Derive health score: baseline 75, +/- based on sleep, glucose, HRV
    let score = 75;
    const avgGlucose = Number(avgGlucoseResult[0]?.avg ?? 95);
    const avgSleep = Number(avgSleepResult[0]?.avg ?? 70);
    const hrv = latestHrv?.rmssd ?? 40;

    // Sleep contribution: score 80+ adds up to +8, below 60 subtracts up to -10
    score += avgSleep >= 80 ? 8 : avgSleep >= 70 ? 4 : avgSleep >= 60 ? 0 : -10;
    // Glucose contribution: 70-100 optimal (+5), 100-120 ok (0), >120 bad (-8)
    score += avgGlucose >= 70 && avgGlucose <= 100 ? 5 : avgGlucose <= 120 ? 0 : -8;
    // HRV contribution: >50 good (+7), 30-50 ok (+2), <30 poor (-5)
    score += hrv > 50 ? 7 : hrv >= 30 ? 2 : -5;

    return { score: Math.min(100, Math.max(0, score)), avgGlucose, avgSleep, hrv };
  }),
});
