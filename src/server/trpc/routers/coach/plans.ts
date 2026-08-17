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
  muscleGroup: z.string().optional(),
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

// Reusable workout-template schemas. Templates are trainer-owned
// workoutPrograms with NO client assignment; exercises carry muscleGroup.
const templateExerciseInput = z.object({
  name: z.string().min(1).max(255),
  muscleGroup: z.string().optional(),
  sets: z.number(),
  reps: z.string(),
  tempo: z.string().optional(),
  restSeconds: z.number().optional(),
});

const templateSessionInput = z.object({
  name: z.string().max(255).optional(),
  exercises: z.array(templateExerciseInput),
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
              muscleGroup: e.muscleGroup ?? "",
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

  // ═══════════════ WORKOUT TEMPLATES (exercise) ═══════════════
  // Reusable routines a coach builds once and applies to one or many clients.
  // A template is a trainer-owned workoutPrograms row with sessions but no
  // clientWorkoutAssignments until explicitly assigned.

  /**
   * Create a reusable workout template (no client assignment).
   */
  createWorkoutTemplate: trainerProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      description: z.string().optional(),
      durationWeeks: z.number().optional(),
      sessions: z.array(templateSessionInput),
    }))
    .mutation(async ({ ctx, input }) => {
      const [program] = await ctx.db.insert(workoutPrograms).values({
        trainerId: ctx.dbUserId,
        isAiGenerated: false,
        name: input.name,
        description: input.description ?? null,
        durationWeeks: input.durationWeeks ?? null,
      }).returning();

      if (input.sessions.length > 0) {
        await ctx.db.insert(workoutSessions).values(
          input.sessions.map((s, i) => ({
            programId: program.id,
            dayNumber: i + 1,
            name: s.name ?? null,
            exercises: s.exercises.map((e) => ({
              exerciseId: "",
              name: e.name,
              muscleGroup: e.muscleGroup ?? "",
              sets: e.sets,
              reps: e.reps,
              tempo: e.tempo ?? "",
              restSeconds: e.restSeconds ?? 0,
            })),
          }))
        );
      }

      return { id: program.id };
    }),

  /**
   * List all of this coach's workout templates with aggregate counts.
   * Batched — one query for programs, one for sessions, one for assignments.
   */
  listWorkoutTemplates: trainerProcedure.query(async ({ ctx }) => {
    const programs = await ctx.db.query.workoutPrograms.findMany({
      where: eq(workoutPrograms.trainerId, ctx.dbUserId),
      orderBy: desc(workoutPrograms.createdAt),
    });
    if (programs.length === 0) return [];

    const programIds = programs.map((p) => p.id);
    const [sessions, assignments] = await Promise.all([
      ctx.db.query.workoutSessions.findMany({
        where: inArray(workoutSessions.programId, programIds),
      }),
      ctx.db.query.clientWorkoutAssignments.findMany({
        where: inArray(clientWorkoutAssignments.programId, programIds),
      }),
    ]);

    const sessionCount = new Map<string, number>();
    const exerciseCount = new Map<string, number>();
    for (const s of sessions) {
      sessionCount.set(s.programId, (sessionCount.get(s.programId) ?? 0) + 1);
      exerciseCount.set(s.programId, (exerciseCount.get(s.programId) ?? 0) + (s.exercises?.length ?? 0));
    }
    const assignedCount = new Map<string, number>();
    for (const a of assignments) {
      assignedCount.set(a.programId, (assignedCount.get(a.programId) ?? 0) + 1);
    }

    return programs.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      durationWeeks: p.durationWeeks,
      createdAt: p.createdAt.toISOString(),
      sessionCount: sessionCount.get(p.id) ?? 0,
      exerciseCount: exerciseCount.get(p.id) ?? 0,
      assignedClientCount: assignedCount.get(p.id) ?? 0,
    }));
  }),

  /**
   * Get a single template (owned by this coach) with full sessions/exercises.
   */
  getWorkoutTemplate: trainerProcedure
    .input(z.object({ programId: z.string() }))
    .query(async ({ ctx, input }) => {
      const program = await ctx.db.query.workoutPrograms.findFirst({
        where: and(
          eq(workoutPrograms.id, input.programId),
          eq(workoutPrograms.trainerId, ctx.dbUserId),
        ),
      });
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const sessions = await ctx.db.query.workoutSessions.findMany({
        where: eq(workoutSessions.programId, program.id),
        orderBy: workoutSessions.dayNumber,
      });

      return {
        id: program.id,
        name: program.name,
        description: program.description,
        durationWeeks: program.durationWeeks,
        isAiGenerated: program.isAiGenerated ?? false,
        createdAt: program.createdAt.toISOString(),
        sessions: sessions.map((s) => ({
          id: s.id,
          dayNumber: s.dayNumber,
          name: s.name,
          exercises: s.exercises ?? [],
        })),
      };
    }),

  /**
   * Update a template. When `sessions` is provided the program's sessions are
   * fully replaced (deleted, then re-inserted with recomputed dayNumbers).
   */
  updateWorkoutTemplate: trainerProcedure
    .input(z.object({
      programId: z.string(),
      name: z.string().min(1).max(255).optional(),
      description: z.string().optional(),
      durationWeeks: z.number().optional(),
      sessions: z.array(templateSessionInput).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.query.workoutPrograms.findFirst({
        where: and(
          eq(workoutPrograms.id, input.programId),
          eq(workoutPrograms.trainerId, ctx.dbUserId),
        ),
      });
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      const updates: Partial<typeof workoutPrograms.$inferInsert> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      if (input.durationWeeks !== undefined) updates.durationWeeks = input.durationWeeks;
      if (Object.keys(updates).length > 0) {
        await ctx.db.update(workoutPrograms).set(updates).where(eq(workoutPrograms.id, program.id));
      }

      if (input.sessions !== undefined) {
        await ctx.db.delete(workoutSessions).where(eq(workoutSessions.programId, program.id));
        if (input.sessions.length > 0) {
          await ctx.db.insert(workoutSessions).values(
            input.sessions.map((s, i) => ({
              programId: program.id,
              dayNumber: i + 1,
              name: s.name ?? null,
              exercises: s.exercises.map((e) => ({
                exerciseId: "",
                name: e.name,
                muscleGroup: e.muscleGroup ?? "",
                sets: e.sets,
                reps: e.reps,
                tempo: e.tempo ?? "",
                restSeconds: e.restSeconds ?? 0,
              })),
            }))
          );
        }
      }

      return { id: program.id };
    }),

  /**
   * Delete a template and everything hanging off it. Order matters for FKs:
   * sessions → assignments → program.
   */
  deleteWorkoutTemplate: trainerProcedure
    .input(z.object({ programId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.query.workoutPrograms.findFirst({
        where: and(
          eq(workoutPrograms.id, input.programId),
          eq(workoutPrograms.trainerId, ctx.dbUserId),
        ),
      });
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      await ctx.db.delete(workoutSessions).where(eq(workoutSessions.programId, program.id));
      await ctx.db.delete(clientWorkoutAssignments).where(eq(clientWorkoutAssignments.programId, program.id));
      await ctx.db.delete(workoutPrograms).where(eq(workoutPrograms.id, program.id));

      return { success: true };
    }),

  /**
   * Apply a template to one or many clients. Clients the coach lacks exercise
   * write access to, or who already have an active assignment of this program,
   * are skipped (with a reason) rather than failing the whole batch.
   */
  assignTemplateToClients: trainerProcedure
    .input(z.object({
      programId: z.string(),
      clientIds: z.array(z.string()).min(1),
      startDate: z.string(), // date (YYYY-MM-DD)
    }))
    .mutation(async ({ ctx, input }) => {
      const program = await ctx.db.query.workoutPrograms.findFirst({
        where: and(
          eq(workoutPrograms.id, input.programId),
          eq(workoutPrograms.trainerId, ctx.dbUserId),
        ),
      });
      if (!program) throw new TRPCError({ code: "NOT_FOUND", message: "Template not found" });

      let assigned = 0;
      const skipped: Array<{ clientId: string; reason: string }> = [];

      for (const clientId of input.clientIds) {
        // Access guard per-client — collect failures instead of throwing.
        try {
          await verifyCoachClientAccess(ctx.db, ctx.dbUserId, clientId, "exercise", "write", ctx.userRole);
        } catch {
          skipped.push({ clientId, reason: "no_access" });
          continue;
        }

        const existing = await ctx.db.query.clientWorkoutAssignments.findFirst({
          where: and(
            eq(clientWorkoutAssignments.clientId, clientId),
            eq(clientWorkoutAssignments.programId, input.programId),
            eq(clientWorkoutAssignments.status, "active"),
          ),
        });
        if (existing) {
          skipped.push({ clientId, reason: "already_assigned" });
          continue;
        }

        await ctx.db.insert(clientWorkoutAssignments).values({
          clientId,
          programId: input.programId,
          startDate: input.startDate,
          status: "active",
        });
        assigned++;
      }

      return { assigned, skipped };
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
