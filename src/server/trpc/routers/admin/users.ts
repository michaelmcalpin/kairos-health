import { z } from "zod";
import { router, superAdminProcedure as adminProcedure } from "@/server/trpc";
import {
  users,
  companies,
  clientProfiles,
  trainerProfiles,
  trainerClientRelationships,
  auditLogs,
} from "@/server/db/schema";
import { eq, and, sql, or, desc, asc, ilike, gte } from "drizzle-orm";

export const adminUsersRouter = router({
  // List users with pagination and filters
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional().default(""),
        role: z.enum(["client", "trainer", "company_admin", "super_admin", "all"]).optional().default("all"),
        status: z.enum(["active", "inactive", "suspended", "onboarding", "all"]).optional().default("all"),
        tier: z.enum(["tier1", "tier2", "tier3", "all"]).optional().default("all"),
        companyId: z.string().optional().default("all"),
        sortBy: z.enum(["name", "email", "createdAt", "lastLogin", "status"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const {
        search = "", role = "all", status = "all", tier = "all",
        companyId = "all", sortBy = "createdAt", sortOrder = "desc",
        page = 1, pageSize = 20,
      } = input ?? {};

      const conditions = [];
      if (role !== "all") conditions.push(eq(users.role, role));
      if (status !== "all") conditions.push(eq(users.status, status));
      if (companyId !== "all") conditions.push(eq(users.companyId, companyId));
      if (search) {
        conditions.push(
          or(
            ilike(users.email, `%${search}%`),
            ilike(users.firstName, `%${search}%`),
            ilike(users.lastName, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Count
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);
      const total = Number(countResult?.count ?? 0);

      // Sort
      const sortCol = sortBy === "name" ? users.firstName
        : sortBy === "email" ? users.email
        : sortBy === "status" ? users.status
        : users.createdAt;
      const orderFn = sortOrder === "asc" ? asc(sortCol) : desc(sortCol);

      const userRows = await ctx.db
        .select()
        .from(users)
        .where(whereClause)
        .orderBy(orderFn)
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // Enrich with company name and profile info
      const enriched = await Promise.all(
        userRows.map(async (u) => {
          let companyName: string | null = null;
          if (u.companyId) {
            const company = await ctx.db.query.companies.findFirst({
              where: eq(companies.id, u.companyId),
            });
            companyName = company?.name ?? null;
          }

          let subscription = null;
          let profile = null;

          if (u.role === "client") {
            const cp = await ctx.db.query.clientProfiles.findFirst({
              where: eq(clientProfiles.userId, u.id),
            });
            if (cp) {
              // Filter by tier if requested
              if (tier !== "all" && cp.tier !== tier) return null;
              subscription = {
                tier: cp.tier as "tier1" | "tier2" | "tier3",
                status: "active" as const,
                currentPeriodEnd: null,
                stripeCustomerId: null,
              };
              profile = {
                goals: (cp.goals as string[]) ?? [],
                onboardingCompleted: cp.onboardingCompleted ?? false,
                dateOfBirth: cp.dateOfBirth,
              };
            }
          } else if (u.role === "trainer") {
            const tp = await ctx.db.query.trainerProfiles.findFirst({
              where: eq(trainerProfiles.userId, u.id),
            });
            if (tp) {
              const [clientCount] = await ctx.db
                .select({ count: sql<number>`count(*)` })
                .from(trainerClientRelationships)
                .where(and(
                  eq(trainerClientRelationships.trainerId, u.id),
                  eq(trainerClientRelationships.status, "active")
                ));
              profile = {
                specialties: (tp.specialties as string[]) ?? [],
                capacity: tp.capacity ?? 25,
                currentClients: Number(clientCount?.count ?? 0),
                acceptingClients: tp.acceptingClients ?? true,
                rating: tp.rating ?? 0,
                reviewCount: tp.reviewCount ?? 0,
                monthlyRate: tp.monthlyRate ? Number(tp.monthlyRate) : undefined,
              };
            }
          }

          // Skip if tier filter didn't match for non-client roles
          if (tier !== "all" && u.role !== "client") return null;

          return {
            id: u.id,
            email: u.email,
            firstName: u.firstName ?? "",
            lastName: u.lastName ?? "",
            role: u.role as "client" | "trainer" | "company_admin" | "super_admin",
            status: u.status as "active" | "inactive" | "suspended" | "onboarding",
            avatarUrl: u.avatarUrl,
            companyId: u.companyId,
            companyName,
            createdAt: u.createdAt.toISOString(),
            updatedAt: u.updatedAt.toISOString(),
            lastLoginAt: null,
            subscription,
            profile,
          };
        })
      );

      const filtered = enriched.filter((u): u is NonNullable<typeof u> => u !== null);

      return {
        users: filtered,
        total: tier !== "all" ? filtered.length : total,
        page,
        pageSize,
        totalPages: Math.ceil((tier !== "all" ? filtered.length : total) / pageSize),
      };
    }),

  // Get single user detail
  get: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ ctx, input }) => {
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.id, input.userId),
      });
      if (!user) throw new Error("User not found");

      let companyName: string | null = null;
      if (user.companyId) {
        const company = await ctx.db.query.companies.findFirst({
          where: eq(companies.id, user.companyId),
        });
        companyName = company?.name ?? null;
      }

      return {
        id: user.id,
        email: user.email,
        firstName: user.firstName ?? "",
        lastName: user.lastName ?? "",
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        companyId: user.companyId,
        companyName,
        createdAt: user.createdAt.toISOString(),
        updatedAt: user.updatedAt.toISOString(),
        lastLoginAt: null,
        subscription: null,
        profile: null,
      };
    }),

  // Update user profile
  update: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, ...updates } = input;
      const [updated] = await ctx.db
        .update(users)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(users.id, userId))
        .returning();

      if (!updated) throw new Error("User not found");

      await ctx.db.insert(auditLogs).values({
        userId: ctx.dbUserId,
        action: "user.updated",
        resourceType: "user",
        resourceId: userId,
        metadata: { updates: Object.keys(updates) },
      });

      return updated;
    }),

  // Perform user action (suspend, reactivate, change role, etc.)
  performAction: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        action: z.enum(["suspend", "reactivate", "change_role", "change_tier", "reset_onboarding", "delete"]),
        reason: z.string().optional(),
        newRole: z.enum(["client", "trainer", "company_admin", "super_admin"]).optional(),
        newTier: z.enum(["tier1", "tier2", "tier3"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { userId, action, reason, newRole, newTier } = input;

      if (action === "suspend") {
        await ctx.db.update(users).set({ status: "suspended", updatedAt: new Date() }).where(eq(users.id, userId));
      } else if (action === "reactivate") {
        await ctx.db.update(users).set({ status: "active", updatedAt: new Date() }).where(eq(users.id, userId));
      } else if (action === "change_role" && newRole) {
        await ctx.db.update(users).set({ role: newRole, updatedAt: new Date() }).where(eq(users.id, userId));
      } else if (action === "change_tier" && newTier) {
        await ctx.db
          .update(clientProfiles)
          .set({ tier: newTier })
          .where(eq(clientProfiles.userId, userId));
      } else if (action === "reset_onboarding") {
        await ctx.db
          .update(clientProfiles)
          .set({ onboardingStep: 1, onboardingCompleted: false })
          .where(eq(clientProfiles.userId, userId));
      } else if (action === "delete") {
        await ctx.db.update(users).set({ status: "inactive", updatedAt: new Date() }).where(eq(users.id, userId));
      }

      await ctx.db.insert(auditLogs).values({
        userId: ctx.dbUserId,
        action: `user.${action === "change_role" ? "role_changed" : action === "change_tier" ? "status_changed" : action === "suspend" ? "suspended" : action === "reactivate" ? "reactivated" : action}`,
        resourceType: "user",
        resourceId: userId,
        metadata: { reason, newRole, newTier },
      });

      // Return updated user
      const updated = await ctx.db.query.users.findFirst({
        where: eq(users.id, userId),
      });

      if (!updated) throw new Error("User not found");

      let companyName: string | null = null;
      if (updated.companyId) {
        const company = await ctx.db.query.companies.findFirst({
          where: eq(companies.id, updated.companyId),
        });
        companyName = company?.name ?? null;
      }

      return {
        id: updated.id,
        email: updated.email,
        firstName: updated.firstName ?? "",
        lastName: updated.lastName ?? "",
        role: updated.role as "client" | "trainer" | "company_admin" | "super_admin",
        status: updated.status as "active" | "inactive" | "suspended" | "onboarding",
        avatarUrl: updated.avatarUrl,
        companyId: updated.companyId,
        companyName,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
        lastLoginAt: null,
        subscription: null,
        profile: null,
      };
    }),

  // Get platform user stats
  getStats: adminProcedure
    .input(z.object({ companyId: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const companyId = input?.companyId;
      const baseCondition = companyId ? eq(users.companyId, companyId) : undefined;

      const countRole = async (value: "client" | "trainer" | "company_admin" | "super_admin") => {
        const conditions = [eq(users.role, value)];
        if (baseCondition) conditions.push(baseCondition);
        const [result] = await ctx.db.select({ count: sql<number>`count(*)` }).from(users).where(and(...conditions));
        return Number(result?.count ?? 0);
      };
      const countStatus = async (value: "active" | "inactive" | "suspended" | "onboarding") => {
        const conditions = [eq(users.status, value)];
        if (baseCondition) conditions.push(baseCondition);
        const [result] = await ctx.db.select({ count: sql<number>`count(*)` }).from(users).where(and(...conditions));
        return Number(result?.count ?? 0);
      };

      const [totalResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(baseCondition);
      const totalUsers = Number(totalResult?.count ?? 0);

      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      const oneMonthAgo = new Date();
      oneMonthAgo.setDate(oneMonthAgo.getDate() - 30);

      const newWeekConditions = [gte(users.createdAt, oneWeekAgo)];
      if (baseCondition) newWeekConditions.push(baseCondition);
      const [newWeekResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(...newWeekConditions));

      const newMonthConditions = [gte(users.createdAt, oneMonthAgo)];
      if (baseCondition) newMonthConditions.push(baseCondition);
      const [newMonthResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(...newMonthConditions));

      // Tier counts from client profiles
      const tierCount = async (tier: "tier1" | "tier2" | "tier3") => {
        if (companyId) {
          const [result] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(clientProfiles)
            .innerJoin(users, eq(clientProfiles.userId, users.id))
            .where(and(eq(clientProfiles.tier, tier), eq(users.companyId, companyId)));
          return Number(result?.count ?? 0);
        }
        const [result] = await ctx.db
          .select({ count: sql<number>`count(*)` })
          .from(clientProfiles)
          .where(eq(clientProfiles.tier, tier));
        return Number(result?.count ?? 0);
      };

      return {
        totalUsers,
        activeUsers: await countStatus("active"),
        suspendedUsers: await countStatus("suspended"),
        onboardingUsers: await countStatus("onboarding"),
        clientCount: await countRole("client"),
        trainerCount: await countRole("trainer"),
        companyAdminCount: await countRole("company_admin"),
        superAdminCount: await countRole("super_admin"),
        tier1Count: await tierCount("tier1"),
        tier2Count: await tierCount("tier2"),
        tier3Count: await tierCount("tier3"),
        newUsersThisWeek: Number(newWeekResult?.count ?? 0),
        newUsersThisMonth: Number(newMonthResult?.count ?? 0),
        churnRate: 0,
      };
    }),

  // Get audit log
  getAuditLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        action: z.string().optional(),
        userId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const offset = input?.offset ?? 0;
      const conditions = [];

      if (input?.action) conditions.push(eq(auditLogs.action, input.action));
      if (input?.userId) conditions.push(eq(auditLogs.resourceId, input.userId));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const entries = await ctx.db
        .select()
        .from(auditLogs)
        .where(whereClause)
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit)
        .offset(offset);

      return entries.map((e) => ({
        id: e.id,
        actorId: e.userId ?? "",
        actorName: "Admin",
        action: e.action,
        targetUserId: e.resourceType === "user" ? e.resourceId : null,
        targetUserName: null,
        resourceType: e.resourceType ?? "user",
        resourceId: e.resourceId ?? "",
        details: JSON.stringify(e.metadata ?? {}),
        metadata: (e.metadata ?? {}) as Record<string, unknown>,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt.toISOString(),
      }));
    }),

  // Get audit log for a specific user
  getUserAuditLog: adminProcedure
    .input(z.object({ userId: z.string(), limit: z.number().optional().default(20) }))
    .query(async ({ ctx, input }) => {
      const entries = await ctx.db
        .select()
        .from(auditLogs)
        .where(
          and(
            eq(auditLogs.resourceType, "user"),
            eq(auditLogs.resourceId, input.userId)
          )
        )
        .orderBy(desc(auditLogs.createdAt))
        .limit(input.limit);

      return entries.map((e) => ({
        id: e.id,
        actorId: e.userId ?? "",
        actorName: "Admin",
        action: e.action,
        targetUserId: e.resourceId,
        targetUserName: null,
        resourceType: e.resourceType ?? "user",
        resourceId: e.resourceId ?? "",
        details: JSON.stringify(e.metadata ?? {}),
        metadata: (e.metadata ?? {}) as Record<string, unknown>,
        ipAddress: e.ipAddress,
        createdAt: e.createdAt.toISOString(),
      }));
    }),
});
