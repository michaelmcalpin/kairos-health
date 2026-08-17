/**
 * Coach Metrics Management Router
 *
 * Allows coaches to add client health metrics on behalf of a client. Every
 * mutation is guarded by the coach-access model (primary relationship OR
 * client-granted category write level). All metrics here map to the
 * `healthData` category (write).
 *
 * Where a table has a `source` column, coach-entered rows are tagged
 * `source: "coach"`.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  glucoseReadings,
  hrvReadings,
  bloodPressureReadings,
  bodyMeasurements,
  activitySummaries,
  healthGoals,
  fastingLogs,
  dailyCheckins,
} from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { getCoachAccess, hasCategoryAccess } from "@/lib/access/coach-access";

// ─── Relationship guard ─────────────────────────────────────
// Mirrors coach/plans.ts: allows access when the coach is the client's
// primary coach OR when the client has granted the relevant category at the
// required level. Reuses the shared resolver in
// src/lib/access/coach-access.ts.
async function verifyCoachClientAccess(
  db: typeof import("@/server/db").db,
  coachId: string,
  clientId: string,
  category: "diet" | "exercise" | "labs" | "healthData",
  minLevel: "read" | "write" = "write",
  userRole?: string,
) {
  if (userRole === "super_admin") return;
  const access = await getCoachAccess(db, coachId, clientId);
  if (!access.hasAnyAccess || !hasCategoryAccess(access, category, minLevel)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "No active relationship or granted access to this client",
    });
  }
}

// ─── Goal enums (match schema.ts) ───────────────────────────
const goalCategoryEnum = z.enum([
  "glucose",
  "sleep",
  "weight",
  "body_fat",
  "activity",
  "nutrition",
  "supplements",
  "fasting",
  "labs",
  "custom",
]);
const goalStatusEnum = z.enum(["active", "paused", "completed", "abandoned"]);
const goalDirectionEnum = z.enum(["increase", "decrease", "maintain", "reach"]);
const goalTimeframeEnum = z.enum([
  "weekly",
  "monthly",
  "quarterly",
  "yearly",
  "open_ended",
]);

// ─── Router ─────────────────────────────────────────────────
export const coachMetricsRouter = router({
  // ═══════════════ GLUCOSE (healthData) ═══════════════
  createGlucose: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      timestamp: z.string(), // ISO datetime
      valueMgdl: z.number(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(glucoseReadings).values({
        clientId: input.clientId,
        timestamp: new Date(input.timestamp),
        valueMgdl: input.valueMgdl,
        notes: input.notes ?? null,
        source: "coach",
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ HRV (healthData) ═══════════════
  createHrv: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      timestamp: z.string(), // ISO datetime
      rmssd: z.number(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(hrvReadings).values({
        clientId: input.clientId,
        timestamp: new Date(input.timestamp),
        rmssd: input.rmssd,
        source: "coach",
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ BLOOD PRESSURE (healthData) ═══════════════
  createBloodPressure: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.string(), // date (YYYY-MM-DD)
      systolic: z.number().int(),
      diastolic: z.number().int(),
      pulse: z.number().int().optional(),
      position: z.string().max(20).optional(),
      arm: z.string().max(10).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(bloodPressureReadings).values({
        clientId: input.clientId,
        date: input.date,
        systolic: input.systolic,
        diastolic: input.diastolic,
        pulse: input.pulse ?? null,
        position: input.position ?? null,
        arm: input.arm ?? null,
        notes: input.notes ?? null,
        source: "coach",
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ BODY MEASUREMENT (healthData) ═══════════════
  createBodyMeasurement: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.string(), // date (YYYY-MM-DD)
      weightLbs: z.number().optional(),
      bodyFatPct: z.number().optional(),
      waistInches: z.number().optional(),
      chestInches: z.number().optional(),
      hipsInches: z.number().optional(),
      rightBicepInches: z.number().optional(),
      leftBicepInches: z.number().optional(),
      rightThighInches: z.number().optional(),
      leftThighInches: z.number().optional(),
      rightCalfInches: z.number().optional(),
      leftCalfInches: z.number().optional(),
      neckInches: z.number().optional(),
      shouldersInches: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(bodyMeasurements).values({
        clientId: input.clientId,
        date: input.date,
        weightLbs: input.weightLbs ?? null,
        bodyFatPct: input.bodyFatPct ?? null,
        waistInches: input.waistInches ?? null,
        chestInches: input.chestInches ?? null,
        hipsInches: input.hipsInches ?? null,
        rightBicepInches: input.rightBicepInches ?? null,
        leftBicepInches: input.leftBicepInches ?? null,
        rightThighInches: input.rightThighInches ?? null,
        leftThighInches: input.leftThighInches ?? null,
        rightCalfInches: input.rightCalfInches ?? null,
        leftCalfInches: input.leftCalfInches ?? null,
        neckInches: input.neckInches ?? null,
        shouldersInches: input.shouldersInches ?? null,
        notes: input.notes ?? null,
        source: "coach",
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ ACTIVITY (healthData) ═══════════════
  createActivity: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.string(), // date (YYYY-MM-DD)
      steps: z.number().int().optional(),
      caloriesActive: z.number().int().optional(),
      exerciseMinutes: z.number().int().optional(),
      standHours: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(activitySummaries).values({
        clientId: input.clientId,
        date: input.date,
        steps: input.steps ?? null,
        caloriesActive: input.caloriesActive ?? null,
        exerciseMinutes: input.exerciseMinutes ?? null,
        standHours: input.standHours ?? null,
        source: "coach",
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ HEALTH GOAL (healthData) ═══════════════
  createGoal: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      category: goalCategoryEnum,
      title: z.string().min(1).max(255),
      description: z.string().optional(),
      targetValue: z.number(),
      targetUnit: z.string().max(50),
      targetDirection: goalDirectionEnum,
      startValue: z.number(),
      currentValue: z.number(),
      timeframe: goalTimeframeEnum,
      startDate: z.string(), // date (YYYY-MM-DD)
      targetDate: z.string().optional(),
      status: goalStatusEnum.optional().default("active"),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(healthGoals).values({
        clientId: input.clientId,
        category: input.category,
        title: input.title,
        description: input.description ?? null,
        targetValue: input.targetValue,
        targetUnit: input.targetUnit,
        targetDirection: input.targetDirection,
        startValue: input.startValue,
        currentValue: input.currentValue,
        timeframe: input.timeframe,
        startDate: input.startDate,
        targetDate: input.targetDate ?? null,
        status: input.status,
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ FASTING (healthData) ═══════════════
  createFasting: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.string(), // date (YYYY-MM-DD)
      startedAt: z.string().optional(), // ISO datetime
      endedAt: z.string().optional(),   // ISO datetime
      completed: z.boolean().optional().default(false),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [row] = await ctx.db.insert(fastingLogs).values({
        clientId: input.clientId,
        date: input.date,
        startedAt: input.startedAt ? new Date(input.startedAt) : null,
        endedAt: input.endedAt ? new Date(input.endedAt) : null,
        completed: input.completed,
      }).returning();

      return { id: row.id };
    }),

  // ═══════════════ DAILY CHECK-IN (healthData) — UPSERT ═══════════════
  createCheckin: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.string(), // date (YYYY-MM-DD)
      weight: z.number().optional(),
      sleepHours: z.number().optional(),
      sleepQuality: z.number().int().optional(),
      hrvScore: z.number().optional(),
      readinessScore: z.number().int().optional(),
      steps: z.number().int().optional(),
      proteinG: z.number().optional(),
      carbsG: z.number().optional(),
      fatG: z.number().optional(),
      fiberG: z.number().optional(),
      totalCalories: z.number().optional(),
      waterOz: z.number().optional(),
      cardioMinutes: z.number().int().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      // One row per (clientId, date): update if it exists, else insert.
      const existing = await ctx.db.query.dailyCheckins.findFirst({
        where: and(
          eq(dailyCheckins.clientId, input.clientId),
          eq(dailyCheckins.date, input.date),
        ),
      });

      if (existing) {
        const [updated] = await ctx.db.update(dailyCheckins)
          .set({
            weight: input.weight ?? existing.weight,
            sleepHours: input.sleepHours ?? existing.sleepHours,
            sleepQuality: input.sleepQuality ?? existing.sleepQuality,
            hrvScore: input.hrvScore ?? existing.hrvScore,
            readinessScore: input.readinessScore ?? existing.readinessScore,
            steps: input.steps ?? existing.steps,
            proteinG: input.proteinG ?? existing.proteinG,
            carbsG: input.carbsG ?? existing.carbsG,
            fatG: input.fatG ?? existing.fatG,
            fiberG: input.fiberG ?? existing.fiberG,
            totalCalories: input.totalCalories ?? existing.totalCalories,
            waterOz: input.waterOz ?? existing.waterOz,
            cardioMinutes: input.cardioMinutes ?? existing.cardioMinutes,
          })
          .where(eq(dailyCheckins.id, existing.id))
          .returning();

        return { id: updated.id };
      }

      const [inserted] = await ctx.db.insert(dailyCheckins).values({
        clientId: input.clientId,
        date: input.date,
        weight: input.weight ?? null,
        sleepHours: input.sleepHours ?? null,
        sleepQuality: input.sleepQuality ?? null,
        hrvScore: input.hrvScore ?? null,
        readinessScore: input.readinessScore ?? null,
        steps: input.steps ?? null,
        proteinG: input.proteinG ?? null,
        carbsG: input.carbsG ?? null,
        fatG: input.fatG ?? null,
        fiberG: input.fiberG ?? null,
        totalCalories: input.totalCalories ?? null,
        waterOz: input.waterOz ?? null,
        cardioMinutes: input.cardioMinutes ?? null,
      }).returning();

      return { id: inserted.id };
    }),
});
