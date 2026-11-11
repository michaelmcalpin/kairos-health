import { describe, it, expect } from "vitest";
import { rangePosition, rangeLayout, formatRange } from "../range";
import { labReviewState, isClientVisible, needsCoachReview, initialReviewFields, reviewHints } from "../review";
import { buildMarkerTrends, groupMarkers, markerCounts } from "../trends";
import { normalizeBiomarkers, normalizeCode, biomarkerName } from "../normalize";

describe("rangePosition", () => {
  it("two-sided range fills the middle half", () => {
    expect(rangePosition(70, 70, 100)).toMatchObject({ pct: 25, zone: "in", inStart: 25, inEnd: 75 });
    expect(rangePosition(85, 70, 100)!.pct).toBe(50);
    expect(rangePosition(100, 70, 100)).toMatchObject({ pct: 75, zone: "in" });
    expect(rangePosition(115, 70, 100)).toMatchObject({ pct: 100, zone: "high", clamped: false });
    expect(rangePosition(400, 70, 100)).toMatchObject({ pct: 100, zone: "high", clamped: true });
    expect(rangePosition(10, 70, 100)).toMatchObject({ pct: 0, zone: "low", clamped: true });
  });

  it("keeps a just-out-of-range dot outside the in-range zone", () => {
    const p = rangePosition(100.1, 70, 100)!;
    expect(p.zone).toBe("high");
    expect(p.pct).toBeGreaterThan(75);
  });

  it("0-based range has no low zone", () => {
    expect(rangeLayout(0, 100)).toEqual({ inStart: 0, inEnd: 75 });
    expect(rangePosition(50, 0, 100)).toMatchObject({ pct: 37.5, zone: "in" });
    expect(rangePosition(130, 0, 100)).toMatchObject({ pct: 97.5, zone: "high" });
  });

  it("one-sided limits", () => {
    expect(rangePosition(60, 60, null)).toMatchObject({ pct: 40, zone: "in" });
    expect(rangePosition(45, 60, null)!.zone).toBe("low");
    expect(rangePosition(65, null, 130)).toMatchObject({ pct: 30, zone: "in" });
    expect(rangePosition(150, null, 130)!.zone).toBe("high");
  });

  it("no range → null (no bar, no status)", () => {
    expect(rangePosition(5, null, null)).toBeNull();
    expect(rangePosition(5, 10, 5)).toBeNull();
    expect(rangePosition(NaN, 1, 2)).toBeNull();
  });

  it("formats ranges", () => {
    expect(formatRange(70, 100, "mg/dL")).toBe("70–100 mg/dL");
    expect(formatRange(60, null)).toBe("≥ 60");
    expect(formatRange(null, 130, "mg/dL")).toBe("≤ 130 mg/dL");
    expect(formatRange(null, null)).toBeNull();
  });
});

describe("review state", () => {
  it("pending until released; reviewed once a coach signs off", () => {
    expect(labReviewState({ releasedAt: null, reviewedAt: null })).toBe("pending_review");
    expect(labReviewState({ releasedAt: new Date(), reviewedAt: null })).toBe("released_unreviewed");
    expect(labReviewState({ releasedAt: "2026-01-01", reviewedAt: "2026-01-01" })).toBe("released");
    expect(isClientVisible({ releasedAt: null, reviewedAt: new Date() })).toBe(false);
    expect(needsCoachReview({ releasedAt: new Date(), reviewedAt: null })).toBe(true);
    expect(needsCoachReview({ releasedAt: new Date(), reviewedAt: new Date() })).toBe(false);
  });

  it("only typed-in client values are visible straight away", () => {
    const now = new Date("2026-11-11T10:00:00Z");
    expect(initialReviewFields("client_manual", now)).toEqual({ releasedAt: now, reviewedAt: null });
    for (const s of ["client_parsed", "client_import", "coach", "url_import", "pdf_upload"] as const) {
      expect(initialReviewFields(s, now).releasedAt).toBeNull();
    }
  });
});

