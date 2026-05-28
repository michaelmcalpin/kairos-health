/**
 * KAIROS Client Settings Router
 *
 * tRPC endpoints for user profile settings and notification preferences.
 * Handles fetching and updating:
 * - User profile (firstName, lastName, avatarUrl)
 * - Notification preferences
 */

import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { users, notificationPreferences, clientProfiles, trainerClientRelationships, trainerProfiles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

export const clientSettingsRouter = router({
  /**
   * Get feature toggles for the current client.
   * Returns resolved toggles with gender-based defaults applied.
   * cycleTracker: default ON for female, OFF for male (overridable by admin).
   */
  getFeatureToggles: clientProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, ctx.dbUserId),
    });

    const stored = (profile?.featureToggles as Record<string, boolean>) ?? {};
    const gender = profile?.gender?.toLowerCase() ?? "male";

    // Apply defaults — admin overrides take precedence
    const defaults: Record<string, boolean> = {
      cycleTracker: gender === "female",
    };

    return { ...defaults, ...stored };
  }),

  /**
   * Get current user's settings (profile + notification preferences)
   */
  getSettings: clientProcedure.query(async ({ ctx }) => {
    const user = await ctx.db.query.users.findFirst({
      where: eq(users.id, ctx.dbUserId),
    });

    const prefs = await ctx.db.query.notificationPreferences.findFirst({
      where: eq(notificationPreferences.userId, ctx.dbUserId),
    });

    return {
      user,
      notificationPreferences: prefs,
    };
  }),

  /**
   * Update user profile (firstName, lastName, avatarUrl)
   */
  updateProfile: clientProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          avatarUrl: input.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.dbUserId))
        .returning();

      return updated;
    }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: clientProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        quietHoursStart: z.string().optional(), // "22:00" format
        quietHoursEnd: z.string().optional(),   // "07:00" format
        categories: z
          .record(
            z.string(),
            z.object({
              in_app: z.boolean(),
              email: z.boolean(),
              push: z.boolean(),
              sms: z.boolean(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if preferences exist
      const existing = await ctx.db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, ctx.dbUserId),
      });

      if (existing) {
        // Update existing
        const [updated] = await ctx.db
          .update(notificationPreferences)
          .set({
            enabled: input.enabled ?? existing.enabled,
            quietHoursStart: input.quietHoursStart ?? existing.quietHoursStart,
            quietHoursEnd: input.quietHoursEnd ?? existing.quietHoursEnd,
            categories: input.categories ?? existing.categories,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, ctx.dbUserId))
          .returning();

        return updated;
      } else {
        // Create new
        const [created] = await ctx.db
          .insert(notificationPreferences)
          .values({
            userId: ctx.dbUserId,
            enabled: input.enabled ?? true,
            quietHoursStart: input.quietHoursStart,
            quietHoursEnd: input.quietHoursEnd,
            categories: input.categories,
          })
          .returning();

        return created;
      }
    }),

  /**
   * Update a feature toggle (e.g. cycleTracker).
   * Merges into the existing featureToggles JSONB on client_profiles.
   */
  updateFeatureToggle: clientProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current toggles
      const profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, ctx.dbUserId),
      });

      const current = (profile?.featureToggles as Record<string, boolean>) ?? {};
      const updated = { ...current, [input.key]: input.value };

      if (profile) {
        await ctx.db
          .update(clientProfiles)
          .set({ featureToggles: updated })
          .where(eq(clientProfiles.userId, ctx.dbUserId));
      }

      return updated;
    }),

  /**
   * Get the client's assigned coach (active trainer relationship).
   * Joins trainer_client_relationships → users + trainer_profiles.
   */
  getMyCoach: clientProcedure.query(async ({ ctx }) => {
    // Find active trainer relationship for this client
    const relationship = await ctx.db.query.trainerClientRelationships.findFirst({
      where: and(
        eq(trainerClientRelationships.clientId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active"),
      ),
    });

    if (!relationship) return null;

    // Get trainer user info
    const trainer = await ctx.db.query.users.findFirst({
      where: eq(users.id, relationship.trainerId),
    });

    if (!trainer) return null;

    // Get trainer profile (bio, specialties, credentials, rating)
    const profile = await ctx.db.query.trainerProfiles.findFirst({
      where: eq(trainerProfiles.userId, relationship.trainerId),
    });

    return {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      avatarUrl: trainer.avatarUrl,
      bio: profile?.bio ?? null,
      specialties: (profile?.specialties as string[]) ?? [],
      credentials: (profile?.credentials as string[]) ?? [],
      rating: profile?.rating ?? null,
      reviewCount: profile?.reviewCount ?? 0,
      since: relationship.startedAt,
    };
  }),
});
