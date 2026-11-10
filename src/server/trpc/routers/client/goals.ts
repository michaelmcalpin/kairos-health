import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import {
  healthGoals, goalMilestones, goalCheckpoints,
  bodyMeasurements, glucoseReadings, sleepSessions, activitySummaries,
} from "@/server/db/schema";
import { eq, and, desc, inArray, gte, isNotNull } from "drizzle-orm";
import type { HealthGoal, GoalMilestone, GoalCheckpoint } from "@/lib/goals/types";

type SeriesPoint = { date: string; value: number };

/**
 * Derive a goal's recent value series from the health data the client is
 * actually tracking, so progress reflects reality instead of only manual logs.
 * Returns points ascending (oldest→newest), capped, or [] when the category
 * has no auto-trackable source (nutrition, supplements, fasting, labs, custom).
 */
async function deriveGoalSeries(
  db: typeof import("@/server/db").db,
  clientId: string,
  category: string,
  targetUnit: string | null,
): Promise<SeriesPoint[]> {
  const since = new Date(Date.now() - 120 * 86400000);
  const sinceDate = since.toISOString().slice(0, 10);
  const cap = (pts: SeriesPoint[]) => pts.slice(-14);

  try {
    if (category === "weight" || category === "body_fat") {
      const col = category === "weight" ? bodyMeasurements.weightLbs : bodyMeasurements.bodyFatPct;
      const rows = await db.select({ date: bodyMeasurements.date, v: col }).from(bodyMeasurements)
        .where(and(eq(bodyMeasurements.clientId, clientId), isNotNull(col), gte(bodyMeasurements.date, sinceDate)))
        .orderBy(bodyMeasurements.date);
      return cap(rows.filter((r) => r.v != null).map((r) => ({ date: String(r.date), value: Number(r.v) })));
    }
    if (category === "activity") {
      const rows = await db.select({ date: activitySummaries.date, v: activitySummaries.steps }).from(activitySummaries)
        .where(and(eq(activitySummaries.clientId, clientId), isNotNull(activitySummaries.steps), gte(activitySummaries.date, sinceDate)))
        .orderBy(activitySummaries.date);
      return cap(rows.filter((r) => r.v != null).map((r) => ({ date: String(r.date), value: Number(r.v) })));
    }
    if (category === "sleep") {
      // Hours if the goal is expressed in hours; otherwise the 0–100 sleep score.
      const wantsHours = (targetUnit ?? "").toLowerCase().includes("h");
      const rows = await db.select({
        date: sleepSessions.date, mins: sleepSessions.totalMinutes, score: sleepSessions.score,
      }).from(sleepSessions)
        .where(and(eq(sleepSessions.clientId, clientId), gte(sleepSessions.date, sinceDate)))
        .orderBy(sleepSessions.date);
      const pts = rows
        .map((r) => {
          const val = wantsHours
            ? (r.mins != null ? +(r.mins / 60).toFixed(1) : null)
            : (r.score != null && r.score !== 0 ? r.score : null);
          return val != null ? { date: String(r.date), value: val } : null;
        })
        .filter((p): p is SeriesPoint => p !== null);
      return cap(pts);
    }
    if (category === "glucose") {
      // Daily average of readings (glucose goals are about the average, not one spike).
      const rows = await db.select({ ts: glucoseReadings.timestamp, v: glucoseReadings.valueMgdl }).from(glucoseReadings)
        .where(and(eq(glucoseReadings.clientId, clientId), gte(glucoseReadings.timestamp, since)))
        .orderBy(glucoseReadings.timestamp);
      const byDay = new Map<string, { sum: number; n: number }>();
      for (const r of rows) {
        if (r.v == null) continue;
        const day = new Date(r.ts as Date).toISOString().slice(0, 10);
        const acc = byDay.get(day) ?? { sum: 0, n: 0 };
        acc.sum += Number(r.v); acc.n += 1; byDay.set(day, acc);
      }
      const pts = Array.from(byDay.entries())
        .sort((a, b) => a[0].localeCompare(b[0]))
        .map(([date, acc]) => ({ date, value: Math.round(acc.sum / acc.n) }));
      return cap(pts);
    }
  } catch {
    return [];
  }
  return [];
}

/**
 * Overlay tracked-data progress onto a goal: set currentValue to the latest
 * tracked value and, when the goal has no manual checkpoints, seed its trend
 * from the tracked series so the chart and insights reflect real data.
 */
function applyDerivedProgress(goal: HealthGoal, series: SeriesPoint[]): HealthGoal {
  if (series.length === 0) return goal;
  const currentValue = series[series.length - 1].value;
  const checkpoints: GoalCheckpoint[] =
    goal.checkpoints.length > 0
      ? goal.checkpoints
      : series.map((p) => ({
          id: `auto:${goal.id}:${p.date}`,
          date: new Date(`${p.date}T12:00:00Z`).toISOString(),
          value: p.value,
          note: "",
          source: "auto" as const,
        }));
  return { ...goal, currentValue, checkpoints };
}

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
        where: inArray(goalMilestones.goalId, goalIds),
        orderBy: goalMilestones.sortOrder,
      });

      const allCheckpoints = await ctx.db.query.goalCheckpoints.findMany({
        where: inArray(goalCheckpoints.goalId, goalIds),
        orderBy: goalCheckpoints.createdAt,
      });

      const mapped = goals.map((g): HealthGoal => ({
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

      // Overlay progress derived from the client's tracked health data.
      return Promise.all(
        mapped.map(async (g) =>
          applyDerivedProgress(g, await deriveGoalSeries(ctx.db, ctx.dbUserId, g.category, g.target.unit)),
        ),
      );
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

      // Overlay progress derived from the client's tracked health data.
      const series = await deriveGoalSeries(ctx.db, ctx.dbUserId, result.category, result.target.unit);
      return applyDerivedProgress(result, series);
    }),

  // Create a new goal
  create: clientProcedure
    .input(
      z.object({
        category: z.enum(["glucose", "sleep", "weight", "body_fat", "activity", "nutrition", "supplements", "fasting", "labs", "custom"]),
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
      // One active goal per title (e.g. no two "Sleep 7+ Hours" goals).
      const dup = await ctx.db.query.healthGoals.findFirst({
        where: and(eq(healthGoals.clientId, ctx.dbUserId), eq(healthGoals.status, "active"), eq(healthGoals.title, input.title)),
      });
      if (dup) {
        throw new TRPCError({ code: "CONFLICT", message: `You already have an active "${input.title}" goal.` });
      }
      const now = new Date();
      const [goal] = await ctx.db
        .insert(healthGoals)
        .values({
          clientId: ctx.dbUserId,
          category: input.category,
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
      if (!goal) throw new TRPCError({ code: "NOT_FOUND", message: "Goal not found" });

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
