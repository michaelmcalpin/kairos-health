// ─── Goal Progress Engine ───────────────────────────────────────
// Calculates progress, streaks, projections, and milestone tracking

import type {
  HealthGoal,
  GoalProgress,
  GoalCheckpoint,
  GoalMilestone,
  GoalDirection,
  GoalTemplate,
} from "./types";
import { uid } from "./types";

// ─── Progress Calculation ───────────────────────────────────────

export function calculateProgress(goal: HealthGoal): GoalProgress {
  const { startValue, currentValue, target, milestones, checkpoints, startDate, targetDate } = goal;
  const totalRange = Math.abs(target.value - startValue);
  const currentRange = Math.abs(currentValue - startValue);

  // Percent complete depends on direction
  let percentComplete = 0;
  if (target.direction === "maintain") {
    // Maintain: 100% when at target, decreases with deviation
    const deviation = Math.abs(currentValue - target.value);
    const maxDeviation = Math.max(totalRange, Math.abs(startValue) * 0.1, 1);
    percentComplete = Math.max(0, 100 - (deviation / maxDeviation) * 100);
  } else if (totalRange > 0) {
    if (target.direction === "decrease") {
      // Lower is better
      if (currentValue <= target.value) {
        percentComplete = 100;
      } else if (currentValue >= startValue) {
        percentComplete = 0;
      } else {
        percentComplete = ((startValue - currentValue) / (startValue - target.value)) * 100;
      }
    } else if (target.direction === "increase") {
      // Higher is better
      if (currentValue >= target.value) {
        percentComplete = 100;
      } else if (currentValue <= startValue) {
        percentComplete = 0;
      } else {
        percentComplete = ((currentValue - startValue) / (target.value - startValue)) * 100;
      }
    } else {
      // "reach" — same as increase
      percentComplete = (currentRange / totalRange) * 100;
    }
  }

  percentComplete = Math.max(0, Math.min(100, Math.round(percentComplete)));

  // Trend from last 3 checkpoints
  const trend = calculateTrend(checkpoints, target.direction);

  // Days
  const now = new Date();
  const start = new Date(startDate);
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  const daysRemaining = targetDate
    ? Math.max(0, Math.floor((new Date(targetDate).getTime() - now.getTime()) / 86400000))
    : null;

  // Milestones reached
  const milestonesReached = milestones.filter((m) => m.reachedAt !== null).length;

  // Streak
  const streak = calculateStreak(checkpoints, target.direction, target.value);

  // Projected completion
  const projectedCompletion = projectCompletion(goal, daysElapsed, percentComplete);

  return {
    percentComplete,
    currentValue,
    startValue,
    targetValue: target.value,
    direction: target.direction,
    trend,
    daysRemaining,
    daysElapsed,
    milestonesReached,
    totalMilestones: milestones.length,
    streak,
    projectedCompletion,
  };
}

function calculateTrend(
  checkpoints: GoalCheckpoint[],
  direction: GoalDirection,
): "improving" | "declining" | "stable" {
  if (checkpoints.length < 2) return "stable";

  const sorted = [...checkpoints].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );
  const recent = sorted.slice(-3);
  const first = recent[0].value;
  const last = recent[recent.length - 1].value;
  const diff = last - first;

  const threshold = Math.abs(first) * 0.02; // 2% change threshold
  if (Math.abs(diff) < threshold) return "stable";

  if (direction === "decrease") {
    return diff < 0 ? "improving" : "declining";
  }
  // increase, maintain, reach
  return diff > 0 ? "improving" : "declining";
}

function calculateStreak(
  checkpoints: GoalCheckpoint[],
  direction: GoalDirection,
  targetValue: number,
): number {
  if (checkpoints.length < 2) return 0;

  const sorted = [...checkpoints].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
  );

  let streak = 0;
  for (let i = 0; i < sorted.length - 1; i++) {
    const current = sorted[i].value;
    const previous = sorted[i + 1].value;
    const isImproving =
      direction === "decrease"
        ? current <= previous
        : direction === "maintain"
          ? Math.abs(current - targetValue) <= Math.abs(previous - targetValue)
          : current >= previous;

    if (isImproving) {
      streak++;
    } else {
      break;
    }
  }

  return streak;
}

function projectCompletion(
  goal: HealthGoal,
  daysElapsed: number,
  percentComplete: number,
): string | null {
  if (percentComplete >= 100) return null;
  if (percentComplete <= 0 || daysElapsed <= 0) return null;

  const ratePerDay = percentComplete / daysElapsed;
  if (ratePerDay <= 0) return null;

  const remainingPercent = 100 - percentComplete;
  const daysToComplete = Math.ceil(remainingPercent / ratePerDay);

  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + daysToComplete);
  return projectedDate.toISOString().split("T")[0];
}

