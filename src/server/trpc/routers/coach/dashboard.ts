import { z } from "zod";
import { router, trainerProcedure } from "@/server/trpc";
import {
  trainerClientRelationships,
  users,
  clientProfiles,
  alerts,
  sleepSessions,
  glucoseReadings,
  appointments,
} from "@/server/db/schema";
import { eq, desc, and, sql, gte, between } from "drizzle-orm";

// ─── Tier pricing for revenue calculation ─────────────────────
const TIER_PRICING: Record<string, number> = {
  tier1: 1500,
  tier2: 900,
  tier3: 450,
};

export const coachDashboardRouter = router({
  /**
   * getDashboard — returns the full dashboard shape for the trainer portal.
   *
   * KPIs, priority clients, and today's schedule.
   * Client data comes from the real DB; schedule is server-generated
   * until an appointments table is added.
   */
  getDashboard: trainerProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const trainerId = ctx.dbUserId;

      // ── Fetch active client relationships ──────────────────
      const relationships = await ctx.db.query.trainerClientRelationships.findMany({
        where: and(
          eq(trainerClientRelationships.trainerId, trainerId),
          eq(trainerClientRelationships.status, "active")
        ),
      });

      const clientIds = relationships.map((r) => r.clientId);

      // ── Gather client details in parallel ──────────────────
      const clientDetails = await Promise.all(
        clientIds.map(async (clientId) => {
          const [user, profile, alertCount, latestSleep, latestGlucose] = await Promise.all([
            ctx.db.query.users.findFirst({ where: eq(users.id, clientId) }),
            ctx.db.query.clientProfiles.findFirst({ where: eq(clientProfiles.userId, clientId) }),
            ctx.db
              .select({ count: sql<number>`count(*)` })
              .from(alerts)
              .where(and(eq(alerts.clientId, clientId), eq(alerts.status, "active"))),
            ctx.db.query.sleepSessions.findFirst({
              where: eq(sleepSessions.clientId, clientId),
              orderBy: desc(sleepSessions.date),
            }),
            ctx.db.query.glucoseReadings.findFirst({
              where: eq(glucoseReadings.clientId, clientId),
              orderBy: desc(glucoseReadings.timestamp),
            }),
          ]);

          const activeAlerts = Number(alertCount[0]?.count ?? 0);
          const firstName = user?.firstName ?? "";
          const lastName = user?.lastName ?? "";
          const name = `${firstName} ${lastName}`.trim() || user?.email || "Unknown";
          const initials = firstName && lastName
            ? `${firstName[0]}${lastName[0]}`.toUpperCase()
            : name.slice(0, 2).toUpperCase();

          // Simple health score derived from available data
          let healthScore = 75; // baseline
          if (latestSleep?.score) healthScore += Math.min(10, Math.round((latestSleep.score - 50) / 5));
          if (latestGlucose?.valueMgdl) {
            const gv = Number(latestGlucose.valueMgdl);
            if (gv >= 70 && gv <= 100) healthScore += 10;
            else if (gv > 100 && gv <= 120) healthScore += 5;
          }
          healthScore = Math.max(0, Math.min(100, healthScore));

          return {
            id: clientId,
            name,
            initials,
            email: user?.email ?? "",
            tier: (profile?.tier ?? "tier1") as string,
            healthScore,
            activeAlerts,
            status: activeAlerts >= 3 ? "Critical Review" as const
              : activeAlerts >= 1 ? "Review Needed" as const
              : "On Track" as const,
          };
        })
      );

      // ── KPIs ───────────────────────────────────────────────
      const totalClients = clientDetails.length;
      const pendingAlerts = clientDetails.reduce((s, c) => s + c.activeAlerts, 0);
      const avgHealthScore = totalClients > 0
        ? Math.round(clientDetails.reduce((s, c) => s + c.healthScore, 0) / totalClients)
        : 0;
      const revenue = clientDetails.reduce((s, c) => s + (TIER_PRICING[c.tier] ?? 450), 0);

      // Real session count from appointments table
      const sessionsResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(appointments)
        .where(
          and(
            eq(appointments.coachId, trainerId),
            gte(appointments.date, sql`${input.startDate}::date`),
            sql`${appointments.date} <= ${input.endDate}::date`,
          )
        );
      const totalSessions = Number(sessionsResult[0]?.count ?? 0);

      type KPI = {
        label: string;
        value: string | number;
        unit?: string;
        trend: "up" | "down" | "flat";
        trendValue: string;
        icon: string;
      };

      const kpis: KPI[] = [
        {
          label: "Active Clients",
          value: totalClients,
          trend: "flat",
          trendValue: `${totalClients} total`,
          icon: "users",
        },
        {
          label: "Pending Alerts",
          value: pendingAlerts,
          trend: pendingAlerts > 3 ? "up" : "flat",
          trendValue: `${pendingAlerts} active`,
          icon: "bell",
        },
        {
          label: "Sessions",
          value: totalSessions,
          trend: "flat",
          trendValue: "this period",
          icon: "calendar",
        },
        {
          label: "Avg Health Score",
          value: avgHealthScore,
          unit: "/100",
          trend: "flat",
          trendValue: "across clients",
          icon: "trending",
        },
        {
          label: "Revenue",
          value: `$${revenue.toLocaleString()}`,
          trend: "flat",
          trendValue: "monthly",
          icon: "dollar",
        },
      ];

      // ── Priority Clients (highest alerts, lowest health score) ──
      const priorityClients = [...clientDetails]
        .sort((a, b) => {
          if (b.activeAlerts !== a.activeAlerts) return b.activeAlerts - a.activeAlerts;
          return a.healthScore - b.healthScore;
        })
        .slice(0, 4)
        .map((c) => ({
          id: c.id,
          name: c.name,
          initials: c.initials,
          healthScore: c.healthScore,
          alerts: c.activeAlerts,
          status: c.status,
        }));

      // ── Today's Schedule from real appointments ──────────────
      const today = new Date().toISOString().split("T")[0];
      const todayAppointments = await ctx.db.query.appointments.findMany({
        where: and(
          eq(appointments.coachId, trainerId),
          sql`${appointments.date}::text = ${today}`,
        ),
      });

      const todaySchedule = await Promise.all(
        todayAppointments.map(async (appt) => {
          const clientUser = await ctx.db.query.users.findFirst({
            where: eq(users.id, appt.clientId),
          });
          const clientName = clientUser
            ? `${clientUser.firstName ?? ""} ${clientUser.lastName ?? ""}`.trim() || clientUser.email
            : "Client";

          // Format time from 24h "HH:MM" to 12h
          const [h, m] = appt.startTime.split(":").map(Number);
          const ampm = h >= 12 ? "PM" : "AM";
          const h12 = h > 12 ? h - 12 : h === 0 ? 12 : h;
          const timeStr = `${h12}:${String(m).padStart(2, "0")} ${ampm}`;

          return {
            id: appt.id,
            time: timeStr,
            client: clientName,
            type: appt.sessionType ?? "Follow-up",
          };
        })
      );

      // Sort by time
      todaySchedule.sort((a, b) => a.time.localeCompare(b.time));

      return { kpis, priorityClients, todaySchedule };
    }),

  // ── Existing queries (kept for backwards compatibility) ─────

  getOverview: trainerProcedure.query(async ({ ctx }) => {
    const clientCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(trainerClientRelationships)
      .where(
        and(
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      );

    const activeAlerts = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .innerJoin(
        trainerClientRelationships,
        and(
          eq(alerts.clientId, trainerClientRelationships.clientId),
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      )
      .where(eq(alerts.status, "active"));

    return {
      clientCount: Number(clientCount[0]?.count ?? 0),
      activeAlerts: Number(activeAlerts[0]?.count ?? 0),
    };
  }),

  getClientList: trainerProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: and(
        eq(trainerClientRelationships.trainerId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return [];

    const clients = await Promise.all(
      clientIds.map(async (clientId) => {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, clientId),
        });
        const profile = await ctx.db.query.clientProfiles.findFirst({
          where: eq(clientProfiles.userId, clientId),
        });
        const latestSleep = await ctx.db.query.sleepSessions.findFirst({
          where: eq(sleepSessions.clientId, clientId),
          orderBy: desc(sleepSessions.date),
        });
        const latestGlucose = await ctx.db.query.glucoseReadings.findFirst({
          where: eq(glucoseReadings.clientId, clientId),
          orderBy: desc(glucoseReadings.timestamp),
        });
        const alertCount = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(alerts)
          .where(and(eq(alerts.clientId, clientId), eq(alerts.status, "active")));

        return {
          id: clientId,
          firstName: user?.firstName,
          lastName: user?.lastName,
          email: user?.email,
          avatarUrl: user?.avatarUrl,
          tier: profile?.tier,
          latestSleepScore: latestSleep?.score ?? null,
          latestGlucose: latestGlucose?.valueMgdl ?? null,
          activeAlerts: Number(alertCount[0]?.count ?? 0),
        };
      })
    );

    return clients;
  }),

  getRecentActivity: trainerProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentAlerts = await ctx.db
      .select({
        id: alerts.id,
        clientId: alerts.clientId,
        title: alerts.title,
        priority: alerts.priority,
        status: alerts.status,
        createdAt: alerts.createdAt,
      })
      .from(alerts)
      .innerJoin(
        trainerClientRelationships,
        and(
          eq(alerts.clientId, trainerClientRelationships.clientId),
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      )
      .where(gte(alerts.createdAt, sevenDaysAgo))
      .orderBy(desc(alerts.createdAt))
      .limit(20);

    return recentAlerts;
  }),
});

