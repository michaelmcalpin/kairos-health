import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { glucoseReadings } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientGlucoseRouter = router({
  // List glucose readings within a date range
  // Note: For manual entries, trendDirection contains the timing context (fasting, pre_meal, post_meal, etc.)
  list: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.glucoseReadings.findMany({
        where: and(
          eq(glucoseReadings.clientId, ctx.dbUserId),
          gte(glucoseReadings.timestamp, new Date(input.startDate)),
          lte(glucoseReadings.timestamp, new Date(input.endDate + "T23:59:59"))
        ),
        orderBy: desc(glucoseReadings.timestamp),
      });

      return results.map((r) => ({
        id: r.id,
        timestamp: r.timestamp,
        valueMgdl: r.valueMgdl,
        source: r.source,
        trendDirection: r.trendDirection,
      }));
    }),

  // Aggregate statistics for a date range
  stats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          count: sql<number>`count(*)`,
          avg: sql<number>`avg(${glucoseReadings.valueMgdl})`,
          min: sql<number>`min(${glucoseReadings.valueMgdl})`,
          max: sql<number>`max(${glucoseReadings.valueMgdl})`,
          timeInRange: sql<number>`
            round(
              count(*) filter (where ${glucoseReadings.valueMgdl} between 70 and 140)::numeric
              / nullif(count(*), 0) * 100, 1
            )
          `,
        })
        .from(glucoseReadings)
        .where(
          and(
            eq(glucoseReadings.clientId, ctx.dbUserId),
            gte(glucoseReadings.timestamp, new Date(input.startDate)),
            lte(glucoseReadings.timestamp, new Date(input.endDate + "T23:59:59"))
          )
        );

      const row = result[0];
      return {
        count: Number(row?.count ?? 0),
        avg: row?.avg ? Math.round(Number(row.avg) * 10) / 10 : null,
        min: row?.min ? Number(row.min) : null,
        max: row?.max ? Number(row.max) : null,
        timeInRange: row?.timeInRange ? Number(row.timeInRange) : null,
      };
    }),

  // Daily averages for chart rendering
  dailyAverages: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db
        .select({
          date: sql<string>`date_trunc('day', ${glucoseReadings.timestamp})::date`,
          avg: sql<number>`avg(${glucoseReadings.valueMgdl})`,
          min: sql<number>`min(${glucoseReadings.valueMgdl})`,
          max: sql<number>`max(${glucoseReadings.valueMgdl})`,
          count: sql<number>`count(*)`,
        })
        .from(glucoseReadings)
        .where(
          and(
            eq(glucoseReadings.clientId, ctx.dbUserId),
            gte(glucoseReadings.timestamp, new Date(input.startDate)),
            lte(glucoseReadings.timestamp, new Date(input.endDate + "T23:59:59"))
          )
        )
        .groupBy(sql`date_trunc('day', ${glucoseReadings.timestamp})::date`)
        .orderBy(sql`date_trunc('day', ${glucoseReadings.timestamp})::date`);

      return results.map((r) => ({
        date: r.date,
        avg: Math.round(Number(r.avg) * 10) / 10,
        min: Number(r.min),
        max: Number(r.max),
        count: Number(r.count),
      }));
    }),

  // Create a manual glucose reading
  create: clientProcedure
    .input(
      z.object({
        valueMgdl: z.number().min(20).max(600),
        timestamp: z.string().optional(),
        source: z.string().default("manual"),
        timingContext: z.enum(["fasting", "pre_meal", "post_meal", "bedtime", "waking", "other"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(glucoseReadings)
        .values({
          clientId: ctx.dbUserId,
          valueMgdl: input.valueMgdl,
          timestamp: input.timestamp ? new Date(input.timestamp) : new Date(),
          source: input.source,
          // Store timingContext in trendDirection field (varchar(20), unused for manual entries until schema migration)
          trendDirection: input.timingContext ?? null,
          // notes are silently dropped (no column in schema yet)
        })
        .returning();

      return result[0];
    }),
});
