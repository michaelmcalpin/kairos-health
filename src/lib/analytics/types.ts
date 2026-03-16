// ─── Platform Analytics Types ────────────────────────────────────
// Types for admin analytics: growth, engagement, retention, coach performance

export function uid(): string {
  return `anl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Time Periods ──────────────────────────────────────────────

export type AnalyticsPeriod = "week" | "month" | "quarter" | "year";

export interface DateRange {
  startDate: string; // YYYY-MM-DD
  endDate: string;
}

// ─── User Growth ───────────────────────────────────────────────

export interface GrowthDataPoint {
  date: string; // YYYY-MM for monthly, YYYY-MM-DD for daily
  newUsers: number;
  cumulativeUsers: number;
  newClients: number;
  newCoaches: number;
  churned: number;
}

export interface GrowthSummary {
  totalUsers: number;
  newUsersThisPeriod: number;
  growthRate: number; // percentage
  churnRate: number;
  netGrowth: number;
  dataPoints: GrowthDataPoint[];
}

// ─── Engagement ────────────────────────────────────────────────

export interface EngagementDataPoint {
  date: string;
  dailyActiveUsers: number;
  checkins: number;
  insightsViewed: number;
  messagesExchanged: number;
  goalsUpdated: number;
}

export interface EngagementSummary {
  avgDailyActiveUsers: number;
  avgCheckinRate: number; // percentage
  avgSessionDuration: number; // minutes
  featureUsage: FeatureUsage[];
  dataPoints: EngagementDataPoint[];
}

export interface FeatureUsage {
  feature: string;
  usageRate: number; // percentage
  trend: "up" | "down" | "stable";
  changePercent: number;
}

// ─── Retention ─────────────────────────────────────────────────

export interface CohortData {
  cohort: string; // YYYY-MM
  label: string; // "Jan 2026"
  totalUsers: number;
  retention: number[]; // percentage for M0, M1, M2, ...
}

export interface RetentionSummary {
  avgRetention30Day: number;
  avgRetention90Day: number;
  bestCohort: string;
  worstCohort: string;
  cohorts: CohortData[];
}

// ─── Coach Performance ─────────────────────────────────────────

export interface CoachPerformance {
  coachId: string;
  name: string;
  activeClients: number;
  capacity: number;
  utilizationRate: number; // percentage
  avgClientHealthScore: number;
  clientRetention: number; // percentage
  avgResponseTime: number; // minutes
  sessionsThisPeriod: number;
  revenueGenerated: number;
  rating: number;
  reviewCount: number;
}

export interface CoachPerformanceSummary {
  totalCoaches: number;
  avgUtilization: number;
  avgClientHealthScore: number;
  avgRetention: number;
  coaches: CoachPerformance[];
}

// ─── Platform Health ───────────────────────────────────────────

export type HealthStatus = "excellent" | "good" | "degraded" | "critical";

export interface PlatformMetric {
  name: string;
  value: string;
  numericValue: number;
  unit: string;
  status: HealthStatus;
  threshold: { excellent: number; good: number; degraded: number };
}

export interface PlatformHealth {
  uptime: PlatformMetric;
  responseTime: PlatformMetric;
  errorRate: PlatformMetric;
  activeConnections: PlatformMetric;
  alerts: PlatformAlert[];
}

export interface PlatformAlert {
  id: string;
  severity: "info" | "warning" | "critical";
  message: string;
  timestamp: string;
  resolved: boolean;
}

// ─── Revenue Analytics ─────────────────────────────────────────

export interface RevenueDataPoint {
  date: string;
  tier1Revenue: number;
  tier2Revenue: number;
  tier3Revenue: number;
  totalRevenue: number;
}

export interface RevenueSummary {
  mrr: number;
  arr: number;
  avgRevenuePerUser: number;
  revenueByTier: { tier: string; revenue: number; count: number; percentage: number }[];
  revenueGrowthRate: number;
  dataPoints: RevenueDataPoint[];
}

// ─── Full Analytics Dashboard ──────────────────────────────────

export interface AnalyticsDashboard {
  growth: GrowthSummary;
  engagement: EngagementSummary;
  retention: RetentionSummary;
  coachPerformance: CoachPerformanceSummary;
  platformHealth: PlatformHealth;
  revenue: RevenueSummary;
  generatedAt: string;
}

// ─── KPI Card ──────────────────────────────────────────────────

export interface KPIData {
  label: string;
  value: string;
  numericValue: number;
  trend: number; // percentage change
  trendLabel: string;
  icon: string;
}

// ─── Constants ─────────────────────────────────────────────────

export const TIER_PRICING: Record<string, number> = {
  tier1: 499,
  tier2: 249,
  tier3: 99,
};

export const TIER_LABELS: Record<string, string> = {
  tier1: "Private",
  tier2: "Associate",
  tier3: "AI-Guided",
};

export const HEALTH_STATUS_COLORS: Record<HealthStatus, string> = {
  excellent: "#22c55e",
  good: "#3b82f6",
  degraded: "#eab308",
  critical: "#ef4444",
};

export const FEATURE_NAMES: string[] = [
  "Daily Check-ins",
  "Goal Tracking",
  "Health Insights",
  "Coach Messaging",
  "Supplement Logging",
  "Glucose Monitoring",
  "Sleep Tracking",
  "Nutrition Logging",
  "Workout Logging",
  "Lab Results",
];

// ─── Helpers ───────────────────────────────────────────────────

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatPercentage(value: number, decimals = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export function getMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, 15); // mid-month avoids timezone issues
  return date.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

export function getShortMonthLabel(dateStr: string): string {
  const [year, month] = dateStr.split("-").map(Number);
  const date = new Date(year, month - 1, 15);
  return date.toLocaleDateString("en-US", { month: "short" });
}
