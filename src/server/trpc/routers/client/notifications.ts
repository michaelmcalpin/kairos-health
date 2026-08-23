/**
 * EVERIST Client Notifications Router
 *
 * tRPC endpoints for notification listing, read/archive,
 * and user preference management. All backed by real DB queries.
 */

import { z } from "zod";
import { and, eq } from "drizzle-orm";
import { router, clientProcedure } from "@/server/trpc";
import { pushTokens } from "@/server/db/schema";
import {
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  archiveNotification,
  getUserPreferences,
  updateUserPreferences,
} from "@/lib/notifications/service";

export const clientNotificationsRouter = router({
  /**
   * List notifications for the current user
   */
  list: clientProcedure
    .input(z.object({
      unreadOnly: z.boolean().optional(),
      category: z.string().optional(),
      limit: z.number().min(1).max(100).optional(),
    }).optional())
    .query(async ({ ctx, input }) => {
      return getUserNotifications(ctx.db, ctx.dbUserId, {
        unreadOnly: input?.unreadOnly,
        category: input?.category,
        limit: input?.limit ?? 50,
      });
    }),

  /**
   * Get unread count
   */
  unreadCount: clientProcedure.query(async ({ ctx }) => {
    const count = await getUnreadCount(ctx.db, ctx.dbUserId);
    return { count };
  }),

  /**
   * Mark a single notification as read
   */
  markRead: clientProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await markAsRead(ctx.db, ctx.dbUserId, input.notificationId);
      return { success };
    }),

  /**
   * Mark all notifications as read
   */
  markAllRead: clientProcedure.mutation(async ({ ctx }) => {
    const count = await markAllAsRead(ctx.db, ctx.dbUserId);
    return { count };
  }),

  /**
   * Archive a notification
   */
  archive: clientProcedure
    .input(z.object({ notificationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const success = await archiveNotification(ctx.db, ctx.dbUserId, input.notificationId);
      return { success };
    }),

  /**
   * Get notification preferences
   */
  getPreferences: clientProcedure.query(async ({ ctx }) => {
    return getUserPreferences(ctx.db, ctx.dbUserId);
  }),

  /**
   * Update notification preferences
   */
  updatePreferences: clientProcedure
    .input(z.object({
      enabled: z.boolean().optional(),
      quietHoursStart: z.string().optional(),
      quietHoursEnd: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      return updateUserPreferences(ctx.db, ctx.dbUserId, input);
    }),

  /**
   * Register (upsert) an Expo push token for the current user's device.
   * On conflict by token, reassign it to this user and bump updatedAt.
   */
  registerPushToken: clientProcedure
    .input(z.object({
      token: z.string().min(1),
      platform: z.enum(["ios", "android", "web"]).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .insert(pushTokens)
        .values({
          userId: ctx.dbUserId,
          token: input.token,
          platform: input.platform,
        })
        .onConflictDoUpdate({
          target: pushTokens.token,
          set: {
            userId: ctx.dbUserId,
            platform: input.platform,
            updatedAt: new Date(),
          },
        });
      return { success: true };
    }),

  /**
   * Unregister an Expo push token (e.g. on logout).
   */
  unregisterPushToken: clientProcedure
    .input(z.object({ token: z.string().min(1) }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(pushTokens)
        .where(and(eq(pushTokens.token, input.token), eq(pushTokens.userId, ctx.dbUserId)));
      return { success: true };
    }),
});
