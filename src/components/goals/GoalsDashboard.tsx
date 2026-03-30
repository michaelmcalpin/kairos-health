"use client";

import { useState } from "react";
import type {
  HealthGoal,
  GoalTemplate,
  GoalStatus,
  GoalCheckpoint,
  GoalMilestone,
  GoalDirection,
  GoalProgress,
} from "@/lib/goals/types";
import { uid } from "@/lib/goals/types";
import { GoalCard } from "./GoalCard";
import { GoalTemplateSelector } from "./GoalTemplateSelector";
import { GoalProgressRing } from "./GoalProgressRing";

// ─── Inlined from @/lib/goals/engine ────────────────────────────────

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
  const threshold = Math.abs(first) * 0.02;
  if (Math.abs(diff) < threshold) return "stable";
  if (direction === "decrease") return diff < 0 ? "improving" : "declining";
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
    if (isImproving) streak++;
    else break;
  }
  return streak;
}

function projectCompletion(
  goal: HealthGoal,
  daysElapsed: number,
  percentComplete: number,
): string | null {
  if (percentComplete >= 100 || percentComplete <= 0 || daysElapsed <= 0) return null;
  const ratePerDay = percentComplete / daysElapsed;
  if (ratePerDay <= 0) return null;
  const daysToComplete = Math.ceil((100 - percentComplete) / ratePerDay);
  const projectedDate = new Date();
  projectedDate.setDate(projectedDate.getDate() + daysToComplete);
  return projectedDate.toISOString().split("T")[0];
}

