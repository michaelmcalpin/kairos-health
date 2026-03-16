// ─── Admin Coaches Engine Tests ──────────────────────────────────
import { describe, it, expect, beforeEach } from "vitest";
import {
  seedAdminCoaches,
  listAdminCoaches,
  getAdminCoach,
  getAdminCoachStats,
  filterAdminCoaches,
  getAdminDashboard,
  resetAdminCoachesStore,
} from "../engine";
// Types imported for reference: AdminCoach

beforeEach(() => {
  resetAdminCoachesStore();
});

// ─── seedAdminCoaches ───────────────────────────────────────────

describe("seedAdminCoaches", () => {
  it("populates the store with 12 coaches", () => {
    seedAdminCoaches();
    expect(listAdminCoaches()).toHaveLength(12);
  });

  it("is idempotent", () => {
    seedAdminCoaches();
    seedAdminCoaches();
    expect(listAdminCoaches()).toHaveLength(12);
  });

  it("assigns deterministic ids", () => {
    seedAdminCoaches();
    const coaches = listAdminCoaches();
    expect(coaches[0].id).toBe("coach_1");
    expect(coaches[11].id).toBe("coach_12");
  });
});

// ─── listAdminCoaches ───────────────────────────────────────────

describe("listAdminCoaches", () => {
  it("auto-seeds if store is empty", () => {
    const coaches = listAdminCoaches();
    expect(coaches.length).toBe(12);
  });

  it("returns AdminCoach objects with all required fields", () => {
    const coaches = listAdminCoaches();
    const coach = coaches[0];
    expect(coach).toHaveProperty("id");
    expect(coach).toHaveProperty("name");
    expect(coach).toHaveProperty("specialization");
    expect(coach).toHaveProperty("status");
    expect(coach).toHaveProperty("clientsAssigned");
    expect(coach).toHaveProperty("clientCapacity");
    expect(coach).toHaveProperty("revenueGenerated");
    expect(coach).toHaveProperty("avgHealthScore");
    expect(coach).toHaveProperty("responseTimeMin");
  });
});

// ─── getAdminCoach ──────────────────────────────────────────────

describe("getAdminCoach", () => {
  it("returns a coach by id", () => {
    seedAdminCoaches();
    const coach = getAdminCoach("coach_1");
    expect(coach).not.toBeNull();
    expect(coach!.name).toBe("Dr. Sarah Mitchell");
  });

  it("returns null for unknown id", () => {
    seedAdminCoaches();
    expect(getAdminCoach("coach_999")).toBeNull();
  });
});

// ─── getAdminCoachStats ─────────────────────────────────────────

describe("getAdminCoachStats", () => {
  it("returns correct total count", () => {
    const stats = getAdminCoachStats();
    expect(stats.totalCoaches).toBe(12);
  });

  it("active + on leave + pending = total", () => {
    const stats = getAdminCoachStats();
    expect(stats.activeCoaches + stats.onLeaveCoaches + stats.pendingCoaches).toBe(stats.totalCoaches);
  });

  it("has 10 active, 1 on leave, 1 pending", () => {
    const stats = getAdminCoachStats();
    expect(stats.activeCoaches).toBe(10);
    expect(stats.onLeaveCoaches).toBe(1);
    expect(stats.pendingCoaches).toBe(1);
  });

  it("totalClients is sum of active coaches clientsAssigned", () => {
    seedAdminCoaches();
    const coaches = listAdminCoaches().filter((c) => c.status === "Active");
    const expectedTotal = coaches.reduce((s, c) => s + c.clientsAssigned, 0);
    const stats = getAdminCoachStats();
    expect(stats.totalClients).toBe(expectedTotal);
  });

  it("totalRevenue is sum of active coaches revenueGenerated", () => {
    seedAdminCoaches();
    const coaches = listAdminCoaches().filter((c) => c.status === "Active");
    const expectedRevenue = coaches.reduce((s, c) => s + c.revenueGenerated, 0);
    const stats = getAdminCoachStats();
    expect(stats.totalRevenue).toBe(expectedRevenue);
  });

  it("avgHealthScore is mean of active coaches", () => {
    seedAdminCoaches();
    const active = listAdminCoaches().filter((c) => c.status === "Active");
    const expectedAvg = Math.round((active.reduce((s, c) => s + c.avgHealthScore, 0) / active.length) * 10) / 10;
    const stats = getAdminCoachStats();
    expect(stats.avgHealthScore).toBe(expectedAvg);
  });
});

// ─── filterAdminCoaches ─────────────────────────────────────────

