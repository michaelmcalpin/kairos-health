import { describe, it, expect } from "vitest";
import { mergeSleepRows, mergeActivityRows, nightlyHrv, normalizeBodyFatPct } from "../health-metrics";
import { mergeSleepNights } from "@/lib/health/sleep";
import { formatDose } from "@/lib/text/dose";
import { decodeEntities } from "@/lib/text/entities";
import { resolveTargetValue } from "@/lib/goals/types";
import { selectPrompt } from "@/lib/lifescore/prompts";

describe("audit data fixes", () => {
  it("D1: one sleep row per night, best source, no sums, no >14h", () => {
    const rows = [
      { date: "2026-11-08", source: "oura", totalMinutes: null, score: 82 },
      { date: "2026-11-08", source: "apple_health", totalMinutes: 966, score: null }, // 16.1 h bug
      { date: "2026-11-08", source: "apple_health_2", totalMinutes: 430, score: null },
      { date: "2026-11-07", source: "oura", totalMinutes: 450, score: 80 },
      { date: "2026-11-07", source: "apple_health", totalMinutes: 470, score: null },
    ];
    const out = mergeSleepRows(rows);
    expect(out).toHaveLength(2);
    expect(out[0]).toMatchObject({ date: "2026-11-08", totalMinutes: 430, score: 82 });
    expect(out[1]).toMatchObject({ date: "2026-11-07", source: "oura", totalMinutes: 450 });
    // Client-side merger drops impossible nights too.
    expect(mergeSleepNights([{ date: "2026-11-08", totalMinutes: 966 }])[0].totalMinutes).toBeNull();
  });

  it("D3: one activity row per day (Apple Health first)", () => {
    const out = mergeActivityRows([
      { date: "2026-11-07", source: "oura", steps: 8901 },
      { date: "2026-11-07", source: "apple_health", steps: 9359 },
    ]);
    expect(out).toEqual([{ date: "2026-11-07", source: "apple_health", steps: 9359 }]);
  });

  it("D4: HRV is a nightly average from one source", () => {
    const t = (h: number) => new Date(Date.UTC(2026, 10, 8, h));
    const out = nightlyHrv([
      { timestamp: t(2), rmssd: 40, source: "apple_health" },
      { timestamp: t(3), rmssd: 30, source: "apple_health" },
      { timestamp: t(4), rmssd: 52, source: "oura" },
    ]);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ rmssd: 52, source: "oura" });
  });

  it("D2: body fat fraction → percent; impossible values dropped", () => {
    expect(normalizeBodyFatPct(0.2)).toBe(20);
    expect(normalizeBodyFatPct(19)).toBe(19);
    expect(normalizeBodyFatPct(95)).toBeNull();
  });

  it("D5: 'Lose 10 lb' from 185 targets 175", () => {
    expect(resolveTargetValue({ value: 10, unit: "lbs", direction: "decrease", relative: true }, 185)).toBe(175);
    expect(resolveTargetValue({ value: 15, unit: "%", direction: "decrease" }, 22)).toBe(15);
  });

  it("D11/D12: entities decoded, units not doubled", () => {
    expect(decodeEntities("A &bull; B &amp; C &#8211; D")).toBe("A • B & C – D");
    expect(formatDose("100 mg", "mg")).toBe("100 mg");
    expect(formatDose("5000", "IU")).toBe("5000 IU");
    expect(formatDose(null, "mcg")).toBe("mcg");
  });

  it("LifeScore: no 'things slipped' prompt before any rating", () => {
    for (let i = 0; i < 20; i++) expect(selectPrompt({ ratings: {}, missedTasks: true }).trigger).not.toBe("missed");
  });
});
