import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import { dailyCheckins } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

// Shared validation schema for check-in fields
const checkinInputSchema = z.object({
  date: z.string().optional(),
  // Vitals / Biofeedback
  weight: z.number().optional(),
  sleepHours: z.number().optional(),
  sleepQuality: z.number().min(1).max(10).optional(),
  hrvScore: z.number().optional(),
  readinessScore: z.number().int().optional(),
  steps: z.number().int().optional(),
  // Nutrition
  plan: z.string().optional(),
  proteinG: z.number().optional(),
  carbsG: z.number().optional(),
  fatG: z.number().optional(),
  fiberG: z.number().optional(),
  totalCalories: z.number().optional(),
  waterOz: z.number().optional(),
  electrolytes: z.boolean().optional(),
  // Activity
  cardioMinutes: z.number().int().optional(),
  trainingType: z.string().optional(),
  trainingDescription: z.string().optional(),
  // Wellness Scores (1-10)
  stress: z.number().min(1).max(10).optional(),
  hunger: z.number().min(1).max(10).optional(),
  energy: z.number().min(1).max(10).optional(),
  mood: z.number().min(1).max(10).optional(),
  // GI / Bowel
  bmCount: z.number().int().optional(),
  // Notes
  deviations: z.string().optional(),
  notes: z.string().optional(),
  // Data sources
  dataSources: z.record(z.string(), z.string()).optional(),
});

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

  // Get check-in for a specific date
  getByDate: clientProcedure
    .input(z.object({
      date: z.string(),
    }))
    .query(async ({ ctx, input }) => {
      const checkin = await ctx.db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.clientId, ctx.dbUserId),
          eq(dailyCheckins.date, input.date)
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
      return results;
    }),

  // Submit a daily check-in (upsert: update if exists for date, else insert)
  submit: clientProcedure
    .input(checkinInputSchema)
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? new Date().toISOString().split("T")[0];

      // Check if a check-in already exists for this date
      const existing = await ctx.db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.clientId, ctx.dbUserId),
          eq(dailyCheckins.date, date)
        ),
      });

      if (existing) {
        // Update existing check-in
        const result = await ctx.db
          .update(dailyCheckins)
          .set({
            weight: input.weight ?? existing.weight,
            sleepHours: input.sleepHours ?? existing.sleepHours,
            sleepQuality: input.sleepQuality ?? existing.sleepQuality,
            hrvScore: input.hrvScore ?? existing.hrvScore,
            readinessScore: input.readinessScore ?? existing.readinessScore,
            steps: input.steps ?? existing.steps,
            plan: input.plan ?? existing.plan,
            proteinG: input.proteinG ?? existing.proteinG,
            carbsG: input.carbsG ?? existing.carbsG,
            fatG: input.fatG ?? existing.fatG,
            fiberG: input.fiberG ?? existing.fiberG,
            totalCalories: input.totalCalories ?? existing.totalCalories,
            waterOz: input.waterOz ?? existing.waterOz,
            electrolytes: input.electrolytes ?? existing.electrolytes,
            cardioMinutes: input.cardioMinutes ?? existing.cardioMinutes,
            trainingType: input.trainingType ?? existing.trainingType,
            trainingDescription: input.trainingDescription ?? existing.trainingDescription,
            stress: input.stress ?? existing.stress,
            hunger: input.hunger ?? existing.hunger,
            energy: input.energy ?? existing.energy,
            mood: input.mood ?? existing.mood,
            bmCount: input.bmCount ?? existing.bmCount,
            deviations: input.deviations ?? existing.deviations,
            notes: input.notes ?? existing.notes,
            dataSources: input.dataSources ?? (existing.dataSources as Record<string, string> | null),
          })
          .where(eq(dailyCheckins.id, existing.id))
          .returning();

        return result[0];
      } else {
        // Insert new check-in
        const result = await ctx.db
          .insert(dailyCheckins)
          .values({
            clientId: ctx.dbUserId,
            date,
            weight: input.weight ?? null,
            sleepHours: input.sleepHours ?? null,
            sleepQuality: input.sleepQuality ?? null,
            hrvScore: input.hrvScore ?? null,
            readinessScore: input.readinessScore ?? null,
            steps: input.steps ?? null,
            plan: input.plan ?? null,
            proteinG: input.proteinG ?? null,
            carbsG: input.carbsG ?? null,
            fatG: input.fatG ?? null,
            fiberG: input.fiberG ?? null,
            totalCalories: input.totalCalories ?? null,
            waterOz: input.waterOz ?? null,
            electrolytes: input.electrolytes ?? null,
            cardioMinutes: input.cardioMinutes ?? null,
            trainingType: input.trainingType ?? null,
            trainingDescription: input.trainingDescription ?? null,
            stress: input.stress ?? null,
            hunger: input.hunger ?? null,
            energy: input.energy ?? null,
            mood: input.mood ?? null,
            bmCount: input.bmCount ?? null,
            deviations: input.deviations ?? null,
            notes: input.notes ?? null,
            dataSources: (input.dataSources as Record<string, string>) ?? null,
          })
          .returning();

        return result[0];
      }
    }),

  // Update an existing check-in by id
  update: clientProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        ...checkinInputSchema.shape,
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Verify ownership: ensure the check-in belongs to the current user
      const existing = await ctx.db.query.dailyCheckins.findFirst({
        where: eq(dailyCheckins.id, id),
      });

      if (!existing) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Check-in not found" });
      }

      if (existing.clientId !== ctx.dbUserId) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Unauthorized: check-in does not belong to this user" });
      }

      // Build update object with only provided fields
      const updateObject: Record<string, unknown> = {};
      if (updateData.date !== undefined) updateObject.date = updateData.date;
      if (updateData.weight !== undefined) updateObject.weight = updateData.weight;
      if (updateData.sleepHours !== undefined) updateObject.sleepHours = updateData.sleepHours;
      if (updateData.sleepQuality !== undefined) updateObject.sleepQuality = updateData.sleepQuality;
      if (updateData.hrvScore !== undefined) updateObject.hrvScore = updateData.hrvScore;
      if (updateData.readinessScore !== undefined) updateObject.readinessScore = updateData.readinessScore;
      if (updateData.steps !== undefined) updateObject.steps = updateData.steps;
      if (updateData.plan !== undefined) updateObject.plan = updateData.plan;
      if (updateData.proteinG !== undefined) updateObject.proteinG = updateData.proteinG;
      if (updateData.carbsG !== undefined) updateObject.carbsG = updateData.carbsG;
      if (updateData.fatG !== undefined) updateObject.fatG = updateData.fatG;
      if (updateData.fiberG !== undefined) updateObject.fiberG = updateData.fiberG;
      if (updateData.totalCalories !== undefined) updateObject.totalCalories = updateData.totalCalories;
      if (updateData.waterOz !== undefined) updateObject.waterOz = updateData.waterOz;
      if (updateData.electrolytes !== undefined) updateObject.electrolytes = updateData.electrolytes;
      if (updateData.cardioMinutes !== undefined) updateObject.cardioMinutes = updateData.cardioMinutes;
      if (updateData.trainingType !== undefined) updateObject.trainingType = updateData.trainingType;
      if (updateData.trainingDescription !== undefined) updateObject.trainingDescription = updateData.trainingDescription;
      if (updateData.stress !== undefined) updateObject.stress = updateData.stress;
      if (updateData.hunger !== undefined) updateObject.hunger = updateData.hunger;
      if (updateData.energy !== undefined) updateObject.energy = updateData.energy;
      if (updateData.mood !== undefined) updateObject.mood = updateData.mood;
      if (updateData.bmCount !== undefined) updateObject.bmCount = updateData.bmCount;
      if (updateData.deviations !== undefined) updateObject.deviations = updateData.deviations;
      if (updateData.notes !== undefined) updateObject.notes = updateData.notes;
      if (updateData.dataSources !== undefined) updateObject.dataSources = updateData.dataSources;

      const result = await ctx.db
        .update(dailyCheckins)
        .set(updateObject)
        .where(eq(dailyCheckins.id, id))
        .returning();

      return result[0];
    }),
});
