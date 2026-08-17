import { z } from "zod";
import { router, trainerProcedure } from "@/server/trpc";
import { alerts, trainerClientRelationships, users } from "@/server/db/schema";
import { eq, desc, and, sql, inArray, gte, lte } from "drizzle-orm";

export const coachAlertsRouter = router({
  // List alerts for all of trainer's clients
  list: trainerProcedure
    .input(
      z.object({
        status: z.enum(["active", "acknowledged", "resolved", "dismissed", "all"]).default("all"),
        clientId: z.string().uuid().optional(),
        // Optional ISO date-range filter (applied server-side against createdAt)
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        limit: z.number().min(1).max(100).default(20),
        offset: z.number().min(0).default(0),
      })
    )
    .query(async ({ ctx, input }) => {
      // Get all client IDs for this trainer
      const relationships = await ctx.db.query.trainerClientRelationships.findMany({
        where: and(
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        ),
      });

      const allowedClientIds = new Set(relationships.map((r) => r.clientId));

      // If a specific clientId was requested, verify the trainer has a relationship with that client
      if (input.clientId && !allowedClientIds.has(input.clientId)) {
        return { alerts: [], total: 0, hasMore: false };
      }

      const clientIds = input.clientId
        ? [input.clientId]
        : relationships.map((r) => r.clientId);

      if (clientIds.length === 0) return { alerts: [], total: 0, hasMore: false };

      // Single batched query (avoids the previous per-client N+1) plus one users fetch.
      const conditions = [inArray(alerts.clientId, clientIds)];
      if (input.status !== "all") {
        conditions.push(eq(alerts.status, input.status));
      }
      if (input.startDate) {
        conditions.push(gte(alerts.createdAt, new Date(input.startDate)));
      }
      if (input.endDate) {
        conditions.push(lte(alerts.createdAt, new Date(input.endDate)));
      }

      const [allAlerts, clientUsers] = await Promise.all([
        ctx.db.query.alerts.findMany({
          where: and(...conditions),
          orderBy: desc(alerts.createdAt),
        }),
        ctx.db.query.users.findMany({ where: inArray(users.id, clientIds) }),
      ]);

      const userMap = new Map(clientUsers.map((u) => [u.id, u]));
      const totalCount = allAlerts.length;

      const paginated = allAlerts
        .slice(input.offset, input.offset + input.limit)
        .map((a) => {
          const user = userMap.get(a.clientId);
          return {
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
          };
        });

      return {
        alerts: paginated,
        total: totalCount,
        hasMore: input.offset + input.limit < totalCount,
      };
    }),

  // Acknowledge an alert on behalf of client
  acknowledge: trainerProcedure
    .input(z.object({ alertId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the alert belongs to one of the trainer's clients
      const alert = await ctx.db.query.alerts.findFirst({
        where: eq(alerts.id, input.alertId),
      });

      if (!alert) return { success: false };

      const relationship = await ctx.db.query.trainerClientRelationships.findFirst({
        where: and(
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.clientId, alert.clientId),
          eq(trainerClientRelationships.status, "active")
        ),
      });

      if (!relationship) return { success: false };

      await ctx.db
        .update(alerts)
        .set({ status: "acknowledged", acknowledgedAt: new Date() })
        .where(eq(alerts.id, input.alertId));

      return { success: true };
    }),

  // Lightweight count of active alerts across this trainer's roster
  // (used by the TopBar bell badge)
  activeCount: trainerProcedure.query(async ({ ctx }) => {
    const rows = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(alerts)
      .innerJoin(
        trainerClientRelationships,
        and(
          eq(alerts.clientId, trainerClientRelationships.clientId),
          eq(trainerClientRelationships.trainerId, ctx.dbUserId),
          eq(trainerClientRelationships.status, "active")
        )
      )
      .where(eq(alerts.status, "active"));

    return { count: Number(rows[0]?.count ?? 0) };
  }),

  // Summary counts by priority
  summary: trainerProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: and(
        eq(trainerClientRelationships.trainerId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return { urgent: 0, action: 0, info: 0, total: 0 };

    // Single batched group-by across all clients (avoids per-client N+1).
    const counts = await ctx.db
      .select({
        priority: alerts.priority,
        count: sql<number>`count(*)`,
      })
      .from(alerts)
      .where(and(inArray(alerts.clientId, clientIds), eq(alerts.status, "active")))
      .groupBy(alerts.priority);

    let urgent = 0, action = 0, info = 0;
    for (const c of counts) {
      const n = Number(c.count);
      if (c.priority === "urgent") urgent += n;
      else if (c.priority === "action") action += n;
      else info += n;
    }

    return { urgent, action, info, total: urgent + action + info };
  }),
});
