import { describe, it, expect } from "vitest";
import {
  getCompanies,
  getCompany,
  getCompanyStats,
  getCompanyTrainers,
  getCompanyClients,
  filterCompanies,
  getRoleLabel,
  getRolePath,
  COMPANY_STATUSES,
} from "../engine";

describe("Company Operations Engine", () => {
  describe("getCompanies", () => {
    it("returns 5 companies", () => {
      expect(getCompanies()).toHaveLength(5);
    });

    it("each company has required fields", () => {
      for (const co of getCompanies()) {
        expect(co.id).toBeTruthy();
        expect(co.name).toBeTruthy();
        expect(co.slug).toBeTruthy();
        expect(co.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(co.status).toBe("active");
        expect(co.maxTrainers).toBeGreaterThan(0);
        expect(co.maxClients).toBeGreaterThan(0);
        expect(co.trainerCount).toBeGreaterThan(0);
        expect(co.clientCount).toBeGreaterThan(0);
      }
    });

    it("is deterministic for same seed", () => {
      expect(getCompanies(42)).toEqual(getCompanies(42));
    });

    it("varies counts by seed", () => {
      const a = getCompanies(1)[0].clientCount;
      const b = getCompanies(99)[0].clientCount;
      expect(a).not.toEqual(b);
    });
  });

  describe("getCompany", () => {
    it("finds company by id", () => {
      const co = getCompany("company-1");
      expect(co).toBeDefined();
      expect(co!.name).toBe("Peak Performance Health");
    });

    it("returns undefined for missing id", () => {
      expect(getCompany("company-999")).toBeUndefined();
    });
  });

  describe("getCompanyStats", () => {
    it("returns plausible stats", () => {
      const stats = getCompanyStats();
      expect(stats.totalCompanies).toBe(5);
      expect(stats.activeCompanies).toBe(5);
      expect(stats.totalTrainers).toBeGreaterThan(10);
      expect(stats.totalClients).toBeGreaterThan(50);
      expect(stats.mrr).toBeGreaterThan(0);
    });
  });

  describe("getCompanyTrainers", () => {
    it("returns trainers for a company", () => {
      const trainers = getCompanyTrainers("company-1");
      expect(trainers.length).toBeGreaterThan(0);
      for (const t of trainers) {
        expect(t.id).toBeTruthy();
        expect(t.firstName).toBeTruthy();
        expect(t.email).toContain("@");
        expect(t.clientCount).toBeGreaterThan(0);
      }
    });

    it("returns empty for unknown company", () => {
      expect(getCompanyTrainers("company-999")).toHaveLength(0);
    });
  });

  describe("getCompanyClients", () => {
    it("returns clients for a company", () => {
      const clients = getCompanyClients("company-1");
      expect(clients.length).toBeGreaterThan(0);
      for (const c of clients) {
        expect(c.id).toBeTruthy();
        expect(["tier1", "tier2", "tier3"]).toContain(c.tier);
        expect(c.trainerId).toBeTruthy();
        expect(c.trainerName).toBeTruthy();
      }
    });
  });

  describe("filterCompanies", () => {
    const companies = getCompanies();

    it("returns all with no filter", () => {
      expect(filterCompanies(companies, "", "All")).toHaveLength(companies.length);
    });

    it("filters by search query", () => {
      const results = filterCompanies(companies, "peak", "All");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every((c) => c.name.toLowerCase().includes("peak") || c.slug.toLowerCase().includes("peak"))).toBe(true);
    });

    it("returns empty for non-matching query", () => {
      expect(filterCompanies(companies, "xyznonexistent", "All")).toHaveLength(0);
    });
  });

  describe("getRoleLabel", () => {
    it("returns correct labels", () => {
      expect(getRoleLabel("super_admin")).toBe("Super Admin");
      expect(getRoleLabel("company_admin")).toBe("Company Admin");
      expect(getRoleLabel("trainer")).toBe("Trainer");
      expect(getRoleLabel("client")).toBe("Client");
    });
  });

  describe("getRolePath", () => {
    it("returns correct paths", () => {
      expect(getRolePath("super_admin")).toBe("/super-admin/dashboard");
      expect(getRolePath("company_admin")).toBe("/company/dashboard");
      expect(getRolePath("trainer")).toBe("/trainer/dashboard");
      expect(getRolePath("client")).toBe("/dashboard");
    });
  });

  describe("COMPANY_STATUSES", () => {
    it("has 4 entries including All", () => {
      expect(COMPANY_STATUSES).toHaveLength(4);
      expect(COMPANY_STATUSES[0]).toBe("All");
    });
  });
});
