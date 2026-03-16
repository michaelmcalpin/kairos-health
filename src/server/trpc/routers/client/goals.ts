import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import type { HealthGoal } from "@/lib/goals/types";

// In-memory store (production would use DB)
const goalsStore = new Map<string, HealthGoal[]>();

function getUserGoals(userId: string): HealthGoal[] {
  return goalsStore.get(userId) ?? [];
}

function setUserGoals(userId: string, goals: HealthGoal[]): void {
  goalsStore.set(userId, goals);
}

export const clientGoalsRouter = router({
  // List all goals
  list: clientProcedure
    .input(
      z.object({
        status: z.enum(["active", "paused", "completed", "abandoned", "all"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const allGoals = getUserGoals(ctx.dbUserId);
      const status = input?.status ?? "all";
      if (status === "all") return allGoals;
      return allGoals.filter((g) => g.status === status);
    }),

  // Get single goal
  get: clientProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      const goals = getUserGoals(ctx.dbUserId);
      return goals.find((g) => g.id === input.id) ?? null;
    }),

  // Create a new goal
  create: clientProcedure
    .input(
      z.object({
        category: z.string(),
        title: z.string().min(1),
        description: z.string(),
        targetValue: z.number(),
        targetUnit: z.string(),
        targetDirection: z.enum(["increase", "decrease", "maintain", "reach"]),
        startValue: z.number(),
        timeframe: z.enum(["weekly", "monthly", "quarterly", "yearly", "open_ended"]),
        targetDate: z.string().nullable(),
        milestones: z.array(
          z.object({
            label: z.string(),
            targetValue: z.number(),
          })
        ).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const id = `goal_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
      const now = new Date().toISOString();

      const goal: HealthGoal = {
        id,
        clientId: ctx.dbUserId,
        category: input.category as HealthGoal["category"],
        title: input.title,
        description: input.description,
        target: {
          value: input.targetValue,
          unit: input.targetUnit,
          direction: input.targetDirection,
        },
        startValue: input.startValue,
        currentValue: input.startValue,
        status: "active",
        timeframe: input.timeframe,
        startDate: now.split("T")[0],
        targetDate: input.targetDate,
        completedDate: null,
        milestones: (input.milestones ?? []).map((m, idx) => ({
          id: `ms_${Date.now().toString(36)}_${idx}`,
          label: m.label,
          targetValue: m.targetValue,
          reachedAt: null,
          order: idx,
        })),
        checkpoints: [
          {
            id: `cp_${Date.now().toString(36)}`,
            date: now,
            value: input.startValue,
            note: "Starting value",
            source: "manual",
          },
        ],
        createdAt: now,
        updatedAt: now,
      };

      const goals = getUserGoals(ctx.dbUserId);
      setUserGoals(ctx.dbUserId, [goal, ...goals]);
      return goal;
    }),

  // Add checkpoint
  addCheckpoint: clientProcedure
    .input(
      z.object({
        goalId: z.string(),
        value: z.number(),
        note: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goals = getUserGoals(ctx.dbUserId);
      const goalIdx = goals.findIndex((g) => g.id === input.goalId);
      if (goalIdx === -1) throw new Error("Goal not found");

      const now = new Date().toISOString();
      const goal = goals[goalIdx];
      const checkpoint = {
        id: `cp_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`,
        date: now,
        value: input.value,
        note: input.note,
        source: "manual" as const,
      };

      goals[goalIdx] = {
        ...goal,
        currentValue: input.value,
        checkpoints: [...goal.checkpoints, checkpoint],
        updatedAt: now,
      };

      setUserGoals(ctx.dbUserId, goals);
      return goals[goalIdx];
    }),

  // Update status
  updateStatus: clientProcedure
    .input(
      z.object({
        goalId: z.string(),
        status: z.enum(["active", "paused", "completed", "abandoned"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const goals = getUserGoals(ctx.dbUserId);
      const goalIdx = goals.findIndex((g) => g.id === input.goalId);
      if (goalIdx === -1) throw new Error("Goal not found");

      goals[goalIdx] = {
        ...goals[goalIdx],
        status: input.status,
        completedDate: input.status === "completed" ? new Date().toISOString() : goals[goalIdx].completedDate,
        updatedAt: new Date().toISOString(),
      };

      setUserGoals(ctx.dbUserId, goals);
      return goals[goalIdx];
    }),

  // Delete goal
  delete: clientProcedure
    .input(z.object({ goalId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const goals = getUserGoals(ctx.dbUserId);
      setUserGoals(ctx.dbUserId, goals.filter((g) => g.id !== input.goalId));
      return { success: true };
    }),
});
