import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { dailyCheckins } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientCheckinRouter = router({
  // Get today's check-in (if exists)
  getToday: clientProcedure.query(async ({ ctx }) => {
    const today = new Date().toISOString().split("T")[0];
    const checkin = await ctx.db.query.dailyCheckins.findFirst({
      where: and(
        eq(dailyCheckins.clientId, ctx.dbUserId),
        eq(dailyCheckins.date, today)
      ),
    });
    return checkin ?? null;
  }),

  // Get check-in history for a date range
  getHistory: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.dailyCheckins.findMany({
        where: and(
          eq(dailyCheckins.clientId, ctx.dbUserId),
          gte(dailyCheckins.date, input.startDate),
          lte(dailyCheckins.date, input.endDate)
        ),
        orderBy: desc(dailyCheckins.date),
      });

      return results.map((c) => ({
        id: c.id,
        date: c.date,
        weight: c.weight,
        proteinG: c.proteinG,
        carbsG: c.carbsG,
        fatG: c.fatG,
        fiberG: c.fiberG,
        waterOz: c.waterOz,
        trainingType: c.trainingType,
        stress: c.stress,
        hunger: c.hunger,
        energy: c.energy,
        sleepQuality: c.sleepQuality,
        bmCount: c.bmCount,
        deviations: c.deviations,
        notes: c.notes,
        submittedAt: c.submittedAt,
      }));
    }),

  // Submit a daily check-in
  submit: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        weight: z.number().optional(),
        proteinG: z.number().optional(),
        carbsG: z.number().optional(),
        fatG: z.number().optional(),
        fiberG: z.number().optional(),
        waterOz: z.number().optional(),
        trainingType: z.string().optional(),
        stress: z.number().min(1).max(10).optional(),
        hunger: z.number().min(1).max(10).optional(),
        energy: z.number().min(1).max(10).optional(),
        sleepQuality: z.number().min(1).max(10).optional(),
        bmCount: z.number().optional(),
        deviations: z.string().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(dailyCheckins)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          weight: input.weight ?? null,
          proteinG: input.proteinG ?? null,
          carbsG: input.carbsG ?? null,
          fatG: input.fatG ?? null,
          fiberG: input.fiberG ?? null,
          waterOz: input.waterOz ?? null,
          trainingType: input.trainingType ?? null,
          stress: input.stress ?? null,
          hunger: input.hunger ?? null,
          energy: input.energy ?? null,
          sleepQuality: input.sleepQuality ?? null,
          bmCount: input.bmCount ?? null,
          deviations: input.deviations ?? null,
          notes: input.notes ?? null,
        })
        .returning();

      return result[0];
    }),
});
