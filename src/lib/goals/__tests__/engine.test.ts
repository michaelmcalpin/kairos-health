import { describe, it, expect } from "vitest";
import {
  calculateProgress,
  checkMilestones,
  addCheckpoint,
  createGoalFromTemplate,
  summarizeGoals,
} from "../engine";
import type { HealthGoal, GoalCheckpoint, GoalMilestone } from "../types";
import { GOAL_TEMPLATES } from "../types";

// ─── Helpers ────────────────────────────────────────────────────

function makeGoal(overrides: Partial<HealthGoal> = {}): HealthGoal {
  const now = new Date().toISOString();
  return {
    id: "test-goal",
    clientId: "user-1",
    category: "glucose",
    title: "Test Goal",
    description: "A test goal",
    target: { value: 90, unit: "%", direction: "increase" },
    startValue: 70,
    currentValue: 70,
    status: "active",
    timeframe: "monthly",
    startDate: "2025-01-01",
    targetDate: "2025-04-01",
    completedDate: null,
    milestones: [],
    checkpoints: [],
    createdAt: now,
    updatedAt: now,
    ...overrides,
  };
}

function makeCheckpoints(values: number[]): GoalCheckpoint[] {
  return values.map((v, i) => ({
    id: `cp-${i}`,
    date: new Date(2025, 0, 1 + i).toISOString(),
    value: v,
    note: "",
    source: "manual" as const,
  }));
}

function makeMilestones(targets: number[]): GoalMilestone[] {
  return targets.map((v, i) => ({
    id: `ms-${i}`,
    label: `Milestone ${i + 1}`,
    targetValue: v,
    reachedAt: null,
    order: i,
  }));
}

// ─── Progress Calculation ───────────────────────────────────────

describe("calculateProgress", () => {
  it("calculates 0% at start for increase goals", () => {
    const goal = makeGoal({ startValue: 70, currentValue: 70, target: { value: 90, unit: "%", direction: "increase" } });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(0);
  });

  it("calculates 50% for increase goals", () => {
    const goal = makeGoal({ startValue: 70, currentValue: 80, target: { value: 90, unit: "%", direction: "increase" } });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(50);
  });

  it("calculates 100% when target reached for increase goals", () => {
    const goal = makeGoal({ startValue: 70, currentValue: 90, target: { value: 90, unit: "%", direction: "increase" } });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(100);
  });

  it("caps at 100% when exceeded for increase goals", () => {
    const goal = makeGoal({ startValue: 70, currentValue: 100, target: { value: 90, unit: "%", direction: "increase" } });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(100);
  });

  it("calculates progress for decrease goals", () => {
    const goal = makeGoal({
      startValue: 200,
      currentValue: 180,
      target: { value: 160, unit: "lbs", direction: "decrease" },
    });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(50);
  });

  it("calculates 100% for decrease goals when target reached", () => {
    const goal = makeGoal({
      startValue: 200,
      currentValue: 160,
      target: { value: 160, unit: "lbs", direction: "decrease" },
    });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(100);
  });

  it("calculates 0% for decrease goals when at or above start", () => {
    const goal = makeGoal({
      startValue: 200,
      currentValue: 210,
      target: { value: 160, unit: "lbs", direction: "decrease" },
    });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(0);
  });

  it("handles maintain direction", () => {
    const goal = makeGoal({
      startValue: 100,
      currentValue: 100,
      target: { value: 100, unit: "mg/dL", direction: "maintain" },
    });
    const progress = calculateProgress(goal);
    expect(progress.percentComplete).toBe(100);
  });

  it("calculates daysElapsed", () => {
    const tenDaysAgo = new Date();
    tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
    const goal = makeGoal({ startDate: tenDaysAgo.toISOString().split("T")[0] });
    const progress = calculateProgress(goal);
    expect(progress.daysElapsed).toBe(10);
  });

  it("calculates daysRemaining with target date", () => {
    const thirtyDaysAhead = new Date();
    thirtyDaysAhead.setDate(thirtyDaysAhead.getDate() + 30);
    const goal = makeGoal({ targetDate: thirtyDaysAhead.toISOString().split("T")[0] });
    const progress = calculateProgress(goal);
    // Allow off-by-one due to time-of-day rounding
    expect(progress.daysRemaining).toBeGreaterThanOrEqual(29);
    expect(progress.daysRemaining).toBeLessThanOrEqual(30);
  });

  it("returns null daysRemaining for open-ended goals", () => {
    const goal = makeGoal({ targetDate: null });
    const progress = calculateProgress(goal);
    expect(progress.daysRemaining).toBeNull();
  });

  it("identifies improving trend", () => {
    const goal = makeGoal({
      target: { value: 90, unit: "%", direction: "increase" },
      checkpoints: makeCheckpoints([70, 75, 80]),
    });
    const progress = calculateProgress(goal);
    expect(progress.trend).toBe("improving");
  });

  it("identifies declining trend for increase goal", () => {
    const goal = makeGoal({
      target: { value: 90, unit: "%", direction: "increase" },
      checkpoints: makeCheckpoints([80, 75, 70]),
    });
    const progress = calculateProgress(goal);
    expect(progress.trend).toBe("declining");
  });

  it("identifies stable trend", () => {
    const goal = makeGoal({
      target: { value: 90, unit: "%", direction: "increase" },
      checkpoints: makeCheckpoints([80, 80, 80]),
    });
    const progress = calculateProgress(goal);
    expect(progress.trend).toBe("stable");
  });

  it("counts milestones reached", () => {
    const goal = makeGoal({
      milestones: [
        { ...makeMilestones([75])[0], reachedAt: "2025-01-10" },
        { ...makeMilestones([80])[0], id: "ms-1", reachedAt: null },
      ],
    });
    const progress = calculateProgress(goal);
    expect(progress.milestonesReached).toBe(1);
    expect(progress.totalMilestones).toBe(2);
  });

  it("calculates streak", () => {
    const goal = makeGoal({
      target: { value: 90, unit: "%", direction: "increase" },
      checkpoints: makeCheckpoints([70, 72, 75, 78, 80]),
    });
    const progress = calculateProgress(goal);
    expect(progress.streak).toBe(4); // 4 consecutive improvements
  });
});

