import { describe, it, expect } from "vitest";
import {
  timeInRange,
  glucoseManagementIndicator,
  glucoseVariability,
  glucoseZone,
  sleepScore,
  hrvStatus,
  hrvTrend,
  calculateBMI,
  bmiCategory,
  adherenceRate,
  adherenceLevel,
  mean,
  standardDeviation,
  percentile,
  movingAverage,
} from "../health";

describe("Glucose Analysis", () => {
  it("calculates time in range", () => {
    const readings = [85, 95, 110, 130, 150, 170, 60, 100];
    const tir = timeInRange(readings);
    // In range (70-140): 85, 95, 110, 130, 100 = 5/8
    expect(tir).toBeCloseTo(0.625);
  });

  it("handles empty readings", () => {
    expect(timeInRange([])).toBe(0);
  });

  it("handles all in range", () => {
    expect(timeInRange([80, 90, 100, 110, 120])).toBe(1);
  });

  it("calculates GMI", () => {
    // GMI for avg glucose of 150 mg/dL ≈ 6.898
    const gmi = glucoseManagementIndicator(150);
    expect(gmi).toBeCloseTo(6.898, 1);
  });

  it("calculates glucose variability (CV)", () => {
    const readings = [100, 100, 100, 100]; // no variation
    expect(glucoseVariability(readings)).toBe(0);

    const varied = [80, 120, 80, 120]; // high variation
    expect(glucoseVariability(varied)).toBeGreaterThan(15);
  });

  it("classifies glucose zones", () => {
    expect(glucoseZone(45)).toBe("critical_low");
    expect(glucoseZone(60)).toBe("low");
    expect(glucoseZone(100)).toBe("optimal");
    expect(glucoseZone(155)).toBe("elevated");
    expect(glucoseZone(200)).toBe("high");
    expect(glucoseZone(300)).toBe("critical_high");
  });
});

describe("Sleep Scoring", () => {
  it("scores optimal sleep high", () => {
    const score = sleepScore({
      totalMinutes: 480, // 8 hours
      deepMinutes: 96,   // 20%
      remMinutes: 108,   // 22.5%
      lightMinutes: 228,
      awakeMinutes: 48,  // 10% = 90% efficiency
    });
    expect(score).toBeGreaterThanOrEqual(80);
  });

  it("scores poor sleep low", () => {
    const score = sleepScore({
      totalMinutes: 240, // 4 hours
      deepMinutes: 12,   // 5%
      remMinutes: 24,    // 10%
      lightMinutes: 156,
      awakeMinutes: 48,
    });
    expect(score).toBeLessThan(50);
  });
});

describe("HRV Analysis", () => {
  it("classifies HRV status relative to baseline", () => {
    expect(hrvStatus(60, 50)).toBe("excellent"); // 120% of baseline
    expect(hrvStatus(50, 50)).toBe("good");      // 100%
    expect(hrvStatus(40, 50)).toBe("below_baseline"); // 80%
    expect(hrvStatus(30, 50)).toBe("low");       // 60%
  });

  it("determines HRV trend", () => {
    expect(hrvTrend([40, 42, 44, 48, 52, 55, 58])).toBe("improving");
    expect(hrvTrend([50, 50, 50, 50, 50, 50, 50])).toBe("stable");
    expect(hrvTrend([60, 58, 55, 50, 45, 42, 40])).toBe("declining");
  });

  it("handles short arrays", () => {
    expect(hrvTrend([50])).toBe("stable");
    expect(hrvTrend([50, 55])).toBe("stable");
  });
});

describe("BMI Calculations", () => {
  it("calculates BMI correctly", () => {
    // 150 lbs, 5'10" (70 inches) ≈ 21.5
    const bmi = calculateBMI(150, 70);
    expect(bmi).toBeCloseTo(21.52, 1);
  });

  it("classifies BMI categories", () => {
    expect(bmiCategory(17)).toBe("underweight");
    expect(bmiCategory(22)).toBe("normal");
    expect(bmiCategory(27)).toBe("overweight");
    expect(bmiCategory(35)).toBe("obese");
  });
});

describe("Supplement Adherence", () => {
  it("calculates adherence rate", () => {
    expect(adherenceRate(7, 7)).toBe(1);
    expect(adherenceRate(5, 10)).toBe(0.5);
    expect(adherenceRate(0, 0)).toBe(0);
  });

  it("caps at 100%", () => {
    expect(adherenceRate(10, 7)).toBe(1);
  });

  it("classifies adherence levels", () => {
    expect(adherenceLevel(0.95)).toBe("excellent");
    expect(adherenceLevel(0.8)).toBe("good");
    expect(adherenceLevel(0.6)).toBe("fair");
    expect(adherenceLevel(0.3)).toBe("poor");
  });
});

describe("Statistical Helpers", () => {
  it("calculates mean", () => {
    expect(mean([2, 4, 6, 8, 10])).toBe(6);
    expect(mean([])).toBe(0);
  });

  it("calculates standard deviation", () => {
    const sd = standardDeviation([2, 4, 4, 4, 5, 5, 7, 9]);
    expect(sd).toBeCloseTo(2.0, 0);
  });

  it("calculates percentiles", () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(percentile(values, 50)).toBeCloseTo(5.5, 1);
    expect(percentile(values, 0)).toBe(1);
    expect(percentile(values, 100)).toBe(10);
  });

  it("calculates moving average", () => {
    const values = [1, 2, 3, 4, 5];
    const ma = movingAverage(values, 3);
    expect(ma).toEqual([2, 3, 4]);
  });
});
