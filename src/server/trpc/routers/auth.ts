import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { users, clientProfiles, trainerProfiles, clientInvitations, trainerClientRelationships } from "@/server/db/schema";
import { eq, and, ilike, sql } from "drizzle-orm";
import { auth as clerkAuth, currentUser, clerkClient } from "@clerk/nextjs/server";
import { logger } from "@/lib/middleware/logger";

export const authRouter = router({
  /**
   * Ensures a DB user record exists for the currently signed-in Clerk user.
   * Called from /select-role on first load to handle cases where the Clerk
   * webhook hasn't fired yet (common in dev) or webhook delivery failed.
   *
   * Reads role and companyId from Clerk publicMetadata if set
   * (e.g. by seed script or admin assignment).
   */
  ensureUser: publicProcedure.mutation(async ({ ctx }) => {
    const { userId: clerkId } = await clerkAuth();
    if (!clerkId) return { user: null, created: false };

    // Already in our DB?
    const existing = await ctx.db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (existing) {
      // Sync role from Clerk publicMetadata in case it was updated
      // (e.g. admin promoted user via Clerk dashboard)
      // Use clerkClient() Backend API for FRESH data — currentUser() can
      // return stale session-token data if the JWT hasn't refreshed yet.
      try {
        const client = await clerkClient();
        const freshUser = await client.users.getUser(clerkId);
        const validRoles = ["client", "trainer", "company_admin", "super_admin"] as const;
        type ValidRole = (typeof validRoles)[number];
        const metaRole = freshUser.publicMetadata?.role as string | undefined;
        if (metaRole && (validRoles as readonly string[]).includes(metaRole) && metaRole !== existing.role) {
          const [updated] = await ctx.db
            .update(users)
            .set({ role: metaRole as ValidRole, updatedAt: new Date() })
            .where(eq(users.clerkId, clerkId))
            .returning();
          return { user: updated, created: false };
        }
      } catch (e) {
        logger.error("auth", "Failed to sync role from Clerk", { error: e instanceof Error ? e.message : "Unknown" });
      }
      return { user: existing, created: false };
    }

    // Fetch full Clerk user to get email + metadata
    const clerkUser = await currentUser();
    if (!clerkUser) return { user: null, created: false };

    const email = clerkUser.emailAddresses[0]?.emailAddress;
    if (!email) return { user: null, created: false };

    const validRoles = ["client", "trainer", "company_admin", "super_admin"] as const;
    type ValidRole = (typeof validRoles)[number];
    const metaRole = clerkUser.publicMetadata?.role as string | undefined;
    const role: ValidRole = metaRole && (validRoles as readonly string[]).includes(metaRole)
      ? (metaRole as ValidRole)
      : "client";
    const companyId = (clerkUser.publicMetadata?.companyId as string) || null;

    // Check if a stub user already exists for this email (created by a trainer)
    const stubUser = await ctx.db.query.users.findFirst({
      where: and(
        ilike(users.email, email),
        sql`${users.clerkId} LIKE 'pending-%'`,
      ),
    });

    if (stubUser) {
      // Merge: update the stub user with real Clerk data
      const [mergedUser] = await ctx.db
        .update(users)
        .set({
          clerkId,
          firstName: clerkUser.firstName ?? stubUser.firstName,
          lastName: clerkUser.lastName ?? stubUser.lastName,
          avatarUrl: clerkUser.imageUrl ?? stubUser.avatarUrl ?? undefined,
          role: role !== "client" ? role : stubUser.role, // preserve role unless Clerk overrides
          companyId: companyId ?? stubUser.companyId ?? undefined,
          updatedAt: new Date(),
        })
        .where(eq(users.id, stubUser.id))
        .returning();

      // Mark any pending invitations as accepted
      try {
        const pendingInvites = await ctx.db.query.clientInvitations.findMany({
          where: and(
            ilike(clientInvitations.email, email),
            eq(clientInvitations.status, "pending"),
          ),
        });
        for (const invite of pendingInvites) {
          await ctx.db.update(clientInvitations)
            .set({ status: "accepted", acceptedAt: new Date() })
            .where(eq(clientInvitations.id, invite.id));
        }
        if (pendingInvites.length > 0) {
          logger.info("auth", `Merged stub user and accepted ${pendingInvites.length} invitation(s)`, { email });
        }
      } catch {
        // clientInvitations table may not exist yet
      }

      logger.info("auth", "Merged stub user with Clerk sign-up", { email, stubId: stubUser.id });
      return { user: mergedUser, created: false };
    }

    const [newUser] = await ctx.db
      .insert(users)
      .values({
        clerkId,
        email,
        firstName: clerkUser.firstName ?? undefined,
        lastName: clerkUser.lastName ?? undefined,
        avatarUrl: clerkUser.imageUrl ?? undefined,
        role,
        companyId: companyId ?? undefined,
      })
      .returning();

    // Create role-specific profile
    if (role === "client" && newUser) {
      // Check for pending invitations — use invited tier if available
      let invitedTier: "tier1" | "tier2" | "tier3" = "tier1";
      try {
        const pendingInvites = await ctx.db.query.clientInvitations.findMany({
          where: and(
            ilike(clientInvitations.email, email),
            eq(clientInvitations.status, "pending"),
          ),
        });

        if (pendingInvites.length > 0) {
          // Use the tier from the first invitation
          invitedTier = (pendingInvites[0].tier as "tier1" | "tier2" | "tier3") ?? "tier1";

          // Auto-create trainer-client relationships for all pending invitations
          for (const invite of pendingInvites) {
            await ctx.db.insert(trainerClientRelationships).values({
              trainerId: invite.trainerId,
              clientId: newUser.id,
              status: "active",
            });

            // Mark invitation as accepted
            await ctx.db.update(clientInvitations)
              .set({ status: "accepted", acceptedAt: new Date() })
              .where(eq(clientInvitations.id, invite.id));
          }

          logger.info("auth", `Auto-assigned new user to ${pendingInvites.length} trainer(s) from invitations`, { email });
        }
      } catch {
        // clientInvitations table may not exist yet — safe to ignore
      }

      await ctx.db.insert(clientProfiles).values({ userId: newUser.id, tier: invitedTier });
    } else if (role === "trainer" && newUser) {
      await ctx.db.insert(trainerProfiles).values({ userId: newUser.id });
    }

    return { user: newUser, created: true };
  }),

  // Sync current authenticated user's DB record.
  // Secured: validates caller's Clerk ID matches their own session.
  // Primarily used as a fallback when webhooks miss; prefer ensureUser.
  syncUser: protectedProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.enum(["client", "trainer", "company_admin", "super_admin"]).default("client"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Security: caller can only sync their own user record
      if (ctx.userId !== input.clerkId) {
        throw new Error("Unauthorized: clerkId does not match authenticated user");
      }

      const existing = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, input.clerkId),
      });

      if (existing) {
        return { user: existing, created: false };
      }

      const [newUser] = await ctx.db
        .insert(users)
        .values({
          clerkId: input.clerkId,
          email: input.email,
          firstName: input.firstName ?? null,
          lastName: input.lastName ?? null,
          role: input.role,
        })
        .returning();

      // Create role-specific profile
      if (input.role === "client") {
        await ctx.db.insert(clientProfiles).values({
          userId: newUser.id,
          tier: "tier1",
        });
      } else if (input.role === "trainer") {
        await ctx.db.insert(trainerProfiles).values({
          userId: newUser.id,
        });
      }

      return { user: newUser, created: true };
    }),

  // Get current user profile (uses publicProcedure so new users without
  // a DB record don't get UNAUTHORIZED — they just get null back)
  me: publicProcedure.query(async ({ ctx }) => {
    const { userId: clerkId } = await clerkAuth();
    if (!clerkId) return null;

    const user = await ctx.db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });

    if (!user) return null;

    let profile = null;
    if (user.role === "client") {
      profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, user.id),
      });
    } else if (user.role === "trainer") {
      profile = await ctx.db.query.trainerProfiles.findFirst({
        where: eq(trainerProfiles.userId, user.id),
      });
    }

    return { ...user, profile };
  }),

  // Update onboarding step
  updateOnboarding: protectedProcedure
    .input(
      z.object({
        step: z.number().min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update onboarding step on client profile
      const user = await ctx.db.query.users.findFirst({
        where: eq(users.clerkId, ctx.userId),
      });
      if (!user) return { success: false };

      await ctx.db
        .update(clientProfiles)
        .set({
          onboardingStep: input.step,
        })
        .where(eq(clientProfiles.userId, user.id));

      return { success: true };
    }),

  // Complete onboarding
  completeOnboarding: protectedProcedure.mutation(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.clerkId, ctx.userId),
    });
    if (!user) return { success: false };

    await ctx.db
      .update(clientProfiles)
      .set({
        onboardingCompleted: true,
      })
      .where(eq(clientProfiles.userId, user.id));

    // Also update user status to active
    await ctx.db
      .update(users)
      .set({ status: "active" })
      .where(eq(users.id, user.id));

    return { success: true };
  }),
});
