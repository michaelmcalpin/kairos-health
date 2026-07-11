/**
 * useGoals -- Custom hooks for the Goals feature.
 *
 * Tries to fetch goals from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - goals.list            -> list goals by status
 *   - goals.get             -> single goal by ID
 *   - goals.create          -> create a new goal
 *   - goals.addCheckpoint   -> log progress on a goal
 *   - goals.updateStatus    -> complete / archive a goal
 *   - goals.delete          -> delete a goal
 */

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { isDevFallbackMode } from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface GoalSummary {
  id: string;
  title: string;
  description?: string;
  category?: string;
  targetValue?: number;
  targetUnit?: string;
  currentValue?: number;
  progress: number;
  targetDate?: string;
  status: "active" | "paused" | "completed" | "abandoned";
  createdAt?: string;
  milestones?: Array<{
    title: string;
    targetValue?: number;
    targetDate?: string;
    completed?: boolean;
  }>;
  checkpoints?: Array<{
    id: string;
    value: number;
    notes?: string;
    createdAt: string;
  }>;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const SAMPLE_ACTIVE_GOALS: GoalSummary[] = [
  {
    id: "1",
    title: "Reach 175 lbs",
    description: "Weight loss goal",
    category: "weight",
    targetValue: 175,
    targetUnit: "lbs",
    currentValue: 183,
    progress: 60,
    targetDate: "2026-08-15",
    status: "active",
  },
  {
    id: "2",
    title: "Sleep 8+ hrs",
    description: "Improve sleep duration",
    category: "sleep",
    targetValue: 8,
    targetUnit: "hrs",
    currentValue: 7.4,
    progress: 85,
    status: "active",
  },
  {
    id: "3",
    title: "Steps 10K daily",
    description: "Increase daily activity",
    category: "fitness",
    targetValue: 10000,
    targetUnit: "steps",
    currentValue: 8742,
    progress: 87,
    status: "active",
  },
  {
    id: "4",
    title: "Reduce A1C to 5.2",
    description: "Lower blood sugar",
    category: "clinical",
    targetValue: 5.2,
    targetUnit: "%",
    currentValue: 5.4,
    progress: 72,
    targetDate: "2026-09-30",
    status: "active",
  },
];

export const SAMPLE_COMPLETED_GOALS: GoalSummary[] = [
  {
    id: "c1",
    title: "Run 5K without stopping",
    category: "fitness",
    progress: 100,
    status: "completed",
    targetDate: "2026-02-28",
  },
  {
    id: "c2",
    title: "Reduce LDL below 100",
    category: "clinical",
    progress: 100,
    status: "completed",
    targetDate: "2026-01-15",
  },
];

export const SAMPLE_GOAL_DETAILS: Record<string, GoalSummary> = {
  "1": {
    ...SAMPLE_ACTIVE_GOALS[0],
    checkpoints: [
      { id: "cp1", value: 183, notes: undefined, createdAt: "2026-06-14" },
      { id: "cp2", value: 183.5, notes: undefined, createdAt: "2026-06-12" },
      { id: "cp3", value: 184, notes: undefined, createdAt: "2026-06-10" },
      { id: "cp4", value: 184.2, notes: undefined, createdAt: "2026-06-07" },
      { id: "cp5", value: 185, notes: undefined, createdAt: "2026-06-04" },
    ],
    milestones: [
      { title: "25% reached (190 lbs)", targetValue: 190, completed: true },
      { title: "50% reached (185 lbs)", targetValue: 185, completed: true },
      { title: "75% reached (180 lbs)", targetValue: 180, completed: false },
      { title: "Goal achieved (175 lbs)", targetValue: 175, completed: false },
    ],
  },
  "2": {
    ...SAMPLE_ACTIVE_GOALS[1],
    checkpoints: [
      { id: "cp6", value: 7.5, createdAt: "2026-06-15" },
      { id: "cp7", value: 7.2, createdAt: "2026-06-14" },
      { id: "cp8", value: 7.8, createdAt: "2026-06-13" },
      { id: "cp9", value: 7.1, createdAt: "2026-06-12" },
    ],
    milestones: [
      { title: "25% reached (6.9 hrs)", targetValue: 6.9, completed: true },
      { title: "50% reached (7.3 hrs)", targetValue: 7.3, completed: true },
      { title: "75% reached (7.6 hrs)", targetValue: 7.6, completed: false },
      { title: "Goal achieved (8.0 hrs)", targetValue: 8, completed: false },
    ],
  },
  "3": {
    ...SAMPLE_ACTIVE_GOALS[2],
    checkpoints: [
      { id: "cp10", value: 9124, createdAt: "2026-06-15" },
      { id: "cp11", value: 8742, createdAt: "2026-06-14" },
      { id: "cp12", value: 8930, createdAt: "2026-06-13" },
      { id: "cp13", value: 7812, createdAt: "2026-06-12" },
    ],
    milestones: [
      { title: "25% reached (6,250 steps)", targetValue: 6250, completed: true },
      { title: "50% reached (7,500 steps)", targetValue: 7500, completed: true },
      { title: "75% reached (8,750 steps)", targetValue: 8750, completed: false },
      { title: "Goal achieved (10,000 steps)", targetValue: 10000, completed: false },
    ],
  },
  "4": {
    ...SAMPLE_ACTIVE_GOALS[3],
    checkpoints: [
      { id: "cp14", value: 5.4, createdAt: "2026-06-01" },
      { id: "cp15", value: 5.5, createdAt: "2026-05-01" },
      { id: "cp16", value: 5.6, createdAt: "2026-04-01" },
    ],
    milestones: [
      { title: "25% reached (5.65%)", targetValue: 5.65, completed: true },
      { title: "50% reached (5.5%)", targetValue: 5.5, completed: true },
      { title: "75% reached (5.35%)", targetValue: 5.35, completed: false },
      { title: "Goal achieved (5.2%)", targetValue: 5.2, completed: false },
    ],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useGoals -- list goals by status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useGoals(status: "active" | "completed" | "abandoned" = "active") {
  const query = trpc.clientPortal.goals.list.useQuery(
    { status },
    DEFAULT_QUERY_OPTIONS,
  );

  const goals: GoalSummary[] = query.data
    ? (query.data as any[]).map(mapApiGoal)
    : status === "active"
      ? SAMPLE_ACTIVE_GOALS
      : status === "completed"
        ? SAMPLE_COMPLETED_GOALS
        : [];

  return {
    goals,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useGoalDetail -- single goal by ID
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useGoalDetail(goalId: string | undefined) {
  const query = trpc.clientPortal.goals.get.useQuery(
    { id: goalId ?? "" },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && !!goalId,
    },
  );

  const goal: GoalSummary | null = query.data
    ? mapApiGoal(query.data)
    : goalId
      ? SAMPLE_GOAL_DETAILS[goalId] ?? null
      : null;

  return {
    goal,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useCreateGoal -- mutation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useCreateGoal() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.goals.create.useMutation({
    onSuccess: () => {
      // Invalidate goal lists so they refetch
      utils.clientPortal.goals.list.invalidate();
    },
  });

  const createGoal = (input: {
    title: string;
    description: string;
    category: "glucose" | "sleep" | "weight" | "body_fat" | "activity" | "nutrition" | "supplements" | "fasting" | "labs" | "custom";
    targetValue: number;
    targetUnit: string;
    targetDirection: "increase" | "decrease" | "maintain" | "reach";
    startValue: number;
    timeframe: "weekly" | "monthly" | "quarterly" | "yearly" | "open_ended";
    targetDate?: string | null;
    milestones?: Array<{ label: string; targetValue: number }>;
  }) => {
    return mutation.mutateAsync(input);
  };

  return {
    createGoal,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAddCheckpoint -- mutation to log progress
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAddCheckpoint() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.goals.addCheckpoint.useMutation({
    onSuccess: () => {
      utils.clientPortal.goals.list.invalidate();
      utils.clientPortal.goals.get.invalidate();
    },
  });

  const addCheckpoint = (goalId: string, value: number, note?: string) => {
    return mutation.mutateAsync({ goalId, value, note });
  };

  return {
    addCheckpoint,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useUpdateGoalStatus -- mutation to complete/archive
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useUpdateGoalStatus() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.goals.updateStatus.useMutation({
    onSuccess: () => {
      utils.clientPortal.goals.list.invalidate();
      utils.clientPortal.goals.get.invalidate();
    },
  });

  const updateStatus = (id: string, status: "active" | "paused" | "completed" | "abandoned") => {
    return mutation.mutateAsync({ goalId: id, status });
  };

  return {
    updateStatus,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useDeleteGoal -- mutation
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDeleteGoal() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.goals.delete.useMutation({
    onSuccess: () => {
      utils.clientPortal.goals.list.invalidate();
    },
  });

  const deleteGoal = (id: string) => {
    return mutation.mutateAsync({ goalId: id });
  };

  return {
    deleteGoal,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapApiGoal(raw: any): GoalSummary {
  // Compute progress from target / current / startValue
  let progress = raw.progress ?? 0;
  if (raw.target && raw.startValue != null && raw.currentValue != null) {
    const total = Math.abs(raw.target.value - raw.startValue);
    const done = Math.abs(raw.currentValue - raw.startValue);
    progress = total > 0 ? Math.round((done / total) * 100) : 0;
  }

  return {
    id: raw.id,
    title: raw.title ?? "",
    description: raw.description ?? undefined,
    category: raw.category ?? "other",
    targetValue: raw.target?.value ?? raw.targetValue ?? undefined,
    targetUnit: raw.target?.unit ?? raw.targetUnit ?? undefined,
    currentValue: raw.currentValue ?? undefined,
    progress,
    targetDate: raw.targetDate ?? undefined,
    status: raw.status ?? "active",
    createdAt: raw.createdAt ?? undefined,
    milestones: raw.milestones
      ? raw.milestones.map((m: any) => ({
          title: m.label ?? m.title ?? "",
          targetValue: m.targetValue,
          completed: m.reachedAt != null ? true : (m.completed ?? false),
        }))
      : undefined,
    checkpoints: raw.checkpoints
      ? raw.checkpoints.map((c: any) => ({
          id: c.id,
          value: c.value,
          notes: c.note ?? c.notes ?? undefined,
          createdAt: c.date ?? c.createdAt ?? "",
        }))
      : undefined,
  };
}
