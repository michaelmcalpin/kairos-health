// ─── Goal Tracking Types ────────────────────────────────────────
// Measurable health goals with progress tracking and milestones

import crypto from "crypto";

export type GoalCategory =
  | "glucose"
  | "sleep"
  | "weight"
  | "body_fat"
  | "activity"
  | "nutrition"
  | "supplements"
  | "fasting"
  | "labs"
  | "custom";

export type GoalStatus = "active" | "paused" | "completed" | "abandoned";

export type GoalDirection = "increase" | "decrease" | "maintain" | "reach";

export type GoalTimeframe = "weekly" | "monthly" | "quarterly" | "yearly" | "open_ended";

export interface GoalTarget {
  value: number;
  unit: string;
  direction: GoalDirection;
}

export interface GoalMilestone {
  id: string;
  label: string;
  targetValue: number;
  reachedAt: string | null;
  order: number;
}

export interface GoalCheckpoint {
  id: string;
  date: string;
  value: number;
  note: string;
  source: "manual" | "auto" | "import";
}

export interface HealthGoal {
  id: string;
  clientId: string;
  category: GoalCategory;
  title: string;
  description: string;
  target: GoalTarget;
  startValue: number;
  currentValue: number;
  status: GoalStatus;
  timeframe: GoalTimeframe;
  startDate: string;
  targetDate: string | null;
  completedDate: string | null;
  milestones: GoalMilestone[];
  checkpoints: GoalCheckpoint[];
  createdAt: string;
  updatedAt: string;
}

// ─── Goal Templates ─────────────────────────────────────────────

