import { describe, it, expect } from "vitest";
import { BIOMARKERS, PANELS, flagResult } from "../panels";

describe("Biomarker Definitions", () => {
  it("has all required fields for each biomarker", () => {
    for (const [key, bio] of Object.entries(BIOMARKERS)) {
      expect(bio.id).toBe(key);
      expect(bio.name).toBeTruthy();
      expect(bio.unit).toBeTruthy();
      expect(bio.category).toBeTruthy();
      expect(bio.optimalRange.min).toBeLessThan(bio.optimalRange.max);
      expect(bio.referenceRange.min).toBeLessThan(bio.referenceRange.max);
    }
  });

  it("has optimal range max within reference range max", () => {
    // Optimal ranges may extend below reference min (e.g., insulin: lower is better)
    // but should never exceed the reference max
    for (const bio of Object.values(BIOMARKERS)) {
      expect(bio.optimalRange.max).toBeLessThanOrEqual(bio.referenceRange.max);
    }
  });
});

describe("Lab Panels", () => {
  it("has at least 5 panels defined", () => {
    expect(PANELS.length).toBeGreaterThanOrEqual(5);
  });

  it("ultimate panel includes all biomarkers", () => {
    const ultimate = PANELS.find((p) => p.id === "kairos_ultimate");
    expect(ultimate).toBeTruthy();
    expect(ultimate!.biomarkers.length).toBe(Object.keys(BIOMARKERS).length);
  });

  it("each panel has valid biomarker references", () => {
    const allBioIds = new Set(Object.keys(BIOMARKERS));
    for (const panel of PANELS) {
      for (const bio of panel.biomarkers) {
        expect(allBioIds.has(bio.id)).toBe(true);
      }
    }
  });
});

describe("Result Flagging", () => {
  const vitD = BIOMARKERS.vitamin_d;

  it("flags optimal values", () => {
    expect(flagResult(65, vitD)).toBe("optimal"); // 50-80
  });

  it("flags normal (in reference but not optimal)", () => {
    expect(flagResult(35, vitD)).toBe("normal"); // 30-100 ref, but below 50 optimal
  });

  it("flags low values", () => {
    expect(flagResult(20, vitD)).toBe("low"); // below 30 ref
  });

  it("flags critical low values", () => {
    expect(flagResult(5, vitD)).toBe("critical_low"); // below 10
  });

  it("flags high values", () => {
    const triglycerides = BIOMARKERS.triglycerides;
    expect(flagResult(200, triglycerides)).toBe("high"); // above 150 ref
  });

  it("flags critical high values", () => {
    const triglycerides = BIOMARKERS.triglycerides;
    expect(flagResult(600, triglycerides)).toBe("critical_high"); // above 500
  });
});
