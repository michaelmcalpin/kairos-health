import { describe, it, expect } from "vitest";
import { normalizeBiomarkers, normalizeCode, biomarkerName } from "../normalize";

describe("lab normalization", () => {
  it("maps aliases to one code", () => {
    expect(normalizeCode("Hemoglobin A1c")).toBe("HBA1C");
    expect(normalizeCode("GLUCOSE")).toBe("GLUCOSE_FASTING");
    expect(normalizeCode("total_cholesterol")).toBe("TOTAL_CHOL");
    expect(biomarkerName("FREE_TESTOSTERONE")).toBe("Free testosterone");
  });
  it("fills catalog ranges, derives status, dedupes", () => {
    const out = normalizeBiomarkers([
      { code: "TOTAL_CHOLESTEROL", value: 230 },
      { code: "TOTAL_CHOL", value: 228 },
      { code: "FREE_TESTOSTERONE", value: 12, status: "normal" },
      { code: "LDL", value: 130, unit: "mmol/L" },
    ]);
    expect(out).toHaveLength(3);
    expect(out[0]).toMatchObject({ code: "TOTAL_CHOL", unit: "mg/dL", refLow: 125, refHigh: 200, status: "high" });
    expect(out[1].status).toBeNull(); // no range → no guessed "normal"
    expect(out[2]).toMatchObject({ refLow: null, refHigh: null }); // unit mismatch → no catalog range
  });
});
