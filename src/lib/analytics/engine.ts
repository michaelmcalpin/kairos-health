// ─── Platform Analytics Engine ─────────────────────────────────
// In-memory analytics computation from seeded demo data.
// Deterministic seeded random for consistent results per time range.

import type {
  AnalyticsDashboard,
  CoachPerformance,
  CoachPerformanceSummary,
  CohortData,
  DateRange,
  EngagementDataPoint,
  EngagementSummary,
  FeatureUsage,
  GrowthDataPoint,
  GrowthSummary,
  KPIData,
  PlatformAlert,
  PlatformHealth,
  PlatformMetric,
  RetentionSummary,
  RevenueDataPoint,
  RevenueSummary,
} from "./types";
import {
  uid,
  TIER_PRICING,
  FEATURE_NAMES,
  formatCurrency,
  getMonthLabel,
} from "./types";

// ─── Seeded Random ─────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 9301 + 49297) * 233280;
  return x - Math.floor(x);
}

function seededInt(seed: number, min: number, max: number): number {
  return Math.floor(seededRandom(seed) * (max - min + 1)) + min;
}

function seededFloat(seed: number, min: number, max: number, decimals = 1): number {
  const val = seededRandom(seed) * (max - min) + min;
  const factor = Math.pow(10, decimals);
  return Math.round(val * factor) / factor;
}

// ─── Demo Data ─────────────────────────────────────────────────

const DEMO_COACHES: Array<{ id: string; name: string }> = [
  { id: "coach-1", name: "Sarah Mitchell" },
  { id: "coach-2", name: "James Chen" },
  { id: "coach-3", name: "Emma Rodriguez" },
  { id: "coach-4", name: "Marcus Thompson" },
  { id: "coach-5", name: "Elena Volkov" },
  { id: "coach-6", name: "Thomas Park" },
];

// ─── Growth Analytics ──────────────────────────────────────────

export function getGrowthAnalytics(range: DateRange): GrowthSummary {
  const months = getMonthsBetween(range.startDate, range.endDate);
  const baseSeed = hashString(range.startDate);
  let cumulative = seededInt(baseSeed, 60, 80); // starting base

  const dataPoints: GrowthDataPoint[] = months.map((month, i) => {
    const monthSeed = baseSeed + i * 7;
    const newClients = seededInt(monthSeed + 1, 8, 22);
    const newCoaches = seededInt(monthSeed + 2, 0, 2);
    const newUsers = newClients + newCoaches + seededInt(monthSeed + 3, 0, 3); // admins/other
    const churned = seededInt(monthSeed + 4, 1, Math.max(2, Math.floor(cumulative * 0.04)));
    cumulative += newUsers - churned;

    return {
      date: month,
      newUsers,
      cumulativeUsers: cumulative,
      newClients,
      newCoaches,
      churned,
    };
  });

  const totalNew = dataPoints.reduce((sum, d) => sum + d.newUsers, 0);
  const totalChurned = dataPoints.reduce((sum, d) => sum + d.churned, 0);
  const firstCumulative = dataPoints.length > 1 ? dataPoints[0].cumulativeUsers - dataPoints[0].newUsers : cumulative;
  const growthRate = firstCumulative > 0
    ? Math.round(((cumulative - firstCumulative) / firstCumulative) * 1000) / 10
    : 0;

  return {
    totalUsers: cumulative,
    newUsersThisPeriod: totalNew,
    growthRate,
    churnRate: cumulative > 0 ? Math.round((totalChurned / cumulative) * 1000) / 10 : 0,
    netGrowth: totalNew - totalChurned,
    dataPoints,
  };
}

// ─── Engagement Analytics ──────────────────────────────────────

