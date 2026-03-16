import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { alerts, alertResponses } from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const clientAlertsRouter = router({
  // Get all alerts with pagination
  list: clientProcedure
    .input(
      z.object({
        status: z.enum(["active", "acknowledged", "resolved", "all"]).default("all"),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      const conditions = [eq(alerts.clientId, ctx.dbUserId)];

      if (input.status !== "all") {
        conditions.push(eq(alerts.status, input.status));
      }

      const results = await ctx.db.query.alerts.findMany({
        where: and(...conditions),
        orderBy: desc(alerts.createdAt),
        limit: input.limit,
        offset: input.offset,
      });

      const total = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(alerts)
        .where(and(...conditions));

      return {
        alerts: results,
        total: Number(total[0]?.count ?? 0),
        hasMore: input.offset + input.limit < Number(total[0]?.count ?? 0),
      };
    }),

  // Get single alert with responses
  getById: clientProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const alert = await ctx.db.query.alerts.findFirst({
        where: and(
          eq(alerts.id, input.id),
          eq(alerts.clientId, ctx.dbUserId)
        ),
      });

      if (!alert) return null;

      const responses = await ctx.db.query.alertResponses.findMany({
        where: eq(alertResponses.alertId, alert.id),
        orderBy: desc(alertResponses.startedAt),
      });

      return { ...alert, responses };
    }),

  // Acknowledge an alert
  acknowledge: clientProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(alerts)
        .set({
          status: "acknowledged",
          acknowledgedAt: new Date(),
        })
        .where(
          and(
            eq(alerts.id, input.id),
            eq(alerts.clientId, ctx.dbUserId)
          )
        );

      return { success: true };
    }),

  // Get unread count
  unreadCount: clientProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .where(
        and(
          eq(alerts.clientId, ctx.dbUserId),
          eq(alerts.status, "active")
        )
      );

    return { count: Number(result[0]?.count ?? 0) };
  }),
});
