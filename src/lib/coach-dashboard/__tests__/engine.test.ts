import { describe, it, expect, beforeEach } from "vitest";
import {
  getCoachDashboard,
  getCoachMetrics,
  getCoachRevenue,
} from "../engine";
import { resetCoachClientsStore } from "@/lib/coach-clients/engine";

const COACH_ID = "test-coach";
const RANGE = { startDate: "2026-02-01", endDate: "2026-02-28" };

beforeEach(() => {
  resetCoachClientsStore();
});

// ─── getCoachDashboard ──────────────────────────────────────────

describe("getCoachDashboard", () => {
  it("returns kpis, priorityClients, and todaySchedule", () => {
    const data = getCoachDashboard(COACH_ID, RANGE);
    expect(data.kpis).toBeInstanceOf(Array);
    expect(data.priorityClients).toBeInstanceOf(Array);
    expect(data.todaySchedule).toBeInstanceOf(Array);
  });

  it("returns 6 KPIs", () => {
    const data = getCoachDashboard(COACH_ID, RANGE);
    expect(data.kpis).toHaveLength(6);
  });

  it("KPIs have required fields", () => {
    const data = getCoachDashboard(COACH_ID, RANGE);
    for (const kpi of data.kpis) {
      expect(kpi.label).toBeTruthy();
      expect(kpi.value).toBeDefined();
      expect(["up", "down", "flat"]).toContain(kpi.trend);
      expect(kpi.trendValue).toBeTruthy();
      expect(kpi.icon).toBeTruthy();
    }
  });

  it("returns up to 4 priority clients", () => {
    const data = getCoachDashboard(COACH_ID, RANGE);
    expect(data.priorityClients.length).toBeGreaterThan(0);
    expect(data.priorityClients.length).toBeLessThanOrEqual(4);
  });

  it("priority clients have valid fields", () => {
    const data = getCoachDashboard(COACH_ID, RANGE);
    for (const c of data.priorityClients) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.initials).toBeTruthy();
      expect(c.healthScore).toBeGreaterThanOrEqual(0);
      expect(c.healthScore).toBeLessThanOrEqual(100);
    }
  });

  it("schedule entries have time, client, and type", () => {
    const data = getCoachDashboard(COACH_ID, RANGE);
    expect(data.todaySchedule.length).toBeGreaterThan(0);
    for (const s of data.todaySchedule) {
      expect(s.id).toBeTruthy();
      expect(s.time).toBeTruthy();
      expect(s.client).toBeTruthy();
      expect(s.type).toBeTruthy();
    }
  });

  it("is deterministic for same range", () => {
    const a = getCoachDashboard(COACH_ID, RANGE);
    resetCoachClientsStore();
    const b = getCoachDashboard(COACH_ID, RANGE);
    expect(a.kpis.map((k) => k.label)).toEqual(b.kpis.map((k) => k.label));
    expect(a.priorityClients.length).toBe(b.priorityClients.length);
  });

  it("returns different data for different ranges", () => {
    const a = getCoachDashboard(COACH_ID, RANGE);
    resetCoachClientsStore();
    const b = getCoachDashboard(COACH_ID, { startDate: "2025-06-01", endDate: "2025-06-30" });
    // Schedule IDs will differ due to uid()
    expect(a.todaySchedule.map((s) => s.id)).not.toEqual(b.todaySchedule.map((s) => s.id));
  });
});

// ─── getCoachMetrics ────────────────────────────────────────────

