import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { fastingProtocols, fastingLogs } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientFastingRouter = router({
  // Get active fasting protocol
  getProtocol: clientProcedure.query(async ({ ctx }) => {
    const protocol = await ctx.db.query.fastingProtocols.findFirst({
      where: and(
        eq(fastingProtocols.clientId, ctx.dbUserId),
        eq(fastingProtocols.status, "active")
      ),
      orderBy: desc(fastingProtocols.createdAt),
    });

    return protocol
      ? {
          id: protocol.id,
          type: protocol.type,
          feedingStartHour: protocol.feedingStartHour,
          feedingEndHour: protocol.feedingEndHour,
          activeDays: protocol.activeDays,
          isAiGenerated: protocol.isAiGenerated,
          createdAt: protocol.createdAt,
        }
      : null;
  }),

  // List fasting logs for a date range
  listLogs: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.fastingLogs.findMany({
        where: and(
          eq(fastingLogs.clientId, ctx.dbUserId),
          gte(fastingLogs.date, input.startDate),
          lte(fastingLogs.date, input.endDate)
        ),
        orderBy: desc(fastingLogs.date),
      });

      return results.map((f) => ({
        id: f.id,
        date: f.date,
        startedAt: f.startedAt,
        endedAt: f.endedAt,
        completed: f.completed,
        metabolicZones: f.metabolicZones,
      }));
    }),

  // Fasting stats for a date range
  stats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          totalFasts: sql<number>`count(*)`,
          completedFasts: sql<number>`count(*) filter (where ${fastingLogs.completed} = true)`,
          avgDurationMinutes: sql<number>`avg(extract(epoch from (${fastingLogs.endedAt} - ${fastingLogs.startedAt})) / 60)`,
        })
        .from(fastingLogs)
        .where(
          and(
            eq(fastingLogs.clientId, ctx.dbUserId),
            gte(fastingLogs.date, input.startDate),
            lte(fastingLogs.date, input.endDate)
          )
        );

      const row = result[0];
      return {
        totalFasts: Number(row?.totalFasts ?? 0),
        completedFasts: Number(row?.completedFasts ?? 0),
        completionRate:
          Number(row?.totalFasts ?? 0) > 0
            ? Math.round((Number(row?.completedFasts ?? 0) / Number(row?.totalFasts ?? 1)) * 100)
            : 0,
        avgDurationMinutes: row?.avgDurationMinutes ? Math.round(Number(row.avgDurationMinutes)) : null,
      };
    }),

  // Start/end a fast
  logFast: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        startedAt: z.string(),
        endedAt: z.string().optional(),
        completed: z.boolean().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(fastingLogs)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          startedAt: new Date(input.startedAt),
          endedAt: input.endedAt ? new Date(input.endedAt) : null,
          completed: input.completed,
        })
        .returning();

      return result[0];
    }),
});