export interface GoalTemplate {
  id: string;
  category: GoalCategory;
  title: string;
  description: string;
  defaultTarget: GoalTarget;
  suggestedMilestones: { label: string; percent: number }[];
  timeframe: GoalTimeframe;
  icon: string;
}

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "glucose_tir_90",
    category: "glucose",
    title: "Achieve 90%+ Time in Range",
    description: "Maintain glucose between 70-140 mg/dL for 90% of the day",
    defaultTarget: { value: 90, unit: "%", direction: "increase" },
    suggestedMilestones: [
      { label: "70% TIR", percent: 25 },
      { label: "80% TIR", percent: 60 },
      { label: "85% TIR", percent: 80 },
      { label: "90% TIR", percent: 100 },
    ],
    timeframe: "quarterly",
    icon: "📊",
  },
  {
    id: "glucose_avg_under_100",
    category: "glucose",
    title: "Average Glucose Under 100 mg/dL",
    description: "Lower fasting and post-meal glucose average",
    defaultTarget: { value: 100, unit: "mg/dL", direction: "decrease" },
    suggestedMilestones: [
      { label: "Under 120", percent: 33 },
      { label: "Under 110", percent: 66 },
      { label: "Under 100", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "🎯",
  },
  {
    id: "sleep_7_hours",
    category: "sleep",
    title: "Sleep 7+ Hours Consistently",
    description: "Achieve 7+ hours of sleep at least 6 nights per week",
    defaultTarget: { value: 7, unit: "hours", direction: "increase" },
    suggestedMilestones: [
      { label: "6 hours avg", percent: 33 },
      { label: "6.5 hours avg", percent: 66 },
      { label: "7+ hours avg", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "😴",
  },
  {
    id: "sleep_score_85",
    category: "sleep",
    title: "Sleep Score 85+",
    description: "Improve overall sleep quality score",
    defaultTarget: { value: 85, unit: "score", direction: "increase" },
    suggestedMilestones: [
      { label: "Score 70+", percent: 30 },
      { label: "Score 75+", percent: 50 },
      { label: "Score 80+", percent: 75 },
      { label: "Score 85+", percent: 100 },
    ],
    timeframe: "quarterly",
    icon: "🌙",
  },
  {
    id: "weight_loss_10",
    category: "weight",
    title: "Lose 10 Pounds",
    description: "Gradual, sustainable weight loss over time",
    defaultTarget: { value: 10, unit: "lbs", direction: "decrease" },
    suggestedMilestones: [
      { label: "-3 lbs", percent: 30 },
      { label: "-5 lbs", percent: 50 },
      { label: "-7 lbs", percent: 70 },
      { label: "-10 lbs", percent: 100 },
    ],
    timeframe: "quarterly",
    icon: "⚖️",
  },
  {
    id: "body_fat_15",
    category: "body_fat",
    title: "Reach 15% Body Fat",
    description: "Optimize body composition to 15% body fat",
    defaultTarget: { value: 15, unit: "%", direction: "decrease" },
    suggestedMilestones: [
      { label: "20% BF", percent: 33 },
      { label: "18% BF", percent: 55 },
      { label: "15% BF", percent: 100 },
    ],
    timeframe: "yearly",
    icon: "💪",
  },
  {
    id: "activity_150_min",
    category: "activity",
    title: "150+ Minutes Weekly Exercise",
    description: "Meet WHO recommended minimum exercise guidelines",
    defaultTarget: { value: 150, unit: "min/week", direction: "increase" },
    suggestedMilestones: [
      { label: "60 min/week", percent: 25 },
      { label: "90 min/week", percent: 50 },
      { label: "120 min/week", percent: 75 },
      { label: "150 min/week", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "🏃",
  },
  {
    id: "activity_4_days",
    category: "activity",
    title: "Exercise 4+ Days Per Week",
    description: "Build a consistent workout habit",
    defaultTarget: { value: 4, unit: "days/week", direction: "increase" },
    suggestedMilestones: [
      { label: "2 days/week", percent: 33 },
      { label: "3 days/week", percent: 66 },
      { label: "4 days/week", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "📅",
  },
  {
    id: "protein_target",
    category: "nutrition",
    title: "Hit Daily Protein Target",
    description: "Consistently reach 1g protein per pound of body weight",
    defaultTarget: { value: 150, unit: "g/day", direction: "increase" },
    suggestedMilestones: [
      { label: "100g avg", percent: 33 },
      { label: "120g avg", percent: 60 },
      { label: "150g avg", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "🥩",
  },
  {
    id: "supplement_adherence_90",
    category: "supplements",
    title: "90%+ Supplement Adherence",
    description: "Take your supplements consistently",
    defaultTarget: { value: 90, unit: "%", direction: "increase" },
    suggestedMilestones: [
      { label: "70% adherence", percent: 33 },
      { label: "80% adherence", percent: 66 },
      { label: "90% adherence", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "💊",
  },
  {
    id: "fasting_16_8",
    category: "fasting",
    title: "Maintain 16:8 Fasting Protocol",
    description: "Complete a 16-hour fast at least 5 days per week",
    defaultTarget: { value: 5, unit: "days/week", direction: "increase" },
    suggestedMilestones: [
      { label: "3 days/week", percent: 40 },
      { label: "4 days/week", percent: 70 },
      { label: "5 days/week", percent: 100 },
    ],
    timeframe: "monthly",
    icon: "⏱️",
  },
  {
    id: "hba1c_under_5_5",
    category: "labs",
    title: "HbA1c Under 5.5%",
    description: "Optimize long-term glucose control",
    defaultTarget: { value: 5.5, unit: "%", direction: "decrease" },
    suggestedMilestones: [
      { label: "Under 6.0%", percent: 40 },
      { label: "Under 5.7%", percent: 70 },
      { label: "Under 5.5%", percent: 100 },
    ],
    timeframe: "quarterly",
    icon: "🧪",
  },
];

// ─── Progress Calculation Types ─────────────────────────────────

export interface GoalProgress {
  percentComplete: number;
  currentValue: number;
  startValue: number;
  targetValue: number;
  direction: GoalDirection;
  trend: "improving" | "declining" | "stable";
  daysRemaining: number | null;
  daysElapsed: number;
  milestonesReached: number;
  totalMilestones: number;
  streak: number; // consecutive checkpoints in right direction
  projectedCompletion: string | null;
}

export function uid(): string {
  return `goal_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`;
}