// ─── Milestones ─────────────────────────────────────────────────

describe("checkMilestones", () => {
  it("marks milestones as reached for increase goals", () => {
    const goal = makeGoal({
      currentValue: 82,
      target: { value: 90, unit: "%", direction: "increase" },
      milestones: makeMilestones([75, 80, 85, 90]),
    });
    const updated = checkMilestones(goal);
    expect(updated.milestones[0].reachedAt).not.toBeNull(); // 75 reached
    expect(updated.milestones[1].reachedAt).not.toBeNull(); // 80 reached
    expect(updated.milestones[2].reachedAt).toBeNull(); // 85 not reached
    expect(updated.milestones[3].reachedAt).toBeNull(); // 90 not reached
  });

  it("marks milestones as reached for decrease goals", () => {
    const goal = makeGoal({
      startValue: 200,
      currentValue: 178,
      target: { value: 160, unit: "lbs", direction: "decrease" },
      milestones: makeMilestones([190, 180, 170, 160]),
    });
    const updated = checkMilestones(goal);
    expect(updated.milestones[0].reachedAt).not.toBeNull(); // 190 reached (below)
    expect(updated.milestones[1].reachedAt).not.toBeNull(); // 180 reached (below)
    expect(updated.milestones[2].reachedAt).toBeNull(); // 170 not reached
  });

  it("marks goal as completed when 100%", () => {
    const goal = makeGoal({
      currentValue: 90,
      target: { value: 90, unit: "%", direction: "increase" },
    });
    const updated = checkMilestones(goal);
    expect(updated.status).toBe("completed");
    expect(updated.completedDate).not.toBeNull();
  });

  it("does not overwrite already-reached milestone dates", () => {
    const goal = makeGoal({
      currentValue: 85,
      target: { value: 90, unit: "%", direction: "increase" },
      milestones: [
        { id: "ms-0", label: "75%", targetValue: 75, reachedAt: "2025-01-10T00:00:00Z", order: 0 },
        ...makeMilestones([80, 85, 90]).map((m, i) => ({ ...m, id: `ms-${i + 1}`, order: i + 1 })),
      ],
    });
    const updated = checkMilestones(goal);
    expect(updated.milestones[0].reachedAt).toBe("2025-01-10T00:00:00Z"); // preserved
  });
});

// ─── Checkpoints ────────────────────────────────────────────────

