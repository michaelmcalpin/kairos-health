/**
 * KAIROS Client Notifications Router
 *
 * tRPC endpoints for notification listing, read/archive,
 * and user preference management. All backed by real DB queries.
 */

import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
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
});
