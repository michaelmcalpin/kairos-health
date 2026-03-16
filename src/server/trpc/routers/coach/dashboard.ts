import { router, coachProcedure } from "@/server/trpc";
import { coachClientRelationships, users, clientProfiles, alerts, sleepSessions, glucoseReadings } from "@/server/db/schema";
import { eq, desc, and, sql, gte } from "drizzle-orm";

export const coachDashboardRouter = router({
  // Get overview KPIs: client count, active alerts, recent metrics
  getOverview: coachProcedure.query(async ({ ctx }) => {
    // Active client count
    const clientCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(coachClientRelationships)
      .where(
        and(
          eq(coachClientRelationships.coachId, ctx.dbUserId),
          eq(coachClientRelationships.status, "active")
        )
      );

    // Active alerts across all clients
    const activeAlerts = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .innerJoin(
        coachClientRelationships,
        and(
          eq(alerts.clientId, coachClientRelationships.clientId),
          eq(coachClientRelationships.coachId, ctx.dbUserId),
          eq(coachClientRelationships.status, "active")
        )
      )
      .where(eq(alerts.status, "active"));

    return {
      clientCount: Number(clientCount[0]?.count ?? 0),
      activeAlerts: Number(activeAlerts[0]?.count ?? 0),
    };
  }),

  // Get list of coach's clients with basic info
  getClientList: coachProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.coachClientRelationships.findMany({
      where: and(
        eq(coachClientRelationships.coachId, ctx.dbUserId),
        eq(coachClientRelationships.status, "active")
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

        // Latest sleep score
        const latestSleep = await ctx.db.query.sleepSessions.findFirst({
          where: eq(sleepSessions.clientId, clientId),
          orderBy: desc(sleepSessions.date),
        });

        // Latest glucose
        const latestGlucose = await ctx.db.query.glucoseReadings.findFirst({
          where: eq(glucoseReadings.clientId, clientId),
          orderBy: desc(glucoseReadings.timestamp),
        });

        // Unread alerts
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

  // Recent activity feed
  getRecentActivity: coachProcedure.query(async ({ ctx }) => {
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
        coachClientRelationships,
        and(
          eq(alerts.clientId, coachClientRelationships.clientId),
          eq(coachClientRelationships.coachId, ctx.dbUserId),
          eq(coachClientRelationships.status, "active")
        )
      )
      .where(gte(alerts.createdAt, sevenDaysAgo))
      .orderBy(desc(alerts.createdAt))
      .limit(20);

    return recentAlerts;
  }),
});
