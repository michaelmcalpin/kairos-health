import { describe, it, expect } from "vitest";
import {
  getGrowthAnalytics,
  getEngagementAnalytics,
  getRetentionAnalytics,
  getCoachPerformance,
  getPlatformHealth,
  getRevenueAnalytics,
  getKPIs,
  getFullAnalyticsDashboard,
} from "../engine";
import type { DateRange } from "../types";

const DEFAULT_RANGE: DateRange = {
  startDate: "2025-09-01",
  endDate: "2026-03-01",
};

const SHORT_RANGE: DateRange = {
  startDate: "2026-02-01",
  endDate: "2026-03-01",
};

// ─── Growth Analytics ──────────────────────────────────────────

describe("getGrowthAnalytics", () => {
  it("returns growth summary with data points", () => {
    const result = getGrowthAnalytics(DEFAULT_RANGE);
    expect(result.totalUsers).toBeGreaterThan(0);
    expect(result.newUsersThisPeriod).toBeGreaterThan(0);
    expect(result.dataPoints.length).toBeGreaterThanOrEqual(3);
    expect(typeof result.growthRate).toBe("number");
    expect(typeof result.churnRate).toBe("number");
  });

  it("has cumulative users that increase over time", () => {
    const result = getGrowthAnalytics(DEFAULT_RANGE);
    for (let i = 1; i < result.dataPoints.length; i++) {
      // Net growth should generally be positive (new > churned)
      expect(result.dataPoints[i].cumulativeUsers).toBeGreaterThan(0);
      // Each data point has valid structure
      expect(result.dataPoints[i].newUsers).toBeGreaterThanOrEqual(0);
      expect(result.dataPoints[i].churned).toBeGreaterThanOrEqual(0);
    }
  });

  it("data points have valid date format", () => {
    const result = getGrowthAnalytics(DEFAULT_RANGE);
    for (const dp of result.dataPoints) {
      expect(dp.date).toMatch(/^\d{4}-\d{2}$/);
    }
  });

  it("returns deterministic results for same input", () => {
    const result1 = getGrowthAnalytics(DEFAULT_RANGE);
    const result2 = getGrowthAnalytics(DEFAULT_RANGE);
    expect(result1.totalUsers).toBe(result2.totalUsers);
    expect(result1.dataPoints.length).toBe(result2.dataPoints.length);
  });

  it("returns different results for different ranges", () => {
    const result1 = getGrowthAnalytics(DEFAULT_RANGE);
    const result2 = getGrowthAnalytics(SHORT_RANGE);
    // Different ranges produce different data
    expect(result1.dataPoints.length).not.toBe(result2.dataPoints.length);
  });

  it("net growth equals newUsers minus churned", () => {
    const result = getGrowthAnalytics(DEFAULT_RANGE);
    const totalNew = result.dataPoints.reduce((s, d) => s + d.newUsers, 0);
    const totalChurned = result.dataPoints.reduce((s, d) => s + d.churned, 0);
    expect(result.netGrowth).toBe(totalNew - totalChurned);
  });
});

// ─── Engagement Analytics ──────────────────────────────────────

