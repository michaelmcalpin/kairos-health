import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { bodyMeasurements } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientMeasurementsRouter = router({
  // List body measurements within a date range
  list: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.bodyMeasurements.findMany({
        where: and(
          eq(bodyMeasurements.clientId, ctx.dbUserId),
          gte(bodyMeasurements.date, input.startDate),
          lte(bodyMeasurements.date, input.endDate)
        ),
        orderBy: desc(bodyMeasurements.date),
      });

      return results.map((m) => ({
        id: m.id,
        date: m.date,
        weightLbs: m.weightLbs,
        bodyFatPct: m.bodyFatPct,
        waistInches: m.waistInches,
        chestInches: m.chestInches,
        source: m.source,
      }));
    }),

  // Get latest measurement
  latest: clientProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.query.bodyMeasurements.findFirst({
      where: eq(bodyMeasurements.clientId, ctx.dbUserId),
      orderBy: desc(bodyMeasurements.date),
    });
    return result ?? null;
  }),

  // Log a new measurement
  create: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        weightLbs: z.number().min(50).max(700).optional(),
        bodyFatPct: z.number().min(1).max(60).optional(),
        waistInches: z.number().min(15).max(80).optional(),
        chestInches: z.number().min(20).max(80).optional(),
        source: z.string().default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(bodyMeasurements)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          weightLbs: input.weightLbs ?? null,
          bodyFatPct: input.bodyFatPct ?? null,
          waistInches: input.waistInches ?? null,
          chestInches: input.chestInches ?? null,
          source: input.source,
        })
        .returning();

      return result[0];
    }),
});
