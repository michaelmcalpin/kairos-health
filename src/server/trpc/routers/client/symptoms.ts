import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { symptomAssessments } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

const symptomCategorySchema = z.record(z.string(), z.number());

export const clientSymptomsRouter = router({
  getLatest: clientProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select()
      .from(symptomAssessments)
      .where(eq(symptomAssessments.clientId, ctx.dbUserId))
      .orderBy(desc(symptomAssessments.weekStart))
      .limit(1);

    return result[0] || null;
  }),

  getHistory: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      return await ctx.db
        .select()
        .from(symptomAssessments)
        .where(
          and(
            eq(symptomAssessments.clientId, ctx.dbUserId),
            gte(symptomAssessments.weekStart, input.startDate),
            lte(symptomAssessments.weekStart, input.endDate)
          )
        )
        .orderBy(desc(symptomAssessments.weekStart));
    }),

  getWeekly: clientProcedure
    .input(z.string().date())
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select()
        .from(symptomAssessments)
        .where(
          and(
            eq(symptomAssessments.clientId, ctx.dbUserId),
            eq(symptomAssessments.weekStart, input)
          )
        );

      return result[0] || null;
    }),

  submit: clientProcedure
    .input(
      z.object({
        weekStart: z.string().date(),
        digestive: symptomCategorySchema.optional(),
        joint: symptomCategorySchema.optional(),
        mood: symptomCategorySchema.optional(),
        adrenal: symptomCategorySchema.optional(),
        skin: symptomCategorySchema.optional(),
        eyes: symptomCategorySchema.optional(),
        nose: symptomCategorySchema.optional(),
        heart: symptomCategorySchema.optional(),
        head: symptomCategorySchema.optional(),
        weightFood: symptomCategorySchema.optional(),
        energySleep: symptomCategorySchema.optional(),
        mouthThroat: symptomCategorySchema.optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const {
        weekStart,
        digestive,
        joint,
        mood,
        adrenal,
        skin,
        eyes,
        nose,
        heart,
        head,
        weightFood,
        energySleep,
        mouthThroat,
        notes,
      } = input;

      // Calculate total score by summing all symptom values
      const calculateTotalScore = () => {
        const categories = [
          digestive,
          joint,
          mood,
          adrenal,
          skin,
          eyes,
          nose,
          heart,
          head,
          weightFood,
          energySleep,
          mouthThroat,
        ];

        return categories.reduce((total, category) => {
          if (!category) return total;
          return total + Object.values(category).reduce((a, b) => a + b, 0);
        }, 0);
      };

      const totalScore = calculateTotalScore();

      // Check if assessment already exists for this week
      const existing = await ctx.db
        .select()
        .from(symptomAssessments)
        .where(
          and(
            eq(symptomAssessments.clientId, ctx.dbUserId),
            eq(symptomAssessments.weekStart, weekStart)
          )
        );

      const assessmentData = {
        digestive: digestive || {},
        joint: joint || {},
        mood: mood || {},
        adrenal: adrenal || {},
        skin: skin || {},
        eyes: eyes || {},
        nose: nose || {},
        heart: heart || {},
        head: head || {},
        weightFood: weightFood || {},
        energySleep: energySleep || {},
        mouthThroat: mouthThroat || {},
        totalScore,
        notes,
      };

      if (existing.length > 0) {
        // Update existing assessment
        const result = await ctx.db
          .update(symptomAssessments)
          .set(assessmentData)
          .where(
            and(
              eq(symptomAssessments.id, existing[0].id),
              eq(symptomAssessments.clientId, ctx.dbUserId)
            )
          )
          .returning();

        return result[0];
      } else {
        // Create new assessment
        const result = await ctx.db
          .insert(symptomAssessments)
          .values({
            clientId: ctx.dbUserId,
            weekStart,
            ...assessmentData,
          })
          .returning();

        return result[0];
      }
    }),
});
