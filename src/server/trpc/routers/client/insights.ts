/**
 * KAIROS Client Insights Router
 *
 * tRPC endpoints for AI-generated health insights,
 * weekly reports, and data export triggers.
 */

import { z } from "zod";
import { router } from "@/server/trpc";
import { clientProcedure } from "@/server/trpc";
import {
  analyzeGlucose,
  analyzeSleep,
  analyzeNutrition,
  analyzeActivity,
  analyzeSupplements,
  analyzeFasting,
  analyzeComposite,
  generateWeeklyReport,
} from "@/lib/ai/engine";
import type {
  GlucoseAnalysisInput,
  SleepAnalysisInput,
  ActivityAnalysisInput,
  SupplementAnalysisInput,
  CompositeAnalysisInput,
  HealthInsight,
} from "@/lib/ai/types";

const dateRangeInput = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const clientInsightsRouter = router({
  /**
   * Get all insights for a date range
   * Runs the full analysis pipeline and returns categorized insights
   */
  getAll: clientProcedure
    .input(dateRangeInput)
    .query(async ({ input }) => {
      // In production, these would query the database.
      // For now, generate demo insights from representative data.
      const allInsights: HealthInsight[] = [];

      // Demo glucose analysis
      const glucoseInput: GlucoseAnalysisInput = {
        readings: [],
        avgGlucose: 98,
        timeInRange: 0.82,
        gmi: 5.3,
        cv: 22,
        minGlucose: 68,
        maxGlucose: 155,
        priorWeekAvg: 102,
      };
      allInsights.push(...analyzeGlucose(glucoseInput));

      // Demo sleep analysis
      const sleepInput: SleepAnalysisInput = {
        sessions: [],
        avgScore: 76,
        avgDuration: 420,
        consistency: 65,
        priorWeekAvgScore: 72,
      };
      allInsights.push(...analyzeSleep(sleepInput));

      // Demo activity analysis
      const activityInput: ActivityAnalysisInput = {
        workouts: [],
        totalWorkouts: 4,
        avgDurationMinutes: 42,
        activeDays: 4,
        totalDaysInRange: 7,
      };
      allInsights.push(...analyzeActivity(activityInput));

      // Demo supplement analysis
      const supplementInput: SupplementAnalysisInput = {
        adherenceRate: 0.78,
        missedItems: ["Omega-3", "Magnesium"],
        streakDays: 3,
        totalProtocolItems: 8,
      };
      allInsights.push(...analyzeSupplements(supplementInput));

      // Demo composite
      const compositeInput: CompositeAnalysisInput = {
        healthScore: 74,
        glucoseScore: 82,
        sleepScore: 76,
        activityScore: 72,
        supplementScore: 78,
        checkinScore: 65,
        priorWeekHealthScore: 70,
      };
      allInsights.push(...analyzeComposite(compositeInput));

      return {
        insights: allInsights,
        period: { startDate: input.startDate, endDate: input.endDate },
        generatedAt: new Date().toISOString(),
      };
    }),

  /**
   * Get insights for a specific category
   */
  byCategory: clientProcedure
    .input(z.object({
      startDate: z.string(),
      endDate: z.string(),
      category: z.enum(["glucose", "sleep", "nutrition", "activity", "supplements", "fasting", "composite"]),
    }))
    .query(async ({ input }) => {
      const { category } = input;

      // Generate category-specific demo insights
      let insights: HealthInsight[] = [];

      switch (category) {
        case "glucose":
          insights = analyzeGlucose({
            readings: [], avgGlucose: 98, timeInRange: 0.82,
            gmi: 5.3, cv: 22, minGlucose: 68, maxGlucose: 155,
          });
          break;
        case "sleep":
          insights = analyzeSleep({
            sessions: [], avgScore: 76, avgDuration: 420, consistency: 65,
          });
          break;
        case "nutrition":
          insights = analyzeNutrition({
            dailyLogs: Array.from({ length: 6 }, (_, i) => ({
              date: `2024-03-${10 + i}`, calories: 2100, protein: 135,
              carbs: 220, fat: 75, fiber: 28,
            })),
            avgCalories: 2100, avgProtein: 135, avgCarbs: 220, avgFat: 75,
          });
          break;
        case "activity":
          insights = analyzeActivity({
            workouts: [], totalWorkouts: 4, avgDurationMinutes: 42,
            activeDays: 4, totalDaysInRange: 7,
          });
          break;
        case "supplements":
          insights = analyzeSupplements({
            adherenceRate: 0.78, missedItems: ["Omega-3", "Magnesium"],
            streakDays: 3, totalProtocolItems: 8,
          });
          break;
        case "fasting":
          insights = analyzeFasting({
            logs: [
              { date: "2024-03-11", durationHours: 16, completed: true },
              { date: "2024-03-12", durationHours: 14, completed: false },
              { date: "2024-03-13", durationHours: 16.5, completed: true },
            ],
            avgDurationHours: 15.5, completionRate: 0.67, protocolTargetHours: 16,
          });
          break;
        case "composite":
          insights = analyzeComposite({
            healthScore: 74, glucoseScore: 82, sleepScore: 76,
            activityScore: 72, supplementScore: 78, checkinScore: 65,
          });
          break;
      }

      return { insights, category, generatedAt: new Date().toISOString() };
    }),

  /**
   * Generate a weekly health report
   */
  weeklyReport: clientProcedure
    .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
    .query(async ({ input }) => {
      const report = generateWeeklyReport({
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        glucose: {
          readings: [], avgGlucose: 98, timeInRange: 0.82,
          gmi: 5.3, cv: 22, minGlucose: 68, maxGlucose: 155, priorWeekAvg: 102,
        },
        sleep: {
          sessions: [], avgScore: 76, avgDuration: 420,
          consistency: 65, priorWeekAvgScore: 72,
        },
        nutrition: {
          dailyLogs: Array.from({ length: 6 }, (_, i) => ({
            date: `2024-03-${10 + i}`, calories: 2100, protein: 135,
            carbs: 220, fat: 75, fiber: 28,
          })),
          avgCalories: 2100, avgProtein: 135, avgCarbs: 220, avgFat: 75,
        },
        activity: {
          workouts: [], totalWorkouts: 4, avgDurationMinutes: 42,
          activeDays: 4, totalDaysInRange: 7,
        },
        supplements: {
          adherenceRate: 0.78, missedItems: ["Omega-3", "Magnesium"],
          streakDays: 3, totalProtocolItems: 8,
        },
        composite: {
          healthScore: 74, glucoseScore: 82, sleepScore: 76,
          activityScore: 72, supplementScore: 78, checkinScore: 65,
          priorWeekHealthScore: 70,
        },
      });

      return report;
    }),
});