describe("addCheckpoint", () => {
  it("adds a checkpoint and updates currentValue", () => {
    const goal = makeGoal({
      currentValue: 70,
      checkpoints: makeCheckpoints([70]),
    });
    const updated = addCheckpoint(goal, 75, "Improving");
    expect(updated.currentValue).toBe(75);
    expect(updated.checkpoints).toHaveLength(2);
    expect(updated.checkpoints[1].value).toBe(75);
    expect(updated.checkpoints[1].note).toBe("Improving");
  });

  it("triggers milestone check after adding checkpoint", () => {
    const goal = makeGoal({
      currentValue: 70,
      target: { value: 90, unit: "%", direction: "increase" },
      milestones: makeMilestones([75, 80]),
      checkpoints: makeCheckpoints([70]),
    });
    const updated = addCheckpoint(goal, 76);
    expect(updated.milestones[0].reachedAt).not.toBeNull(); // 75 reached
    expect(updated.milestones[1].reachedAt).toBeNull(); // 80 not reached
  });
});

// ─── Template Creation ──────────────────────────────────────────

describe("createGoalFromTemplate", () => {
  it("creates a goal from glucose template", () => {
    const template = GOAL_TEMPLATES.find((t) => t.id === "glucose_tir_90")!;
    const goal = createGoalFromTemplate(template, "user-1", 65);

    expect(goal.clientId).toBe("user-1");
    expect(goal.category).toBe("glucose");
    expect(goal.startValue).toBe(65);
    expect(goal.currentValue).toBe(65);
    expect(goal.target.value).toBe(90);
    expect(goal.target.direction).toBe("increase");
    expect(goal.status).toBe("active");
    expect(goal.milestones.length).toBe(4);
    expect(goal.checkpoints.length).toBe(1); // initial checkpoint
    expect(goal.targetDate).not.toBeNull(); // quarterly
  });

  it("uses custom target value", () => {
    const template = GOAL_TEMPLATES.find((t) => t.id === "weight_loss_10")!;
    const goal = createGoalFromTemplate(template, "user-1", 200, 15);

    expect(goal.target.value).toBe(15);
  });

  it("generates milestones based on start and target", () => {
    const template = GOAL_TEMPLATES.find((t) => t.id === "sleep_7_hours")!;
    const goal = createGoalFromTemplate(template, "user-1", 5);

    // Start 5, target 7. Milestones at 33%, 66%, 100% of 2-hour range
    expect(goal.milestones[0].targetValue).toBeCloseTo(5.7, 0);
    expect(goal.milestones[1].targetValue).toBeCloseTo(6.3, 0);
    expect(goal.milestones[2].targetValue).toBeCloseTo(7.0, 0);
  });

  it("generates milestones for decrease goals", () => {
    const template = GOAL_TEMPLATES.find((t) => t.id === "weight_loss_10")!;
    const goal = createGoalFromTemplate(template, "user-1", 200);

    // Start 200, target 10 (decrease). Range = 190. 30% = 57 loss → 143
    expect(goal.milestones[0].targetValue).toBeLessThan(200);
    expect(goal.milestones[0].targetValue).toBeGreaterThan(goal.target.value);
  });
});

// ─── Summary ────────────────────────────────────────────────────

describe("summarizeGoals", () => {
  it("computes summary for multiple goals", () => {
    const goals = [
      makeGoal({ status: "active", currentValue: 80, checkpoints: makeCheckpoints([70, 75, 80]) }),
      makeGoal({ status: "completed", currentValue: 90, completedDate: "2025-02-01" }),
      makeGoal({ status: "active", currentValue: 75, checkpoints: makeCheckpoints([70, 72, 75]) }),
    ];

    const summary = summarizeGoals(goals);
    expect(summary.totalGoals).toBe(3);
    expect(summary.activeGoals).toBe(2);
    expect(summary.completedGoals).toBe(1);
    expect(summary.avgProgress).toBeGreaterThan(0);
  });

  it("handles empty goals list", () => {
    const summary = summarizeGoals([]);
    expect(summary.totalGoals).toBe(0);
    expect(summary.avgProgress).toBe(0);
  });

  it("counts category distribution", () => {
    const goals = [
      makeGoal({ category: "glucose" }),
      makeGoal({ category: "glucose", id: "g2" }),
      makeGoal({ category: "sleep", id: "g3" }),
    ];
    const summary = summarizeGoals(goals);
    expect(summary.categoryCounts.glucose).toBe(2);
    expect(summary.categoryCounts.sleep).toBe(1);
  });
});
