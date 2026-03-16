import { z } from "zod";
import { router, publicProcedure, protectedProcedure } from "@/server/trpc";
import { users, clientProfiles, coachProfiles } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const authRouter = router({
  // Called after Clerk sign-up to create our DB user record
  syncUser: publicProcedure
    .input(
      z.object({
        clerkId: z.string(),
        email: z.string().email(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        role: z.enum(["client", "coach", "admin"]).default("client"),
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
      } else if (input.role === "coach") {
        await ctx.db.insert(coachProfiles).values({
          userId: newUser.id,
        });
      }

      return { user: newUser, created: true };
    }),

  // Get current user profile
  me: protectedProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.clerkId, ctx.userId),
    });

    if (!user) return null;

    let profile = null;
    if (user.role === "client") {
      profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, user.id),
      });
    } else if (user.role === "coach") {
      profile = await ctx.db.query.coachProfiles.findFirst({
        where: eq(coachProfiles.userId, user.id),
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