export function getEngagementAnalytics(range: DateRange): EngagementSummary {
  const days = getDaysBetween(range.startDate, range.endDate);
  const baseSeed = hashString(range.startDate + "engagement");
  const baseDAU = seededInt(baseSeed, 40, 70);

  const dataPoints: EngagementDataPoint[] = days.map((date, i) => {
    const daySeed = baseSeed + i * 13;
    const dayOfWeek = new Date(date).getDay();
    // Weekends have lower activity
    const weekendFactor = dayOfWeek === 0 || dayOfWeek === 6 ? 0.6 : 1.0;

    return {
      date,
      dailyActiveUsers: Math.round((baseDAU + seededInt(daySeed + 1, -10, 15)) * weekendFactor),
      checkins: Math.round((baseDAU * 0.7 + seededInt(daySeed + 2, -5, 10)) * weekendFactor),
      insightsViewed: seededInt(daySeed + 3, 20, 60),
      messagesExchanged: seededInt(daySeed + 4, 15, 50),
      goalsUpdated: seededInt(daySeed + 5, 5, 25),
    };
  });

  const avgDAU = dataPoints.length > 0
    ? Math.round(dataPoints.reduce((sum, d) => sum + d.dailyActiveUsers, 0) / dataPoints.length)
    : 0;

  const avgCheckins = dataPoints.length > 0
    ? Math.round(dataPoints.reduce((sum, d) => sum + d.checkins, 0) / dataPoints.length)
    : 0;

  const featureUsage: FeatureUsage[] = FEATURE_NAMES.map((feature, i) => {
    const usageRate = seededFloat(baseSeed + i * 17, 35, 95);
    const changePercent = seededFloat(baseSeed + i * 19, -8, 12);
    const trend: FeatureUsage["trend"] = changePercent > 2 ? "up" : changePercent < -2 ? "down" : "stable";
    return { feature, usageRate, trend, changePercent };
  }).sort((a, b) => b.usageRate - a.usageRate);

  return {
    avgDailyActiveUsers: avgDAU,
    avgCheckinRate: avgDAU > 0 ? Math.round((avgCheckins / avgDAU) * 100) : 0,
    avgSessionDuration: seededFloat(baseSeed + 99, 8, 18),
    featureUsage,
    dataPoints,
  };
}

// ─── Retention Analytics ───────────────────────────────────────

export function getRetentionAnalytics(range: DateRange): RetentionSummary {
  const baseSeed = hashString(range.startDate + "retention");
  const months = getMonthsBetween(range.startDate, range.endDate);
  const cohortMonths = months.length >= 3 ? months.slice(0, -1) : months;

  const cohorts: CohortData[] = cohortMonths.map((month, i) => {
    const cohortSeed = baseSeed + i * 23;
    const totalUsers = seededInt(cohortSeed, 15, 35);
    const decayRate = seededFloat(cohortSeed + 2, 5, 15);

    const maxMonths = Math.min(7, months.length - i);
    const retention: number[] = [100];
    for (let m = 1; m < maxMonths; m++) {
      const prevRetention = retention[m - 1];
      const drop = decayRate * Math.pow(0.7, m - 1); // decay slows over time
      const noise = seededFloat(cohortSeed + m * 3, -2, 2);
      retention.push(Math.max(20, Math.round((prevRetention - drop + noise) * 10) / 10));
    }

    return {
      cohort: month,
      label: getMonthLabel(month),
      totalUsers,
      retention,
    };
  });

  // Calculate averages
  const retention30Values = cohorts
    .filter((c) => c.retention.length >= 2)
    .map((c) => c.retention[1]);
  const retention90Values = cohorts
    .filter((c) => c.retention.length >= 4)
    .map((c) => c.retention[3]);

  const avg30 = retention30Values.length > 0
    ? Math.round(retention30Values.reduce((a, b) => a + b, 0) / retention30Values.length * 10) / 10
    : 0;
  const avg90 = retention90Values.length > 0
    ? Math.round(retention90Values.reduce((a, b) => a + b, 0) / retention90Values.length * 10) / 10
    : 0;

  const sortedByRetention = [...cohorts]
    .filter((c) => c.retention.length >= 2)
    .sort((a, b) => b.retention[1] - a.retention[1]);

  return {
    avgRetention30Day: avg30,
    avgRetention90Day: avg90,
    bestCohort: sortedByRetention.length > 0 ? sortedByRetention[0].label : "N/A",
    worstCohort: sortedByRetention.length > 0 ? sortedByRetention[sortedByRetention.length - 1].label : "N/A",
    cohorts,
  };
}

