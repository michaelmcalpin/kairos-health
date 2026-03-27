import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { bloodSugarReadings } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientBloodSugarRouter = router({
  // Get all readings for a specific date
  getByDate: clientProcedure
    .input(
      z.object({
        date: z.string(),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.bloodSugarReadings.findMany({
        where: and(
          eq(bloodSugarReadings.clientId, ctx.dbUserId),
          eq(bloodSugarReadings.date, input.date)
        ),
        orderBy: desc(bloodSugarReadings.createdAt),
      });

      return results.map((r) => ({
        id: r.id,
        date: r.date,
        timing: r.timing,
        valueMgdl: r.valueMgdl,
        mealDescription: r.mealDescription,
        mealLogId: r.mealLogId,
        source: r.source,
        notes: r.notes,
        createdAt: r.createdAt,
      }));
    }),

  // Get readings within a date range
  getHistory: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.bloodSugarReadings.findMany({
        where: and(
          eq(bloodSugarReadings.clientId, ctx.dbUserId),
          gte(bloodSugarReadings.date, input.startDate),
          lte(bloodSugarReadings.date, input.endDate)
        ),
        orderBy: desc(bloodSugarReadings.date),
      });

      return results.map((r) => ({
        id: r.id,
        date: r.date,
        timing: r.timing,
        valueMgdl: r.valueMgdl,
        mealDescription: r.mealDescription,
        mealLogId: r.mealLogId,
        source: r.source,
        notes: r.notes,
        createdAt: r.createdAt,
      }));
    }),

  // Add a new blood sugar reading
  add: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        timing: z.enum(["fasted", "1hr", "2hr", "3hr", "4hr"]),
        valueMgdl: z.number().min(0).max(600),
        mealDescription: z.string().optional(),
        mealLogId: z.string().uuid().optional(),
        source: z.string().default("manual"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(bloodSugarReadings)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          timing: input.timing,
          valueMgdl: input.valueMgdl,
          mealDescription: input.mealDescription ?? null,
          mealLogId: input.mealLogId ?? null,
          source: input.source,
          notes: input.notes ?? null,
        })
        .returning();

      return result[0];
    }),

  // Update an existing blood sugar reading
  update: clientProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        timing: z.enum(["fasted", "1hr", "2hr", "3hr", "4hr"]).optional(),
        valueMgdl: z.number().min(0).max(600).optional(),
        mealDescription: z.string().optional(),
        mealLogId: z.string().uuid().nullable().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const updateData: Record<string, any> = {};

      if (input.timing !== undefined) updateData.timing = input.timing;
      if (input.valueMgdl !== undefined) updateData.valueMgdl = input.valueMgdl;
      if (input.mealDescription !== undefined)
        updateData.mealDescription = input.mealDescription;
      if (input.mealLogId !== undefined) updateData.mealLogId = input.mealLogId;
      if (input.notes !== undefined) updateData.notes = input.notes;

      const result = await ctx.db
        .update(bloodSugarReadings)
        .set(updateData)
        .where(
          and(
            eq(bloodSugarReadings.id, input.id),
            eq(bloodSugarReadings.clientId, ctx.dbUserId)
          )
        )
        .returning();

      return result[0] ?? null;
    }),

  // Delete a blood sugar reading
  delete: clientProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(bloodSugarReadings)
        .where(
          and(
            eq(bloodSugarReadings.id, input.id),
            eq(bloodSugarReadings.clientId, ctx.dbUserId)
          )
        );

      return { success: true };
    }),

  // Get the most recent 10 readings
  getLatest: clientProcedure.query(async ({ ctx }) => {
    const results = await ctx.db.query.bloodSugarReadings.findMany({
      where: eq(bloodSugarReadings.clientId, ctx.dbUserId),
      orderBy: desc(bloodSugarReadings.date),
      limit: 10,
    });

    return results.map((r) => ({
      id: r.id,
      date: r.date,
      timing: r.timing,
      valueMgdl: r.valueMgdl,
      mealDescription: r.mealDescription,
      mealLogId: r.mealLogId,
      source: r.source,
      notes: r.notes,
      createdAt: r.createdAt,
    }));
  }),
});
