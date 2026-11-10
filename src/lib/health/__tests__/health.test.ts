import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { METRICS, METRIC_BY_KEY, healthKitReadTypes, convertValue, scoreMetric, formatMetric } from "../metrics";
import { deriveSleep, deriveCategoryDaily, sleepDay, workoutName } from "../derive";
import { mergeRows, summarize } from "@/server/services/health-metrics";

const SWIFT_UNITS = ["count", "m", "cm", "in", "kcal", "min", "bpm", "count/min", "ms", "%", "vo2", "degF", "degC", "mmHg", "mg/dL", "lb", "m/s", "g", "mg", "mcg", "mL", "L", "L/min", "dBASPL", "IU", "uS", "W"];

describe("metric catalog", () => {
  it("has unique keys and reads 60+ Apple Health types", () => {
    expect(new Set(METRICS.map((m) => m.key)).size).toBe(METRICS.length);
    const { quantity, category } = healthKitReadTypes();
    expect(quantity.length + category.length).toBeGreaterThanOrEqual(60);
    expect(category).toContain("HKCategoryTypeIdentifierSleepAnalysis");
  });

  it("only uses units the native module can build", () => {
    for (const m of METRICS) if (m.healthkit?.unit) expect(SWIFT_UNITS).toContain(m.healthkit.unit);
  });

  it("every Swift unit name is handled in the module", () => {
    const swift = readFileSync(resolve(__dirname, "../../../../mobile/modules/everist-healthkit/ios/EveristHealthKitModule.swift"), "utf8");
    for (const u of Array.from(new Set(METRICS.map((m) => m.healthkit?.unit).filter(Boolean)))) expect(swift).toContain(`"${u}"`);
  });

  it("converts HealthKit units", () => {
    expect(convertValue(METRIC_BY_KEY.spo2, 0.97)).toBeCloseTo(97);
    expect(convertValue(METRIC_BY_KEY.distance_walk_run, 1609.344)).toBeCloseTo(1);
    expect(convertValue(METRIC_BY_KEY.walking_speed, 1)).toBeCloseTo(2.237, 2);
  });

  it("scores against targets", () => {
    expect(scoreMetric(METRIC_BY_KEY.sleep_total_min, 480)).toBe(100);
    expect(scoreMetric(METRIC_BY_KEY.sleep_total_min, 300)).toBe(0);
    expect(scoreMetric(METRIC_BY_KEY.resting_hr, 55)).toBe(100);
    expect(scoreMetric(METRIC_BY_KEY.resting_hr, 70)).toBe(50);
    expect(scoreMetric(METRIC_BY_KEY.hrv, 50, 50)).toBe(75);
    expect(scoreMetric(METRIC_BY_KEY.hrv, 50, null)).toBeNull();
    expect(formatMetric(METRIC_BY_KEY.sleep_total_min, 452)).toBe("7h 32m");
  });
});

describe("sleep + category derivation", () => {
  const at = (h: number, m = 0, dayOffset = 0) => new Date(2026, 10, 9 + dayOffset, h, m).getTime();
  const s = (start: number, end: number, value: number, sourceId = "com.apple.health.watch") => ({ start, end, value, source: "Watch", sourceId });

  it("assigns a night to the wake-up day and splits stages", () => {
    expect(sleepDay(at(23, 30, -1))).toBe("2026-11-09");
    const out = deriveSleep([
      s(at(22, 30, -1), at(23, 30, -1), 3), // core 60
      s(at(23, 30, -1), at(0, 30), 4),      // deep 60
      s(at(0, 30), at(2, 0), 5),            // rem 90
      s(at(2, 0), at(2, 20), 2),            // awake 20
      s(at(2, 20), at(6, 20), 3),           // core 240
    ]);
    const get = (k: string) => out.find((o) => o.metric === k)?.value;
    expect(get("sleep_total_min")).toBe(450);
    expect(get("sleep_deep_min")).toBe(60);
    expect(get("sleep_rem_min")).toBe(90);
    expect(get("sleep_core_min")).toBe(300);
    expect(get("sleep_awake_min")).toBe(20);
    expect(out.every((o) => o.date === "2026-11-09")).toBe(true);
  });

  it("keeps one source per night instead of adding them", () => {
    const out = deriveSleep([
      s(at(23, 0, -1), at(6, 0), 1, "com.ouraring.oura"),     // 420 unstaged
      s(at(23, 0, -1), at(3, 0), 3), s(at(3, 0), at(6, 30), 4), // 450 staged
    ]);
    expect(out.find((o) => o.metric === "sleep_total_min")?.value).toBe(450);
  });

  it("counts stood hours only, and sums mindful minutes", () => {
    const stand = deriveCategoryDaily("stand_hours", "HKCategoryTypeIdentifierAppleStandHour", "count", [
      s(at(9), at(10), 0), s(at(10), at(11), 1), s(at(11), at(12), 0),
    ]);
    expect(stand[0].value).toBe(2);
    const mind = deriveCategoryDaily("mindful_min", "HKCategoryTypeIdentifierMindfulSession", "minutes", [s(at(7), at(7, 10), 0), s(at(20), at(20, 5), 0)]);
    expect(mind[0].value).toBe(15);
    expect(workoutName(37)).toBe("Running");
  });
});

describe("merging sources", () => {
  it("prefers Oura for sleep/recovery and Apple Health for steps", () => {
    const m = mergeRows([
      { date: "2026-11-09", metric: "sleep_total_min", value: 400, source: "apple_health" },
      { date: "2026-11-09", metric: "sleep_total_min", value: 430, source: "oura" },
      { date: "2026-11-09", metric: "steps", value: 9000, source: "oura" },
      { date: "2026-11-09", metric: "steps", value: 10000, source: "apple_health" },
    ]);
    expect(m.get("sleep_total_min")!.get("2026-11-09")!.value).toBe(430);
    expect(m.get("steps")!.get("2026-11-09")!.value).toBe(10000);
    const groups = summarize(m, "2026-11-09");
    expect(groups.map((g) => g.key)).toEqual(["activity", "sleep"]);
    expect(groups[0].metrics[0].series).toHaveLength(30);
  });
});

describe("mobile copies", () => {
  const root = resolve(__dirname, "../../../..");
  for (const f of ["metrics.ts", "derive.ts"]) {
    it(`mobile/lib/health/${f} matches the web version`, () => {
      expect(readFileSync(resolve(root, `mobile/lib/health/${f}`), "utf8")).toBe(readFileSync(resolve(root, `src/lib/health/${f}`), "utf8"));
    });
  }
});
