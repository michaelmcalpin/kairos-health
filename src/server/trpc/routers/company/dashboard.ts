import { z } from "zod";
import { router, companyAdminProcedure } from "@/server/trpc";
import {
  users,
  companies,
  clientProfiles,
  trainerProfiles,
  trainerClientRelationships,
} from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

export const companyDashboardRouter = router({
  /**
   * getDashboard — full company dashboard payload.
   *
   * Returns company info, stats, trainer list, and client list
   * all from real DB queries using the admin's companyId.
   */
  getDashboard: companyAdminProcedure.query(async ({ ctx }) => {
    const companyId = ctx.companyId;

    // ── Company record ───────────────────────────────────────
    const company = companyId
      ? await ctx.db.query.companies.findFirst({
          where: eq(companies.id, companyId),
        })
      : null;

    // ── Trainers in this company ─────────────────────────────
    const trainerUsers = companyId
      ? await ctx.db.query.users.findMany({
          where: and(eq(users.companyId, companyId), eq(users.role, "trainer")),
        })
      : [];

    const trainers = await Promise.all(
      trainerUsers.map(async (t) => {
        const profile = await ctx.db.query.trainerProfiles.findFirst({
          where: eq(trainerProfiles.userId, t.id),
        });
        const clientCount = await ctx.db
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
          clientCount: Number(clientCount[0]?.count ?? 0),
          capacity: profile?.capacity ?? 25,
          rating: profile?.rating ?? 0,
          status: t.status === "active" ? "active" as const : "inactive" as const,
        };
      })
    );

    // ── Clients in this company ──────────────────────────────
    const clientUsers = companyId
      ? await ctx.db.query.users.findMany({
          where: and(eq(users.companyId, companyId), eq(users.role, "client")),
        })
      : [];

    const clients = await Promise.all(
      clientUsers.map(async (c) => {
        const profile = await ctx.db.query.clientProfiles.findFirst({
          where: eq(clientProfiles.userId, c.id),
        });

        // Find trainer assignment
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

    // ── Computed stats ───────────────────────────────────────
    const totalCapacity = trainers.reduce((s, t) => s + t.capacity, 0);
    const totalAssigned = trainers.reduce((s, t) => s + t.clientCount, 0);
    const avgRating = trainers.length > 0
      ? parseFloat((trainers.reduce((s, t) => s + t.rating, 0) / trainers.length).toFixed(1))
      : 0;

    return {
      company: company
        ? {
            id: company.id,
            name: company.name,
            slug: company.slug,
            logoUrl: company.logoUrl,
            brandColor: company.brandColor ?? "#D4AF37",
            status: company.status,
            maxTrainers: company.maxTrainers ?? 10,
            maxClients: company.maxClients ?? 100,
          }
        : null,
      stats: {
        trainerCount: trainers.length,
        clientCount: clients.length,
        totalCapacity,
        utilization: totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0,
        avgRating,
        estMrr: clients.length * 200,
      },
      trainers: trainers.sort((a, b) => b.rating - a.rating),
      clients,
    };
  }),

  // ── Keep existing endpoints for backwards compatibility ──────

  getOverview: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      const company = await ctx.db.query.companies.findFirst({
        where: eq(companies.id, input.companyId),
      });
      if (!company) throw new Error("Company not found");

      const trainerCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.companyId, input.companyId), eq(users.role, "trainer")));

      const clientCount = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(users)
        .where(and(eq(users.companyId, input.companyId), eq(users.role, "client")));

      return {
        company,
        trainerCount: Number(trainerCount[0]?.count ?? 0),
        clientCount: Number(clientCount[0]?.count ?? 0),
      };
    }),

  getTrainers: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.users.findMany({
        where: and(eq(users.companyId, input.companyId), eq(users.role, "trainer")),
      });
    }),

  getClients: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.users.findMany({
        where: and(eq(users.companyId, input.companyId), eq(users.role, "client")),
      });
    }),
});
