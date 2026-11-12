import { describe, it, expect } from "vitest";
import { buildLifeScoreActions, type ActionInput } from "../actions";

const base: ActionInput = {
  physicalScore: 70,
  mentalScore: 70,
  parts: [
    { key: "health_data", label: "Health data", score: 70, weight: 100, detail: null },
    { key: "labs", label: "Labs", score: null, weight: 0, detail: null },
    { key: "medications", label: "Medications", score: null, weight: 0, detail: null },
    { key: "genetics", label: "Genetics", score: null, weight: 0, detail: null },
  ],
  metrics: [
    { key: "sleep_total_min", label: "Time asleep", value: 366, score: 40, weight: 3 },
    { key: "steps", label: "Steps", value: 6000, score: 57, weight: 2 },
    { key: "spo2", label: "Blood oxygen", value: 97, score: 100, weight: 1 },
  ],
  healthWeightSum: 6,
  feelBlended: false,
  mentalAreas: [
    { dimension: "mind", score: 80, weight: 20 },
    { dimension: "purpose", score: 60, weight: 20 },
    { dimension: "relationships", score: 90, weight: 20 },
    { dimension: "work", score: 80, weight: 20 },
  ],
  mindful: null,
  mindfulMaxBonus: 6,
  checkinDays7: 7,
};

describe("buildLifeScoreActions", () => {
  it("estimates Core points from the score's own weights and sorts by gain", () => {
    const a = buildLifeScoreActions(base);
    // Sleep: (100-40) × 3/6 × 100% health × 0.6 physical = 18
    expect(a[0]).toMatchObject({ key: "metric:sleep_total_min", gain: 18, title: "Sleep 7–9 hours a night" });
    expect(a[0].detail).toContain("6h 6m");
    // Steps: 43 × 2/6 × 0.6 = 8.6
    expect(a.find((x) => x.key === "metric:steps")?.gain).toBe(8.6);
    expect(a.some((x) => x.key === "metric:spo2")).toBe(false); // already at target
  });

  it("suggests adding labs when there are none", () => {
    expect(buildLifeScoreActions(base).some((x) => x.key === "part:labs:add" && x.gain == null)).toBe(true);
  });

  it("mental: low areas, mindfulness and daily check-ins", () => {
    const a = buildLifeScoreActions({ ...base, checkinDays7: 3 });
    // Purpose +15 × 1/4 × 0.4 = 1.5
    expect(a.find((x) => x.key === "mental:purpose")?.gain).toBe(1.5);
    // Mindful: +6 × 1/4 × 0.4 = 0.6
    expect(a.find((x) => x.key === "mental:mindful")?.gain).toBe(0.6);
    expect(a.find((x) => x.key === "mental:checkin")?.detail).toContain("3 of the last 7");
  });

  it("with no Mental score, 'check in every day' comes first", () => {
    const a = buildLifeScoreActions({ ...base, mentalScore: null, checkinDays7: 0, mentalAreas: base.mentalAreas.map((m) => ({ ...m, score: null })) });
    expect(a[0].key).toBe("mental:checkin");
    // Physical is the whole Core now: sleep 60 × 0.5 × 1 = 30
    expect(a.find((x) => x.key === "metric:sleep_total_min")?.gain).toBe(30);
  });

  it("protocol adherence and labs out of range", () => {
    const parts = [
      { key: "health_data" as const, label: "Health data", score: 80, weight: 61, detail: null },
      { key: "labs" as const, label: "Labs", score: 70, weight: 22, detail: "7 of 10 labs in range" },
      { key: "medications" as const, label: "Medications", score: 60, weight: 17, detail: "17 of 28 doses taken (14 days)" },
    ];
    const a = buildLifeScoreActions({ ...base, parts });
    expect(a.find((x) => x.key === "part:medications")?.gain).toBe(4.1); // 40 × .17 × .6
    expect(a.find((x) => x.key === "part:labs")?.detail).toContain("7 of 10");
  });
});
