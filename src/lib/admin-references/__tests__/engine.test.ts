import { describe, it, expect } from "vitest";
import {
  getReferences,
  getReferenceStats,
  filterReferences,
  sortReferences,
  REFERENCE_CATEGORIES,
} from "../engine";

describe("Admin References Engine", () => {
  describe("getReferences", () => {
    it("returns 10 references", () => {
      expect(getReferences()).toHaveLength(10);
    });

    it("each reference has required fields", () => {
      for (const ref of getReferences()) {
        expect(ref.id).toBeTruthy();
        expect(ref.title).toBeTruthy();
        expect(ref.source).toBeTruthy();
        expect(ref.year).toBeGreaterThanOrEqual(2023);
        expect(ref.relevanceTags.length).toBeGreaterThan(0);
        expect(ref.citationCount).toBeGreaterThan(0);
      }
    });

    it("is deterministic for same seed", () => {
      expect(getReferences(42)).toEqual(getReferences(42));
    });

    it("varies citation counts by seed", () => {
      const a = getReferences(1)[0].citationCount;
      const b = getReferences(99)[0].citationCount;
      expect(a).not.toEqual(b);
    });
  });

  describe("getReferenceStats", () => {
    it("returns plausible stats", () => {
      const stats = getReferenceStats();
      expect(stats.total).toBeGreaterThan(0);
      expect(stats.recentlyAdded).toBeGreaterThan(0);
      expect(stats.mostCitedCategory).toBeTruthy();
    });
  });

  describe("filterReferences", () => {
    const refs = getReferences();

    it("returns all with no filter", () => {
      expect(filterReferences(refs, "", "All")).toHaveLength(refs.length);
    });

    it("filters by category", () => {
      const clinical = filterReferences(refs, "", "Clinical Studies");
      expect(clinical.length).toBeGreaterThan(0);
      expect(clinical.every(r => r.category === "Clinical Studies")).toBe(true);
    });

    it("filters by search query", () => {
      const results = filterReferences(refs, "rapamycin", "All");
      expect(results.length).toBeGreaterThan(0);
    });

    it("returns empty for non-matching query", () => {
      expect(filterReferences(refs, "xyznonexistent", "All")).toHaveLength(0);
    });
  });

  describe("sortReferences", () => {
    const refs = getReferences();

    it("sorts by date descending", () => {
      const sorted = sortReferences(refs, "date");
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].year).toBeGreaterThanOrEqual(sorted[i].year);
      }
    });

    it("sorts by citations descending", () => {
      const sorted = sortReferences(refs, "relevance");
      for (let i = 1; i < sorted.length; i++) {
        expect(sorted[i - 1].citationCount).toBeGreaterThanOrEqual(sorted[i].citationCount);
      }
    });
  });

  describe("REFERENCE_CATEGORIES", () => {
    it("has 6 entries including All", () => {
      expect(REFERENCE_CATEGORIES).toHaveLength(6);
      expect(REFERENCE_CATEGORIES[0]).toBe("All");
    });
  });
});
