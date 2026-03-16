// ─── Coach Dashboard Engine ─────────────────────────────────────
// Derives dashboard KPIs, performance metrics, revenue analytics,
// and schedule data from the coach-clients engine store.

import {
  seedCoachClients,
  listCoachClients,
  getRosterStats,
} from "@/lib/coach-clients/engine";
import type { CoachClientSummary } from "@/lib/coach-clients/types";
import type {
  CoachDashboardData,
  CoachDashboardKPI,
  PriorityClient,
  ScheduleEntry,
  CoachMetricsData,
  HealthScoreBucket,
  MonthlyTrend,
  TopClient,
  AtRiskClient,
  ProtocolMetric,
  CoachRevenueData,
  ClientRevenue,
  RevenueTrendPoint,
  Transaction,
  TierRevenueSummary,
} from "./types";
import { TIER_PRICING, TIER_DISPLAY_LABELS } from "./types";
import type { ClientTier } from "@/lib/coach-clients/types";

// ─── Seeded Random ──────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function seededFloat(seed: number, min: number, max: number): number {
  return Math.round((seededRandom(seed) * (max - min) + min) * 10) / 10;
}

function uid(): string {
  return `cd_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

// ─── Dashboard ──────────────────────────────────────────────────

export function getCoachDashboard(
  coachId: string,
  range: { startDate: string; endDate: string },
): CoachDashboardData {
  seedCoachClients(coachId);
  const clients = listCoachClients(coachId);
  const stats = getRosterStats(coachId);

  const baseSeed = hashDateRange(range.startDate);
  const totalSessions = seededInt(baseSeed + 1, 12, 28);
  const pendingAlerts = stats.totalAlerts;
  const revenue = computeMonthlyRevenue(clients);

  const kpis: CoachDashboardKPI[] = [
    {
      label: "Active Clients",
      value: stats.totalClients,
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 10, 1, 3)} this month`,
      icon: "users",
    },
    {
      label: "Pending Alerts",
      value: pendingAlerts,
      trend: pendingAlerts > 3 ? "up" : "down",
      trendValue: pendingAlerts > 3 ? `+${seededInt(baseSeed + 11, 1, 3)}` : `-${seededInt(baseSeed + 11, 1, 3)}`,
      icon: "bell",
    },
    {
      label: "Sessions",
      value: totalSessions,
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 12, 2, 8)}`,
      icon: "calendar",
    },
    {
      label: "Avg Health Score",
      value: stats.avgHealthScore,
      unit: "/100",
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 13, 1, 6)} pts`,
      icon: "trending",
    },
    {
      label: "Revenue",
      value: `$${revenue.toLocaleString()}`,
      trend: "up",
      trendValue: `+${seededInt(baseSeed + 14, 5, 15)}%`,
      icon: "dollar",
    },
    {
      label: "Avg Response",
      value: seededInt(baseSeed + 15, 5, 20),
      unit: "min",
      trend: "down",
      trendValue: `-${seededInt(baseSeed + 16, 2, 8)} min`,
      icon: "clock",
    },
  ];

  // Priority clients — sort by highest alerts, lowest health score
  const priorityClients: PriorityClient[] = [...clients]
    .sort((a, b) => {
      if (b.activeAlerts !== a.activeAlerts) return b.activeAlerts - a.activeAlerts;
      return a.healthScore - b.healthScore;
    })
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      name: c.name,
      initials: c.initials,
      healthScore: c.healthScore,
      alerts: c.activeAlerts,
      status: c.status === "critical" ? "Critical Review" :
              c.status === "attention" ? "Review Needed" :
              c.activeAlerts > 0 ? "Active Protocol" : "On Track",
    }));

  // Today's schedule
  const sessionTypes = ["Check-in", "Protocol Review", "Lab Review", "Follow-up", "Assessment"];
  const scheduleCount = seededInt(baseSeed + 30, 3, 6);
  const todaySchedule: ScheduleEntry[] = Array.from({ length: scheduleCount }, (_, i) => {
    const hour = 8 + Math.floor(seededRandom(baseSeed + 40 + i) * 9);
    const minute = Math.floor(seededRandom(baseSeed + 50 + i) * 4) * 15;
    const clientIdx = seededInt(baseSeed + 60 + i, 0, clients.length - 1);
    return {
      id: uid(),
      time: `${hour > 12 ? hour - 12 : hour}:${String(minute).padStart(2, "0")} ${hour >= 12 ? "PM" : "AM"}`,
      client: clients[clientIdx].name,
      type: sessionTypes[seededInt(baseSeed + 70 + i, 0, sessionTypes.length - 1)],
    };
  }).sort((a, b) => a.time.localeCompare(b.time));

  return { kpis, priorityClients, todaySchedule };
}

