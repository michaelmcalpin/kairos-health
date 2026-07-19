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
  bodyMeasurements,
  bloodPressureReadings,
  activitySummaries,
  fastingProtocols,
  workoutPrograms,
  clientWorkoutAssignments,
} from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";

// Helper: safely query a table that may not exist yet (returns fallback on error)
async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientDashboardRouter = router({
  // ── Dashboard overview KPIs ──────────────────────────────
  getOverview: clientProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const todayStr = now.toISOString().split("T")[0];
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    // Batch-load everything in parallel
    const [
      profile,
      latestGlucose,
      latestHR,
      latestHRV,
      latestSleep,
      unreadAlertRows,
      latestCheckin,
      todayCheckin,
      latestBody,
      latestBP,
      todayGlucoseRows,
    ] = await Promise.all([
      ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, ctx.dbUserId),
      }),
      safeQ(() => ctx.db.query.glucoseReadings.findFirst({
        where: eq(glucoseReadings.clientId, ctx.dbUserId),
        orderBy: desc(glucoseReadings.timestamp),
      }), undefined),
      safeQ(() => ctx.db.query.heartRateReadings.findFirst({
        where: eq(heartRateReadings.clientId, ctx.dbUserId),
        orderBy: desc(heartRateReadings.timestamp),
      }), undefined),
      safeQ(() => ctx.db.query.hrvReadings.findFirst({
        where: eq(hrvReadings.clientId, ctx.dbUserId),
        orderBy: desc(hrvReadings.timestamp),
      }), undefined),
      safeQ(() => ctx.db.query.sleepSessions.findFirst({
        where: eq(sleepSessions.clientId, ctx.dbUserId),
        orderBy: desc(sleepSessions.date),
      }), undefined),
      ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(alerts)
        .where(and(eq(alerts.clientId, ctx.dbUserId), eq(alerts.status, "active"))),
      safeQ(() => ctx.db.query.dailyCheckins.findFirst({
        where: eq(dailyCheckins.clientId, ctx.dbUserId),
        orderBy: desc(dailyCheckins.date),
      }), undefined),
      safeQ(() => ctx.db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.clientId, ctx.dbUserId),
          gte(dailyCheckins.date, twentyFourHoursAgo.toISOString().split("T")[0]),
        ),
        orderBy: desc(dailyCheckins.date),
      }), undefined),
      safeQ(() => ctx.db.query.bodyMeasurements.findFirst({
        where: eq(bodyMeasurements.clientId, ctx.dbUserId),
        orderBy: desc(bodyMeasurements.date),
      }), undefined),
      // Latest blood pressure
      safeQ(() => ctx.db.query.bloodPressureReadings.findFirst({
        where: eq(bloodPressureReadings.clientId, ctx.dbUserId),
        orderBy: desc(bloodPressureReadings.date),
      }), undefined),
      // Today's glucose readings for spike analysis
      safeQ(() => ctx.db.query.glucoseReadings.findMany({
        where: and(
          eq(glucoseReadings.clientId, ctx.dbUserId),
          gte(glucoseReadings.timestamp, new Date(todayStr)),
        ),
        orderBy: glucoseReadings.timestamp,
      }), []),
    ]);

    // Glucose spike analysis: count readings >140 mg/dL as spikes
    const SPIKE_THRESHOLD = 140;
    const IN_RANGE_LOW = 70;
    const IN_RANGE_HIGH = 140;
    let glucoseSpikes = 0;
    let glucoseTimeInRange: number | null = null;

    if (todayGlucoseRows.length > 0) {
      // Count contiguous spike episodes
      let inSpike = false;
      for (const reading of todayGlucoseRows) {
        const val = Number(reading.valueMgdl);
        if (val > SPIKE_THRESHOLD) {
          if (!inSpike) {
            glucoseSpikes++;
            inSpike = true;
          }
        } else {
          inSpike = false;
        }
      }
      // Time in range percentage
      const inRangeCount = todayGlucoseRows.filter(
        (r) => Number(r.valueMgdl) >= IN_RANGE_LOW && Number(r.valueMgdl) <= IN_RANGE_HIGH,
      ).length;
      glucoseTimeInRange = Math.round((inRangeCount / todayGlucoseRows.length) * 100);
    }

    return {
      profile,
      kpis: {
        weight: latestCheckin?.weight
          ? { value: latestCheckin.weight, date: latestCheckin.date }
          : latestBody?.weightLbs
            ? { value: latestBody.weightLbs, date: latestBody.date }
            : null,
        bodyFat: latestBody?.bodyFatPct
          ? { value: latestBody.bodyFatPct, date: latestBody.date }
          : null,
        sleep: latestSleep
          ? { duration: latestSleep.totalMinutes, quality: latestSleep.score, timestamp: latestSleep.date }
          : null,
        heartRate: latestHR
          ? { value: latestHR.bpm, timestamp: latestHR.timestamp }
          : null,
        glucose: latestGlucose
          ? { value: latestGlucose.valueMgdl, unit: "mg/dL", timestamp: latestGlucose.timestamp }
          : null,
        glucoseSpikes,
        glucoseTimeInRange,
        hrv: latestHRV
          ? { value: latestHRV.rmssd, timestamp: latestHRV.timestamp }
          : null,
        bloodPressure: latestBP
          ? { systolic: latestBP.systolic, diastolic: latestBP.diastolic, pulse: latestBP.pulse, date: latestBP.date }
          : null,
        steps: latestCheckin?.steps
          ? { value: latestCheckin.steps, date: latestCheckin.date }
          : null,
        bmCount: todayCheckin?.bmCount ?? null,
        unreadAlerts: Number(unreadAlertRows[0]?.count ?? 0),
        checkedInToday: !!todayCheckin,
      },
    };
  }),

  // ── Today's protocols (fasting, exercise, etc.) ──────────
  getTodayProtocols: clientProcedure.query(async ({ ctx }) => {
    const now = new Date();
    const currentHour = now.getHours();
    const dayOfWeek = now.getDay(); // 0=Sun

    // Fasting protocol
    const fastingProto = await safeQ(() => ctx.db.query.fastingProtocols.findFirst({
      where: and(
        eq(fastingProtocols.clientId, ctx.dbUserId),
        eq(fastingProtocols.status, "active"),
      ),
      orderBy: desc(fastingProtocols.createdAt),
    }), undefined);

    let fasting = null;
    if (fastingProto) {
      const activeDays = (fastingProto.activeDays as number[]) ?? [0, 1, 2, 3, 4, 5, 6];
      const isToday = activeDays.includes(dayOfWeek);
      if (isToday) {
        const feedStart = fastingProto.feedingStartHour ?? 12;
        const feedEnd = fastingProto.feedingEndHour ?? 20;
        fasting = {
          type: fastingProto.type,
          feedingStart: feedStart,
          feedingEnd: feedEnd,
          isActive: currentHour >= feedStart && currentHour < feedEnd,
        };
      }
    }

    // Active workout assignment
    const todayStr = now.toISOString().split("T")[0];
    const assignment = await safeQ(() => ctx.db.query.clientWorkoutAssignments.findFirst({
      where: and(
        eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
        eq(clientWorkoutAssignments.status, "active"),
      ),
    }), undefined);

    let exercise: { stepGoal: number; workout: { name: string; description: string | null } | null } = {
      stepGoal: 10000,
      workout: null,
    };

    if (assignment) {
      const program = await ctx.db.query.workoutPrograms.findFirst({
        where: eq(workoutPrograms.id, assignment.programId),
      });
      if (program) {
        exercise.workout = {
          name: program.name,
          description: program.description,
        };
      }
    }

    return { fasting, exercise };
  }),

  // ── Recent activity feed ─────────────────────────────────
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

  // ── Active protocol summary ──────────────────────────────
  getActiveProtocol: clientProcedure.query(async ({ ctx }) => {
    const protocol = await safeQ(() => ctx.db.query.supplementProtocols.findFirst({
      where: and(
        eq(supplementProtocols.clientId, ctx.dbUserId),
        eq(supplementProtocols.status, "active"),
      ),
      orderBy: desc(supplementProtocols.createdAt),
    }), undefined);

    if (!protocol) return null;

    const items = await safeQ(() => ctx.db.query.protocolItems.findMany({
      where: eq(protocolItems.protocolId, protocol.id),
    }), []);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const todayAdherence = await safeQ(() => ctx.db.query.adherenceLogs.findMany({
      where: and(
        eq(adherenceLogs.clientId, ctx.dbUserId),
        gte(adherenceLogs.date, today.toISOString().split("T")[0]),
      ),
    }), []);

    return {
      ...protocol,
      items,
      todayAdherence: {
        total: items.length,
        completed: todayAdherence.filter((a) => !a.skipped).length,
      },
    };
  }),

  // ── Daily summaries for date range ───────────────────────
  getDailySummaries: clientProcedure
    .input(z.object({ startDate: z.string(), endDate: z.string() }))
    .query(async ({ ctx, input }) => {
      const { startDate, endDate } = input;

      const glucoseDaily = await safeQ(() => ctx.db
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
            lte(glucoseReadings.timestamp, new Date(endDate + "T23:59:59")),
          ),
        )
        .groupBy(sql`DATE(${glucoseReadings.timestamp})`)
        .orderBy(sql`DATE(${glucoseReadings.timestamp})`), []);

      const sleepDaily = await safeQ(() => ctx.db.query.sleepSessions.findMany({
        where: and(
          eq(sleepSessions.clientId, ctx.dbUserId),
          gte(sleepSessions.date, startDate),
          lte(sleepSessions.date, endDate),
        ),
        orderBy: sleepSessions.date,
      }), []);

      const protocol = await safeQ(() => ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.clientId, ctx.dbUserId),
          eq(supplementProtocols.status, "active"),
        ),
        orderBy: desc(supplementProtocols.createdAt),
      }), undefined);

      let adherenceDaily: { date: string; taken: number; total: number }[] = [];
      if (protocol) {
        const items = await safeQ(() => ctx.db.query.protocolItems.findMany({
          where: eq(protocolItems.protocolId, protocol.id),
        }), []);
        const totalItems = items.length;

        const adherenceRows = await safeQ(() => ctx.db
          .select({
            date: adherenceLogs.date,
            taken: sql<number>`COUNT(*) FILTER (WHERE ${adherenceLogs.skipped} = false)`.as("taken"),
          })
          .from(adherenceLogs)
          .where(
            and(
              eq(adherenceLogs.clientId, ctx.dbUserId),
              gte(adherenceLogs.date, startDate),
              lte(adherenceLogs.date, endDate),
            ),
          )
          .groupBy(adherenceLogs.date)
          .orderBy(adherenceLogs.date), []);

        adherenceDaily = adherenceRows.map((r) => ({
          date: r.date,
          taken: Number(r.taken),
          total: totalItems,
        }));
      }

      const sleepMap = new Map(sleepDaily.map((s) => [s.date, s]));
      const adherenceMap = new Map(adherenceDaily.map((a) => [a.date, a]));

      return glucoseDaily.map((g) => {
        const dateStr = String(g.date);
        const sleep = sleepMap.get(dateStr);
        const adh = adherenceMap.get(dateStr);
        const timeInRange =
          g.count > 0
            ? Math.round((Number(g.inRangeCount) / Number(g.count)) * 100)
            : 0;

        return {
          date: dateStr,
          dateLabel: new Date(dateStr + "T12:00:00").toLocaleDateString("en-US", { weekday: "short" }),
          glucose: { avg: Number(g.avg), min: Number(g.min), max: Number(g.max), timeInRange },
          sleep: sleep?.totalMinutes
            ? { totalHrs: parseFloat((sleep.totalMinutes / 60).toFixed(1)), score: sleep.score }
            : null,
          adherence: adh ? Math.round((adh.taken / Math.max(adh.total, 1)) * 100) : null,
        };
      });
    }),

  // ── Sparkline data for dashboard (defaults to last 7 days) ─
  getSparklines: clientProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
    const sevenDaysAgo = input?.startDate
      ? new Date(input.startDate)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
    const sevenStr = sevenDaysAgo.toISOString().split("T")[0];

    const [sleepRows, glucoseRows, bpRows] = await Promise.all([
      safeQ(() => ctx.db.query.sleepSessions.findMany({
        where: and(eq(sleepSessions.clientId, ctx.dbUserId), gte(sleepSessions.date, sevenStr)),
        orderBy: sleepSessions.date,
        columns: { date: true, totalMinutes: true, score: true },
      }), []),
      safeQ(() => ctx.db
        .select({
          date: sql<string>`DATE(${glucoseReadings.timestamp})`.as("date"),
          avg: sql<number>`ROUND(AVG(${glucoseReadings.valueMgdl}))`.as("avg"),
        })
        .from(glucoseReadings)
        .where(
          and(eq(glucoseReadings.clientId, ctx.dbUserId), gte(glucoseReadings.timestamp, sevenDaysAgo)),
        )
        .groupBy(sql`DATE(${glucoseReadings.timestamp})`)
        .orderBy(sql`DATE(${glucoseReadings.timestamp})`), []),
      safeQ(() => ctx.db.query.bloodPressureReadings.findMany({
        where: and(eq(bloodPressureReadings.clientId, ctx.dbUserId), gte(bloodPressureReadings.date, sevenStr)),
        orderBy: bloodPressureReadings.date,
        columns: { date: true, systolic: true, diastolic: true },
      }), []),
    ]);

    return {
      sleep: sleepRows.map((s) => ({ date: s.date, hours: s.totalMinutes ? +(s.totalMinutes / 60).toFixed(1) : null, score: s.score })),
      glucose: glucoseRows.map((g) => ({ date: String(g.date), avg: Number(g.avg) })),
      bp: bpRows.map((b) => ({ date: b.date, sys: b.systolic, dia: b.diastolic })),
    };
  }),

  // ── Computed health score (defaults to last 7 days) ──────
  getHealthScore: clientProcedure
    .input(
      z.object({
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
    const sevenDaysAgo = input?.startDate
      ? new Date(input.startDate)
      : (() => { const d = new Date(); d.setDate(d.getDate() - 7); return d; })();
    const sevenDaysStr = sevenDaysAgo.toISOString().split("T")[0];

    const [avgGlucoseResult, avgSleepResult, latestHrv] = await Promise.all([
      safeQ(() => ctx.db
        .select({ avg: sql<number>`ROUND(AVG(${glucoseReadings.valueMgdl}))` })
        .from(glucoseReadings)
        .where(
          and(eq(glucoseReadings.clientId, ctx.dbUserId), gte(glucoseReadings.timestamp, sevenDaysAgo)),
        ), []),
      safeQ(() => ctx.db
        .select({ avg: sql<number>`ROUND(AVG(${sleepSessions.score}))` })
        .from(sleepSessions)
        .where(
          and(eq(sleepSessions.clientId, ctx.dbUserId), gte(sleepSessions.date, sevenDaysStr)),
        ), []),
      safeQ(() => ctx.db.query.hrvReadings.findFirst({
        where: eq(hrvReadings.clientId, ctx.dbUserId),
        orderBy: desc(hrvReadings.timestamp),
      }), undefined),
    ]);

    let score = 75;
    const avgGlucose = Number(avgGlucoseResult[0]?.avg ?? 95);
    const avgSleep = Number(avgSleepResult[0]?.avg ?? 70);
    const hrv = latestHrv?.rmssd ?? 40;

    score += avgSleep >= 80 ? 8 : avgSleep >= 70 ? 4 : avgSleep >= 60 ? 0 : -10;
    score += avgGlucose >= 70 && avgGlucose <= 100 ? 5 : avgGlucose <= 120 ? 0 : -8;
    score += hrv > 50 ? 7 : hrv >= 30 ? 2 : -5;

    return { score: Math.min(100, Math.max(0, score)), avgGlucose, avgSleep, hrv };
  }),
});
