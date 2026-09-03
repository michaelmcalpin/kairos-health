import { router, clientProcedure } from "@/server/trpc";
import { sleepSessions } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";
import { mergeSleepNights } from "@/lib/health/sleep";
import { z } from "zod";

// Only swallow "relation/table does not exist" errors (e.g. a table that has
// not been migrated yet); rethrow everything else so tRPC surfaces a real DB
// error and the UI can show its error state instead of a false "no data".
async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const message = err instanceof Error ? err.message : String(err);
    if (code === "42P01" || message.includes("does not exist")) {
      return fallback;
    }
    throw err;
  }
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

      // A night synced by more than one source (Apple Health + Oura) has one row
      // each — merge to a single best-of-source night so it isn't double-counted.
      return mergeSleepNights(results).map((s) => ({
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

  // Aggregate sleep statistics — averaged over merged nights (one per date), so
  // a night synced by two sources isn't double-counted in the averages.
  stats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const rows = await safeQ(() => ctx.db.query.sleepSessions.findMany({
        where: and(
          eq(sleepSessions.clientId, ctx.dbUserId),
          gte(sleepSessions.date, input.startDate),
          lte(sleepSessions.date, input.endDate),
        ),
      }), []);
      const nights = mergeSleepNights(rows);

      const avg = (pick: (n: (typeof nights)[number]) => number | null | undefined) => {
        const vals = nights.map(pick).filter((v): v is number => v != null && v !== 0);
        if (vals.length === 0) return null;
        return Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      };

      return {
        count: nights.length,
        avgScore: avg((n) => n.score),
        avgDuration: avg((n) => n.totalMinutes),
        avgDeep: avg((n) => n.deepMinutes),
        avgRem: avg((n) => n.remMinutes),
        avgLight: avg((n) => n.lightMinutes),
        avgAwake: avg((n) => n.awakeMinutes),
      };
    }),

  // Get the most recent sleep NIGHT (merged across sources). Pull a few recent
  // rows so both sources for the latest night are merged, not one arbitrary row.
  latest: clientProcedure.query(async ({ ctx }) => {
    const recent = await safeQ(() => ctx.db.query.sleepSessions.findMany({
      where: eq(sleepSessions.clientId, ctx.dbUserId),
      orderBy: desc(sleepSessions.date),
      limit: 6,
    }), []);
    return mergeSleepNights(recent)[0] ?? null;
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
