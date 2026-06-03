import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { workoutLogs, clientWorkoutAssignments, workoutPrograms, workoutSessions } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientWorkoutsRouter = router({
  // List workout logs within a date range
  list: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.workoutLogs.findMany({
        where: and(
          eq(workoutLogs.clientId, ctx.dbUserId),
          gte(workoutLogs.date, input.startDate),
          lte(workoutLogs.date, input.endDate)
        ),
        orderBy: desc(workoutLogs.date),
      });

      return results.map((w) => ({
        id: w.id,
        sessionId: w.sessionId,
        date: w.date,
        exercisesCompleted: w.exercisesCompleted,
        notes: w.notes,
      }));
    }),

  // Workout stats for a date range
  stats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          totalWorkouts: sql<number>`count(*)`,
        })
        .from(workoutLogs)
        .where(
          and(
            eq(workoutLogs.clientId, ctx.dbUserId),
            gte(workoutLogs.date, input.startDate),
            lte(workoutLogs.date, input.endDate)
          )
        );

      return {
        totalWorkouts: Number(result[0]?.totalWorkouts ?? 0),
      };
    }),

  // Log a workout
  logWorkout: clientProcedure
    .input(
      z.object({
        sessionId: z.string().uuid().optional(),
        date: z.string().optional(),
        exercisesCompleted: z.array(
          z.object({
            exerciseId: z.string(),
            sets: z.array(
              z.object({
                weight: z.number(),
                reps: z.number(),
                rpe: z.number().optional(),
              })
            ),
          })
        ),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(workoutLogs)
        .values({
          clientId: ctx.dbUserId,
          sessionId: input.sessionId ?? null,
          date: input.date ?? new Date().toISOString().split("T")[0],
          exercisesCompleted: input.exercisesCompleted.map((ex) => ({
            ...ex,
            sets: ex.sets.map((s) => ({ ...s, rpe: s.rpe ?? 0 })),
          })),
          notes: input.notes ?? null,
        })
        .returning();

      return result[0];
    }),

  // Quick log a workout (simplified for UI modal without structured exercise data)
  quickLog: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        workoutType: z.enum(["strength", "cardio", "hiit", "yoga", "stretching", "sports", "other"]),
        durationMinutes: z.number().min(1).max(600),
        caloriesBurned: z.number().optional(),
        avgHeartRate: z.number().optional(),
        maxHeartRate: z.number().optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(workoutLogs)
        .values({
          clientId: ctx.dbUserId,
          sessionId: null,
          date: input.date ?? new Date().toISOString().split("T")[0],
          // Store quick log data as a single exercise entry.
          // Uses weight=0, reps=0, rpe=0 since quick logs aren't set-based.
          // Actual workout metadata is in the exerciseId prefix and notes.
          exercisesCompleted: [
            {
              exerciseId: `quick_log:${input.workoutType}`,
              sets: [{
                weight: 0,
                reps: 0,
                rpe: 0,
              }],
            },
          ] as typeof workoutLogs.$inferInsert["exercisesCompleted"],
          notes: JSON.stringify({
            type: input.workoutType,
            durationMinutes: input.durationMinutes,
            caloriesBurned: input.caloriesBurned ?? null,
            avgHeartRate: input.avgHeartRate ?? null,
            maxHeartRate: input.maxHeartRate ?? null,
            userNotes: input.notes ?? null,
          }),
        })
        .returning();

      return result[0];
    }),

  // Get active workout program assignment
  getActiveProgram: clientProcedure.query(async ({ ctx }) => {
    const assignment = await ctx.db.query.clientWorkoutAssignments.findFirst({
      where: and(
        eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
        eq(clientWorkoutAssignments.status, "active")
      ),
    });

    if (!assignment) return null;

    const program = await ctx.db.query.workoutPrograms.findFirst({
      where: eq(workoutPrograms.id, assignment.programId),
    });

    if (!program) return null;

    // Fetch sessions for this program
    const sessions = await ctx.db.query.workoutSessions.findMany({
      where: eq(workoutSessions.programId, program.id),
      orderBy: workoutSessions.dayNumber,
    });

    return { ...program, startDate: assignment.startDate, sessions };
  }),

  // List all programs assigned to this client
  listPrograms: clientProcedure.query(async ({ ctx }) => {
    const assignments = await ctx.db.query.clientWorkoutAssignments.findMany({
      where: eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
    });

    if (assignments.length === 0) return [];

    const programIds = assignments.map((a) => a.programId);
    const programs = await ctx.db.query.workoutPrograms.findMany({
      where: sql`${workoutPrograms.id} IN (${sql.join(programIds.map(id => sql`${id}`), sql`, `)})`,
      orderBy: desc(workoutPrograms.createdAt),
    });

    const assignmentMap = new Map(assignments.map((a) => [a.programId, a]));

    return programs.map((p) => ({
      ...p,
      status: assignmentMap.get(p.id)?.status ?? "inactive",
      startDate: assignmentMap.get(p.id)?.startDate ?? null,
      assignmentId: assignmentMap.get(p.id)?.id ?? null,
    }));
  }),

  // Get a specific program with all sessions
  getProgram: clientProcedure
    .input(z.object({ programId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Verify assignment
      const assignment = await ctx.db.query.clientWorkoutAssignments.findFirst({
        where: and(
          eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
          eq(clientWorkoutAssignments.programId, input.programId),
        ),
      });
      if (!assignment) return null;

      const program = await ctx.db.query.workoutPrograms.findFirst({
        where: eq(workoutPrograms.id, input.programId),
      });
      if (!program) return null;

      const sessions = await ctx.db.query.workoutSessions.findMany({
        where: eq(workoutSessions.programId, program.id),
        orderBy: workoutSessions.dayNumber,
      });

      return { ...program, sessions, status: assignment.status, startDate: assignment.startDate };
    }),

  // Create a new exercise program (from AI or manual)
  createProgram: clientProcedure
    .input(
      z.object({
        name: z.string().min(1),
        description: z.string().optional(),
        durationWeeks: z.number().optional(),
        isAiGenerated: z.boolean().optional(),
        schedule: z.record(z.string(), z.unknown()).optional(),
        sessions: z.array(
          z.object({
            dayNumber: z.number(),
            name: z.string(),
            exercises: z.array(
              z.object({
                exerciseId: z.string(),
                name: z.string().optional(),
                sets: z.number(),
                reps: z.string(),
                tempo: z.string().optional(),
                restSeconds: z.number().optional(),
                notes: z.string().optional(),
              })
            ),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Create program
      const [program] = await ctx.db.insert(workoutPrograms).values({
        trainerId: null,
        isAiGenerated: input.isAiGenerated ?? false,
        name: input.name,
        description: input.description,
        durationWeeks: input.durationWeeks,
        schedule: input.schedule,
      }).returning();

      // Create sessions
      if (input.sessions.length > 0) {
        await ctx.db.insert(workoutSessions).values(
          input.sessions.map((s) => ({
            programId: program.id,
            dayNumber: s.dayNumber,
            name: s.name,
            exercises: s.exercises.map((e) => ({
              exerciseId: e.exerciseId,
              sets: e.sets,
              reps: e.reps,
              tempo: e.tempo ?? "controlled",
              restSeconds: e.restSeconds ?? 60,
            })),
          }))
        );
      }

      // Deactivate any existing active assignment
      await ctx.db
        .update(clientWorkoutAssignments)
        .set({ status: "inactive" })
        .where(and(
          eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
          eq(clientWorkoutAssignments.status, "active"),
        ));

      // Create assignment (auto-activate)
      await ctx.db.insert(clientWorkoutAssignments).values({
        clientId: ctx.dbUserId,
        programId: program.id,
        startDate: new Date().toISOString().split("T")[0],
        status: "active",
      });

      return program;
    }),

  // Activate / deactivate a program
  setActiveProgram: clientProcedure
    .input(z.object({ programId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Deactivate all
      await ctx.db
        .update(clientWorkoutAssignments)
        .set({ status: "inactive" })
        .where(eq(clientWorkoutAssignments.clientId, ctx.dbUserId));

      // Activate the chosen one
      await ctx.db
        .update(clientWorkoutAssignments)
        .set({ status: "active", startDate: new Date().toISOString().split("T")[0] })
        .where(and(
          eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
          eq(clientWorkoutAssignments.programId, input.programId),
        ));

      return { success: true };
    }),

  // Delete a program
  deleteProgram: clientProcedure
    .input(z.object({ programId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const assignment = await ctx.db.query.clientWorkoutAssignments.findFirst({
        where: and(
          eq(clientWorkoutAssignments.clientId, ctx.dbUserId),
          eq(clientWorkoutAssignments.programId, input.programId),
        ),
      });
      if (!assignment) return { success: false };

      // Delete sessions, assignment, then program
      await ctx.db.delete(workoutSessions).where(eq(workoutSessions.programId, input.programId));
      await ctx.db.delete(clientWorkoutAssignments).where(eq(clientWorkoutAssignments.id, assignment.id));
      await ctx.db.delete(workoutPrograms).where(eq(workoutPrograms.id, input.programId));

      return { success: true };
    }),
});
