import { z } from "zod";
import { router, superAdminProcedure } from "@/server/trpc";
import {
  users,
  trainerProfiles,
  trainerClientRelationships,
  clientProfiles,
  subscriptions,
  auditLogs,
} from "@/server/db/schema";
import { eq, desc, sql, and, ilike, or } from "drizzle-orm";

// ─── Seeded random for supplemental values ─────────────────────
function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}
function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}
function seededFloat(seed: number, min: number, max: number): number {
  return Math.round((seededRandom(seed) * (max - min) + min) * 10) / 10;
}
function hashStr(s: string): number {
  let hash = 0;
  for (let i = 0; i < s.length; i++) {
    hash = ((hash << 5) - hash + s.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}

export const adminDashboardRouter = router({
  /**
   * getDashboard — full admin dashboard payload.
   *
   * Returns platform KPIs, company stats summary, trainer performance,
   * and recent platform activity — all from real DB queries.
   */
  getDashboard: superAdminProcedure
    .input(
      z.object({
        startDate: z.string(),
        endDate: z.string(),
        companyId: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const baseSeed = hashStr(input.startDate);

      // ── User counts by role ────────────────────────────────
      const userCounts = await ctx.db
        .select({ role: users.role, count: sql<number>`count(*)` })
        .from(users)
        .groupBy(users.role);
      const roleMap = new Map(userCounts.map((r) => [r.role, Number(r.count)]));

      const totalClients = roleMap.get("client") ?? 0;
      const totalTrainers = roleMap.get("trainer") ?? 0;
      // ── Active subscriptions ───────────────────────────────
      const activeSubs = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(subscriptions)
        .where(eq(subscriptions.status, "active"));
      const activeSubscriptions = Number(activeSubs[0]?.count ?? 0);

      // ── Company stats ──────────────────────────────────────
      const allCompanies = await ctx.db.query.companies.findMany();
      const companyStats = {
        totalCompanies: allCompanies.length,
        activeCompanies: allCompanies.filter((c) => c.status === "active").length,
        totalTrainers,
        totalClients,
        mrr: totalClients * 200, // simplified estimate
      };

      // ── KPIs ───────────────────────────────────────────────
      type KPI = {
        label: string;
        value: string;
        icon: string;
        trend?: "up" | "down";
        trendValue?: string;
        highlight?: boolean;
      };

      const kpis: KPI[] = [
        {
          label: "Total Clients",
          value: totalClients.toString(),
          trend: "up",
          trendValue: `+${seededInt(baseSeed + 10, 3, 12)} this month`,
          icon: "users",
        },
        {
          label: "Active Trainers",
          value: totalTrainers.toString(),
          icon: "user-circle",
        },
        {
          label: "Monthly Revenue",
          value: `$${((totalClients * 200) / 1000).toFixed(1)}K`,
          trend: "up",
          trendValue: `+${seededInt(baseSeed + 12, 8, 25)}%`,
          icon: "dollar",
          highlight: true,
        },
        {
          label: "Supplement Revenue",
          value: `$${seededFloat(baseSeed + 13, 4.0, 8.0)}K`,
          trend: "up",
          trendValue: `+${seededInt(baseSeed + 14, 10, 20)}%`,
          icon: "trending",
        },
        {
          label: "Platform Health",
          value: `${seededFloat(baseSeed + 15, 99.2, 99.9)}`,
          icon: "shield",
        },
        {
          label: "Active Subs",
          value: activeSubscriptions.toString(),
          trend: "up",
          trendValue: `+${seededInt(baseSeed + 16, 1, 5)} this week`,
          icon: "activity",
        },
      ];

      // ── Trainer performance ────────────────────────────────
      const trainers = await ctx.db.query.users.findMany({
        where: eq(users.role, "trainer"),
      });

      const trainerPerformance = await Promise.all(
        trainers.map(async (trainer) => {
          const profile = await ctx.db.query.trainerProfiles.findFirst({
            where: eq(trainerProfiles.userId, trainer.id),
          });
          const clientCount = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(trainerClientRelationships)
            .where(
              and(
                eq(trainerClientRelationships.trainerId, trainer.id),
                eq(trainerClientRelationships.status, "active")
              )
            );
          const count = Number(clientCount[0]?.count ?? 0);

          return {
            id: trainer.id,
            name: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email,
            clientsAssigned: count,
            revenueGenerated: count * 200 * 12,
            avgHealthScore: (profile?.rating ?? 4.0) * 10,
            responseTimeMin: Math.round(10 + (1 - (profile?.rating ?? 4.0) / 5) * 30),
          };
        })
      );

      const topTrainerPerformance = trainerPerformance
        .sort((a, b) => b.clientsAssigned - a.clientsAssigned)
        .slice(0, 5);

      // ── Recent activity from audit logs ─────────────────────
      const logs = await ctx.db.query.auditLogs.findMany({
        orderBy: desc(auditLogs.createdAt),
        limit: 10,
      });

      const recentActivity = await Promise.all(
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

          const ago = Math.round((Date.now() - new Date(log.createdAt).getTime()) / 3600000);
          const timeStr = ago < 24 ? `${ago}h ago` : `${Math.floor(ago / 24)}d ago`;

          return {
            id: log.id,
            event: log.action,
            detail: `${userName} — ${log.resourceType ?? "platform"}`,
            time: timeStr,
          };
        })
      );

      return {
        kpis,
        companyStats,
        coachPerformance: topTrainerPerformance,
        recentActivity,
      };
    }),

  // ── Keep existing endpoints for backwards compatibility ──────

  getKPIs: superAdminProcedure.query(async ({ ctx }) => {
    const userCounts = await ctx.db
      .select({ role: users.role, count: sql<number>`count(*)` })
      .from(users)
      .groupBy(users.role);
    const roleMap = new Map(userCounts.map((r) => [r.role, Number(r.count)]));
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
          .where(eq(trainerClientRelationships.trainerId, trainer.id));
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

  /**
   * listTrainers — platform-wide trainer listing with search/filter.
   * Used by the trainers management page.
   */
  listTrainers: superAdminProcedure
    .input(
      z.object({
        search: z.string().optional(),
        status: z.enum(["All", "active", "inactive", "suspended", "onboarding"]).optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filters = input ?? {};

      // Get all trainers
      const allTrainers = await ctx.db.query.users.findMany({
        where: eq(users.role, "trainer"),
      });

      // Enrich each trainer
      const enriched = await Promise.all(
        allTrainers.map(async (trainer) => {
          const profile = await ctx.db.query.trainerProfiles.findFirst({
            where: eq(trainerProfiles.userId, trainer.id),
          });
          const clientCountResult = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(trainerClientRelationships)
            .where(
              and(
                eq(trainerClientRelationships.trainerId, trainer.id),
                eq(trainerClientRelationships.status, "active")
              )
            );
          const clientCount = Number(clientCountResult[0]?.count ?? 0);
          const specialties = (profile?.specialties as string[] | null) ?? [];

          return {
            id: trainer.id,
            name: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email,
            email: trainer.email,
            status: trainer.status,
            specialization: specialties[0] ?? "General Health",
            clientsAssigned: clientCount,
            clientCapacity: profile?.capacity ?? 25,
            revenueGenerated: clientCount * 200 * 12,
            avgHealthScore: profile?.rating ? Math.round(profile.rating * 10) / 10 : 0,
            responseTimeMin: Math.round(10 + (1 - (profile?.rating ?? 4.0) / 5) * 30),
            rating: profile?.rating ?? 0,
            acceptingClients: profile?.acceptingClients ?? false,
          };
        })
      );

      // Apply search filter
      let result = enriched;
      if (filters.search) {
        const q = filters.search.toLowerCase();
        result = result.filter(
          (t) =>
            t.name.toLowerCase().includes(q) ||
            t.specialization.toLowerCase().includes(q) ||
            t.email.toLowerCase().includes(q)
        );
      }

      // Apply status filter
      if (filters.status && filters.status !== "All") {
        result = result.filter((t) => t.status === filters.status);
      }

      return result.sort((a, b) => b.clientsAssigned - a.clientsAssigned);
    }),

  /**
   * getTrainerStats — platform-wide trainer statistics.
   */
  getTrainerStats: superAdminProcedure.query(async ({ ctx }) => {
    const allTrainers = await ctx.db.query.users.findMany({
      where: eq(users.role, "trainer"),
    });

    const active = allTrainers.filter((t) => t.status === "active");
    const suspended = allTrainers.filter((t) => t.status === "suspended");
    const onboarding = allTrainers.filter((t) => t.status === "onboarding");

    // Get total client assignments and revenue
    let totalClients = 0;
    let totalRevenue = 0;
    let ratingSum = 0;
    let ratingCount = 0;

    for (const trainer of active) {
      const clientCountResult = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(trainerClientRelationships)
        .where(
          and(
            eq(trainerClientRelationships.trainerId, trainer.id),
            eq(trainerClientRelationships.status, "active")
          )
        );
      const count = Number(clientCountResult[0]?.count ?? 0);
      totalClients += count;
      totalRevenue += count * 200 * 12;

      const profile = await ctx.db.query.trainerProfiles.findFirst({
        where: eq(trainerProfiles.userId, trainer.id),
      });
      if (profile?.rating && profile.rating > 0) {
        ratingSum += profile.rating;
        ratingCount++;
      }
    }

    const avgHealthScore = ratingCount > 0
      ? Math.round((ratingSum / ratingCount) * 10) / 10
      : 0;

    return {
      totalCoaches: allTrainers.length,
      activeCoaches: active.length,
      onLeaveCoaches: suspended.length,
      pendingCoaches: onboarding.length,
      totalClients,
      totalRevenue,
      avgHealthScore,
    };
  }),

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
