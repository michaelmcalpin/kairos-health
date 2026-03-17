import { describe, it, expect } from "vitest";
import {
  getContentItems,
  getContentStats,
  filterContent,
  getContentLibrary,
} from "../engine";

describe("Content Management Engine", () => {
  describe("getContentItems", () => {
    it("returns 8 content items", () => {
      expect(getContentItems()).toHaveLength(8);
    });

    it("each item has required fields", () => {
      for (const item of getContentItems()) {
        expect(item.id).toBeTruthy();
        expect(item.title).toBeTruthy();
        expect(["Protocols", "Articles", "Videos", "Guides"]).toContain(item.category);
        expect(["Published", "Draft", "Review"]).toContain(item.status);
        expect(item.author).toBeTruthy();
        expect(item.publishDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("published items have positive view counts", () => {
      const items = getContentItems();
      const published = items.filter(i => i.status === "Published");
      expect(published.length).toBeGreaterThan(0);
      for (const p of published) {
        expect(p.viewCount).toBeGreaterThan(0);
      }
    });

    it("draft items have zero views", () => {
      const items = getContentItems();
      const drafts = items.filter(i => i.status === "Draft");
      for (const d of drafts) {
        expect(d.viewCount).toBe(0);
      }
    });

    it("is deterministic for same seed", () => {
      expect(getContentItems(42)).toEqual(getContentItems(42));
    });
  });

  describe("getContentStats", () => {
    it("reports correct stat totals", () => {
      const items = getContentItems();
      const stats = getContentStats(items);
      expect(stats.total).toBeGreaterThan(items.length);
      expect(stats.published).toBeGreaterThan(0);
      expect(stats.drafts).toBeGreaterThan(0);
      expect(stats.inReview).toBeGreaterThan(0);
    });
  });

  describe("filterContent", () => {
    const items = getContentItems();

    it("returns all items with no filter", () => {
      expect(filterContent(items, "", "All")).toHaveLength(items.length);
    });

    it("filters by category", () => {
      const protocols = filterContent(items, "", "Protocols");
      expect(protocols.every(i => i.category === "Protocols")).toBe(true);
      expect(protocols.length).toBeGreaterThan(0);
      expect(protocols.length).toBeLessThan(items.length);
    });

    it("filters by search query (case-insensitive)", () => {
      const results = filterContent(items, "fasting", "All");
      expect(results.length).toBeGreaterThan(0);
      expect(results.every(i => i.title.toLowerCase().includes("fasting"))).toBe(true);
    });

    it("combines search and category", () => {
      const results = filterContent(items, "supplement", "Protocols");
      for (const r of results) {
        expect(r.category).toBe("Protocols");
        expect(r.title.toLowerCase()).toContain("supplement");
      }
    });

    it("returns empty for non-matching query", () => {
      expect(filterContent(items, "xyznonexistent", "All")).toHaveLength(0);
    });
  });

  describe("getContentLibrary", () => {
    it("returns items and stats", () => {
      const lib = getContentLibrary();
      expect(lib.items.length).toBeGreaterThan(0);
      expect(lib.stats.total).toBeGreaterThan(0);
    });
  });
});
