import { describe, it, expect } from "vitest";
import {
  getRevenueKPIs,
  getTopRevenueClients,
  getRecentPayouts,
  getRevenueBreakdown,
  getRevenueSources,
  getAdminRevenueData,
} from "../engine";

describe("Admin Revenue Engine", () => {
  describe("getRevenueKPIs", () => {
    it("returns 5 KPIs", () => {
      expect(getRevenueKPIs()).toHaveLength(5);
    });

    it("includes MRR starting with $", () => {
      const kpis = getRevenueKPIs();
      const mrr = kpis.find(k => k.label === "Platform MRR");
      expect(mrr).toBeDefined();
      expect(mrr!.value).toMatch(/^\$/);
    });

    it("ARR is approximately 12x MRR", () => {
      const kpis = getRevenueKPIs();
      const mrr = kpis.find(k => k.label === "Platform MRR")!;
      const arr = kpis.find(k => k.label === "Total ARR")!;
      const mrrNum = parseInt(mrr.value.replace(/[$,]/g, ""));
      const arrNum = parseInt(arr.value.replace(/[$,]/g, ""));
      expect(arrNum).toBeCloseTo(mrrNum * 12, -3);
    });

    it("is deterministic for same seed", () => {
      expect(getRevenueKPIs(42)).toEqual(getRevenueKPIs(42));
    });

    it("varies with different seeds", () => {
      const a = getRevenueKPIs(1);
      const b = getRevenueKPIs(99);
      expect(a[0].value).not.toEqual(b[0].value);
    });
  });

  describe("getTopRevenueClients", () => {
    it("returns 8 clients", () => {
      expect(getTopRevenueClients()).toHaveLength(8);
    });

    it("each client has tier, monthly, and lifetime", () => {
      for (const c of getTopRevenueClients()) {
        expect(c.tier).toMatch(/^Tier [1-3]$/);
        expect(c.monthly).toMatch(/^\$/);
        expect(c.lifetime).toMatch(/^\$/);
      }
    });

    it("is deterministic", () => {
      expect(getTopRevenueClients(7)).toEqual(getTopRevenueClients(7));
    });
  });

  describe("getRecentPayouts", () => {
    it("returns 6 payouts", () => {
      expect(getRecentPayouts()).toHaveLength(6);
    });

    it("each has Paid or Pending status", () => {
      for (const p of getRecentPayouts()) {
        expect(["Paid", "Pending"]).toContain(p.status);
      }
    });
  });

  describe("getRevenueBreakdown", () => {
    it("returns 6 months of data", () => {
      expect(getRevenueBreakdown()).toHaveLength(6);
    });

    it("each month has positive tier values", () => {
      for (const m of getRevenueBreakdown()) {
        expect(m.tier1).toBeGreaterThan(0);
        expect(m.tier2).toBeGreaterThan(0);
        expect(m.tier3).toBeGreaterThan(0);
      }
    });

    it("tier3 > tier2 > tier1 in later months", () => {
      const last = getRevenueBreakdown().at(-1)!;
      expect(last.tier3).toBeGreaterThan(last.tier2);
      expect(last.tier2).toBeGreaterThan(last.tier1);
    });
  });

  describe("getRevenueSources", () => {
    it("returns 4 sources", () => {
      expect(getRevenueSources()).toHaveLength(4);
    });

    it("percentages sum to 100", () => {
      const total = getRevenueSources().reduce((s, r) => s + r.percentage, 0);
      expect(total).toBe(100);
    });
  });

  describe("getAdminRevenueData", () => {
    it("returns all sections", () => {
      const data = getAdminRevenueData();
      expect(data.kpis).toHaveLength(5);
      expect(data.topClients).toHaveLength(8);
      expect(data.recentPayouts).toHaveLength(6);
      expect(data.breakdown).toHaveLength(6);
      expect(data.sources).toHaveLength(4);
    });
  });
});
