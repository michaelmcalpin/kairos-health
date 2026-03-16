// ─── Coach Dashboard, Metrics & Revenue Types ──────────────────
// Types for the coach portal's dashboard KPIs, performance metrics,
// revenue analytics, and schedule integration.

import type { ClientTier } from "@/lib/coach-clients/types";

// ─── Dashboard KPIs ─────────────────────────────────────────────

export interface CoachDashboardKPI {
  label: string;
  value: string | number;
  unit?: string;
  trend: "up" | "down" | "flat";
  trendValue: string;
  icon: string; // icon key for rendering
}

export interface PriorityClient {
  id: string;
  name: string;
  initials: string;
  healthScore: number;
  alerts: number;
  status: string;
}

export interface ScheduleEntry {
  id: string;
  time: string;
  client: string;
  type: string;
}

export interface CoachDashboardData {
  kpis: CoachDashboardKPI[];
  priorityClients: PriorityClient[];
  todaySchedule: ScheduleEntry[];
}

// ─── Performance Metrics ────────────────────────────────────────

export interface HealthScoreBucket {
  range: string;
  count: number;
  percentage: number;
}

export interface MonthlyTrend {
  month: string;
  newClients: number;
  sessions: number;
  revenue: number;
}

export interface TopClient {
  id: string;
  name: string;
  score: number;
  trend: "up" | "down" | "stable";
  lastUpdate: string;
}

export interface AtRiskClient {
  id: string;
  name: string;
  issue: string;
  daysSinceContact: number;
}

export interface ProtocolMetric {
  name: string;
  adherenceRate: number;
  outcomeScore: number;
  clientCount: number;
}

export interface CoachMetricsData {
  kpis: CoachDashboardKPI[];
  healthDistribution: HealthScoreBucket[];
  monthlyTrend: MonthlyTrend[];
  topClients: TopClient[];
  atRiskClients: AtRiskClient[];
  protocols: ProtocolMetric[];
  sessionMetrics: {
    totalSessions: number;
    avgDuration: number;
    completionRate: number;
    noShowRate: number;
  };
  clientSegments: {
    active: number;
    onTrack: number;
    needsAttention: number;
    inactive: number;
    total: number;
  };
}

// ─── Revenue ────────────────────────────────────────────────────

export interface ClientRevenue {
  id: string;
  name: string;
  tier: ClientTier;
  coachingFee: number;
  supplementMarkup: number;
  totalMonthly: number;
}

export interface RevenueTrendPoint {
  month: string;
  coaching: number;
  supplement: number;
}

export interface Transaction {
  id: string;
  date: string;
  client: string;
  type: string;
  amount: number;
  status: "paid" | "pending";
}

export interface TierRevenueSummary {
  tier: ClientTier;
  tierLabel: string;
  clientCount: number;
  avgMonthly: number;
  totalRevenue: number;
}

export interface CoachRevenueData {
  totalMonthlyRevenue: number;
  totalCoachingFees: number;
  totalSupplementMarkup: number;
  pendingPayouts: number;
  ytdTotal: number;
  monthlyTrend: RevenueTrendPoint[];
  clientRevenue: ClientRevenue[];
  tierSummaries: TierRevenueSummary[];
  recentTransactions: Transaction[];
}

// ─── Pricing ────────────────────────────────────────────────────

export const TIER_PRICING: Record<ClientTier, number> = {
  tier1: 499,
  tier2: 249,
  tier3: 99,
};

export const TIER_DISPLAY_LABELS: Record<ClientTier, string> = {
  tier1: "Tier 1 (Private)",
  tier2: "Tier 2 (Associate)",
  tier3: "Tier 3 (AI-Guided)",
};
