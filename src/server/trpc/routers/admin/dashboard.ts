import { router, adminProcedure } from "@/server/trpc";
import { users, coachProfiles, coachClientRelationships, subscriptions, auditLogs } from "@/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const adminDashboardRouter = router({
  // Platform-wide KPIs
  getKPIs: adminProcedure.query(async ({ ctx }) => {
    // Total users by role
    const userCounts = await ctx.db
      .select({
        role: users.role,
        count: sql<number>`count(*)`,
      })
      .from(users)
      .groupBy(users.role);

    const roleMap = new Map(userCounts.map((r) => [r.role, Number(r.count)]));

    // Active subscriptions
    const activeSubs = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(subscriptions)
      .where(eq(subscriptions.status, "active"));

    return {
      totalClients: roleMap.get("client") ?? 0,
      totalCoaches: roleMap.get("coach") ?? 0,
      totalAdmins: roleMap.get("admin") ?? 0,
      totalUsers: Array.from(roleMap.values()).reduce((s, n) => s + n, 0),
      activeSubscriptions: Number(activeSubs[0]?.count ?? 0),
    };
  }),

  // Coach performance table
  getCoachPerformance: adminProcedure.query(async ({ ctx }) => {
    const coaches = await ctx.db.query.users.findMany({
      where: eq(users.role, "coach"),
    });

    const performance = await Promise.all(
      coaches.map(async (coach) => {
        const profile = await ctx.db.query.coachProfiles.findFirst({
          where: eq(coachProfiles.userId, coach.id),
        });

        const clientCount = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(coachClientRelationships)
          .where(
            eq(coachClientRelationships.coachId, coach.id)
          );

        return {
          id: coach.id,
          name: `${coach.firstName ?? ""} ${coach.lastName ?? ""}`.trim(),
          email: coach.email,
          clientCount: Number(clientCount[0]?.count ?? 0),
          capacity: profile?.capacity ?? 25,
          rating: profile?.rating ?? 0,
          reviewCount: profile?.reviewCount ?? 0,
          acceptingClients: profile?.acceptingClients ?? false,
        };
      })
    );

    return performance.sort((a, b) => b.clientCount - a.clientCount);
  }),

  // Recent platform activity from audit logs
  getRecentActivity: adminProcedure.query(async ({ ctx }) => {
    const logs = await ctx.db.query.auditLogs.findMany({
      orderBy: desc(auditLogs.createdAt),
      limit: 20,
    });

    return Promise.all(
      logs.map(async (log) => {
        let userName = "System";
        if (log.userId) {
          const user = await ctx.db.query.users.findFirst({
            where: eq(users.id, log.userId),
          });
          if (user) {
            userName = `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email;
          }
        }

        return {
          id: log.id,
          action: log.action,
          resourceType: log.resourceType,
          resourceId: log.resourceId,
          userName,
          createdAt: log.createdAt,
        };
      })
    );
  }),
});