// ─── Milestone Management ───────────────────────────────────────

export function checkMilestones(goal: HealthGoal): HealthGoal {
  const progress = calculateProgress(goal);
  const updatedMilestones = goal.milestones.map((m) => {
    if (m.reachedAt) return m; // already reached

    // For decrease goals, check if current is below milestone
    let reached = false;
    if (goal.target.direction === "decrease") {
      reached = goal.currentValue <= m.targetValue;
    } else {
      reached = goal.currentValue >= m.targetValue;
    }

    if (reached) {
      return { ...m, reachedAt: new Date().toISOString() };
    }
    return m;
  });

  // Check if goal itself is completed
  const isComplete = progress.percentComplete >= 100;

  return {
    ...goal,
    milestones: updatedMilestones,
    status: isComplete && goal.status === "active" ? "completed" : goal.status,
    completedDate: isComplete && !goal.completedDate ? new Date().toISOString() : goal.completedDate,
    updatedAt: new Date().toISOString(),
  };
}

export function addCheckpoint(
  goal: HealthGoal,
  value: number,
  note: string = "",
  source: GoalCheckpoint["source"] = "manual",
): HealthGoal {
  const checkpoint: GoalCheckpoint = {
    id: uid(),
    date: new Date().toISOString(),
    value,
    note,
    source,
  };

  const updated: HealthGoal = {
    ...goal,
    currentValue: value,
    checkpoints: [...goal.checkpoints, checkpoint],
    updatedAt: new Date().toISOString(),
  };

  return checkMilestones(updated);
}

// ─── Goal Creation from Template ────────────────────────────────

export function createGoalFromTemplate(
  template: GoalTemplate,
  clientId: string,
  startValue: number,
  customTarget?: number,
  customTargetDate?: string,
): HealthGoal {
  const targetValue = customTarget ?? template.defaultTarget.value;
  const now = new Date().toISOString();

  // Generate milestones from template percentages
  const milestones: GoalMilestone[] = template.suggestedMilestones.map((sm, idx) => {
    let milestoneValue: number;
    if (template.defaultTarget.direction === "decrease") {
      milestoneValue = startValue - ((startValue - targetValue) * sm.percent) / 100;
    } else {
      milestoneValue = startValue + ((targetValue - startValue) * sm.percent) / 100;
    }

    return {
      id: uid(),
      label: sm.label,
      targetValue: Math.round(milestoneValue * 10) / 10,
      reachedAt: null,
      order: idx,
    };
  });

  // Calculate target date from timeframe
  let targetDate: string | null = null;
  if (customTargetDate) {
    targetDate = customTargetDate;
  } else {
    const d = new Date();
    switch (template.timeframe) {
      case "weekly":
        d.setDate(d.getDate() + 7);
        break;
      case "monthly":
        d.setMonth(d.getMonth() + 1);
        break;
      case "quarterly":
        d.setMonth(d.getMonth() + 3);
        break;
      case "yearly":
        d.setFullYear(d.getFullYear() + 1);
        break;
      default:
        break;
    }
    if (template.timeframe !== "open_ended") {
      targetDate = d.toISOString().split("T")[0];
    }
  }

  return {
    id: uid(),
    clientId,
    category: template.category,
    title: template.title,
    description: template.description,
    target: { ...template.defaultTarget, value: targetValue },
    startValue,
    currentValue: startValue,
    status: "active",
    timeframe: template.timeframe,
    startDate: now.split("T")[0],
    targetDate,
    completedDate: null,
    milestones,
    checkpoints: [
      {
        id: uid(),
        date: now,
        value: startValue,
        note: "Starting value",
        source: "manual",
      },
    ],
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Aggregate Stats ────────────────────────────────────────────

export interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  totalMilestonesReached: number;
  longestStreak: number;
  categoryCounts: Record<string, number>;
}

export function summarizeGoals(goals: HealthGoal[]): GoalsSummary {
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");

  const progressValues = activeGoals.map((g) => calculateProgress(g).percentComplete);
  const avgProgress =
    progressValues.length > 0
      ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
      : 0;

  let totalMilestonesReached = 0;
  let longestStreak = 0;
  const categoryCounts: Record<string, number> = {};

  for (const goal of goals) {
    const progress = calculateProgress(goal);
    totalMilestonesReached += progress.milestonesReached;
    if (progress.streak > longestStreak) longestStreak = progress.streak;
    categoryCounts[goal.category] = (categoryCounts[goal.category] || 0) + 1;
  }

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    avgProgress,
    totalMilestonesReached,
    longestStreak,
    categoryCounts,
  };
}
