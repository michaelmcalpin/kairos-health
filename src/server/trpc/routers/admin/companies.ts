import { z } from "zod";
import { router, superAdminProcedure as adminProcedure } from "@/server/trpc";
import {
  companies,
  users,
  trainerProfiles,
  clientProfiles,
  trainerClientRelationships,
  auditLogs,
} from "@/server/db/schema";
import { eq, and, sql, like, or, desc, asc, ilike } from "drizzle-orm";

export const adminCompaniesRouter = router({
  // List companies with pagination and filters
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional().default(""),
        status: z.enum(["all", "active", "inactive", "suspended", "onboarding"]).optional().default("all"),
        sortBy: z.enum(["name", "createdAt", "trainerCount", "clientCount"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(20),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const { search = "", status = "all", sortBy = "createdAt", sortOrder = "desc", page = 1, pageSize = 20 } = input ?? {};

      // Build where conditions
      const conditions = [];
      if (status !== "all") {
        conditions.push(eq(companies.status, status));
      }
      if (search) {
        conditions.push(
          or(
            ilike(companies.name, `%${search}%`),
            ilike(companies.slug, `%${search}%`),
            ilike(companies.website, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Get total count
      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(companies)
        .where(whereClause);
      const total = Number(countResult?.count ?? 0);

      // Determine sort column
      const orderCol = sortBy === "name" ? companies.name : companies.createdAt;
      const orderFn = sortOrder === "asc" ? asc(orderCol) : desc(orderCol);

      const companyRows = await ctx.db
        .select()
        .from(companies)
        .where(whereClause)
        .orderBy(orderFn)
        .limit(pageSize)
        .offset((page - 1) * pageSize);

      // Enrich with trainer/client counts
      const enriched = await Promise.all(
        companyRows.map(async (c) => {
          const [trainerCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(and(eq(users.companyId, c.id), eq(users.role, "trainer")));

          const [clientCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(users)
            .where(and(eq(users.companyId, c.id), eq(users.role, "client")));

          return {
            id: c.id,
            name: c.name,
            slug: c.slug,
            logoUrl: c.logoUrl,
            brandColor: c.brandColor ?? "#D4AF37",
            website: c.website ?? "",
            emailFromName: c.emailFromName ?? "",
            emailFooter: c.emailFooter ?? "",
            status: c.status,
            maxTrainers: c.maxTrainers ?? 10,
            maxClients: c.maxClients ?? 100,
            trainerCount: Number(trainerCount?.count ?? 0),
            clientCount: Number(clientCount?.count ?? 0),
            createdAt: c.createdAt.toISOString(),
            updatedAt: c.updatedAt.toISOString(),
          };
        })
      );

      // Sort by computed columns if needed
      if (sortBy === "trainerCount" || sortBy === "clientCount") {
        enriched.sort((a, b) => {
          const diff = a[sortBy] - b[sortBy];
          return sortOrder === "asc" ? diff : -diff;
        });
      }

      return {
        companies: enriched,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      };
    }),

  // Get single company detail
  get: adminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.db.query.companies.findFirst({
        where: eq(companies.id, input.companyId),
      });
      if (!company) throw new Error("Company not found");

      const [trainerCount] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.companyId, company.id), eq(users.role, "trainer")));

      const [clientCount] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.companyId, company.id), eq(users.role, "client")));

      return {
        id: company.id,
        name: company.name,
        slug: company.slug,
        logoUrl: company.logoUrl,
        brandColor: company.brandColor ?? "#D4AF37",
        website: company.website ?? "",
        emailFromName: company.emailFromName ?? "",
        emailFooter: company.emailFooter ?? "",
        status: company.status,
        maxTrainers: company.maxTrainers ?? 10,
        maxClients: company.maxClients ?? 100,
        trainerCount: Number(trainerCount?.count ?? 0),
        clientCount: Number(clientCount?.count ?? 0),
        createdAt: company.createdAt.toISOString(),
        updatedAt: company.updatedAt.toISOString(),
      };
    }),

  // Get platform-wide company stats
  getStats: adminProcedure
    .query(async ({ ctx }) => {
      const [totalResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(companies);

      const [activeResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(companies)
        .where(eq(companies.status, "active"));

      const [trainerResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "trainer"));

      const [clientResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.role, "client"));

      const totalClients = Number(clientResult?.count ?? 0);

      return {
        totalCompanies: Number(totalResult?.count ?? 0),
        activeCompanies: Number(activeResult?.count ?? 0),
        totalTrainers: Number(trainerResult?.count ?? 0),
        totalClients,
        mrr: totalClients * 200,
      };
    }),

  // Get trainers for a company
  getTrainers: adminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const trainerUsers = await ctx.db.query.users.findMany({
        where: and(eq(users.companyId, input.companyId), eq(users.role, "trainer")),
      });

      return Promise.all(
        trainerUsers.map(async (t) => {
          const profile = await ctx.db.query.trainerProfiles.findFirst({
            where: eq(trainerProfiles.userId, t.id),
          });
          const [clientCount] = await ctx.db
            .select({ count: sql<number>`count(*)` })
            .from(trainerClientRelationships)
            .where(
              and(
                eq(trainerClientRelationships.trainerId, t.id),
                eq(trainerClientRelationships.status, "active")
              )
            );

          return {
            id: t.id,
            firstName: t.firstName ?? "",
            lastName: t.lastName ?? "",
            email: t.email,
            avatarUrl: t.avatarUrl,
            clientCount: Number(clientCount?.count ?? 0),
            capacity: profile?.capacity ?? 25,
            rating: profile?.rating ?? 0,
            status: t.status === "active" ? "active" as const : "inactive" as const,
          };
        })
      );
    }),

  // Get clients for a company
  getClients: adminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const clientUsers = await ctx.db.query.users.findMany({
        where: and(eq(users.companyId, input.companyId), eq(users.role, "client")),
      });

      return Promise.all(
        clientUsers.map(async (c) => {
          const profile = await ctx.db.query.clientProfiles.findFirst({
            where: eq(clientProfiles.userId, c.id),
          });

          const relationship = await ctx.db.query.trainerClientRelationships.findFirst({
            where: and(
              eq(trainerClientRelationships.clientId, c.id),
              eq(trainerClientRelationships.status, "active")
            ),
          });

          let trainerName = "Unassigned";
          if (relationship) {
            const trainer = await ctx.db.query.users.findFirst({
              where: eq(users.id, relationship.trainerId),
            });
            if (trainer) {
              trainerName = `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email;
            }
          }

          return {
            id: c.id,
            firstName: c.firstName ?? "",
            lastName: c.lastName ?? "",
            email: c.email,
            tier: (profile?.tier ?? "tier3") as "tier1" | "tier2" | "tier3",
            trainerId: relationship?.trainerId ?? "",
            trainerName,
            status: c.status === "active" ? "active" as const : "inactive" as const,
          };
        })
      );
    }),

  // Create a new company
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        website: z.string().max(500).optional(),
        emailFromName: z.string().max(255).optional(),
        emailFooter: z.string().max(1000).optional(),
        maxTrainers: z.number().min(1).max(1000).optional(),
        maxClients: z.number().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const slug = input.slug || input.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

      const [created] = await ctx.db
        .insert(companies)
        .values({
          name: input.name,
          slug,
          brandColor: input.brandColor ?? "#D4AF37",
          website: input.website ?? "",
          emailFromName: input.emailFromName ?? input.name,
          emailFooter: input.emailFooter ?? "",
          maxTrainers: input.maxTrainers ?? 10,
          maxClients: input.maxClients ?? 100,
        })
        .returning();

      // Log the creation
      await ctx.db.insert(auditLogs).values({
        userId: ctx.dbUserId,
        action: "company.created",
        resourceType: "company",
        resourceId: created.id,
        metadata: { companyName: created.name },
      });

      return created;
    }),

  // Update an existing company
  update: adminProcedure
    .input(
      z.object({
        companyId: z.string(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(100).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        website: z.string().max(500).optional(),
        emailFromName: z.string().max(255).optional(),
        emailFooter: z.string().max(1000).optional(),
        logoUrl: z.string().nullable().optional(),
        maxTrainers: z.number().min(1).max(1000).optional(),
        maxClients: z.number().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, ...updates } = input;

      const [updated] = await ctx.db
        .update(companies)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(companies.id, companyId))
        .returning();

      if (!updated) throw new Error("Company not found");

      await ctx.db.insert(auditLogs).values({
        userId: ctx.dbUserId,
        action: "company.updated",
        resourceType: "company",
        resourceId: companyId,
        metadata: { updates: Object.keys(updates) },
      });

      return updated;
    }),

  // Perform company action (suspend, reactivate, delete)
  performAction: adminProcedure
    .input(
      z.object({
        companyId: z.string(),
        action: z.enum(["suspend", "reactivate", "delete"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (input.action === "delete") {
        // Soft-delete: set status to inactive
        const [updated] = await ctx.db
          .update(companies)
          .set({ status: "inactive", updatedAt: new Date() })
          .where(eq(companies.id, input.companyId))
          .returning();

        await ctx.db.insert(auditLogs).values({
          userId: ctx.dbUserId,
          action: "company.deleted",
          resourceType: "company",
          resourceId: input.companyId,
          metadata: { reason: input.reason },
        });

        return updated;
      }

      const newStatus = input.action === "suspend" ? "suspended" as const : "active" as const;

      const [updated] = await ctx.db
        .update(companies)
        .set({ status: newStatus, updatedAt: new Date() })
        .where(eq(companies.id, input.companyId))
        .returning();

      if (!updated) throw new Error("Company not found");

      await ctx.db.insert(auditLogs).values({
        userId: ctx.dbUserId,
        action: `company.${input.action === "suspend" ? "suspended" : "reactivated"}`,
        resourceType: "company",
        resourceId: input.companyId,
        metadata: { reason: input.reason },
      });

      return updated;
    }),

  // Get audit log for companies
  getAuditLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        companyId: z.string().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;
      const conditions = [like(auditLogs.action, "company.%")];

      if (input?.companyId) {
        conditions.push(eq(auditLogs.resourceId, input.companyId));
      }

      const entries = await ctx.db
        .select()
        .from(auditLogs)
        .where(and(...conditions))
        .orderBy(desc(auditLogs.createdAt))
        .limit(limit);

      return entries.map((e) => ({
        id: e.id,
        action: e.action,
        details: JSON.stringify(e.metadata ?? {}),
        userId: e.userId,
        timestamp: e.createdAt.toISOString(),
      }));
    }),
});
