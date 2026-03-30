import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { healthGoals, goalMilestones, goalCheckpoints } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";
import type { HealthGoal, GoalMilestone, GoalCheckpoint } from "@/lib/goals/types";

export const clientGoalsRouter = router({
  // List all goals (optionally filtered by status)
  list: clientProcedure
    .input(
      z.object({
        status: z.enum(["active", "paused", "completed", "abandoned", "all"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const status = input?.status ?? "all";

      const conditions = [eq(healthGoals.clientId, ctx.dbUserId)];
      if (status !== "all") {
        conditions.push(eq(healthGoals.status, status));
      }

      const goals = await ctx.db.query.healthGoals.findMany({
        where: and(...conditions),
        orderBy: desc(healthGoals.createdAt),
      });

      // Fetch milestones and checkpoints for all returned goals
      const goalIds = goals.map((g) => g.id);
      if (goalIds.length === 0) return [];

      const allMilestones = await ctx.db.query.goalMilestones.findMany({
        where: sql`${goalMilestones.goalId} = ANY(${goalIds})`,
        orderBy: goalMilestones.sortOrder,
      });

      const allCheckpoints = await ctx.db.query.goalCheckpoints.findMany({
        where: sql`${goalCheckpoints.goalId} = ANY(${goalIds})`,
        orderBy: goalCheckpoints.createdAt,
      });

      return goals.map((g): HealthGoal => ({
        id: g.id,
        clientId: g.clientId,
        category: g.category,
        title: g.title,
        description: g.description ?? "",
        target: {
          value: g.targetValue,
          unit: g.targetUnit,
          direction: g.targetDirection,
        },
        startValue: g.startValue,
        currentValue: g.currentValue,
        status: g.status,
        timeframe: g.timeframe,
        startDate: g.startDate,
        targetDate: g.targetDate,
        completedDate: g.completedDate,
        milestones: allMilestones
          .filter((m) => m.goalId === g.id)
          .map((m): GoalMilestone => ({
            id: m.id,
            label: m.label,
            targetValue: m.targetValue,
            reachedAt: m.reachedAt ? m.reachedAt.toISOString() : null,
            order: m.sortOrder,
          })),
        checkpoints: allCheckpoints
          .filter((c) => c.goalId === g.id)
          .map((c): GoalCheckpoint => ({
            id: c.id,
            date: c.createdAt.toISOString(),
            value: c.value,
            note: c.note ?? "",
            source: c.source as "manual" | "auto" | "import",
          })),
        createdAt: g.createdAt.toISOString(),
        updatedAt: g.updatedAt.toISOString(),
      }));
    }),

  // Get single goal
  get: clientProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const goal = await ctx.db.query.healthGoals.findFirst({
        where: and(eq(healthGoals.id, input.id), eq(healthGoals.clientId, ctx.dbUserId)),
      });
      if (!goal) return null;

      const milestones = await ctx.db.query.goalMilestones.findMany({
        where: eq(goalMilestones.goalId, goal.id),
        orderBy: goalMilestones.sortOrder,
      });

      const checkpoints = await ctx.db.query.goalCheckpoints.findMany({
        where: eq(goalCheckpoints.goalId, goal.id),
        orderBy: goalCheckpoints.createdAt,
      });

      const result: HealthGoal = {
        id: goal.id,
        clientId: goal.clientId,
        category: goal.category,
        title: goal.title,
        description: goal.description ?? "",
        target: { value: goal.targetValue, unit: goal.targetUnit, direction: goal.targetDirection },
        startValue: goal.startValue,
        currentValue: goal.currentValue,
        status: goal.status,
        timeframe: goal.timeframe,
        startDate: goal.startDate,
        targetDate: goal.targetDate,
        completedDate: goal.completedDate,
        milestones: milestones.map((m) => ({
          id: m.id,
          label: m.label,
          targetValue: m.targetValue,
          reachedAt: m.reachedAt ? m.reachedAt.toISOString() : null,
          order: m.sortOrder,
        })),
        checkpoints: checkpoints.map((c) => ({
          id: c.id,
          date: c.createdAt.toISOString(),
          value: c.value,
          note: c.note ?? "",
          source: c.source as "manual" | "auto" | "import",
        })),
        createdAt: goal.createdAt.toISOString(),
        updatedAt: goal.updatedAt.toISOString(),
      };

      return result;
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
      const now = new Date();
      const [goal] = await ctx.db
        .insert(healthGoals)
        .values({
          clientId: ctx.dbUserId,
          category: input.category as typeof healthGoals.$inferInsert.category,
          title: input.title,
          description: input.description,
          targetValue: input.targetValue,
          targetUnit: input.targetUnit,
          targetDirection: input.targetDirection,
          startValue: input.startValue,
          currentValue: input.startValue,
          status: "active",
          timeframe: input.timeframe,
          startDate: now.toISOString().split("T")[0],
          targetDate: input.targetDate,
          createdAt: now,
          updatedAt: now,
        })
        .returning();

      // Insert milestones
      if (input.milestones && input.milestones.length > 0) {
        await ctx.db.insert(goalMilestones).values(
          input.milestones.map((m, idx) => ({
            goalId: goal.id,
            label: m.label,
            targetValue: m.targetValue,
            sortOrder: idx,
          }))
        );
      }

      // Insert initial checkpoint
      await ctx.db.insert(goalCheckpoints).values({
        goalId: goal.id,
        value: input.startValue,
        note: "Starting value",
        source: "manual",
        createdAt: now,
      });

      return goal;
    }),

  // Add checkpoint
  addCheckpoint: clientProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        value: z.number(),
        note: z.string().optional().default(""),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify ownership
      const goal = await ctx.db.query.healthGoals.findFirst({
        where: and(eq(healthGoals.id, input.goalId), eq(healthGoals.clientId, ctx.dbUserId)),
      });
      if (!goal) throw new Error("Goal not found");

      const now = new Date();

      // Insert checkpoint
      await ctx.db.insert(goalCheckpoints).values({
        goalId: input.goalId,
        value: input.value,
        note: input.note,
        source: "manual",
        createdAt: now,
      });

      // Update goal's current value
      await ctx.db
        .update(healthGoals)
        .set({ currentValue: input.value, updatedAt: now })
        .where(eq(healthGoals.id, input.goalId));

      // Check and update milestones
      const milestones = await ctx.db.query.goalMilestones.findMany({
        where: eq(goalMilestones.goalId, input.goalId),
      });

      for (const m of milestones) {
        if (m.reachedAt) continue;
        let reached = false;
        if (goal.targetDirection === "decrease") {
          reached = input.value <= m.targetValue;
        } else {
          reached = input.value >= m.targetValue;
        }
        if (reached) {
          await ctx.db
            .update(goalMilestones)
            .set({ reachedAt: now })
            .where(eq(goalMilestones.id, m.id));
        }
      }

      return { success: true };
    }),

  // Update status
  updateStatus: clientProcedure
    .input(
      z.object({
        goalId: z.string().uuid(),
        status: z.enum(["active", "paused", "completed", "abandoned"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const now = new Date();
      await ctx.db
        .update(healthGoals)
        .set({
          status: input.status,
          completedDate: input.status === "completed" ? now.toISOString().split("T")[0] : undefined,
          updatedAt: now,
        })
        .where(and(eq(healthGoals.id, input.goalId), eq(healthGoals.clientId, ctx.dbUserId)));

      return { success: true };
    }),

  // Delete goal
  delete: clientProcedure
    .input(z.object({ goalId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .delete(healthGoals)
        .where(and(eq(healthGoals.id, input.goalId), eq(healthGoals.clientId, ctx.dbUserId)));
      return { success: true };
    }),
});
