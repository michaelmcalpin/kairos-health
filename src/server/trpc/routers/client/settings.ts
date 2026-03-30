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
import { users, notificationPreferences } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const clientSettingsRouter = router({
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
});
