"use client";

import { useState } from "react";
import type { HealthGoal, GoalTemplate, GoalStatus } from "@/lib/goals/types";
import { createGoalFromTemplate, addCheckpoint, summarizeGoals } from "@/lib/goals/engine";
import { GoalCard } from "./GoalCard";
import { GoalTemplateSelector } from "./GoalTemplateSelector";
import { GoalProgressRing } from "./GoalProgressRing";

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
              color="#D4AF37"
              label={`${summary.avgProgress}%`}
              sublabel="avg"
            />
          </div>
          <div className="kairos-card p-4 text-center">
            <div className="text-2xl font-bold text-emerald-400">{summary.activeGoals}</div>
            <div className="text-gray-500 text-xs">Active</div>
          </div>
          <div className="kairos-card p-4 text-center">
            <div className="text-2xl font-bold text-[#D4AF37]">{summary.completedGoals}</div>
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
                  ? "bg-[#D4AF37]/20 text-[#D4AF37]"
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
