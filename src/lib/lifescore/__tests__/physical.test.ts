import { describe, it, expect } from "vitest";

import { scoreLab, scoreLabs, scoreGenetics, scoreAdherence, combineParts, scoreHealthData, labFamilies } from "../physical";
import { mergeRows } from "@/server/services/health-metrics";

const lab = (code: string, value: number, refLow: number | null, refHigh: number | null, name = code) =>
  ({ code, name, value, refLow, refHigh, status: null });

describe("labs", () => {
  it("is 100 in range and falls off outside", () => {
    expect(scoreLab(lab("LDL", 90, 0, 100))).toBe(100);
    expect(scoreLab(lab("LDL", 130, 0, 100))).toBe(40);
    expect(scoreLab({ ...lab("X", 1, null, null), status: "borderline" })).toBe(65);
    expect(scoreLabs([lab("A", 1, 0, 2), lab("B", 5, 0, 2)]).inRange).toBe(1);
  });
  it("links gene lab text to biomarkers", () => {
    expect(labFamilies("Plasma Homocysteine")).toContain("homocysteine");
    expect(labFamilies("VITAMIN_D 25-OH")).toContain("vitamin_d");
    expect(labFamilies("Hemoglobin A1C")).toEqual(["a1c"]);
  });
});

describe("genetics follow-through", () => {
  it("credits checking the gene's labs and having them in range", () => {
    const genes = [{ gene: "MTHFR C677T", strength: "two" as const, labs: ["Homocysteine", "Serum B12"] }];
    expect(scoreGenetics(genes, []).score).toBe(0);
    expect(scoreGenetics(genes, [lab("HOMOCYSTEINE", 8, 5, 10)]).score).toBe(75);
    expect(scoreGenetics(genes, [lab("HOMOCYSTEINE", 8, 5, 10), lab("B12", 600, 400, 900)]).score).toBe(100);
    expect(scoreGenetics([{ gene: "X", strength: "one", labs: ["GI Map"] }], []).score).toBeNull();
  });
});

describe("medication adherence", () => {
  const days = ["2026-11-09", "2026-11-08"];
  it("counts daily doses and only logged days for non-daily items", () => {
    const r = scoreAdherence({
      items: [{ id: "a", frequency: "daily" }, { id: "b", frequency: "weekly" }],
      logs: [
        { protocolItemId: "a", date: "2026-11-09", takenAt: new Date(), skipped: false },
        { protocolItemId: "b", date: "2026-11-08", takenAt: new Date(), skipped: false },
      ],
      days,
    });
    expect(r).toEqual({ score: 67, taken: 2, expected: 3 });
    expect(scoreAdherence({ items: [], logs: [], days }).score).toBeNull();
  });
});

describe("physical blend", () => {
  it("re-balances when a part has no data", () => {
    const r = combineParts([
      { key: "health_data", label: "", score: 80, detail: null },
      { key: "labs", label: "", score: 60, detail: null },
      { key: "medications", label: "", score: null, detail: null },
      { key: "genetics", label: "", score: null, detail: null },
    ]);
    expect(r.score).toBe(Math.round((80 * 55 + 60 * 20) / 75));
    expect(r.parts.find((p) => p.key === "medications")!.weight).toBe(0);
  });
  it("scores device data over the window", () => {
    const rows = ["2026-11-08", "2026-11-09"].flatMap((date) => [
      { date, metric: "sleep_total_min", value: 480, source: "oura" },
      { date, metric: "resting_hr", value: 70, source: "oura" },
    ]);
    const r = scoreHealthData(mergeRows(rows), "2026-11-09", 7);
    expect(r.score).toBe(Math.round((100 * 3 + 50 * 2) / 5));
    expect(r.metrics[0].key).toBe("resting_hr");
  });
});
