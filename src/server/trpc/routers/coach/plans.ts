/**
 * Coach Plans Management Router
 *
 * Allows coaches to create and assign training programs, meal plans, and
 * manual sleep entries on behalf of a client. Every mutation is guarded by
 * the coach-access model (primary relationship OR client-granted category
 * write level).
 *
 * Category mapping:
 *   - training programs   → exercise
 *   - meal plans          → diet
 *   - sleep manual entry  → healthData
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  workoutPrograms,
  workoutSessions,
  clientWorkoutAssignments,
  mealPlans,
  sleepSessions,
} from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";
import { getCoachAccess, hasCategoryAccess } from "@/lib/access/coach-access";

// ─── Relationship guard ─────────────────────────────────────
// Mirrors coach/protocols.ts but category-aware: allows access when the
// coach is the client's primary coach OR when the client has granted the
// relevant category at the required level. Reuses the shared resolver in
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

// ─── Input schemas ──────────────────────────────────────────
const exerciseInput = z.object({
  exerciseId: z.string().optional(),
  name: z.string().min(1).max(255),
  sets: z.number(),
  reps: z.string(),
  tempo: z.string().optional(),
  restSeconds: z.number().optional(),
});

const sessionInput = z.object({
  dayNumber: z.number(),
  name: z.string().max(255).optional(),
  exercises: z.array(exerciseInput),
});

const macroTargetsInput = z.object({
  calories: z.number(),
  protein: z.number(),
  carbs: z.number(),
  fat: z.number(),
  fiber: z.number(),
});

const assignmentStatusEnum = z.enum(["active", "paused", "completed", "cancelled"]);

// ─── Router ─────────────────────────────────────────────────
export const coachPlansRouter = router({
  // ═══════════════ TRAINING PROGRAMS (exercise) ═══════════════

  /**
   * Create a training program (+ sessions) and optionally assign it to a client.
   */
  createTrainingProgram: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      durationWeeks: z.number().optional(),
      sessions: z.array(sessionInput).optional(),
      startDate: z.string(), // date (YYYY-MM-DD)
      activate: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "exercise", "write", ctx.userRole);

      const [program] = await ctx.db.insert(workoutPrograms).values({
        trainerId: ctx.dbUserId,
        isAiGenerated: false,
        name: input.name,
        description: input.description ?? null,
        durationWeeks: input.durationWeeks ?? null,
      }).returning();

      if (input.sessions && input.sessions.length > 0) {
        await ctx.db.insert(workoutSessions).values(
          input.sessions.map((s) => ({
            programId: program.id,
            dayNumber: s.dayNumber,
            name: s.name ?? null,
            exercises: s.exercises.map((e) => ({
              exerciseId: e.exerciseId ?? "",
              name: e.name,
              sets: e.sets,
              reps: e.reps,
              tempo: e.tempo ?? "",
              restSeconds: e.restSeconds ?? 0,
            })),
          }))
        );
      }

      if (input.activate) {
        await ctx.db.insert(clientWorkoutAssignments).values({
          clientId: input.clientId,
          programId: program.id,
          startDate: input.startDate,
          status: "active",
        });
      }

      return { id: program.id };
    }),

  /**
   * List training programs assigned to a client, with sessions and
   * assignment status/startDate.
   */
  listTrainingPrograms: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "exercise", "read", ctx.userRole);

      const assignments = await ctx.db.query.clientWorkoutAssignments.findMany({
        where: eq(clientWorkoutAssignments.clientId, input.clientId),
      });
      if (assignments.length === 0) return [];

      const programIds = assignments.map((a) => a.programId);
      const programs = await ctx.db.query.workoutPrograms.findMany({
        where: inArray(workoutPrograms.id, programIds),
      });
      const sessions = await ctx.db.query.workoutSessions.findMany({
        where: inArray(workoutSessions.programId, programIds),
      });

      const programById = new Map(programs.map((p) => [p.id, p]));
      const sessionsByProgram = new Map<string, typeof sessions>();
      for (const s of sessions) {
        const arr = sessionsByProgram.get(s.programId) ?? [];
        arr.push(s);
        sessionsByProgram.set(s.programId, arr);
      }

      return assignments.map((a) => {
        const program = programById.get(a.programId);
        return {
          assignmentId: a.id,
          programId: a.programId,
          status: a.status,
          startDate: a.startDate,
          name: program?.name ?? null,
          description: program?.description ?? null,
          durationWeeks: program?.durationWeeks ?? null,
          isAiGenerated: program?.isAiGenerated ?? false,
          createdAt: program?.createdAt?.toISOString() ?? null,
          sessions: (sessionsByProgram.get(a.programId) ?? []).map((s) => ({
            id: s.id,
            dayNumber: s.dayNumber,
            name: s.name,
            exercises: s.exercises ?? [],
          })),
        };
      });
    }),

  /**
   * Update a client workout assignment's status.
   */
  updateAssignmentStatus: trainerProcedure
    .input(z.object({
      assignmentId: z.string(),
      clientId: z.string(),
      status: assignmentStatusEnum,
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "exercise", "write", ctx.userRole);

      const assignment = await ctx.db.query.clientWorkoutAssignments.findFirst({
        where: and(
          eq(clientWorkoutAssignments.id, input.assignmentId),
          eq(clientWorkoutAssignments.clientId, input.clientId),
        ),
      });
      if (!assignment) throw new TRPCError({ code: "NOT_FOUND", message: "Assignment not found" });

      const [updated] = await ctx.db.update(clientWorkoutAssignments)
        .set({ status: input.status })
        .where(eq(clientWorkoutAssignments.id, input.assignmentId))
        .returning();

      return updated;
    }),

  // ═══════════════ MEAL PLANS (diet) ═══════════════

  /**
   * Create a meal plan for a client.
   */
  createMealPlan: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      name: z.string().min(1).max(255),
      meals: z.any().optional(),
      macroTargets: macroTargetsInput.optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "diet", "write", ctx.userRole);

      const [plan] = await ctx.db.insert(mealPlans).values({
        trainerId: ctx.dbUserId,
        clientId: input.clientId,
        name: input.name,
        meals: input.meals ?? null,
        macroTargets: input.macroTargets ?? null,
        isAiGenerated: false,
        status: "active",
      }).returning();

      return { id: plan.id };
    }),

  /**
   * List a client's meal plans (most recent first).
   */
  listMealPlans: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "diet", "read", ctx.userRole);

      return ctx.db.query.mealPlans.findMany({
        where: eq(mealPlans.clientId, input.clientId),
        orderBy: desc(mealPlans.createdAt),
      });
    }),

  /**
   * Update a meal plan's status.
   */
  updateMealPlanStatus: trainerProcedure
    .input(z.object({
      mealPlanId: z.string(),
      clientId: z.string(),
      status: z.string().max(20),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "diet", "write", ctx.userRole);

      const plan = await ctx.db.query.mealPlans.findFirst({
        where: and(
          eq(mealPlans.id, input.mealPlanId),
          eq(mealPlans.clientId, input.clientId),
        ),
      });
      if (!plan) throw new TRPCError({ code: "NOT_FOUND", message: "Meal plan not found" });

      const [updated] = await ctx.db.update(mealPlans)
        .set({ status: input.status })
        .where(eq(mealPlans.id, input.mealPlanId))
        .returning();

      return updated;
    }),

  // ═══════════════ SLEEP MANUAL ENTRY (healthData) ═══════════════

  /**
   * Create a coach-entered sleep record for a client.
   */
  createSleepEntry: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      date: z.string(), // date (YYYY-MM-DD)
      bedtime: z.string().max(10).optional(),
      wakeTime: z.string().max(10).optional(),
      totalMinutes: z.number().optional(),
      deepMinutes: z.number().optional(),
      remMinutes: z.number().optional(),
      lightMinutes: z.number().optional(),
      awakeMinutes: z.number().optional(),
      score: z.number().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientAccess(ctx.db, ctx.dbUserId, input.clientId, "healthData", "write", ctx.userRole);

      const [entry] = await ctx.db.insert(sleepSessions).values({
        clientId: input.clientId,
        date: input.date,
        bedtime: input.bedtime ?? null,
        wakeTime: input.wakeTime ?? null,
        totalMinutes: input.totalMinutes ?? null,
        deepMinutes: input.deepMinutes ?? null,
        remMinutes: input.remMinutes ?? null,
        lightMinutes: input.lightMinutes ?? null,
        awakeMinutes: input.awakeMinutes ?? null,
        score: input.score ?? null,
        notes: input.notes ?? null,
        source: "coach",
      }).returning();

      return { id: entry.id };
    }),
});
