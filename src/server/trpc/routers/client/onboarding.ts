import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { clientProfiles, users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const clientOnboardingRouter = router({
  // Get current onboarding state
  getState: clientProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, ctx.dbUserId),
    });

    if (!profile) {
      return {
        step: 1,
        completed: false,
        goals: [] as string[],
        tier: "tier3" as const,
        dateOfBirth: null as string | null,
        gender: null as string | null,
        heightInches: null as number | null,
      };
    }

    return {
      step: profile.onboardingStep ?? 1,
      completed: profile.onboardingCompleted ?? false,
      goals: (profile.goals ?? []) as string[],
      tier: profile.tier,
      dateOfBirth: profile.dateOfBirth,
      gender: profile.gender,
      heightInches: profile.heightInches,
    };
  }),

  // Save profile data (step 1)
  saveProfile: clientProcedure
    .input(
      z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        heightInches: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Update user name
      await ctx.db
        .update(users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
        })
        .where(eq(users.id, ctx.dbUserId));

      // Update profile
      await ctx.db
        .update(clientProfiles)
        .set({
          dateOfBirth: input.dateOfBirth ?? null,
          gender: input.gender ?? null,
          heightInches: input.heightInches ?? null,
          onboardingStep: 2,
        })
        .where(eq(clientProfiles.userId, ctx.dbUserId));

      return { success: true };
    }),

  // Save health goals (step 2)
  saveGoals: clientProcedure
    .input(
      z.object({
        goals: z.array(z.string()).min(1).max(5),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(clientProfiles)
        .set({
          goals: input.goals,
          onboardingStep: 3,
        })
        .where(eq(clientProfiles.userId, ctx.dbUserId));

      return { success: true };
    }),

  // Save tier selection (step 4)
  saveTier: clientProcedure
    .input(
      z.object({
        tier: z.enum(["tier1", "tier2", "tier3"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(clientProfiles)
        .set({
          tier: input.tier,
          onboardingStep: 5,
        })
        .where(eq(clientProfiles.userId, ctx.dbUserId));

      return { success: true };
    }),

  // Mark onboarding complete
  complete: clientProcedure.mutation(async ({ ctx }) => {
    await ctx.db
      .update(clientProfiles)
      .set({
        onboardingCompleted: true,
        onboardingStep: 6,
      })
      .where(eq(clientProfiles.userId, ctx.dbUserId));

    // Update user status from "onboarding" to "active"
    await ctx.db
      .update(users)
      .set({ status: "active" })
      .where(eq(users.id, ctx.dbUserId));

    return { success: true };
  }),

  // Update step progress
  updateStep: clientProcedure
    .input(
      z.object({
        step: z.number().min(1).max(6),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(clientProfiles)
        .set({ onboardingStep: input.step })
        .where(eq(clientProfiles.userId, ctx.dbUserId));

      return { success: true };
    }),
});
