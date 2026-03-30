"use client";

import { useState } from "react";
import type { HealthGoal, GoalProgress, GoalCheckpoint, GoalDirection } from "@/lib/goals/types";
import { useThemeColors } from "@/lib/theme";
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

// ─── Component ──────────────────────────────────────────────────────

interface GoalCardProps {
  goal: HealthGoal;
  onAddCheckpoint?: (goalId: string, value: number, note: string) => void;
  onPause?: (goalId: string) => void;
  onResume?: (goalId: string) => void;
}

const getStatusColors = (accentColor: string): Record<string, string> => ({
  active: "#10B981",
  paused: "#F59E0B",
  completed: accentColor,
  abandoned: "#6B7280",
});

const TREND_ICONS: Record<string, string> = {
  improving: "↑",
  declining: "↓",
  stable: "→",
};

const TREND_COLORS: Record<string, string> = {
  improving: "#10B981",
  declining: "#EF4444",
  stable: "#6B7280",
};

export function GoalCard({ goal, onAddCheckpoint, onPause, onResume }: GoalCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [checkpointValue, setCheckpointValue] = useState("");
  const [checkpointNote, setCheckpointNote] = useState("");
  const colors = useThemeColors();

  const progress = calculateProgress(goal);
  const progressColor = progress.percentComplete >= 80
    ? "#10B981"
    : progress.percentComplete >= 50
      ? `rgb(${colors.accent})`
      : progress.percentComplete >= 25
        ? "#F59E0B"
        : "#EF4444";

  const STATUS_COLORS = getStatusColors(`rgb(${colors.accent})`);

  function handleSubmitCheckpoint() {
    const val = parseFloat(checkpointValue);
    if (isNaN(val)) return;
    onAddCheckpoint?.(goal.id, val, checkpointNote);
    setCheckpointValue("");
    setCheckpointNote("");
  }

  return (
    <div className="kairos-card p-5 transition-all hover:border-gray-600">
      <div className="flex items-start gap-4">
        {/* Progress Ring */}
        <GoalProgressRing
          percent={progress.percentComplete}
          size={80}
          strokeWidth={6}
          color={progressColor}
        />

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h3 className="font-heading font-semibold text-white text-sm truncate">
              {goal.title}
            </h3>
            <span
              className="px-2 py-0.5 rounded-full text-xs font-medium"
              style={{
                backgroundColor: `${STATUS_COLORS[goal.status]}15`,
                color: STATUS_COLORS[goal.status],
              }}
            >
              {goal.status}
            </span>
          </div>

          <p className="text-gray-500 text-xs mb-2 truncate">{goal.description}</p>

          {/* Metrics Row */}
          <div className="flex items-center gap-4 text-xs">
            <div>
              <span className="text-gray-600">Current: </span>
              <span className="text-white font-semibold">
                {goal.currentValue} {goal.target.unit}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Target: </span>
              <span className="text-kairos-gold font-semibold">
                {goal.target.value} {goal.target.unit}
              </span>
            </div>
            <div className="flex items-center gap-1">
              <span style={{ color: TREND_COLORS[progress.trend] }}>
                {TREND_ICONS[progress.trend]}
              </span>
              <span style={{ color: TREND_COLORS[progress.trend] }} className="capitalize">
                {progress.trend}
              </span>
            </div>
            {progress.streak > 0 && (
              <div className="text-amber-400">
                {progress.streak} streak
              </div>
            )}
          </div>

          {/* Milestones Mini */}
          {goal.milestones.length > 0 && (
            <div className="flex gap-1 mt-2">
              {goal.milestones.map((m) => (
                <div
                  key={m.id}
                  className="w-2 h-2 rounded-full"
                  title={`${m.label}${m.reachedAt ? " ✓" : ""}`}
                  style={{
                    backgroundColor: m.reachedAt ? "rgb(var(--k-accent))" : "rgba(55, 65, 81, 0.5)",
                  }}
                />
              ))}
            </div>
          )}
        </div>

        {/* Expand Toggle */}
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-white transition p-1"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
          >
            <path d="M4 6L8 10L12 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="mt-4 pt-4 border-t border-gray-800">
          {/* Timeline Info */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="text-center">
              <div className="text-lg font-bold text-white">{progress.daysElapsed}</div>
              <div className="text-gray-600 text-xs">Days Elapsed</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {progress.daysRemaining !== null ? progress.daysRemaining : "—"}
              </div>
              <div className="text-gray-600 text-xs">Days Left</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-kairos-gold">
                {progress.milestonesReached}/{progress.totalMilestones}
              </div>
              <div className="text-gray-600 text-xs">Milestones</div>
            </div>
            <div className="text-center">
              <div className="text-lg font-bold text-white">
                {progress.projectedCompletion ?? "—"}
              </div>
              <div className="text-gray-600 text-xs">Projected</div>
            </div>
          </div>

          {/* Milestones List */}
          {goal.milestones.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Milestones</h4>
              <div className="space-y-1">
                {goal.milestones.map((m) => (
                  <div
                    key={m.id}
                    className="flex items-center gap-2 text-xs"
                  >
                    <div
                      className={`w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
                        m.reachedAt ? "bg-kairos-gold/20" : "bg-gray-800"
                      }`}
                    >
                      {m.reachedAt && (
                        <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                          <path d="M1.5 4L3.5 6L6.5 2" stroke="rgb(var(--k-accent))" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </div>
                    <span className={m.reachedAt ? "text-kairos-gold" : "text-gray-500"}>
                      {m.label}
                    </span>
                    <span className="text-gray-700">
                      ({m.targetValue} {goal.target.unit})
                    </span>
                    {m.reachedAt && (
                      <span className="text-gray-700 ml-auto">
                        {new Date(m.reachedAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Checkpoints */}
          {goal.checkpoints.length > 0 && (
            <div className="mb-4">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                Recent Entries ({goal.checkpoints.length})
              </h4>
              <div className="space-y-1">
                {[...goal.checkpoints]
                  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                  .slice(0, 5)
                  .map((cp) => (
                    <div key={cp.id} className="flex items-center gap-2 text-xs">
                      <span className="text-gray-600 w-20">
                        {new Date(cp.date).toLocaleDateString()}
                      </span>
                      <span className="text-white font-semibold">
                        {cp.value} {goal.target.unit}
                      </span>
                      {cp.note && <span className="text-gray-600 truncate">— {cp.note}</span>}
                      <span className="text-gray-700 ml-auto capitalize">{cp.source}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Add Checkpoint Form */}
          {goal.status === "active" && onAddCheckpoint && (
            <div className="pt-3 border-t border-gray-800">
              <h4 className="text-xs text-gray-500 uppercase tracking-wider mb-2">Log Progress</h4>
              <div className="flex gap-2">
                <input
                  type="number"
                  value={checkpointValue}
                  onChange={(e) => setCheckpointValue(e.target.value)}
                  placeholder={`Value (${goal.target.unit})`}
                  className="flex-1 px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:border-kairos-gold focus:outline-none"
                />
                <input
                  type="text"
                  value={checkpointNote}
                  onChange={(e) => setCheckpointNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="flex-1 px-3 py-1.5 rounded bg-gray-800 border border-gray-700 text-white text-sm focus:border-kairos-gold focus:outline-none"
                />
                <button
                  onClick={handleSubmitCheckpoint}
                  disabled={!checkpointValue}
                  className="px-4 py-1.5 rounded kairos-btn-gold text-sm font-semibold disabled:opacity-50"
                >
                  Log
                </button>
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 mt-3">
            {goal.status === "active" && onPause && (
              <button
                onClick={() => onPause(goal.id)}
                className="px-3 py-1 rounded text-xs text-amber-400 border border-amber-800/30 hover:bg-amber-900/10 transition"
              >
                Pause Goal
              </button>
            )}
            {goal.status === "paused" && onResume && (
              <button
                onClick={() => onResume(goal.id)}
                className="px-3 py-1 rounded text-xs text-emerald-400 border border-emerald-800/30 hover:bg-emerald-900/10 transition"
              >
                Resume Goal
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