describe("getCoachMetrics", () => {
  it("returns all sections", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.kpis).toBeInstanceOf(Array);
    expect(data.healthDistribution).toBeInstanceOf(Array);
    expect(data.monthlyTrend).toBeInstanceOf(Array);
    expect(data.topClients).toBeInstanceOf(Array);
    expect(data.atRiskClients).toBeInstanceOf(Array);
    expect(data.protocols).toBeInstanceOf(Array);
    expect(data.sessionMetrics).toBeDefined();
    expect(data.clientSegments).toBeDefined();
  });

  it("returns 5 KPIs", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.kpis).toHaveLength(5);
  });

  it("health distribution has 5 buckets", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.healthDistribution).toHaveLength(5);
    const totalCount = data.healthDistribution.reduce((s, b) => s + b.count, 0);
    expect(totalCount).toBe(8); // 8 demo clients
  });

  it("health distribution percentages roughly sum to 100", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    const totalPct = data.healthDistribution.reduce((s, b) => s + b.percentage, 0);
    // Allow rounding error
    expect(totalPct).toBeGreaterThanOrEqual(98);
    expect(totalPct).toBeLessThanOrEqual(102);
  });

  it("monthly trend has 6 months", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.monthlyTrend).toHaveLength(6);
    for (const m of data.monthlyTrend) {
      expect(m.month).toBeTruthy();
      expect(m.revenue).toBeGreaterThan(0);
      expect(m.sessions).toBeGreaterThan(0);
      expect(m.newClients).toBeGreaterThanOrEqual(0);
    }
  });

  it("top clients sorted by score descending", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    for (let i = 1; i < data.topClients.length; i++) {
      expect(data.topClients[i - 1].score).toBeGreaterThanOrEqual(data.topClients[i].score);
    }
  });

  it("at-risk clients have required fields", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    for (const c of data.atRiskClients) {
      expect(c.id).toBeTruthy();
      expect(c.name).toBeTruthy();
      expect(c.issue).toBeTruthy();
      expect(c.daysSinceContact).toBeGreaterThan(0);
    }
  });

  it("protocols have valid adherence and outcome ranges", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.protocols).toHaveLength(4);
    for (const p of data.protocols) {
      expect(p.adherenceRate).toBeGreaterThanOrEqual(0);
      expect(p.adherenceRate).toBeLessThanOrEqual(100);
      expect(p.outcomeScore).toBeGreaterThanOrEqual(0);
      expect(p.outcomeScore).toBeLessThanOrEqual(10);
      expect(p.clientCount).toBeGreaterThan(0);
    }
  });

  it("session metrics are valid", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.sessionMetrics.totalSessions).toBeGreaterThan(0);
    expect(data.sessionMetrics.avgDuration).toBeGreaterThan(0);
    expect(data.sessionMetrics.completionRate).toBeGreaterThanOrEqual(0);
    expect(data.sessionMetrics.completionRate).toBeLessThanOrEqual(100);
    expect(data.sessionMetrics.noShowRate).toBeGreaterThanOrEqual(0);
  });

  it("client segments total matches", () => {
    const data = getCoachMetrics(COACH_ID, RANGE);
    expect(data.clientSegments.total).toBe(8);
  });
});

// ─── getCoachRevenue ────────────────────────────────────────────

describe("getCoachRevenue", () => {
  it("returns all sections", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.totalMonthlyRevenue).toBeGreaterThan(0);
    expect(data.totalCoachingFees).toBeGreaterThan(0);
    expect(data.totalSupplementMarkup).toBeGreaterThan(0);
    expect(data.clientRevenue).toBeInstanceOf(Array);
    expect(data.monthlyTrend).toBeInstanceOf(Array);
    expect(data.tierSummaries).toBeInstanceOf(Array);
    expect(data.recentTransactions).toBeInstanceOf(Array);
  });

  it("total revenue = coaching + supplement", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.totalMonthlyRevenue).toBe(data.totalCoachingFees + data.totalSupplementMarkup);
  });

  it("client revenue has 8 entries", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.clientRevenue).toHaveLength(8);
  });

  it("client revenue totals are correct", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    for (const cr of data.clientRevenue) {
      expect(cr.totalMonthly).toBe(cr.coachingFee + cr.supplementMarkup);
    }
  });

  it("coaching fees match tier pricing", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    const tierPrices: Record<string, number> = { tier1: 499, tier2: 249, tier3: 99 };
    for (const cr of data.clientRevenue) {
      expect(cr.coachingFee).toBe(tierPrices[cr.tier]);
    }
  });

  it("tier summaries cover all 3 tiers", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.tierSummaries).toHaveLength(3);
    const tiers = data.tierSummaries.map((t) => t.tier);
    expect(tiers).toContain("tier1");
    expect(tiers).toContain("tier2");
    expect(tiers).toContain("tier3");
  });

  it("tier summary client counts sum to 8", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    const totalClients = data.tierSummaries.reduce((s, t) => s + t.clientCount, 0);
    expect(totalClients).toBe(8);
  });

  it("monthly trend has 6 points", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.monthlyTrend).toHaveLength(6);
    for (const m of data.monthlyTrend) {
      expect(m.coaching).toBeGreaterThan(0);
      expect(m.supplement).toBeGreaterThan(0);
    }
  });

  it("recent transactions have valid fields", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.recentTransactions.length).toBeGreaterThan(0);
    for (const tx of data.recentTransactions) {
      expect(tx.id).toBeTruthy();
      expect(tx.date).toBeTruthy();
      expect(tx.client).toBeTruthy();
      expect(tx.type).toBeTruthy();
      expect(tx.amount).toBeGreaterThan(0);
      expect(["paid", "pending"]).toContain(tx.status);
    }
  });

  it("YTD total exceeds monthly", () => {
    const data = getCoachRevenue(COACH_ID, RANGE);
    expect(data.ytdTotal).toBeGreaterThan(data.totalMonthlyRevenue);
  });
});
