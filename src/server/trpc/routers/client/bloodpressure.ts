import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { bloodPressureReadings } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientBloodPressureRouter = router({
  // Get readings within a date range
  getHistory: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      return await safeQ(() => ctx.db.query.bloodPressureReadings.findMany({
        where: and(
          eq(bloodPressureReadings.clientId, ctx.dbUserId),
          gte(bloodPressureReadings.date, input.startDate),
          lte(bloodPressureReadings.date, input.endDate)
        ),
        orderBy: desc(bloodPressureReadings.date),
      }), []);
    }),

  // Get latest reading
  getLatest: clientProcedure.query(async ({ ctx }) => {
    return await safeQ(() => ctx.db.query.bloodPressureReadings.findFirst({
      where: eq(bloodPressureReadings.clientId, ctx.dbUserId),
      orderBy: desc(bloodPressureReadings.date),
    }), undefined);
  }),

  // Get averages for a date range
  getAverages: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const result = await safeQ(() => ctx.db
        .select({
          avgSystolic: sql<number>`round(avg(${bloodPressureReadings.systolic}))`,
          avgDiastolic: sql<number>`round(avg(${bloodPressureReadings.diastolic}))`,
          avgPulse: sql<number>`round(avg(${bloodPressureReadings.pulse}))`,
          count: sql<number>`count(*)`,
          maxSystolic: sql<number>`max(${bloodPressureReadings.systolic})`,
          minSystolic: sql<number>`min(${bloodPressureReadings.systolic})`,
        })
        .from(bloodPressureReadings)
        .where(
          and(
            eq(bloodPressureReadings.clientId, ctx.dbUserId),
            gte(bloodPressureReadings.date, input.startDate),
            lte(bloodPressureReadings.date, input.endDate)
          )
        ), []);

      return result[0] ?? {
        avgSystolic: 0,
        avgDiastolic: 0,
        avgPulse: 0,
        count: 0,
        maxSystolic: 0,
        minSystolic: 0,
      };
    }),

  // Add a new reading
  add: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        systolic: z.number().int().min(60).max(250),
        diastolic: z.number().int().min(30).max(150),
        pulse: z.number().int().min(30).max(220).optional(),
        position: z.enum(["sitting", "standing", "lying"]).optional(),
        arm: z.enum(["left", "right"]).optional(),
        notes: z.string().optional(),
        source: z.string().max(50).default("manual"),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [result] = await ctx.db
        .insert(bloodPressureReadings)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          systolic: input.systolic,
          diastolic: input.diastolic,
          pulse: input.pulse,
          position: input.position,
          arm: input.arm,
          notes: input.notes,
          source: input.source,
        })
        .returning();

      return result;
    }),

  // Delete a reading
  delete: clientProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(bloodPressureReadings)
        .where(
          and(
            eq(bloodPressureReadings.id, input),
            eq(bloodPressureReadings.clientId, ctx.dbUserId)
          )
        );
    }),
});