// ─── Coach Performance ─────────────────────────────────────────

export function getCoachPerformance(range: DateRange): CoachPerformanceSummary {
  const baseSeed = hashString(range.startDate + "coaches");

  const coaches: CoachPerformance[] = DEMO_COACHES.map((coach, i) => {
    const coachSeed = baseSeed + i * 31;
    const capacity = seededInt(coachSeed + 1, 12, 25);
    const activeClients = seededInt(coachSeed + 2, Math.floor(capacity * 0.5), capacity);
    const utilizationRate = Math.round((activeClients / capacity) * 100);

    return {
      coachId: coach.id,
      name: coach.name,
      activeClients,
      capacity,
      utilizationRate,
      avgClientHealthScore: seededFloat(coachSeed + 3, 70, 92),
      clientRetention: seededFloat(coachSeed + 4, 78, 100),
      avgResponseTime: seededInt(coachSeed + 5, 15, 120),
      sessionsThisPeriod: seededInt(coachSeed + 6, 15, 50),
      revenueGenerated: seededInt(coachSeed + 7, 2000, 8000),
      rating: seededFloat(coachSeed + 8, 4.0, 5.0),
      reviewCount: seededInt(coachSeed + 9, 8, 45),
    };
  }).sort((a, b) => b.avgClientHealthScore - a.avgClientHealthScore);

  const avgUtilization = Math.round(
    coaches.reduce((sum, c) => sum + c.utilizationRate, 0) / coaches.length
  );
  const avgHealth = Math.round(
    coaches.reduce((sum, c) => sum + c.avgClientHealthScore, 0) / coaches.length * 10
  ) / 10;
  const avgRetention = Math.round(
    coaches.reduce((sum, c) => sum + c.clientRetention, 0) / coaches.length * 10
  ) / 10;

  return {
    totalCoaches: coaches.length,
    avgUtilization,
    avgClientHealthScore: avgHealth,
    avgRetention,
    coaches,
  };
}

// ─── Platform Health ───────────────────────────────────────────

