import { describe, it, expect } from "vitest";
import { redactDosing, DosingStreamFilter, redactDosingDeep, buildDoseAllowlist } from "../clinical-guardrails";

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

  describe("client's own reference doses", () => {
    const allow = buildDoseAllowlist([
      { name: "BPC-157", dosage: "250", unit: "mcg", frequency: "twice a day", durationWeeks: 6 },
      { name: "Testosterone Cypionate", dosage: "100mg", unit: null, frequency: "every 7 days" },
      { name: "Peptide blend", dosage: "5", unit: "mg", frequency: null },
    ]);

    it("keeps a dose exactly as the client's list states it", () => {
      const r = redactDosing("Your BPC 157 entry says 250 mcg twice a day for 6 weeks.", allow);
      expect(r.text).toBe("Your BPC 157 entry says 250 mcg twice a day for 6 weeks.");
      expect(r.redacted).toBe(false);
    });

    it("matches a compound by its keyword (testosterone) and normalizes units", () => {
      const r = redactDosing("Testosterone: 100 mg every 7 days, per your list.", allow);
      expect(r.text).toContain("100 mg");
      expect(r.text).toContain("every 7 days");
    });

    it("still redacts a different amount or a new schedule for the same compound", () => {
      const r = redactDosing("You could raise BPC-157 to 500 mcg 3x/week.", allow);
      expect(r.text).not.toMatch(/500 mcg|3x\/week/);
    });

    it("never carries a listed dose over to another compound", () => {
      const r = redactDosing("TB-500 250 mcg twice a day", allow);
      expect(r.text).not.toContain("250 mcg");
    });

    it("a generic name like 'Peptide blend' doesn't unlock doses on any peptide line", () => {
      const r = redactDosing("Take GHK-Cu peptide 5 mg daily", allow);
      expect(r.text).not.toContain("5 mg");
    });

    it("works in the stream filter and report JSON", () => {
      const f = new DosingStreamFilter(allow);
      const out = f.push("BPC-157: 250 mc") + f.push("g twice a day\n") + f.flush();
      expect(out).toContain("250 mcg twice a day");
      expect(redactDosingDeep({ t: "BPC-157 250 mcg" }, allow).t).toBe("BPC-157 250 mcg");
    });
  });
});
