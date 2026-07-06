import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { fastingProtocols, fastingLogs } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

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
      const results = await safeQ(
        () => ctx.db.query.fastingLogs.findMany({
          where: and(
            eq(fastingLogs.clientId, ctx.dbUserId),
            gte(fastingLogs.date, input.startDate),
            lte(fastingLogs.date, input.endDate)
          ),
          orderBy: desc(fastingLogs.date),
        }),
        [],
      );

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
      const result = await safeQ(
        () => ctx.db
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
          ),
        [],
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

  // Create or update fasting protocol
  setProtocol: clientProcedure
    .input(z.object({
      type: z.string(),
      feedingStartHour: z.number().min(0).max(23).optional(),
      feedingEndHour: z.number().min(0).max(23).optional(),
      activeDays: z.array(z.number()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Deactivate existing protocols
      await ctx.db
        .update(fastingProtocols)
        .set({ status: "inactive" })
        .where(and(eq(fastingProtocols.clientId, ctx.dbUserId), eq(fastingProtocols.status, "active")));

      // Create new protocol
      const [protocol] = await ctx.db.insert(fastingProtocols).values({
        clientId: ctx.dbUserId,
        type: input.type as "16_8",
        feedingStartHour: input.feedingStartHour,
        feedingEndHour: input.feedingEndHour,
        activeDays: input.activeDays ?? [0, 1, 2, 3, 4, 5, 6],
        status: "active",
      }).returning();

      return protocol;
    }),

  // Start a new fast
  startFast: clientProcedure.mutation(async ({ ctx }) => {
    const [log] = await ctx.db.insert(fastingLogs).values({
      clientId: ctx.dbUserId,
      date: new Date().toISOString().split("T")[0],
      startedAt: new Date(),
      completed: false,
    }).returning();
    return log;
  }),

  // End current fast
  endFast: clientProcedure
    .input(z.object({ logId: z.string(), completed: z.boolean() }))
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(fastingLogs)
        .set({ endedAt: new Date(), completed: input.completed })
        .where(and(eq(fastingLogs.id, input.logId), eq(fastingLogs.clientId, ctx.dbUserId)))
        .returning();
      return updated;
    }),

  // Get current active fast (in progress)
  getActiveFast: clientProcedure.query(async ({ ctx }) => {
    const activeFast = await safeQ(
      () => ctx.db.query.fastingLogs.findFirst({
        where: and(
          eq(fastingLogs.clientId, ctx.dbUserId),
          sql`${fastingLogs.endedAt} IS NULL`,
        ),
        orderBy: desc(fastingLogs.startedAt),
      }),
      undefined,
    );
    return activeFast ?? null;
  }),

  // Log a completed fast (manual entry)
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
