import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { workoutLogs, clientWorkoutAssignments, workoutPrograms } from "@/server/db/schema";
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

    return program ? { ...program, startDate: assignment.startDate } : null;
  }),
});
