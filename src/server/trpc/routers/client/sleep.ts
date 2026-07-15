import { router, clientProcedure } from "@/server/trpc";
import { sleepSessions } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";
import { z } from "zod";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientSleepRouter = router({
  // List sleep sessions within a date range
  list: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await safeQ(() => ctx.db.query.sleepSessions.findMany({
        where: and(
          eq(sleepSessions.clientId, ctx.dbUserId),
          gte(sleepSessions.date, input.startDate),
          lte(sleepSessions.date, input.endDate)
        ),
        orderBy: desc(sleepSessions.date),
      }), []);

      return results.map((s) => ({
        id: s.id,
        date: s.date,
        bedtime: s.bedtime,
        wakeTime: s.wakeTime,
        totalMinutes: s.totalMinutes,
        deepMinutes: s.deepMinutes,
        remMinutes: s.remMinutes,
        lightMinutes: s.lightMinutes,
        awakeMinutes: s.awakeMinutes,
        score: s.score,
        notes: s.notes,
        source: s.source,
      }));
    }),

  // Aggregate sleep statistics
  stats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const result = await safeQ(() => ctx.db
        .select({
          count: sql<number>`count(*)`,
          avgScore: sql<number>`avg(${sleepSessions.score})`,
          avgDuration: sql<number>`avg(${sleepSessions.totalMinutes})`,
          avgDeep: sql<number>`avg(${sleepSessions.deepMinutes})`,
          avgRem: sql<number>`avg(${sleepSessions.remMinutes})`,
          avgLight: sql<number>`avg(${sleepSessions.lightMinutes})`,
          avgAwake: sql<number>`avg(${sleepSessions.awakeMinutes})`,
        })
        .from(sleepSessions)
        .where(
          and(
            eq(sleepSessions.clientId, ctx.dbUserId),
            gte(sleepSessions.date, input.startDate),
            lte(sleepSessions.date, input.endDate)
          )
        ), []);

      const row = result[0];
      return {
        count: Number(row?.count ?? 0),
        avgScore: row?.avgScore ? Math.round(Number(row.avgScore)) : null,
        avgDuration: row?.avgDuration ? Math.round(Number(row.avgDuration)) : null,
        avgDeep: row?.avgDeep ? Math.round(Number(row.avgDeep)) : null,
        avgRem: row?.avgRem ? Math.round(Number(row.avgRem)) : null,
        avgLight: row?.avgLight ? Math.round(Number(row.avgLight)) : null,
        avgAwake: row?.avgAwake ? Math.round(Number(row.avgAwake)) : null,
      };
    }),

  // Get the most recent sleep session
  latest: clientProcedure.query(async ({ ctx }) => {
    const result = await safeQ(() => ctx.db.query.sleepSessions.findFirst({
      where: eq(sleepSessions.clientId, ctx.dbUserId),
      orderBy: desc(sleepSessions.date),
    }), undefined);
    return result ?? null;
  }),

  // Create a new sleep session
  create: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        bedtime: z.string().optional(),
        wakeTime: z.string().optional(),
        totalMinutes: z.number().optional(),
        deepMinutes: z.number().optional(),
        remMinutes: z.number().optional(),
        lightMinutes: z.number().optional(),
        awakeMinutes: z.number().optional(),
        score: z.number().min(0).max(100).optional(),
        notes: z.string().optional(),
        source: z.string().default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Determine the date
      const sessionDate = input.date || new Date().toISOString().split("T")[0];

      // Calculate totalMinutes from bedtime and wakeTime if not provided
      let totalMinutes = input.totalMinutes;
      if (!totalMinutes && input.bedtime && input.wakeTime) {
        const [bedHour, bedMin] = input.bedtime.split(":").map(Number);
        const [wakeHour, wakeMin] = input.wakeTime.split(":").map(Number);

        let bedTimeMinutes = bedHour * 60 + bedMin;
        let wakeTimeMinutes = wakeHour * 60 + wakeMin;

        // If wake time is earlier than bed time, assume next day
        if (wakeTimeMinutes <= bedTimeMinutes) {
          wakeTimeMinutes += 24 * 60;
        }

        totalMinutes = wakeTimeMinutes - bedTimeMinutes;
      }

      // Insert the sleep session
      const result = await ctx.db
        .insert(sleepSessions)
        .values({
          clientId: ctx.dbUserId,
          date: sessionDate,
          bedtime: input.bedtime ?? null,
          wakeTime: input.wakeTime ?? null,
          totalMinutes: totalMinutes ?? null,
          deepMinutes: input.deepMinutes ?? null,
          remMinutes: input.remMinutes ?? null,
          lightMinutes: input.lightMinutes ?? null,
          awakeMinutes: input.awakeMinutes ?? null,
          score: input.score ?? null,
          notes: input.notes ?? null,
          source: input.source,
        })
        .returning();

      return result[0] ?? null;
    }),
});