// ─── Performance Metrics ────────────────────────────────────────

export function getCoachMetrics(
  coachId: string,
  range: { startDate: string; endDate: string },
): CoachMetricsData {
  seedCoachClients(coachId);
  const clients = listCoachClients(coachId);
  const stats = getRosterStats(coachId);
  const baseSeed = hashDateRange(range.startDate);

  // KPIs
  const revenue = computeMonthlyRevenue(clients);
  const kpis: CoachDashboardKPI[] = [
    { label: "Total Clients", value: stats.totalClients.toString(), trend: "up", trendValue: `${seededInt(baseSeed + 100, 2, 6)}%`, icon: "users" },
    { label: "Avg Health Score", value: stats.avgHealthScore.toFixed(1), trend: "up", trendValue: `${seededFloat(baseSeed + 101, 1, 4)}%`, icon: "target" },
    { label: "Client Retention", value: `${seededInt(baseSeed + 102, 88, 96)}%`, trend: "up", trendValue: `${seededFloat(baseSeed + 103, 1, 5)}%`, icon: "trending" },
    { label: "Avg Session Rating", value: `${seededFloat(baseSeed + 104, 4.2, 4.9)}/5`, trend: "up", trendValue: `${seededFloat(baseSeed + 105, 0.1, 0.5)}`, icon: "award" },
    { label: "Revenue This Month", value: `$${revenue.toLocaleString()}`, trend: "up", trendValue: `${seededFloat(baseSeed + 106, 5, 12)}%`, icon: "dollar" },
  ];

  // Health score distribution from actual client data
  const buckets: HealthScoreBucket[] = [
    { range: "90+", count: 0, percentage: 0 },
    { range: "80-89", count: 0, percentage: 0 },
    { range: "70-79", count: 0, percentage: 0 },
    { range: "60-69", count: 0, percentage: 0 },
    { range: "<60", count: 0, percentage: 0 },
  ];
  for (const c of clients) {
    if (c.healthScore >= 90) buckets[0].count++;
    else if (c.healthScore >= 80) buckets[1].count++;
    else if (c.healthScore >= 70) buckets[2].count++;
    else if (c.healthScore >= 60) buckets[3].count++;
    else buckets[4].count++;
  }
  const total = clients.length;
  for (const b of buckets) {
    b.percentage = total > 0 ? Math.round((b.count / total) * 1000) / 10 : 0;
  }

  // Monthly trend — last 6 months
  const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
  const monthlyTrend: MonthlyTrend[] = months.map((month, i) => ({
    month,
    newClients: seededInt(baseSeed + 200 + i, 1, 4),
    sessions: seededInt(baseSeed + 210 + i, 40, 65),
    revenue: seededInt(baseSeed + 220 + i, 8000, 13000),
  }));

  // Top clients — sorted by health score desc
  const topClients: TopClient[] = [...clients]
    .sort((a, b) => b.healthScore - a.healthScore)
    .slice(0, 4)
    .map((c) => ({
      id: c.id,
      name: c.name,
      score: c.healthScore,
      trend: c.scoreTrend === "up" ? "up" as const :
             c.scoreTrend === "down" ? "down" as const : "stable" as const,
      lastUpdate: c.lastActive,
    }));

  // At-risk clients — low health score or high alerts
  const atRiskClients: AtRiskClient[] = [...clients]
    .filter((c) => c.status === "critical" || c.status === "attention")
    .slice(0, 3)
    .map((c, i) => ({
      id: c.id,
      name: c.name,
      issue: c.activeAlerts > 2 ? "Multiple unresolved alerts" :
             c.healthScore < 65 ? "Health score declining" :
             "Low adherence",
      daysSinceContact: seededInt(baseSeed + 300 + i, 3, 10),
    }));

  // Protocols
  const protocolNames = [
    "Cardiovascular Optimization",
    "Sleep & Recovery",
    "Strength & Mobility",
    "Nutritional Reset",
  ];
  const protocols: ProtocolMetric[] = protocolNames.map((name, i) => ({
    name,
    adherenceRate: seededInt(baseSeed + 400 + i, 75, 95),
    outcomeScore: seededFloat(baseSeed + 410 + i, 7.5, 9.2),
    clientCount: seededInt(baseSeed + 420 + i, 6, 18),
  }));

  // Session metrics
  const sessionMetrics = {
    totalSessions: seededInt(baseSeed + 500, 45, 65),
    avgDuration: seededInt(baseSeed + 501, 40, 55),
    completionRate: seededInt(baseSeed + 502, 93, 99),
    noShowRate: seededInt(baseSeed + 503, 1, 5),
  };

  // Client segments
  const clientSegments = {
    active: stats.totalClients - seededInt(baseSeed + 510, 1, 2),
    onTrack: stats.stableCount,
    needsAttention: stats.attentionCount + stats.criticalCount,
    inactive: seededInt(baseSeed + 511, 1, 2),
    total: stats.totalClients,
  };

  return {
    kpis,
    healthDistribution: buckets,
    monthlyTrend,
    topClients,
    atRiskClients,
    protocols,
    sessionMetrics,
    clientSegments,
  };
}

