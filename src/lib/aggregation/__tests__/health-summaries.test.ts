import { describe, it, expect } from "vitest";
import {
  aggregateGlucoseDay,
  aggregateGlucoseWeek,
  computeDailyHealthScore,
  generateTrendLine,
} from "../health-summaries";

describe("Glucose Day Aggregation", () => {
  it("aggregates a full day of readings", () => {
    const readings = [90, 95, 110, 120, 130, 115, 100, 88, 92, 105];
    const summary = aggregateGlucoseDay("2024-03-15", readings);

    expect(summary.date).toBe("2024-03-15");
    expect(summary.readingCount).toBe(10);
    expect(summary.minGlucose).toBe(88);
    expect(summary.maxGlucose).toBe(130);
    expect(summary.avgGlucose).toBeGreaterThan(80);
    expect(summary.avgGlucose).toBeLessThan(130);
    expect(summary.timeInRange).toBeGreaterThan(0);
    expect(summary.gmi).toBeGreaterThan(0);
  });

  it("handles empty readings", () => {
    const summary = aggregateGlucoseDay("2024-03-15", []);
    expect(summary.readingCount).toBe(0);
    expect(summary.avgGlucose).toBe(0);
  });
});

describe("Glucose Week Aggregation", () => {
  it("aggregates daily summaries into a week", () => {
    const dailies = [
      aggregateGlucoseDay("2024-03-11", [90, 95, 100, 105, 110]),
      aggregateGlucoseDay("2024-03-12", [88, 92, 98, 115, 120]),
      aggregateGlucoseDay("2024-03-13", [95, 100, 105, 108, 112]),
    ];

    const week = aggregateGlucoseWeek("2024-03-11", "2024-03-17", dailies);
    expect(week.avgGlucose).toBeGreaterThan(80);
    expect(week.timeInRange).toBeGreaterThan(0);
    expect(week.gmi).toBeGreaterThan(0);
    expect(week.dailySummaries).toHaveLength(3);
  });

  it("detects improving trend when glucose drops", () => {
    const dailies = [
      aggregateGlucoseDay("2024-03-11", [100, 105, 110]),
    ];
    const week = aggregateGlucoseWeek("2024-03-11", "2024-03-17", dailies, 120);
    expect(week.trendVsPrior).toBe("improving");
  });
});

describe("Daily Health Score", () => {
  it("computes a composite health score", () => {
    const score = computeDailyHealthScore({
      glucoseTIR: 0.85,
      sleepScoreVal: 80,
      workoutMinutes: 45,
      supplementAdherence: 0.9,
      checkinMood: 8,
    });

    expect(score.overall).toBeGreaterThan(60);
    expect(score.overall).toBeLessThanOrEqual(100);
    expect(score.glucoseScore).toBe(85);
    expect(score.sleepScore).toBe(80);
    expect(score.supplementScore).toBe(90);
  });

  it("defaults missing metrics to 50", () => {
    const score = computeDailyHealthScore({});
    expect(score.overall).toBe(50);
  });

  it("caps score at 100", () => {
    const score = computeDailyHealthScore({
      glucoseTIR: 1,
      sleepScoreVal: 100,
      workoutMinutes: 120,
      supplementAdherence: 1,
      checkinMood: 10,
    });
    expect(score.overall).toBeLessThanOrEqual(100);
  });
});

describe("Trend Line Generator", () => {
  it("generates trend with moving average", () => {
    const data = Array.from({ length: 14 }, (_, i) => ({
      date: `2024-03-${String(i + 1).padStart(2, "0")}`,
      value: 100 + Math.sin(i) * 10,
    }));

    const trend = generateTrendLine(data, 7);
    expect(trend).toHaveLength(14);
    // First 6 should have no moving average
    expect(trend[0].movingAvg).toBeUndefined();
    expect(trend[5].movingAvg).toBeUndefined();
    // 7th onward should have moving average
    expect(trend[6].movingAvg).toBeDefined();
    expect(typeof trend[6].movingAvg).toBe("number");
  });
});