export function getPlatformHealth(): PlatformHealth {
  const seed = Math.floor(Date.now() / 3600000); // changes hourly

  const uptime: PlatformMetric = {
    name: "API Uptime",
    value: `${seededFloat(seed + 1, 99.8, 99.99, 2)}%`,
    numericValue: seededFloat(seed + 1, 99.8, 99.99, 2),
    unit: "%",
    status: "excellent",
    threshold: { excellent: 99.9, good: 99.5, degraded: 99.0 },
  };

  const responseTime: PlatformMetric = {
    name: "Avg Response Time",
    value: `${seededInt(seed + 2, 85, 200)} ms`,
    numericValue: seededInt(seed + 2, 85, 200),
    unit: "ms",
    status: "good",
    threshold: { excellent: 100, good: 200, degraded: 500 },
  };
  responseTime.status = responseTime.numericValue <= 100 ? "excellent"
    : responseTime.numericValue <= 200 ? "good"
    : responseTime.numericValue <= 500 ? "degraded" : "critical";

  const errorRate: PlatformMetric = {
    name: "Error Rate",
    value: `${seededFloat(seed + 3, 0.01, 0.08, 2)}%`,
    numericValue: seededFloat(seed + 3, 0.01, 0.08, 2),
    unit: "%",
    status: "excellent",
    threshold: { excellent: 0.05, good: 0.1, degraded: 0.5 },
  };
  errorRate.status = errorRate.numericValue <= 0.05 ? "excellent"
    : errorRate.numericValue <= 0.1 ? "good"
    : errorRate.numericValue <= 0.5 ? "degraded" : "critical";

  const activeConnections: PlatformMetric = {
    name: "Active Connections",
    value: `${seededInt(seed + 4, 40, 120)}`,
    numericValue: seededInt(seed + 4, 40, 120),
    unit: "connections",
    status: "good",
    threshold: { excellent: 50, good: 150, degraded: 300 },
  };

  const alerts: PlatformAlert[] = [];
  if (responseTime.numericValue > 150) {
    alerts.push({
      id: uid(),
      severity: "warning",
      message: `Elevated response time detected (${responseTime.value}). Investigating database query optimization.`,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }
  if (errorRate.numericValue > 0.05) {
    alerts.push({
      id: uid(),
      severity: "info",
      message: `Error rate slightly above baseline (${errorRate.value}). Monitoring for patterns.`,
      timestamp: new Date().toISOString(),
      resolved: false,
    });
  }

  return { uptime, responseTime, errorRate, activeConnections, alerts };
}

// ─── Revenue Analytics ─────────────────────────────────────────

export function getRevenueAnalytics(range: DateRange): RevenueSummary {
  const months = getMonthsBetween(range.startDate, range.endDate);
  const baseSeed = hashString(range.startDate + "revenue");

  const dataPoints: RevenueDataPoint[] = months.map((month, i) => {
    const monthSeed = baseSeed + i * 11;
    const tier1Count = seededInt(monthSeed + 1, 15, 30);
    const tier2Count = seededInt(monthSeed + 2, 25, 50);
    const tier3Count = seededInt(monthSeed + 3, 30, 60);

    return {
      date: month,
      tier1Revenue: tier1Count * TIER_PRICING.tier1,
      tier2Revenue: tier2Count * TIER_PRICING.tier2,
      tier3Revenue: tier3Count * TIER_PRICING.tier3,
      totalRevenue: tier1Count * TIER_PRICING.tier1 + tier2Count * TIER_PRICING.tier2 + tier3Count * TIER_PRICING.tier3,
    };
  });

  const latestMonth = dataPoints[dataPoints.length - 1];
  const mrr = latestMonth ? latestMonth.totalRevenue : 0;

  const prevMonth = dataPoints.length >= 2 ? dataPoints[dataPoints.length - 2] : null;
  const revenueGrowthRate = prevMonth && prevMonth.totalRevenue > 0
    ? Math.round(((mrr - prevMonth.totalRevenue) / prevMonth.totalRevenue) * 1000) / 10
    : 0;

  const totalRevenue = dataPoints.reduce((sum, d) => sum + d.totalRevenue, 0);
  const totalTier1 = dataPoints.reduce((sum, d) => sum + d.tier1Revenue, 0);
  const totalTier2 = dataPoints.reduce((sum, d) => sum + d.tier2Revenue, 0);
  const totalTier3 = dataPoints.reduce((sum, d) => sum + d.tier3Revenue, 0);

  return {
    mrr,
    arr: mrr * 12,
    avgRevenuePerUser: mrr > 0 ? Math.round(mrr / seededInt(baseSeed + 99, 80, 130)) : 0,
    revenueByTier: [
      { tier: "tier1", revenue: totalTier1, count: Math.round(totalTier1 / TIER_PRICING.tier1), percentage: totalRevenue > 0 ? Math.round((totalTier1 / totalRevenue) * 100) : 0 },
      { tier: "tier2", revenue: totalTier2, count: Math.round(totalTier2 / TIER_PRICING.tier2), percentage: totalRevenue > 0 ? Math.round((totalTier2 / totalRevenue) * 100) : 0 },
      { tier: "tier3", revenue: totalTier3, count: Math.round(totalTier3 / TIER_PRICING.tier3), percentage: totalRevenue > 0 ? Math.round((totalTier3 / totalRevenue) * 100) : 0 },
    ],
    revenueGrowthRate,
    dataPoints,
  };
}

// ─── Full Dashboard ────────────────────────────────────────────

export function getFullAnalyticsDashboard(range: DateRange): AnalyticsDashboard {
  return {
    growth: getGrowthAnalytics(range),
    engagement: getEngagementAnalytics(range),
    retention: getRetentionAnalytics(range),
    coachPerformance: getCoachPerformance(range),
    platformHealth: getPlatformHealth(),
    revenue: getRevenueAnalytics(range),
    generatedAt: new Date().toISOString(),
  };
}

// ─── KPI Generation ────────────────────────────────────────────

export function getKPIs(range: DateRange): KPIData[] {
  const growth = getGrowthAnalytics(range);
  const engagement = getEngagementAnalytics(range);
  const revenue = getRevenueAnalytics(range);
  const baseSeed = hashString(range.startDate + "kpis");

  return [
    {
      label: "Total Users",
      value: String(growth.totalUsers),
      numericValue: growth.totalUsers,
      trend: growth.growthRate,
      trendLabel: "this period",
      icon: "users",
    },
    {
      label: "Active Clients",
      value: String(engagement.avgDailyActiveUsers),
      numericValue: engagement.avgDailyActiveUsers,
      trend: seededFloat(baseSeed + 1, 2, 12),
      trendLabel: "this month",
      icon: "heart",
    },
    {
      label: "Active Coaches",
      value: String(DEMO_COACHES.length),
      numericValue: DEMO_COACHES.length,
      trend: 0,
      trendLabel: "stable",
      icon: "star",
    },
    {
      label: "MRR",
      value: formatCurrency(revenue.mrr),
      numericValue: revenue.mrr,
      trend: revenue.revenueGrowthRate,
      trendLabel: "monthly growth",
      icon: "dollar",
    },
    {
      label: "Churn Rate",
      value: `${growth.churnRate}%`,
      numericValue: growth.churnRate,
      trend: seededFloat(baseSeed + 5, -2, 1),
      trendLabel: "30-day cohort",
      icon: "trending",
    },
    {
      label: "NPS Score",
      value: String(seededInt(baseSeed + 6, 65, 80)),
      numericValue: seededInt(baseSeed + 6, 65, 80),
      trend: seededFloat(baseSeed + 7, -3, 5),
      trendLabel: "last 30 days",
      icon: "star",
    },
  ];
}

// ─── Date Helpers ──────────────────────────────────────────────

function getMonthsBetween(start: string, end: string): string[] {
  const months: string[] = [];
  const startDate = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
  while (current <= endDate) {
    months.push(
      `${current.getFullYear()}-${String(current.getMonth() + 1).padStart(2, "0")}`
    );
    current.setMonth(current.getMonth() + 1);
  }

  // Ensure at least 3 months for useful analytics
  if (months.length < 3) {
    const first = new Date(months[0] + "-01");
    for (let i = months.length; i < 6; i++) {
      first.setMonth(first.getMonth() - 1);
      months.unshift(
        `${first.getFullYear()}-${String(first.getMonth() + 1).padStart(2, "0")}`
      );
    }
  }

  return months;
}

function getDaysBetween(start: string, end: string): string[] {
  const days: string[] = [];
  const current = new Date(start + "T00:00:00");
  const endDate = new Date(end + "T00:00:00");

  while (current <= endDate) {
    days.push(current.toISOString().split("T")[0]);
    current.setDate(current.getDate() + 1);
  }

  return days;
}

function hashString(str: string): number {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return Math.abs(hash);
}

// ─── Reset (for testing) ──────────────────────────────────────

export function resetAnalyticsEngine(): void {
  // No mutable state to reset — all computed from seeds.
  // This exists for API consistency with other engines.
}
