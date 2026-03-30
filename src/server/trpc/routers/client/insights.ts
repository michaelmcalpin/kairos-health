/**
 * KAIROS Client Insights Router
 *
 * tRPC endpoints for AI-generated health insights,
 * weekly reports, and data export triggers.
 * Now DB-backed: reads real client data where available.
 */

import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { clientProfiles, sleepSessions, glucoseReadings, supplementProtocols } from "@/server/db/schema";
import { eq, and, gte, lte, sql, desc } from "drizzle-orm";

interface HealthInsight {
  id: string;
  category: string;
  severity: "info" | "warning" | "positive" | "critical";
  title: string;
  description: string;
  recommendation?: string;
  confidence: number;
  dataSource: string;
  timestamp: string;
}

function makeInsight(
  category: string,
  severity: HealthInsight["severity"],
  title: string,
  description: string,
  recommendation?: string,
): HealthInsight {
  return {
    id: crypto.randomUUID(),
    category,
    severity,
    title,
    description,
    recommendation,
    confidence: 0.85,
    dataSource: "platform_analytics",
    timestamp: new Date().toISOString(),
  };
}

const dateRangeInput = z.object({
  startDate: z.string(),
  endDate: z.string(),
});

export const clientInsightsRouter = router({
  /**
   * Get all insights for a date range
   */
  getAll: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const insights: HealthInsight[] = [];

      // Query real glucose data if available
      const glucoseData = await ctx.db
        .select({
          avg: sql<number>`avg(${glucoseReadings.valueMgdl})`,
          min: sql<number>`min(${glucoseReadings.valueMgdl})`,
          max: sql<number>`max(${glucoseReadings.valueMgdl})`,
          count: sql<number>`count(*)`,
        })
        .from(glucoseReadings)
        .where(and(
          eq(glucoseReadings.clientId, ctx.dbUserId),
          gte(glucoseReadings.timestamp, new Date(input.startDate)),
          lte(glucoseReadings.timestamp, new Date(input.endDate + "T23:59:59")),
        ));

      const gd = glucoseData[0];
      if (gd && Number(gd.count) > 0) {
        const avg = Number(gd.avg);
        if (avg < 100) {
          insights.push(makeInsight("glucose", "positive", "Great Glucose Control",
            `Your average glucose of ${avg.toFixed(0)} mg/dL is in the optimal range.`,
            "Keep up your current nutrition and activity patterns."));
        } else if (avg < 126) {
          insights.push(makeInsight("glucose", "warning", "Elevated Glucose",
            `Your average glucose of ${avg.toFixed(0)} mg/dL is slightly above optimal.`,
            "Consider reducing refined carbohydrates and increasing post-meal walks."));
        } else {
          insights.push(makeInsight("glucose", "critical", "High Glucose Alert",
            `Your average glucose of ${avg.toFixed(0)} mg/dL needs attention.`,
            "Consult with your coach about adjusting your protocol."));
        }
      }

      // Query real sleep data if available
      const sleepData = await ctx.db
        .select({
          avgScore: sql<number>`avg(${sleepSessions.score})`,
          avgDuration: sql<number>`avg(${sleepSessions.totalMinutes})`,
          count: sql<number>`count(*)`,
        })
        .from(sleepSessions)
        .where(and(
          eq(sleepSessions.clientId, ctx.dbUserId),
          gte(sleepSessions.date, input.startDate),
          lte(sleepSessions.date, input.endDate),
        ));

      const sd = sleepData[0];
      if (sd && Number(sd.count) > 0) {
        const avgScore = Number(sd.avgScore);
        const avgDuration = Number(sd.avgDuration);
        if (avgScore >= 80) {
          insights.push(makeInsight("sleep", "positive", "Excellent Sleep Quality",
            `Your average sleep score of ${avgScore.toFixed(0)} shows strong recovery.`,
            "Maintain your current sleep routine."));
        } else if (avgScore >= 60) {
          insights.push(makeInsight("sleep", "info", "Sleep Could Improve",
            `Your average sleep score of ${avgScore.toFixed(0)} has room for improvement.`,
            "Try consistent bed/wake times and limiting screens 1 hour before bed."));
        } else {
          insights.push(makeInsight("sleep", "warning", "Low Sleep Quality",
            `Your average sleep score of ${avgScore.toFixed(0)} may be impacting recovery.`,
            "Discuss sleep optimization strategies with your coach."));
        }

        if (avgDuration < 360) {
          insights.push(makeInsight("sleep", "warning", "Short Sleep Duration",
            `You're averaging ${(avgDuration / 60).toFixed(1)} hours of sleep.`,
            "Aim for at least 7 hours per night for optimal recovery."));
        }
      }

      // General composite insight
      const profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, ctx.dbUserId),
      });

      if (profile) {
        insights.push(makeInsight("composite", "info", "Health Score Summary",
          `Your overall health trajectory is being tracked. Current tier: ${profile.tier ?? "unset"}.`,
          "Continue logging daily check-ins for more personalized insights."));
      }

      // If no real data, add a helpful fallback
      if (insights.length === 0) {
        insights.push(makeInsight("composite", "info", "Start Tracking for Insights",
          "We need more data to generate personalized health insights.",
          "Log daily check-ins, connect wearable devices, and upload lab results to unlock insights."));
      }

      return {
        insights,
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
    .query(async ({ ctx, input }) => {
      const insights: HealthInsight[] = [];

      switch (input.category) {
        case "glucose": {
          const data = await ctx.db
            .select({
              avg: sql<number>`avg(${glucoseReadings.valueMgdl})`,
              min: sql<number>`min(${glucoseReadings.valueMgdl})`,
              max: sql<number>`max(${glucoseReadings.valueMgdl})`,
              count: sql<number>`count(*)`,
            })
            .from(glucoseReadings)
            .where(and(
              eq(glucoseReadings.clientId, ctx.dbUserId),
              gte(glucoseReadings.timestamp, new Date(input.startDate)),
              lte(glucoseReadings.timestamp, new Date(input.endDate + "T23:59:59")),
            ));
          const d = data[0];
          if (d && Number(d.count) > 0) {
            const avg = Number(d.avg);
            insights.push(makeInsight("glucose", avg < 100 ? "positive" : avg < 126 ? "warning" : "critical",
              `Glucose Average: ${avg.toFixed(0)} mg/dL`,
              `Range: ${Number(d.min).toFixed(0)}–${Number(d.max).toFixed(0)} mg/dL across ${d.count} readings.`,
              avg < 100 ? "Excellent control!" : "Consider reviewing carb intake with your coach."));
          }
          break;
        }
        case "sleep": {
          const data = await ctx.db
            .select({
              avgScore: sql<number>`avg(${sleepSessions.score})`,
              avgDuration: sql<number>`avg(${sleepSessions.totalMinutes})`,
              count: sql<number>`count(*)`,
            })
            .from(sleepSessions)
            .where(and(
              eq(sleepSessions.clientId, ctx.dbUserId),
              gte(sleepSessions.date, input.startDate),
              lte(sleepSessions.date, input.endDate),
            ));
          const d = data[0];
          if (d && Number(d.count) > 0) {
            insights.push(makeInsight("sleep", Number(d.avgScore) >= 75 ? "positive" : "info",
              `Sleep Score: ${Number(d.avgScore).toFixed(0)}`,
              `Averaging ${(Number(d.avgDuration) / 60).toFixed(1)} hours across ${d.count} sessions.`));
          }
          break;
        }
        default: {
          insights.push(makeInsight(input.category, "info",
            `${input.category.charAt(0).toUpperCase() + input.category.slice(1)} Insights`,
            "Continue logging data for more personalized insights in this category.",
            "Check back after logging more entries."));
        }
      }

      return { insights, category: input.category, generatedAt: new Date().toISOString() };
    }),

  /**
   * Generate a weekly health report
   */
  weeklyReport: clientProcedure
    .input(z.object({ weekStart: z.string(), weekEnd: z.string() }))
    .query(async ({ ctx, input }) => {
      // Pull real data for the week
      const glucoseData = await ctx.db
        .select({
          avg: sql<number>`avg(${glucoseReadings.valueMgdl})`,
          count: sql<number>`count(*)`,
        })
        .from(glucoseReadings)
        .where(and(
          eq(glucoseReadings.clientId, ctx.dbUserId),
          gte(glucoseReadings.timestamp, new Date(input.weekStart)),
          lte(glucoseReadings.timestamp, new Date(input.weekEnd + "T23:59:59")),
        ));

      const sleepData = await ctx.db
        .select({
          avgScore: sql<number>`avg(${sleepSessions.score})`,
          avgDuration: sql<number>`avg(${sleepSessions.totalMinutes})`,
          count: sql<number>`count(*)`,
        })
        .from(sleepSessions)
        .where(and(
          eq(sleepSessions.clientId, ctx.dbUserId),
          gte(sleepSessions.date, input.weekStart),
          lte(sleepSessions.date, input.weekEnd),
        ));

      const gd = glucoseData[0];
      const sd = sleepData[0];

      const sections = [];

      if (gd && Number(gd.count) > 0) {
        sections.push({
          category: "glucose",
          title: "Glucose",
          score: Number(gd.avg) < 100 ? 85 : Number(gd.avg) < 126 ? 65 : 40,
          summary: `Average ${Number(gd.avg).toFixed(0)} mg/dL across ${gd.count} readings.`,
          highlights: Number(gd.avg) < 100 ? ["In optimal range"] : ["Consider protocol adjustment"],
        });
      }

      if (sd && Number(sd.count) > 0) {
        sections.push({
          category: "sleep",
          title: "Sleep",
          score: Number(sd.avgScore),
          summary: `Average score ${Number(sd.avgScore).toFixed(0)}, ${(Number(sd.avgDuration) / 60).toFixed(1)} hrs/night.`,
          highlights: Number(sd.avgScore) >= 75 ? ["Good recovery"] : ["Room for improvement"],
        });
      }

      // Compute overall score
      const scores = sections.map((s) => s.score);
      const overallScore = scores.length > 0
        ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
        : 0;

      return {
        weekStart: input.weekStart,
        weekEnd: input.weekEnd,
        overallScore,
        sections,
        generatedAt: new Date().toISOString(),
        recommendations: [
          "Continue daily check-ins for more accurate insights.",
          "Connect additional wearable devices for comprehensive tracking.",
        ],
      };
    }),
});
