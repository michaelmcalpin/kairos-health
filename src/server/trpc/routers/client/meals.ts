import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { mealLogs, mealPhotos } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

const foodItemSchema = z.object({
  foodId: z.string().optional(),
  name: z.string(),
  quantity: z.number(),
  unit: z.string(),
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
});

export const clientMealsRouter = router({
  // Get all meals for a specific date
  getByDate: clientProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      const meals = await ctx.db.query.mealLogs.findMany({
        where: and(
          eq(mealLogs.clientId, ctx.dbUserId),
          eq(mealLogs.date, input.date)
        ),
        orderBy: desc(mealLogs.createdAt),
      });

      // Get photos for these meals
      const mealIds = meals.map((m) => m.id);
      const photos = mealIds.length > 0
        ? await ctx.db.query.mealPhotos.findMany({
            where: eq(mealPhotos.clientId, ctx.dbUserId),
          })
        : [];

      return meals.map((m) => ({
        id: m.id,
        date: m.date,
        mealType: m.mealType,
        items: m.items || [],
        photoUrl: m.photoUrl,
        totalCalories: m.totalCalories,
        totalProtein: m.totalProtein,
        totalCarbs: m.totalCarbs,
        totalFat: m.totalFat,
        photos: photos.filter((p) => p.mealLogId === m.id),
        createdAt: m.createdAt,
      }));
    }),

  // Add a new meal
  add: clientProcedure
    .input(
      z.object({
        date: z.string(),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        items: z.array(foodItemSchema).optional(),
        photoUrl: z.string().optional(),
        totalCalories: z.number().optional(),
        totalProtein: z.number().optional(),
        totalCarbs: z.number().optional(),
        totalFat: z.number().optional(),
        totalFiber: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [meal] = await ctx.db.insert(mealLogs).values({
        clientId: ctx.dbUserId,
        date: input.date,
        mealType: input.mealType,
        items: input.items as typeof mealLogs.$inferInsert["items"],
        photoUrl: input.photoUrl,
        totalCalories: input.totalCalories,
        totalProtein: input.totalProtein,
        totalCarbs: input.totalCarbs,
        totalFat: input.totalFat,
        totalFiber: input.totalFiber,
      }).returning();

      return meal;
    }),

  // Update a meal
  update: clientProcedure
    .input(
      z.object({
        id: z.string(),
        items: z.array(foodItemSchema).optional(),
        totalCalories: z.number().optional(),
        totalProtein: z.number().optional(),
        totalCarbs: z.number().optional(),
        totalFat: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updates } = input;
      const updateData: Record<string, unknown> = {};
      if (updates.items !== undefined) updateData.items = updates.items;
      if (updates.totalCalories !== undefined) updateData.totalCalories = updates.totalCalories;
      if (updates.totalProtein !== undefined) updateData.totalProtein = updates.totalProtein;
      if (updates.totalCarbs !== undefined) updateData.totalCarbs = updates.totalCarbs;
      if (updates.totalFat !== undefined) updateData.totalFat = updates.totalFat;

      await ctx.db.update(mealLogs)
        .set(updateData)
        .where(and(eq(mealLogs.id, id), eq(mealLogs.clientId, ctx.dbUserId)));
    }),

  // Delete a meal
  delete: clientProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(mealLogs)
        .where(and(eq(mealLogs.id, input.id), eq(mealLogs.clientId, ctx.dbUserId)));
    }),

  // Upload a meal photo (returns upload URL placeholder)
  addPhoto: clientProcedure
    .input(
      z.object({
        mealLogId: z.string().optional(),
        checkinId: z.string().optional(),
        photoUrl: z.string(),
        mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [photo] = await ctx.db.insert(mealPhotos).values({
        clientId: ctx.dbUserId,
        mealLogId: input.mealLogId,
        checkinId: input.checkinId,
        photoUrl: input.photoUrl,
        mealType: input.mealType,
        notes: input.notes,
      }).returning();

      return photo;
    }),
});
