import { describe, it, expect } from "vitest";
import { redactDosing, DosingStreamFilter, redactDosingDeep } from "../clinical-guardrails";

describe("clinical guardrails", () => {
  it("strips peptide doses and schedules", () => {
    const r = redactDosing("- Add GHK-Cu 1-2mg, 3x/week\n- MOTS-c 10mg, 2x/week\n- Cycle Epithalon for 10 days");
    expect(r.redacted).toBe(true);
    expect(r.text).not.toMatch(/\d\s?mg|x\/week|10 days/);
    expect(r.text).toContain("GHK-Cu");
    expect(r.text).toContain("[dose set by your prescriber]");
  });

  it("leaves supplement doses alone", () => {
    const r = redactDosing("Vitamin D3 5,000 IU daily and magnesium glycinate 400 mg at night");
    expect(r.redacted).toBe(false);
    expect(r.text).toContain("5,000 IU");
  });

  it("removes sourcing language", () => {
    expect(redactDosing("BPC-157 from a research-market vial").text).not.toMatch(/research-market/);
  });

  it("catches a dose split across stream deltas and appends a care-team note", () => {
    const f = new DosingStreamFilter();
    let out = f.push("Consider tirzepatide 2.");
    out += f.push("5 mg once a week\nSleep is great.");
    out += f.flush();
    expect(out).not.toMatch(/2\.5 mg|once a week/);
    expect(out).toContain("Sleep is great.");
    expect(out).toMatch(/set by your prescriber/);
  });

  it("redacts strings inside report JSON", () => {
    const r = redactDosingDeep({ recs: [{ text: "Semaglutide 0.25 mg weekly" }], n: 3 });
    expect(r.recs[0].text).not.toMatch(/0\.25 mg/);
    expect(r.n).toBe(3);
  });
});
