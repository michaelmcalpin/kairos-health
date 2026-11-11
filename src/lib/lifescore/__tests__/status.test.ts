import { describe, it, expect } from "vitest";
import { deriveLifeScoreStatus } from "../status";

const base = { core: 80, physical: 80, mental: 80, physicalSentiment: "steady", mentalSentiment: "steady", activeAlerts: 0, focus: [] as Array<{ label: string; score: number }> };

describe("deriveLifeScoreStatus", () => {
  it("stable when scores are good", () => {
    expect(deriveLifeScoreStatus(base)).toMatchObject({ status: "stable", reason: "On track", trend: "flat" });
  });
  it("no scores → insufficient data, unless alerts pile up", () => {
    const none = { ...base, core: null, physical: null, mental: null, physicalSentiment: "no_data", mentalSentiment: "no_data" };
    expect(deriveLifeScoreStatus(none).status).toBe("insufficient_data");
    expect(deriveLifeScoreStatus({ ...none, activeAlerts: 4 })).toMatchObject({ status: "critical", reason: "4 open alerts" });
  });
  it("names the weakest physical measure", () => {
    const r = deriveLifeScoreStatus({ ...base, physical: 55, core: 70, focus: [{ label: "Time asleep", score: 38 }] });
    expect(r).toMatchObject({ status: "attention", reason: "Time asleep low (38/100)" });
  });
  it("critical when physical is very low or both sides trend down", () => {
    expect(deriveLifeScoreStatus({ ...base, physical: 40 }).status).toBe("critical");
    expect(deriveLifeScoreStatus({ ...base, physicalSentiment: "struggling", mentalSentiment: "struggling" }))
      .toMatchObject({ status: "critical", trend: "down" });
  });
  it("mental reasons stay general", () => {
    expect(deriveLifeScoreStatus({ ...base, mentalSentiment: "struggling" }).reason).toBe("Mental trending down");
    expect(deriveLifeScoreStatus({ ...base, mental: 50 }).reason).toBe("Mental 50/100");
  });
  it("alerts drive status and lead the reason", () => {
    expect(deriveLifeScoreStatus({ ...base, activeAlerts: 2 })).toMatchObject({ status: "attention", reason: "2 open alerts" });
  });
});
