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
  createCompany,
  updateCompany,
  performCompanyAction,
  listCompanies,
  getCompanyAuditLog,
  COMPANY_STATUSES,
} from "../engine";

describe("Company Operations Engine", () => {
  describe("getCompanies", () => {
    it("returns at least 5 seed companies", () => {
      expect(getCompanies().length).toBeGreaterThanOrEqual(5);
    });

    it("each company has required fields", () => {
      for (const co of getCompanies()) {
        expect(co.id).toBeTruthy();
        expect(co.name).toBeTruthy();
        expect(co.slug).toBeTruthy();
        expect(co.brandColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(co.maxTrainers).toBeGreaterThan(0);
        expect(co.maxClients).toBeGreaterThan(0);
      }
    });

    it("is deterministic across calls", () => {
      expect(getCompanies()).toEqual(getCompanies());
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
      expect(stats.totalCompanies).toBeGreaterThanOrEqual(5);
      expect(stats.activeCompanies).toBeGreaterThan(0);
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

  describe("createCompany", () => {
    it("creates a company with default values", () => {
      const co = createCompany({ name: "Test Health Co" });
      expect(co.id).toBeTruthy();
      expect(co.name).toBe("Test Health Co");
      expect(co.slug).toBe("test-health-co");
      expect(co.brandColor).toBe("#D4A574");
      expect(co.status).toBe("active");
      expect(co.trainerCount).toBe(0);
      expect(co.clientCount).toBe(0);
    });

    it("creates a company with custom fields", () => {
      const co = createCompany({
        name: "Custom Co",
        slug: "custom-co",
        brandColor: "#FF5500",
        website: "https://custom.co",
        maxTrainers: 20,
        maxClients: 200,
      });
      expect(co.brandColor).toBe("#FF5500");
      expect(co.website).toBe("https://custom.co");
      expect(co.maxTrainers).toBe(20);
      expect(co.maxClients).toBe(200);
    });

    it("throws on duplicate slug", () => {
      createCompany({ name: "Unique Co", slug: "unique-slug" });
      expect(() => createCompany({ name: "Another Co", slug: "unique-slug" })).toThrow("already exists");
    });

    it("appears in getCompanies after creation", () => {
      const before = getCompanies().length;
      createCompany({ name: "Visible Co" });
      expect(getCompanies().length).toBe(before + 1);
    });
  });

  describe("updateCompany", () => {
    it("updates company fields", () => {
      const co = createCompany({ name: "Update Test Co" });
      const updated = updateCompany(co.id, { name: "Renamed Co", brandColor: "#112233" });
      expect(updated.name).toBe("Renamed Co");
      expect(updated.brandColor).toBe("#112233");
    });

    it("throws for non-existent company", () => {
      expect(() => updateCompany("fake-id", { name: "Nope" })).toThrow("Company not found");
    });

    it("prevents duplicate slug on update", () => {
      const a = createCompany({ name: "Slug A", slug: "slug-a-unique" });
      createCompany({ name: "Slug B", slug: "slug-b-unique" });
      expect(() => updateCompany(a.id, { slug: "slug-b-unique" })).toThrow("already exists");
    });
  });

  describe("performCompanyAction", () => {
    it("suspends a company", () => {
      const co = createCompany({ name: "Suspendable Co" });
      const result = performCompanyAction(co.id, "suspend", "Testing");
      expect(result).not.toBeNull();
      expect(result!.status).toBe("suspended");
    });

    it("reactivates a suspended company", () => {
      const co = createCompany({ name: "Reactivate Co" });
      performCompanyAction(co.id, "suspend");
      const result = performCompanyAction(co.id, "reactivate");
      expect(result!.status).toBe("active");
    });

    it("deletes a company", () => {
      const co = createCompany({ name: "Delete Me Co" });
      const result = performCompanyAction(co.id, "delete");
      expect(result).toBeNull();
      expect(getCompany(co.id)).toBeUndefined();
    });

    it("throws for non-existent company", () => {
      expect(() => performCompanyAction("fake-id", "suspend")).toThrow("Company not found");
    });
  });

  describe("listCompanies", () => {
    it("returns paginated results", () => {
      const result = listCompanies({ page: 1, pageSize: 3 });
      expect(result.companies.length).toBeLessThanOrEqual(3);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(3);
      expect(result.total).toBeGreaterThan(0);
      expect(result.totalPages).toBeGreaterThan(0);
    });

    it("filters by search", () => {
      const result = listCompanies({ search: "peak" });
      expect(result.companies.length).toBeGreaterThan(0);
      expect(result.companies.every((c) => c.name.toLowerCase().includes("peak"))).toBe(true);
    });

    it("filters by status", () => {
      const co = createCompany({ name: "Filter Test Co" });
      performCompanyAction(co.id, "suspend");
      const result = listCompanies({ status: "suspended" });
      expect(result.companies.some((c) => c.id === co.id)).toBe(true);
    });
  });

  describe("getCompanyAuditLog", () => {
    it("returns audit entries", () => {
      const entries = getCompanyAuditLog(10);
      expect(entries.length).toBeGreaterThan(0);
      for (const e of entries) {
        expect(e.id).toBeTruthy();
        expect(e.action).toBeTruthy();
        expect(e.companyName).toBeTruthy();
        expect(e.timestamp).toBeTruthy();
      }
    });

    it("filters by companyId", () => {
      const co = createCompany({ name: "Audit Test Co" });
      updateCompany(co.id, { website: "https://audit.test" });
      const entries = getCompanyAuditLog(10, co.id);
      expect(entries.length).toBeGreaterThan(0);
      expect(entries.every((e) => e.companyId === co.id)).toBe(true);
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
