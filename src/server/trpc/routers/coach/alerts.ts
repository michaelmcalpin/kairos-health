import { z } from "zod";
import { router, coachProcedure } from "@/server/trpc";
import { alerts, coachClientRelationships, users } from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const coachAlertsRouter = router({
  // List alerts for all of coach's clients
  list: coachProcedure
    .input(
      z.object({
        status: z.enum(["active", "acknowledged", "resolved", "dismissed", "all"]).default("all"),
        clientId: z.string().uuid().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all client IDs for this coach
      const relationships = await ctx.db.query.coachClientRelationships.findMany({
        where: and(
          eq(coachClientRelationships.coachId, ctx.dbUserId),
          eq(coachClientRelationships.status, "active")
        ),
      });

      const clientIds = input.clientId
        ? [input.clientId]
        : relationships.map((r) => r.clientId);

      if (clientIds.length === 0) return { alerts: [], total: 0, hasMore: false };

      // Build conditions
      const results = [];
      let totalCount = 0;

      for (const clientId of clientIds) {
        const conditions = [eq(alerts.clientId, clientId)];
        if (input.status !== "all") {
          conditions.push(eq(alerts.status, input.status));
        }

        const clientAlerts = await ctx.db.query.alerts.findMany({
          where: and(...conditions),
          orderBy: desc(alerts.createdAt),
        });

        // Get client name
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, clientId),
        });

        results.push(
          ...clientAlerts.map((a) => ({
            id: a.id,
            clientId: a.clientId,
            clientName: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
            type: a.type,
            priority: a.priority,
            title: a.title,
            message: a.message,
            status: a.status,
            createdAt: a.createdAt,
            acknowledgedAt: a.acknowledgedAt,
          }))
        );
        totalCount += clientAlerts.length;
      }

      // Sort combined results by createdAt descending, then paginate
      results.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      const paginated = results.slice(input.offset, input.offset + input.limit);

      return {
        alerts: paginated,
        total: totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Acknowledge an alert on behalf of client
  acknowledge: coachProcedure
    .input(z.object({ alertId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the alert belongs to one of the coach's clients
      const alert = await ctx.db.query.alerts.findFirst({
        where: eq(alerts.id, input.alertId),
      });

      if (!alert) return { success: false };

      const relationship = await ctx.db.query.coachClientRelationships.findFirst({
        where: and(
          eq(coachClientRelationships.coachId, ctx.dbUserId),
          eq(coachClientRelationships.clientId, alert.clientId),
          eq(coachClientRelationships.status, "active")
        ),
      });

      if (!relationship) return { success: false };

      await ctx.db
        .update(alerts)
        .set({ status: "acknowledged", acknowledgedAt: new Date() })
        .where(eq(alerts.id, input.alertId));

      return { success: true };
    }),

  // Summary counts by priority
  summary: coachProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.coachClientRelationships.findMany({
      where: and(
        eq(coachClientRelationships.coachId, ctx.dbUserId),
        eq(coachClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return { urgent: 0, action: 0, info: 0, total: 0 };

    let urgent = 0, action = 0, info = 0;
    for (const clientId of clientIds) {
      const counts = await ctx.db
        .select({
          priority: alerts.priority,
          count: sql<number>`count(*)`,
        })
        .from(alerts)
        .where(and(eq(alerts.clientId, clientId), eq(alerts.status, "active")))
        .groupBy(alerts.priority);

      for (const c of counts) {
        const n = Number(c.count);
        if (c.priority === "urgent") urgent += n;
        else if (c.priority === "action") action += n;
        else info += n;
      }
    }

    return { urgent, action, info, total: urgent + action + info };
  }),
});
