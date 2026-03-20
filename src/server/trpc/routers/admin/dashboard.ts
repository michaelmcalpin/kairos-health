import { router, superAdminProcedure } from "@/server/trpc";
import { users, trainerProfiles, trainerClientRelationships, subscriptions, auditLogs } from "@/server/db/schema";
import { eq, desc, sql } from "drizzle-orm";

export const adminDashboardRouter = router({
  // Platform-wide KPIs
  getKPIs: superAdminProcedure.query(async ({ ctx }) => {
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
      totalTrainers: roleMap.get("trainer") ?? 0,
      totalCompanyAdmins: roleMap.get("company_admin") ?? 0,
      totalSuperAdmins: roleMap.get("super_admin") ?? 0,
      totalUsers: Array.from(roleMap.values()).reduce((s, n) => s + n, 0),
      activeSubscriptions: Number(activeSubs[0]?.count ?? 0),
    };
  }),

  // Trainer performance table
  getTrainerPerformance: superAdminProcedure.query(async ({ ctx }) => {
    const trainers = await ctx.db.query.users.findMany({
      where: eq(users.role, "trainer"),
    });

    const performance = await Promise.all(
      trainers.map(async (trainer) => {
        const profile = await ctx.db.query.trainerProfiles.findFirst({
          where: eq(trainerProfiles.userId, trainer.id),
        });

        const clientCount = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(trainerClientRelationships)
          .where(
            eq(trainerClientRelationships.trainerId, trainer.id)
          );

        return {
          id: trainer.id,
          name: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim(),
          email: trainer.email,
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
  getRecentActivity: superAdminProcedure.query(async ({ ctx }) => {
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
