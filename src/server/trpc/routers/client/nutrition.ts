import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { mealLogs, mealPlans } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientNutritionRouter = router({
  // List meal logs within a date range
  listMeals: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await safeQ(() => ctx.db.query.mealLogs.findMany({
        where: and(
          eq(mealLogs.clientId, ctx.dbUserId),
          gte(mealLogs.date, input.startDate),
          lte(mealLogs.date, input.endDate)
        ),
        orderBy: [desc(mealLogs.date), desc(mealLogs.createdAt)],
      }), []);

      return results.map((m) => ({
        id: m.id,
        date: m.date,
        mealType: m.mealType,
        items: m.items,
        totalCalories: m.totalCalories,
        totalProtein: m.totalProtein,
        totalCarbs: m.totalCarbs,
        totalFat: m.totalFat,
        totalFiber: m.totalFiber,
        photoUrl: m.photoUrl,
        createdAt: m.createdAt,
      }));
    }),

  // Daily macro summary for a date range (aggregated per day)
  dailySummary: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await safeQ(() => ctx.db
        .select({
          date: mealLogs.date,
          totalCalories: sql<number>`sum(${mealLogs.totalCalories})`,
          totalProtein: sql<number>`sum(${mealLogs.totalProtein})`,
          totalCarbs: sql<number>`sum(${mealLogs.totalCarbs})`,
          totalFat: sql<number>`sum(${mealLogs.totalFat})`,
          totalFiber: sql<number>`sum(${mealLogs.totalFiber})`,
          mealCount: sql<number>`count(*)`,
        })
        .from(mealLogs)
        .where(
          and(
            eq(mealLogs.clientId, ctx.dbUserId),
            gte(mealLogs.date, input.startDate),
            lte(mealLogs.date, input.endDate)
          )
        )
        .groupBy(mealLogs.date)
        .orderBy(mealLogs.date), []);

      return results.map((r) => ({
        date: r.date,
        totalCalories: Math.round(Number(r.totalCalories ?? 0)),
        totalProtein: Math.round(Number(r.totalProtein ?? 0)),
        totalCarbs: Math.round(Number(r.totalCarbs ?? 0)),
        totalFat: Math.round(Number(r.totalFat ?? 0)),
        totalFiber: Math.round(Number(r.totalFiber ?? 0)),
        mealCount: Number(r.mealCount),
      }));
    }),

  // Log a new meal
  logMeal: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        items: z.array(
          z.object({
            foodId: z.string(),
            name: z.string(),
            quantity: z.number(),
            unit: z.string(),
            calories: z.number(),
            protein: z.number(),
            carbs: z.number(),
            fat: z.number(),
          })
        ),
        photoUrl: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const totalCalories = input.items.reduce((s, i) => s + i.calories, 0);
      const totalProtein = input.items.reduce((s, i) => s + i.protein, 0);
      const totalCarbs = input.items.reduce((s, i) => s + i.carbs, 0);
      const totalFat = input.items.reduce((s, i) => s + i.fat, 0);

      const result = await ctx.db
        .insert(mealLogs)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          mealType: input.mealType,
          items: input.items,
          totalCalories,
          totalProtein,
          totalCarbs,
          totalFat,
          photoUrl: input.photoUrl ?? null,
        })
        .returning();

      return result[0];
    }),

  // Get active meal plan
  getActivePlan: clientProcedure.query(async ({ ctx }) => {
    const plan = await ctx.db.query.mealPlans.findFirst({
      where: and(
        eq(mealPlans.clientId, ctx.dbUserId),
        eq(mealPlans.status, "active")
      ),
      orderBy: desc(mealPlans.createdAt),
    });
    return plan ?? null;
  }),

  // List all meal plans
  listPlans: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.query.mealPlans.findMany({
      where: eq(mealPlans.clientId, ctx.dbUserId),
      orderBy: desc(mealPlans.createdAt),
    });
  }),

  // Save a meal plan (from AI generation)
  savePlan: clientProcedure
    .input(z.object({
      name: z.string(),
      meals: z.unknown(),
      macroTargets: z.unknown().optional(),
      isAiGenerated: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Deactivate existing plans
      await ctx.db.update(mealPlans).set({ status: "inactive" }).where(
        and(eq(mealPlans.clientId, ctx.dbUserId), eq(mealPlans.status, "active"))
      );

      const [plan] = await ctx.db.insert(mealPlans).values({
        trainerId: null,
        clientId: ctx.dbUserId,
        isAiGenerated: input.isAiGenerated ?? false,
        name: input.name,
        meals: input.meals as Record<string, unknown>,
        macroTargets: (input.macroTargets ?? {}) as { calories: number; protein: number; carbs: number; fat: number; fiber: number },
        status: "active",
      }).returning();

      return plan;
    }),

  // Delete a meal plan
  deletePlan: clientProcedure
    .input(z.object({ planId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(mealPlans).where(
        and(eq(mealPlans.id, input.planId), eq(mealPlans.clientId, ctx.dbUserId))
      );
      return { success: true };
    }),
});
