import { describe, it, expect } from "vitest";
import {
  formatNumber,
  formatCompact,
  formatPercent,
  formatPercentRaw,
  formatCurrency,
  formatCentsAsDollars,
  formatDuration,
  formatGlucose,
  formatHeartRate,
  formatHRV,
  formatCalories,
  formatMacro,
  truncate,
  capitalize,
  titleCase,
  pluralize,
  initials,
  formatTimeAgo,
} from "../format";

describe("Number Formatting", () => {
  it("formats numbers with commas", () => {
    expect(formatNumber(12345)).toBe("12,345");
    expect(formatNumber(999)).toBe("999");
    expect(formatNumber(1234567)).toBe("1,234,567");
  });

  it("formats numbers with decimals", () => {
    expect(formatNumber(12345.678, 2)).toBe("12,345.68");
    expect(formatNumber(100, 1)).toBe("100.0");
  });

  it("formats compact numbers", () => {
    expect(formatCompact(500)).toBe("500");
    expect(formatCompact(1234)).toBe("1.2K");
    expect(formatCompact(1234567)).toBe("1.2M");
    expect(formatCompact(-1500)).toBe("-1.5K");
  });

  it("formats percentages from ratio", () => {
    expect(formatPercent(0.875)).toBe("87.5%");
    expect(formatPercent(1)).toBe("100.0%");
    expect(formatPercent(0, 0)).toBe("0%");
  });

  it("formats raw percentages", () => {
    expect(formatPercentRaw(87.5)).toBe("87.5%");
    expect(formatPercentRaw(100, 0)).toBe("100%");
  });
});

describe("Currency Formatting", () => {
  it("formats USD amounts", () => {
    expect(formatCurrency(499)).toBe("$499.00");
    expect(formatCurrency(4788)).toBe("$4,788.00");
    expect(formatCurrency(0)).toBe("$0.00");
  });

  it("converts cents to dollars", () => {
    expect(formatCentsAsDollars(49900)).toBe("$499.00");
    expect(formatCentsAsDollars(9900)).toBe("$99.00");
  });
});

describe("Duration Formatting", () => {
  it("formats minutes to human readable", () => {
    expect(formatDuration(45)).toBe("45m");
    expect(formatDuration(60)).toBe("1h");
    expect(formatDuration(90)).toBe("1h 30m");
    expect(formatDuration(485)).toBe("8h 5m");
  });
});

describe("Health Metric Formatting", () => {
  it("formats glucose", () => {
    expect(formatGlucose(105)).toBe("105 mg/dL");
    expect(formatGlucose(5.8, "mmol/L")).toBe("6 mmol/L");
  });

  it("formats heart rate", () => {
    expect(formatHeartRate(72)).toBe("72 bpm");
    expect(formatHeartRate(72.7)).toBe("73 bpm");
  });

  it("formats HRV", () => {
    expect(formatHRV(45.3)).toBe("45 ms");
  });

  it("formats calories", () => {
    expect(formatCalories(2150)).toBe("2,150 kcal");
  });

  it("formats macros", () => {
    expect(formatMacro(150.7)).toBe("151g");
  });
});

describe("Text Formatting", () => {
  it("truncates long text", () => {
    expect(truncate("Hello World", 20)).toBe("Hello World");
    expect(truncate("Hello World", 8)).toBe("Hello...");
  });

  it("capitalizes first letter", () => {
    expect(capitalize("hello")).toBe("Hello");
    expect(capitalize("Hello")).toBe("Hello");
  });

  it("title cases strings", () => {
    expect(titleCase("hello world")).toBe("Hello World");
    expect(titleCase("the quick brown fox")).toBe("The Quick Brown Fox");
  });

  it("pluralizes correctly", () => {
    expect(pluralize(1, "item")).toBe("1 item");
    expect(pluralize(5, "item")).toBe("5 items");
    expect(pluralize(0, "item")).toBe("0 items");
    expect(pluralize(3, "person", "people")).toBe("3 people");
  });

  it("extracts initials", () => {
    expect(initials("Sarah Chen")).toBe("SC");
    expect(initials("John")).toBe("J");
    expect(initials("Mary Jane Watson")).toBe("MJ");
  });
});

describe("Time Ago Formatting", () => {
  it("formats recent times", () => {
    expect(formatTimeAgo(new Date())).toBe("just now");
    expect(formatTimeAgo(new Date(Date.now() - 30000))).toBe("30s ago");
    expect(formatTimeAgo(new Date(Date.now() - 300000))).toBe("5m ago");
    expect(formatTimeAgo(new Date(Date.now() - 7200000))).toBe("2h ago");
    expect(formatTimeAgo(new Date(Date.now() - 172800000))).toBe("2d ago");
  });
});