describe("filterAdminCoaches", () => {
  it("returns all coaches with no filters", () => {
    expect(filterAdminCoaches()).toHaveLength(12);
  });

  it("returns all coaches with status 'All'", () => {
    expect(filterAdminCoaches({ status: "All" })).toHaveLength(12);
  });

  it("filters by Active status", () => {
    const active = filterAdminCoaches({ status: "Active" });
    expect(active).toHaveLength(10);
    expect(active.every((c) => c.status === "Active")).toBe(true);
  });

  it("filters by On Leave status", () => {
    const onLeave = filterAdminCoaches({ status: "On Leave" });
    expect(onLeave).toHaveLength(1);
    expect(onLeave[0].status).toBe("On Leave");
  });

  it("filters by Pending status", () => {
    const pending = filterAdminCoaches({ status: "Pending" });
    expect(pending).toHaveLength(1);
    expect(pending[0].status).toBe("Pending");
  });

  it("filters by name search", () => {
    const results = filterAdminCoaches({ search: "Sarah" });
    expect(results).toHaveLength(1);
    expect(results[0].name).toContain("Sarah");
  });

  it("filters by specialization search", () => {
    const results = filterAdminCoaches({ search: "longevity" });
    expect(results.length).toBeGreaterThan(0);
    expect(results.every((c) => c.specialization.toLowerCase().includes("longevity"))).toBe(true);
  });

  it("combines search and status filters", () => {
    const results = filterAdminCoaches({ search: "Dr.", status: "Active" });
    expect(results.length).toBe(10);
    expect(results.every((c) => c.status === "Active")).toBe(true);
  });

  it("returns empty array for no match", () => {
    expect(filterAdminCoaches({ search: "NonExistentName" })).toHaveLength(0);
  });
});

// ─── getAdminDashboard ──────────────────────────────────────────

describe("getAdminDashboard", () => {
  const range = { startDate: "2026-03-01", endDate: "2026-03-31" };

  it("returns kpis, coachPerformance, and recentActivity", () => {
    const data = getAdminDashboard(range);
    expect(data).toHaveProperty("kpis");
    expect(data).toHaveProperty("coachPerformance");
    expect(data).toHaveProperty("recentActivity");
  });

  it("returns 6 KPIs", () => {
    const data = getAdminDashboard(range);
    expect(data.kpis).toHaveLength(6);
  });

  it("KPIs have required fields", () => {
    const data = getAdminDashboard(range);
    for (const kpi of data.kpis) {
      expect(kpi).toHaveProperty("label");
      expect(kpi).toHaveProperty("value");
      expect(kpi).toHaveProperty("icon");
    }
  });

  it("returns top 5 coaches by revenue", () => {
    const data = getAdminDashboard(range);
    expect(data.coachPerformance.length).toBeLessThanOrEqual(5);
    // Should be sorted descending by revenue
    for (let i = 1; i < data.coachPerformance.length; i++) {
      expect(data.coachPerformance[i - 1].revenueGenerated).toBeGreaterThanOrEqual(
        data.coachPerformance[i].revenueGenerated
      );
    }
  });

  it("coach performance only includes active coaches", () => {
    const data = getAdminDashboard(range);
    expect(data.coachPerformance.every((c) => c.status === "Active")).toBe(true);
  });

  it("returns 5 recent activity entries", () => {
    const data = getAdminDashboard(range);
    expect(data.recentActivity).toHaveLength(5);
  });

  it("activity entries have required fields", () => {
    const data = getAdminDashboard(range);
    for (const item of data.recentActivity) {
      expect(item).toHaveProperty("id");
      expect(item).toHaveProperty("event");
      expect(item).toHaveProperty("detail");
      expect(item).toHaveProperty("time");
    }
  });

  it("produces deterministic results for same date range", () => {
    const data1 = getAdminDashboard(range);
    resetAdminCoachesStore();
    const data2 = getAdminDashboard(range);
    expect(data1.kpis.map((k) => k.value)).toEqual(data2.kpis.map((k) => k.value));
  });

  it("produces different results for different date ranges", () => {
    const data1 = getAdminDashboard({ startDate: "2026-01-01", endDate: "2026-01-31" });
    resetAdminCoachesStore();
    const data2 = getAdminDashboard({ startDate: "2026-06-01", endDate: "2026-06-30" });
    // At least one KPI trend value should differ
    const values1 = data1.kpis.map((k) => k.trendValue).join(",");
    const values2 = data2.kpis.map((k) => k.trendValue).join(",");
    expect(values1).not.toBe(values2);
  });
});

// ─── Coach seed data integrity ──────────────────────────────────

describe("seed data integrity", () => {
  it("on leave coaches have 0 clients and 0 revenue", () => {
    const onLeave = filterAdminCoaches({ status: "On Leave" });
    for (const c of onLeave) {
      expect(c.clientsAssigned).toBe(0);
      expect(c.revenueGenerated).toBe(0);
    }
  });

  it("pending coaches have 0 capacity, 0 clients, 0 revenue", () => {
    const pending = filterAdminCoaches({ status: "Pending" });
    for (const c of pending) {
      expect(c.clientCapacity).toBe(0);
      expect(c.clientsAssigned).toBe(0);
      expect(c.revenueGenerated).toBe(0);
    }
  });

  it("active coaches have positive revenue and clients", () => {
    const active = filterAdminCoaches({ status: "Active" });
    for (const c of active) {
      expect(c.revenueGenerated).toBeGreaterThan(0);
      expect(c.clientsAssigned).toBeGreaterThan(0);
      expect(c.avgHealthScore).toBeGreaterThan(0);
    }
  });

  it("active coaches clientsAssigned <= clientCapacity", () => {
    const active = filterAdminCoaches({ status: "Active" });
    for (const c of active) {
      expect(c.clientsAssigned).toBeLessThanOrEqual(c.clientCapacity);
    }
  });

  it("all coaches have a valid specialization", () => {
    const coaches = listAdminCoaches();
    const validSpecs = [
      "Longevity Medicine",
      "Metabolic Health",
      "Sleep Optimization",
      "Functional Medicine",
      "Nutrition Science",
      "Performance Medicine",
    ];
    for (const c of coaches) {
      expect(validSpecs).toContain(c.specialization);
    }
  });
});