describe("reviewHints", () => {
  it("flags unit mismatch, far-out values and big changes", () => {
    const h = reviewHints({ code: "GLUCOSE", value: 5.4, unit: "mmol/L", refLow: 70, refHigh: 100 });
    expect(h.map((x) => x.kind)).toEqual(["unit_mismatch", "far_out_of_range"]);

    const h2 = reviewHints({ code: "LDL", value: 160, unit: "mg/dL", refLow: 0, refHigh: 100 }, { value: 100, unit: "mg/dL" });
    expect(h2.map((x) => x.kind)).toEqual(["out_of_range", "big_change"]);
    expect(h2[1].message).toBe("Up 60% since last panel");

    expect(reviewHints({ code: "XYZ", value: 1, unit: null, refLow: null, refHigh: null }).map((x) => x.kind)).toEqual(["no_unit", "no_range"]);
    expect(reviewHints({ code: "HDL", value: 55, unit: "mg/dL", refLow: 40, refHigh: 100 }, { value: 50, unit: "mg/dL" })).toEqual([]);
  });

  it("doesn't compare across different units", () => {
    expect(reviewHints({ code: "VITAMIN_D", value: 100, unit: "nmol/L", refLow: 75, refHigh: 250 }, { value: 40, unit: "ng/mL" })
      .some((x) => x.kind === "big_change")).toBe(false);
  });
});

describe("marker trends", () => {
  const panels = [
    { resultId: "b", date: "2025-02-10", markers: [
      { code: "LDL_CHOLESTEROL", value: 120, unit: "mg/dL", refLow: 0, refHigh: 100, status: "high" },
      { code: "VITAMIN_D", value: 42, unit: "ng/mL", refLow: 30, refHigh: 100, status: "normal", flagged: true },
      { code: "ALT", value: 30, unit: "U/L", refLow: null, refHigh: null, status: null },
    ] },
    { resultId: "a", date: "2024-03-01", markers: [
      { code: "LDL", value: 140, unit: "mg/dL", refLow: 0, refHigh: 100, status: "high" },
    ] },
  ];

  it("trends the same canonical code across panels, oldest first", () => {
    const t = buildMarkerTrends(panels);
    const ldl = t.find((x) => x.code === "LDL")!;
    expect(ldl.points.map((p) => p.value)).toEqual([140, 120]);
    expect(ldl.previous!.value).toBe(140);
    expect(ldl.name).toBe("LDL Cholesterol");
    expect(ldl.category).toBe("lipids");
    expect(ldl.status).toBe("high");
    expect(t.find((x) => x.code === "ALT")!.status).toBeNull();
  });

  it("groups by category and counts no-range markers separately", () => {
    const t = buildMarkerTrends(panels);
    expect(groupMarkers(t).map((g) => g.key)).toEqual(["lipids", "vitamins", "liver"]);
    expect(markerCounts(t)).toEqual({ total: 3, inRange: 1, outOfRange: 1, noRange: 1 });
    expect(t.find((x) => x.code === "VITAMIN_D")!.flagged).toBe(true);
  });
});

describe("catalog extensions", () => {
  it("maps common aliases and fills only known ranges", () => {
    expect(normalizeCode("SGPT")).toBe("ALT");
    expect(normalizeCode("eGFR")).toBe("EGFR");
    expect(normalizeCode("Apolipoprotein B")).toBe("APOB");
    expect(biomarkerName("PLT")).toBe("Platelets");
    const [na, alt, egfr] = normalizeBiomarkers([
      { code: "Sodium", value: 150 },
      { code: "ALT", value: 80 },
      { code: "GFR", value: 55, unit: "mL/min/1.73m2" },
    ]);
    expect(na).toMatchObject({ code: "SODIUM", unit: "mmol/L", refLow: 135, refHigh: 145, status: "high" });
    expect(alt).toMatchObject({ code: "ALT", unit: "U/L", refLow: null, refHigh: null, status: null });
    expect(egfr).toMatchObject({ refLow: 60, refHigh: null, status: "low" });
  });
});
