/**
 * KAIROS AI Health Insights — Type Definitions
 *
 * Types for the insight generation engine, covering glucose,
 * sleep, nutrition, activity, supplement adherence, and
 * composite health scoring insights.
 */

// ─── Insight Categories ─────────────────────────────────────────────────────

export type InsightCategory =
  | "glucose"
  | "sleep"
  | "nutrition"
  | "activity"
  | "supplements"
  | "fasting"
  | "labs"
  | "composite";

export type InsightSeverity = "info" | "positive" | "warning" | "critical";

export type InsightActionType =
  | "adjust_diet"
  | "adjust_sleep"
  | "adjust_exercise"
  | "adjust_supplements"
  | "adjust_fasting"
  | "consult_coach"
  | "consult_doctor"
  | "order_labs"
  | "review_data"
  | "celebrate";

// ─── Core Insight ────────────────────────────────────────────────────────────

export interface HealthInsight {
  id: string;
  category: InsightCategory;
  severity: InsightSeverity;
  title: string;
  summary: string;
  detail: string;
  actions: InsightAction[];
  dataPoints: InsightDataPoint[];
  confidence: number; // 0-1
  generatedAt: string; // ISO timestamp
  expiresAt?: string;
  tags: string[];
}

export interface InsightAction {
  type: InsightActionType;
  label: string;
  description: string;
  priority: number; // 1-5
}

export interface InsightDataPoint {
  metric: string;
  value: number;
  unit: string;
  context?: string; // e.g. "vs 7-day avg"
}

// ─── Analysis Input Shapes ───────────────────────────────────────────────────

export interface GlucoseAnalysisInput {
  readings: { timestamp: string; value: number }[];
  avgGlucose: number;
  timeInRange: number; // 0-1
  gmi: number;
  cv: number; // coefficient of variation %
  minGlucose: number;
  maxGlucose: number;
  priorWeekAvg?: number;
}

export interface SleepAnalysisInput {
  sessions: {
    date: string;
    totalMinutes: number;
    deepMinutes: number;
    remMinutes: number;
    score: number;
    efficiency: number;
  }[];
  avgScore: number;
  avgDuration: number;
  consistency: number; // 0-100
  priorWeekAvgScore?: number;
}

export interface NutritionAnalysisInput {
  dailyLogs: {
    date: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber: number;
  }[];
  avgCalories: number;
  avgProtein: number;
  avgCarbs: number;
  avgFat: number;
}

export interface ActivityAnalysisInput {
  workouts: {
    date: string;
    durationMinutes: number;
    type?: string;
  }[];
  totalWorkouts: number;
  avgDurationMinutes: number;
  activeDays: number;
  totalDaysInRange: number;
}

export interface SupplementAnalysisInput {
  adherenceRate: number; // 0-1
  missedItems: string[];
  streakDays: number;
  totalProtocolItems: number;
}

export interface FastingAnalysisInput {
  logs: {
    date: string;
    durationHours: number;
    completed: boolean;
  }[];
  avgDurationHours: number;
  completionRate: number; // 0-1
  protocolTargetHours: number;
}

export interface CompositeAnalysisInput {
  healthScore: number; // 0-100
  glucoseScore: number;
  sleepScore: number;
  activityScore: number;
  supplementScore: number;
  checkinScore: number;
  priorWeekHealthScore?: number;
}

// ─── Weekly Report ───────────────────────────────────────────────────────────

export interface WeeklyHealthReport {
  weekStart: string;
  weekEnd: string;
  overallScore: number;
  scoreChange: number;
  insights: HealthInsight[];
  topWins: string[];
  areasToImprove: string[];
  coachNote?: string;
  generatedAt: string;
}

// ─── Prompt Template ─────────────────────────────────────────────────────────

export interface PromptTemplate {
  category: InsightCategory;
  systemPrompt: string;
  userPromptBuilder: (data: Record<string, unknown>) => string;
}