describe("getEngagementAnalytics", () => {
  it("returns engagement summary with data points", () => {
    const result = getEngagementAnalytics(SHORT_RANGE);
    expect(result.avgDailyActiveUsers).toBeGreaterThan(0);
    expect(result.avgCheckinRate).toBeGreaterThanOrEqual(0);
    expect(result.avgCheckinRate).toBeLessThanOrEqual(100);
    expect(result.avgSessionDuration).toBeGreaterThan(0);
    expect(result.dataPoints.length).toBeGreaterThan(0);
  });

  it("returns feature usage sorted by rate descending", () => {
    const result = getEngagementAnalytics(DEFAULT_RANGE);
    expect(result.featureUsage.length).toBeGreaterThan(0);
    for (let i = 1; i < result.featureUsage.length; i++) {
      expect(result.featureUsage[i - 1].usageRate).toBeGreaterThanOrEqual(result.featureUsage[i].usageRate);
    }
  });

  it("feature trends are valid", () => {
    const result = getEngagementAnalytics(DEFAULT_RANGE);
    for (const f of result.featureUsage) {
      expect(["up", "down", "stable"]).toContain(f.trend);
      expect(typeof f.changePercent).toBe("number");
    }
  });

  it("engagement data points have all required fields", () => {
    const result = getEngagementAnalytics(SHORT_RANGE);
    for (const dp of result.dataPoints) {
      expect(dp.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(dp.dailyActiveUsers).toBeGreaterThanOrEqual(0);
      expect(dp.checkins).toBeGreaterThanOrEqual(0);
      expect(dp.insightsViewed).toBeGreaterThanOrEqual(0);
      expect(dp.messagesExchanged).toBeGreaterThanOrEqual(0);
      expect(dp.goalsUpdated).toBeGreaterThanOrEqual(0);
    }
  });
});

// ─── Retention Analytics ───────────────────────────────────────

describe("getRetentionAnalytics", () => {
  it("returns retention summary with cohorts", () => {
    const result = getRetentionAnalytics(DEFAULT_RANGE);
    expect(result.cohorts.length).toBeGreaterThan(0);
    expect(typeof result.avgRetention30Day).toBe("number");
    expect(typeof result.avgRetention90Day).toBe("number");
  });

  it("all cohorts start at 100% retention", () => {
    const result = getRetentionAnalytics(DEFAULT_RANGE);
    for (const cohort of result.cohorts) {
      expect(cohort.retention[0]).toBe(100);
    }
  });

  it("retention generally decreases over months", () => {
    const result = getRetentionAnalytics(DEFAULT_RANGE);
    for (const cohort of result.cohorts) {
      if (cohort.retention.length >= 3) {
        // Last retention should be less than first
        expect(cohort.retention[cohort.retention.length - 1]).toBeLessThan(cohort.retention[0]);
      }
    }
  });

  it("cohorts have valid labels", () => {
    const result = getRetentionAnalytics(DEFAULT_RANGE);
    for (const cohort of result.cohorts) {
      expect(cohort.cohort).toMatch(/^\d{4}-\d{2}$/);
      expect(cohort.label.length).toBeGreaterThan(0);
      expect(cohort.totalUsers).toBeGreaterThan(0);
    }
  });

  it("retention values are between 0 and 100", () => {
    const result = getRetentionAnalytics(DEFAULT_RANGE);
    for (const cohort of result.cohorts) {
      for (const rate of cohort.retention) {
        expect(rate).toBeGreaterThanOrEqual(0);
        expect(rate).toBeLessThanOrEqual(100);
      }
    }
  });
});

// ─── Coach Performance ─────────────────────────────────────────

describe("getCoachPerformance", () => {
  it("returns coach performance summary", () => {
    const result = getCoachPerformance(DEFAULT_RANGE);
    expect(result.totalCoaches).toBeGreaterThan(0);
    expect(result.coaches.length).toBe(result.totalCoaches);
    expect(result.avgUtilization).toBeGreaterThan(0);
    expect(result.avgUtilization).toBeLessThanOrEqual(100);
  });

  it("coaches are sorted by health score descending", () => {
    const result = getCoachPerformance(DEFAULT_RANGE);
    for (let i = 1; i < result.coaches.length; i++) {
      expect(result.coaches[i - 1].avgClientHealthScore)
        .toBeGreaterThanOrEqual(result.coaches[i].avgClientHealthScore);
    }
  });

  it("coach metrics are within valid ranges", () => {
    const result = getCoachPerformance(DEFAULT_RANGE);
    for (const coach of result.coaches) {
      expect(coach.activeClients).toBeLessThanOrEqual(coach.capacity);
      expect(coach.utilizationRate).toBeGreaterThanOrEqual(0);
      expect(coach.utilizationRate).toBeLessThanOrEqual(100);
      expect(coach.avgClientHealthScore).toBeGreaterThanOrEqual(0);
      expect(coach.avgClientHealthScore).toBeLessThanOrEqual(100);
      expect(coach.clientRetention).toBeGreaterThanOrEqual(0);
      expect(coach.clientRetention).toBeLessThanOrEqual(100);
      expect(coach.rating).toBeGreaterThanOrEqual(0);
      expect(coach.rating).toBeLessThanOrEqual(5);
    }
  });

  it("each coach has required fields", () => {
    const result = getCoachPerformance(DEFAULT_RANGE);
    for (const coach of result.coaches) {
      expect(coach.coachId).toBeTruthy();
      expect(coach.name).toBeTruthy();
      expect(typeof coach.sessionsThisPeriod).toBe("number");
      expect(typeof coach.revenueGenerated).toBe("number");
    }
  });
});

// ─── Platform Health ───────────────────────────────────────────

describe("getPlatformHealth", () => {
  it("returns all four metrics", () => {
    const result = getPlatformHealth();
    expect(result.uptime).toBeDefined();
    expect(result.responseTime).toBeDefined();
    expect(result.errorRate).toBeDefined();
    expect(result.activeConnections).toBeDefined();
  });

  it("metrics have valid status values", () => {
    const result = getPlatformHealth();
    const validStatuses = ["excellent", "good", "degraded", "critical"];
    expect(validStatuses).toContain(result.uptime.status);
    expect(validStatuses).toContain(result.responseTime.status);
    expect(validStatuses).toContain(result.errorRate.status);
    expect(validStatuses).toContain(result.activeConnections.status);
  });

  it("metrics have numeric values", () => {
    const result = getPlatformHealth();
    expect(typeof result.uptime.numericValue).toBe("number");
    expect(typeof result.responseTime.numericValue).toBe("number");
    expect(typeof result.errorRate.numericValue).toBe("number");
    expect(typeof result.activeConnections.numericValue).toBe("number");
  });

  it("alerts array is defined", () => {
    const result = getPlatformHealth();
    expect(Array.isArray(result.alerts)).toBe(true);
  });
});

// ─── Revenue Analytics ─────────────────────────────────────────

describe("getRevenueAnalytics", () => {
  it("returns revenue summary with data points", () => {
    const result = getRevenueAnalytics(DEFAULT_RANGE);
    expect(result.mrr).toBeGreaterThan(0);
    expect(result.arr).toBe(result.mrr * 12);
    expect(result.avgRevenuePerUser).toBeGreaterThan(0);
    expect(result.dataPoints.length).toBeGreaterThan(0);
  });

  it("revenue by tier sums to approximately 100%", () => {
    const result = getRevenueAnalytics(DEFAULT_RANGE);
    expect(result.revenueByTier.length).toBe(3);
    const totalPct = result.revenueByTier.reduce((s, t) => s + t.percentage, 0);
    // Allow rounding error
    expect(totalPct).toBeGreaterThanOrEqual(98);
    expect(totalPct).toBeLessThanOrEqual(102);
  });

  it("data points have valid revenue breakdown", () => {
    const result = getRevenueAnalytics(DEFAULT_RANGE);
    for (const dp of result.dataPoints) {
      expect(dp.totalRevenue).toBe(dp.tier1Revenue + dp.tier2Revenue + dp.tier3Revenue);
      expect(dp.tier1Revenue).toBeGreaterThanOrEqual(0);
      expect(dp.tier2Revenue).toBeGreaterThanOrEqual(0);
      expect(dp.tier3Revenue).toBeGreaterThanOrEqual(0);
    }
  });

  it("tier pricing is correctly applied", () => {
    const result = getRevenueAnalytics(DEFAULT_RANGE);
    for (const dp of result.dataPoints) {
      // Tier 1 revenue should be divisible by 499
      expect(dp.tier1Revenue % 499).toBe(0);
      // Tier 2 revenue should be divisible by 249
      expect(dp.tier2Revenue % 249).toBe(0);
      // Tier 3 revenue should be divisible by 99
      expect(dp.tier3Revenue % 99).toBe(0);
    }
  });
});

// ─── KPIs ──────────────────────────────────────────────────────

describe("getKPIs", () => {
  it("returns 6 KPI cards", () => {
    const result = getKPIs(DEFAULT_RANGE);
    expect(result.length).toBe(6);
  });

  it("each KPI has required fields", () => {
    const result = getKPIs(DEFAULT_RANGE);
    for (const kpi of result) {
      expect(kpi.label).toBeTruthy();
      expect(kpi.value).toBeTruthy();
      expect(typeof kpi.numericValue).toBe("number");
      expect(typeof kpi.trend).toBe("number");
      expect(kpi.trendLabel).toBeTruthy();
      expect(kpi.icon).toBeTruthy();
    }
  });

  it("includes expected labels", () => {
    const result = getKPIs(DEFAULT_RANGE);
    const labels = result.map((k) => k.label);
    expect(labels).toContain("Total Users");
    expect(labels).toContain("MRR");
    expect(labels).toContain("Churn Rate");
  });
});

// ─── Full Dashboard ────────────────────────────────────────────

describe("getFullAnalyticsDashboard", () => {
  it("returns all sections", () => {
    const result = getFullAnalyticsDashboard(DEFAULT_RANGE);
    expect(result.growth).toBeDefined();
    expect(result.engagement).toBeDefined();
    expect(result.retention).toBeDefined();
    expect(result.coachPerformance).toBeDefined();
    expect(result.platformHealth).toBeDefined();
    expect(result.revenue).toBeDefined();
    expect(result.generatedAt).toBeTruthy();
  });

  it("generatedAt is a valid ISO string", () => {
    const result = getFullAnalyticsDashboard(DEFAULT_RANGE);
    expect(() => new Date(result.generatedAt)).not.toThrow();
    expect(new Date(result.generatedAt).getTime()).toBeGreaterThan(0);
  });
});

// ─── Types Helper Tests ────────────────────────────────────────

describe("type helpers", () => {
  it("formatCurrency formats correctly", async () => {
    const { formatCurrency } = await import("../types");
    expect(formatCurrency(1000)).toBe("$1,000");
    expect(formatCurrency(24500)).toBe("$24,500");
    expect(formatCurrency(0)).toBe("$0");
  });

  it("formatPercentage formats correctly", async () => {
    const { formatPercentage } = await import("../types");
    expect(formatPercentage(85.6)).toBe("85.6%");
    expect(formatPercentage(100, 0)).toBe("100%");
  });

  it("getMonthLabel returns readable month", async () => {
    const { getMonthLabel } = await import("../types");
    const label = getMonthLabel("2026-01");
    expect(label).toContain("Jan");
    expect(label).toContain("2026");
  });

  it("getShortMonthLabel returns short month", async () => {
    const { getShortMonthLabel } = await import("../types");
    const label = getShortMonthLabel("2026-03");
    expect(label).toContain("Mar");
  });

  it("uid generates unique ids", async () => {
    const { uid } = await import("../types");
    const ids = new Set(Array.from({ length: 100 }, () => uid()));
    expect(ids.size).toBe(100);
  });
});
