import { describe, it, expect } from "vitest";
import {
  getPresetRange,
  daysAgo,
  startOfDay,
  endOfDay,
  startOfWeek,
  addDays,
  daysBetween,
  eachDayInRange,
  toDateString,
  parseDate,
  isSameDay,
  isToday,
  cgmIntervals,
  fastingWindow,
} from "../date";

describe("Preset Ranges", () => {
  it("creates today range", () => {
    const range = getPresetRange("today");
    expect(range.start.getHours()).toBe(0);
    expect(range.end.getHours()).toBe(23);
    expect(isSameDay(range.start, range.end)).toBe(true);
  });

  it("creates 7-day range", () => {
    const range = getPresetRange("7d");
    const days = eachDayInRange(range);
    expect(days.length).toBe(7);
  });

  it("creates 30-day range", () => {
    const range = getPresetRange("30d");
    const days = eachDayInRange(range);
    expect(days.length).toBe(30);
  });
});

describe("Date Arithmetic", () => {
  it("calculates days ago", () => {
    const d = daysAgo(7);
    const today = startOfDay(new Date());
    expect(daysBetween(d, today)).toBe(7);
    expect(d.getHours()).toBe(0);
  });

  it("gets start of day", () => {
    const d = startOfDay(new Date(2024, 2, 15, 14, 30));
    expect(d.getHours()).toBe(0);
    expect(d.getMinutes()).toBe(0);
  });

  it("gets end of day", () => {
    const d = endOfDay(new Date(2024, 2, 15, 14, 30));
    expect(d.getHours()).toBe(23);
    expect(d.getMinutes()).toBe(59);
  });

  it("gets start of week (Monday)", () => {
    // March 15, 2024 is a Friday
    const friday = new Date(2024, 2, 15);
    const monday = startOfWeek(friday);
    expect(monday.getDay()).toBe(1); // Monday
    expect(monday.getDate()).toBe(11); // March 11
  });

  it("adds days", () => {
    const d = new Date(2024, 0, 1);
    const result = addDays(d, 5);
    expect(result.getDate()).toBe(6);
  });

  it("calculates days between", () => {
    const a = new Date(2024, 0, 1);
    const b = new Date(2024, 0, 31);
    expect(daysBetween(a, b)).toBe(30);
    // Order shouldn't matter
    expect(daysBetween(b, a)).toBe(30);
  });
});

describe("Date Iteration", () => {
  it("generates each day in range", () => {
    const days = eachDayInRange({
      start: new Date(2024, 0, 1),
      end: new Date(2024, 0, 7),
    });
    expect(days).toHaveLength(7);
    expect(days[0].getDate()).toBe(1);
    expect(days[6].getDate()).toBe(7);
  });
});

describe("Date Utilities", () => {
  it("converts to ISO date string", () => {
    const d = new Date(2024, 2, 15);
    expect(toDateString(d)).toBe("2024-03-15");
  });

  it("parses date strings", () => {
    const d = parseDate("2024-03-15");
    expect(d.getFullYear()).toBe(2024);
    expect(d.getMonth()).toBe(2); // March = 2
    expect(d.getDate()).toBe(15);
  });

  it("checks same day", () => {
    const a = new Date(2024, 2, 15, 9, 0);
    const b = new Date(2024, 2, 15, 17, 0);
    const c = new Date(2024, 2, 16, 9, 0);
    expect(isSameDay(a, b)).toBe(true);
    expect(isSameDay(a, c)).toBe(false);
  });

  it("checks if today", () => {
    expect(isToday(new Date())).toBe(true);
    expect(isToday(new Date(2020, 0, 1))).toBe(false);
  });
});

describe("Health-Specific Date Helpers", () => {
  it("generates CGM intervals (288 per day)", () => {
    const intervals = cgmIntervals(new Date(2024, 2, 15));
    expect(intervals).toHaveLength(288);
    // First should be midnight
    expect(intervals[0].getHours()).toBe(0);
    expect(intervals[0].getMinutes()).toBe(0);
    // Last should be 23:55
    expect(intervals[287].getHours()).toBe(23);
    expect(intervals[287].getMinutes()).toBe(55);
  });

  it("calculates fasting window", () => {
    const start = new Date(2024, 2, 15, 20, 0); // 8 PM
    const window = fastingWindow(start, 16);
    expect(window.start).toEqual(start);
    expect(window.end.getHours()).toBe(12); // 12 PM next day
  });
});
