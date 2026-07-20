/**
 * EVERIST Client Coach-Access Router
 *
 * Lets a CLIENT control which coaches can see their data and at what
 * level. The client grants access by coach email, chooses per-category
 * levels (diet / exercise / labs / healthData — none / read / write),
 * and can update or revoke at any time.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import { users, clientCoachAccess, trainerClientRelationships, trainerProfiles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

const accessLevelInput = z.enum(["none", "read", "write"]);

const categoryLevelsInput = z.object({
  dietAccess: accessLevelInput.default("none"),
  exerciseAccess: accessLevelInput.default("none"),
  labsAccess: accessLevelInput.default("none"),
  healthDataAccess: accessLevelInput.default("none"),
});

export const clientCoachAccessRouter = router({
  /**
   * List all coaches with access to my data: the primary coach
   * (relationship) plus every active client-granted coach.
   */
  list: clientProcedure.query(async ({ ctx }) => {
    // Primary coach
    const primaryRel = await ctx.db.query.trainerClientRelationships.findFirst({
      where: and(
        eq(trainerClientRelationships.clientId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active"),
      ),
    });

    let primary = null;
    if (primaryRel) {
      const coach = await ctx.db.query.users.findFirst({
        where: eq(users.id, primaryRel.trainerId),
      });
      if (coach) {
        primary = {
          coachId: coach.id,
          firstName: coach.firstName,
          lastName: coach.lastName,
          email: coach.email,
          avatarUrl: coach.avatarUrl,
          isPrimary: true,
        };
      }
    }

    // Granted coaches
    const grants = await ctx.db.query.clientCoachAccess.findMany({
      where: and(
        eq(clientCoachAccess.clientId, ctx.dbUserId),
        eq(clientCoachAccess.status, "active"),
      ),
    });

    const granted = await Promise.all(
      grants.map(async (g) => {
        const coach = await ctx.db.query.users.findFirst({
          where: eq(users.id, g.coachId),
        });
        return {
          grantId: g.id,
          coachId: g.coachId,
          firstName: coach?.firstName ?? null,
          lastName: coach?.lastName ?? null,
          email: coach?.email ?? null,
          avatarUrl: coach?.avatarUrl ?? null,
          dietAccess: g.dietAccess,
          exerciseAccess: g.exerciseAccess,
          labsAccess: g.labsAccess,
          healthDataAccess: g.healthDataAccess,
          grantedAt: g.grantedAt,
        };
      }),
    );

    return { primary, granted };
  }),

  /**
   * Look up a coach by email (to preview before granting).
   */
  findCoach: clientProcedure
    .input(z.object({ email: z.string().email() }))
    .query(async ({ ctx, input }) => {
      const coach = await ctx.db.query.users.findFirst({
        where: and(
          eq(users.email, input.email.toLowerCase().trim()),
          eq(users.role, "trainer"),
        ),
      });
      if (!coach) return null;

      const profile = await ctx.db.query.trainerProfiles.findFirst({
        where: eq(trainerProfiles.userId, coach.id),
      });

      return {
        coachId: coach.id,
        firstName: coach.firstName,
        lastName: coach.lastName,
        email: coach.email,
        avatarUrl: coach.avatarUrl,
        bio: profile?.bio ?? null,
        specialties: (profile?.specialties as string[]) ?? [],
      };
    }),

  /**
   * Grant a coach access to my data (or re-activate/update an existing
   * grant for the same coach).
   */
  grant: clientProcedure
    .input(
      z.object({
        coachEmail: z.string().email(),
      }).merge(categoryLevelsInput),
    )
    .mutation(async ({ ctx, input }) => {
      const coach = await ctx.db.query.users.findFirst({
        where: and(
          eq(users.email, input.coachEmail.toLowerCase().trim()),
          eq(users.role, "trainer"),
        ),
      });
      if (!coach) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "No coach found with that email address.",
        });
      }
      if (coach.id === ctx.dbUserId) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "You cannot grant access to yourself." });
      }

      const allNone =
        input.dietAccess === "none" &&
        input.exerciseAccess === "none" &&
        input.labsAccess === "none" &&
        input.healthDataAccess === "none";
      if (allNone) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Select at least one category to share.",
        });
      }

      // Upsert: one grant row per client+coach pair
      const existing = await ctx.db.query.clientCoachAccess.findFirst({
        where: and(
          eq(clientCoachAccess.clientId, ctx.dbUserId),
          eq(clientCoachAccess.coachId, coach.id),
        ),
      });

      if (existing) {
        const [updated] = await ctx.db
          .update(clientCoachAccess)
          .set({
            dietAccess: input.dietAccess,
            exerciseAccess: input.exerciseAccess,
            labsAccess: input.labsAccess,
            healthDataAccess: input.healthDataAccess,
            status: "active",
            revokedAt: null,
            updatedAt: new Date(),
          })
          .where(eq(clientCoachAccess.id, existing.id))
          .returning();
        return updated;
      }

      const [created] = await ctx.db
        .insert(clientCoachAccess)
        .values({
          clientId: ctx.dbUserId,
          coachId: coach.id,
          dietAccess: input.dietAccess,
          exerciseAccess: input.exerciseAccess,
          labsAccess: input.labsAccess,
          healthDataAccess: input.healthDataAccess,
          status: "active",
        })
        .returning();
      return created;
    }),

  /**
   * Update the category levels on an existing grant.
   */
  update: clientProcedure
    .input(z.object({ grantId: z.string().uuid() }).merge(categoryLevelsInput))
    .mutation(async ({ ctx, input }) => {
      const grant = await ctx.db.query.clientCoachAccess.findFirst({
        where: and(
          eq(clientCoachAccess.id, input.grantId),
          eq(clientCoachAccess.clientId, ctx.dbUserId),
        ),
      });
      if (!grant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Access grant not found." });
      }

      const [updated] = await ctx.db
        .update(clientCoachAccess)
        .set({
          dietAccess: input.dietAccess,
          exerciseAccess: input.exerciseAccess,
          labsAccess: input.labsAccess,
          healthDataAccess: input.healthDataAccess,
          updatedAt: new Date(),
        })
        .where(eq(clientCoachAccess.id, grant.id))
        .returning();
      return updated;
    }),

  /**
   * Revoke a coach's access entirely.
   */
  revoke: clientProcedure
    .input(z.object({ grantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const grant = await ctx.db.query.clientCoachAccess.findFirst({
        where: and(
          eq(clientCoachAccess.id, input.grantId),
          eq(clientCoachAccess.clientId, ctx.dbUserId),
        ),
      });
      if (!grant) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Access grant not found." });
      }

      await ctx.db
        .update(clientCoachAccess)
        .set({ status: "revoked", revokedAt: new Date(), updatedAt: new Date() })
        .where(eq(clientCoachAccess.id, grant.id));

      return { success: true };
    }),
});