function calculateProgress(goal: HealthGoal): GoalProgress {
  const { startValue, currentValue, target, milestones, checkpoints, startDate, targetDate } = goal;
  const totalRange = Math.abs(target.value - startValue);

  let percentComplete = 0;
  if (target.direction === "maintain") {
    const deviation = Math.abs(currentValue - target.value);
    const maxDeviation = Math.max(totalRange, Math.abs(startValue) * 0.1, 1);
    percentComplete = Math.max(0, 100 - (deviation / maxDeviation) * 100);
  } else if (totalRange > 0) {
    if (target.direction === "decrease") {
      if (currentValue <= target.value) percentComplete = 100;
      else if (currentValue >= startValue) percentComplete = 0;
      else percentComplete = ((startValue - currentValue) / (startValue - target.value)) * 100;
    } else if (target.direction === "increase") {
      if (currentValue >= target.value) percentComplete = 100;
      else if (currentValue <= startValue) percentComplete = 0;
      else percentComplete = ((currentValue - startValue) / (target.value - startValue)) * 100;
    } else {
      percentComplete = (Math.abs(currentValue - startValue) / totalRange) * 100;
    }
  }
  percentComplete = Math.max(0, Math.min(100, Math.round(percentComplete)));

  const trend = calculateTrend(checkpoints, target.direction);
  const now = new Date();
  const start = new Date(startDate);
  const daysElapsed = Math.max(0, Math.floor((now.getTime() - start.getTime()) / 86400000));
  const daysRemaining = targetDate
    ? Math.max(0, Math.floor((new Date(targetDate).getTime() - now.getTime()) / 86400000))
    : null;
  const milestonesReached = milestones.filter((m) => m.reachedAt !== null).length;
  const streak = calculateStreak(checkpoints, target.direction, target.value);
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

function checkMilestones(goal: HealthGoal): HealthGoal {
  const progress = calculateProgress(goal);
  const updatedMilestones = goal.milestones.map((m) => {
    if (m.reachedAt) return m;
    let reached = false;
    if (goal.target.direction === "decrease") {
      reached = goal.currentValue <= m.targetValue;
    } else {
      reached = goal.currentValue >= m.targetValue;
    }
    if (reached) return { ...m, reachedAt: new Date().toISOString() };
    return m;
  });

  const isComplete = progress.percentComplete >= 100;
  return {
    ...goal,
    milestones: updatedMilestones,
    status: isComplete && goal.status === "active" ? "completed" : goal.status,
    completedDate: isComplete && !goal.completedDate ? new Date().toISOString() : goal.completedDate,
    updatedAt: new Date().toISOString(),
  };
}

function addCheckpoint(
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

function createGoalFromTemplate(
  template: GoalTemplate,
  clientId: string,
  startValue: number,
  customTarget?: number,
): HealthGoal {
  const targetValue = customTarget ?? template.defaultTarget.value;
  const now = new Date().toISOString();

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

  let targetDate: string | null = null;
  const d = new Date();
  switch (template.timeframe) {
    case "weekly": d.setDate(d.getDate() + 7); break;
    case "monthly": d.setMonth(d.getMonth() + 1); break;
    case "quarterly": d.setMonth(d.getMonth() + 3); break;
    case "yearly": d.setFullYear(d.getFullYear() + 1); break;
    default: break;
  }
  if (template.timeframe !== "open_ended") {
    targetDate = d.toISOString().split("T")[0];
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
    checkpoints: [{ id: uid(), date: now, value: startValue, note: "Starting value", source: "manual" }],
    createdAt: now,
    updatedAt: now,
  };
}

interface GoalsSummary {
  totalGoals: number;
  activeGoals: number;
  completedGoals: number;
  avgProgress: number;
  totalMilestonesReached: number;
  longestStreak: number;
}

function summarizeGoals(goals: HealthGoal[]): GoalsSummary {
  const activeGoals = goals.filter((g) => g.status === "active");
  const completedGoals = goals.filter((g) => g.status === "completed");
  const progressValues = activeGoals.map((g) => calculateProgress(g).percentComplete);
  const avgProgress =
    progressValues.length > 0
      ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length)
      : 0;

  let totalMilestonesReached = 0;
  let longestStreak = 0;
  for (const goal of goals) {
    const progress = calculateProgress(goal);
    totalMilestonesReached += progress.milestonesReached;
    if (progress.streak > longestStreak) longestStreak = progress.streak;
  }

  return {
    totalGoals: goals.length,
    activeGoals: activeGoals.length,
    completedGoals: completedGoals.length,
    avgProgress,
    totalMilestonesReached,
    longestStreak,
  };
}

// ─── Component ──────────────────────────────────────────────────────

interface GoalsDashboardProps {
  initialGoals?: HealthGoal[];
  clientId?: string;
}

export function GoalsDashboard({ initialGoals = [], clientId = "demo" }: GoalsDashboardProps) {
  const [goals, setGoals] = useState<HealthGoal[]>(initialGoals);
  const [showTemplates, setShowTemplates] = useState(false);
  const [filterStatus, setFilterStatus] = useState<GoalStatus | "all">("all");

  const summary = summarizeGoals(goals);

  function handleCreateGoal(template: GoalTemplate, startValue: number, customTarget?: number) {
    const newGoal = createGoalFromTemplate(template, clientId, startValue, customTarget);
    setGoals((prev) => [newGoal, ...prev]);
    setShowTemplates(false);
  }

  function handleAddCheckpoint(goalId: string, value: number, note: string) {
    setGoals((prev) =>
      prev.map((g) => (g.id === goalId ? addCheckpoint(g, value, note) : g))
    );
  }

  function handlePause(goalId: string) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, status: "paused" as const, updatedAt: new Date().toISOString() } : g
      )
    );
  }

  function handleResume(goalId: string) {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, status: "active" as const, updatedAt: new Date().toISOString() } : g
      )
    );
  }

  const filteredGoals = filterStatus === "all"
    ? goals
    : goals.filter((g) => g.status === filterStatus);

  if (showTemplates) {
    return (
      <GoalTemplateSelector
        onSelect={handleCreateGoal}
        onCancel={() => setShowTemplates(false)}
      />
    );
  }

  return (
    <div>
      {/* Summary Stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
          <div className="kairos-card p-4 flex flex-col items-center">
            <GoalProgressRing
              percent={summary.avgProgress}
              size={64}
              strokeWidth={5}
              color="rgb(var(--k-accent))"
              label={`${summary.avgProgress}%`}
              sublabel="avg"
            />
          </div>
          <div className="kairos-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{summary.activeGoals}</div>
            <div className="text-gray-500 text-xs">Active</div>
          </div>
          <div className="kairos-card p-4 text-center">
            <div className="text-2xl font-bold text-kairos-gold">{summary.completedGoals}</div>
            <div className="text-gray-500 text-xs">Completed</div>
          </div>
          <div className="kairos-card p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">{summary.totalMilestonesReached}</div>
            <div className="text-gray-500 text-xs">Milestones</div>
          </div>
          <div className="kairos-card p-4 text-center">
            <div className="text-2xl font-bold text-purple-400">{summary.longestStreak}</div>
            <div className="text-gray-500 text-xs">Best Streak</div>
          </div>
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex gap-2">
          {(["all", "active", "completed", "paused"] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1 rounded-full text-xs transition ${
                filterStatus === status
                  ? "bg-kairos-gold/20 text-kairos-gold"
                  : "bg-gray-800 text-gray-500 hover:text-gray-300"
              }`}
            >
              {status === "all" ? "All" : status.charAt(0).toUpperCase() + status.slice(1)}
              {status !== "all" && (
                <span className="ml-1 text-gray-600">
                  ({goals.filter((g) => g.status === status).length})
                </span>
              )}
            </button>
          ))}
        </div>
        <button
          onClick={() => setShowTemplates(true)}
          className="kairos-btn-gold px-4 py-1.5 rounded-lg text-sm font-semibold transition hover:scale-105"
        >
          + New Goal
        </button>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <div className="kairos-card p-12 text-center">
          <p className="text-gray-500 mb-4">
            {goals.length === 0
              ? "No goals yet. Start by creating your first health goal."
              : "No goals match this filter."}
          </p>
          {goals.length === 0 && (
            <button
              onClick={() => setShowTemplates(true)}
              className="kairos-btn-gold px-6 py-2 rounded-lg font-semibold transition hover:scale-105"
            >
              Create Your First Goal
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {filteredGoals.map((goal) => (
            <GoalCard
              key={goal.id}
              goal={goal}
              onAddCheckpoint={handleAddCheckpoint}
              onPause={handlePause}
              onResume={handleResume}
            />
          ))}
        </div>
      )}
    </div>
  );
}
