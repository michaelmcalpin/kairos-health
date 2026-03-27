import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { cycleData } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientCycleDataRouter = router({
  getHistory: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(cycleData)
        .where(
          and(
            eq(cycleData.clientId, ctx.dbUserId),
            gte(cycleData.startDate, input.startDate),
            lte(cycleData.startDate, input.endDate)
          )
        )
        .orderBy(desc(cycleData.startDate));
    }),

  add: clientProcedure
    .input(
      z.object({
        startDate: z.string().date(),
        cycleLength: z.number().int().positive().optional(),
        periodLength: z.number().int().positive().optional(),
        flowIntensity: z
          .enum(["light", "moderate", "heavy"])
          .optional(),
        symptoms: z.array(z.string()).default([]),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(cycleData)
        .values({
          clientId: ctx.dbUserId,
          startDate: input.startDate,
          cycleLength: input.cycleLength,
          periodLength: input.periodLength,
          flowIntensity: input.flowIntensity,
          symptoms: input.symptoms,
          notes: input.notes,
        })
        .returning();

      return result[0];
    }),

  update: clientProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        startDate: z.string().date().optional(),
        cycleLength: z.number().int().positive().optional(),
        periodLength: z.number().int().positive().optional(),
        flowIntensity: z
          .enum(["light", "moderate", "heavy"])
          .optional(),
        symptoms: z.array(z.string()).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      const result = await ctx.db
        .update(cycleData)
        .set(updateData)
        .where(
          and(eq(cycleData.id, id), eq(cycleData.clientId, ctx.dbUserId))
        )
        .returning();

      return result[0];
    }),

  delete: clientProcedure
    .input(z.string().uuid())
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(cycleData)
        .where(
          and(eq(cycleData.id, input), eq(cycleData.clientId, ctx.dbUserId))
        )
        .returning();

      return result[0];
    }),

  getLatest: clientProcedure.query(async ({ ctx }) => {
    return await ctx.db
      .select()
      .from(cycleData)
      .where(eq(cycleData.clientId, ctx.dbUserId))
      .orderBy(desc(cycleData.startDate))
      .limit(6);
  }),
});
