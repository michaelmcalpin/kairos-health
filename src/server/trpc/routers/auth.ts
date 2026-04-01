import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { users, clientProfiles, trainerProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";
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
      await ctx.db.insert(clientProfiles).values({ userId: newUser.id, tier: "tier1" });
    } else if (role === "trainer" && newUser) {
      await ctx.db.insert(trainerProfiles).values({ userId: newUser.id });
    }

    return { user: newUser, created: true };
  }),

  // Called after Clerk sign-up to create our DB user record
  syncUser: publicProcedure
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