// ─── Revenue ────────────────────────────────────────────────────

export function getCoachRevenue(
  coachId: string,
  range: { startDate: string; endDate: string },
): CoachRevenueData {
  seedCoachClients(coachId);
  const clients = listCoachClients(coachId);
  const baseSeed = hashDateRange(range.startDate);

  // Client revenue breakdown
  const clientRevenue: ClientRevenue[] = clients.map((c, i) => {
    const coachingFee = TIER_PRICING[c.tier];
    const supplementMarkup = seededInt(baseSeed + 600 + i, 15, 150);
    return {
      id: c.id,
      name: c.name,
      tier: c.tier,
      coachingFee,
      supplementMarkup,
      totalMonthly: coachingFee + supplementMarkup,
    };
  });

  const totalCoachingFees = clientRevenue.reduce((s, c) => s + c.coachingFee, 0);
  const totalSupplementMarkup = clientRevenue.reduce((s, c) => s + c.supplementMarkup, 0);
  const totalMonthlyRevenue = totalCoachingFees + totalSupplementMarkup;
  const pendingPayouts = seededInt(baseSeed + 700, 800, 2000);
  const ytdTotal = totalMonthlyRevenue * seededInt(baseSeed + 701, 2, 3) + seededInt(baseSeed + 702, 1000, 5000);

  // Monthly trend — last 6 months
  const trendMonths = ["Oct", "Nov", "Dec", "Jan", "Feb", "Mar"];
  const monthlyTrend: RevenueTrendPoint[] = trendMonths.map((month, i) => ({
    month,
    coaching: seededInt(baseSeed + 800 + i, totalCoachingFees - 300, totalCoachingFees + 200),
    supplement: seededInt(baseSeed + 810 + i, totalSupplementMarkup - 100, totalSupplementMarkup + 100),
  }));

  // Tier summaries
  const tiers: ClientTier[] = ["tier1", "tier2", "tier3"];
  const tierSummaries: TierRevenueSummary[] = tiers.map((tier) => {
    const tierClients = clientRevenue.filter((c) => c.tier === tier);
    const totalRev = tierClients.reduce((s, c) => s + c.totalMonthly, 0);
    return {
      tier,
      tierLabel: TIER_DISPLAY_LABELS[tier],
      clientCount: tierClients.length,
      avgMonthly: tierClients.length > 0 ? Math.round(totalRev / tierClients.length) : 0,
      totalRevenue: totalRev,
    };
  });

  // Recent transactions
  const txTypes = ["Coaching Fee", "Supplement Order", "Lab Order"];
  const txCount = seededInt(baseSeed + 900, 6, 10);
  const recentTransactions: Transaction[] = Array.from({ length: txCount }, (_, i) => {
    const clientIdx = seededInt(baseSeed + 910 + i, 0, clients.length - 1);
    const txType = txTypes[seededInt(baseSeed + 920 + i, 0, txTypes.length - 1)];
    const amount = txType === "Coaching Fee"
      ? TIER_PRICING[clients[clientIdx].tier]
      : txType === "Supplement Order"
        ? seededInt(baseSeed + 930 + i, 25, 150)
        : seededInt(baseSeed + 940 + i, 150, 400);
    const daysAgo = i;
    const date = new Date(Date.now() - daysAgo * 86400000).toISOString().split("T")[0];
    const statusVal: "paid" | "pending" = seededRandom(baseSeed + 950 + i) > 0.2 ? "paid" : "pending";

    return {
      id: uid(),
      date,
      client: clients[clientIdx].name,
      type: txType,
      amount,
      status: statusVal,
    };
  });

  return {
    totalMonthlyRevenue,
    totalCoachingFees,
    totalSupplementMarkup,
    pendingPayouts,
    ytdTotal,
    monthlyTrend,
    clientRevenue,
    tierSummaries,
    recentTransactions,
  };
}

// ─── Helpers ────────────────────────────────────────────────────

function computeMonthlyRevenue(clients: CoachClientSummary[]): number {
  return clients.reduce((sum, c) => sum + TIER_PRICING[c.tier], 0);
}

function hashDateRange(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    hash = ((hash << 5) - hash + dateStr.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
