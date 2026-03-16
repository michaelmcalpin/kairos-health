/**
 * KAIROS Date Utilities
 *
 * Date range calculations, period helpers, and health-data
 * specific date logic used throughout the platform.
 */

// ─── Date Range Types ───────────────────────────────────────────────────────

export interface DateRange {
  start: Date;
  end: Date;
}

export type PresetRange = "today" | "7d" | "14d" | "30d" | "90d" | "6m" | "1y" | "all";

// ─── Preset Range Builders ──────────────────────────────────────────────────

export function getPresetRange(preset: PresetRange): DateRange {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (preset) {
    case "today":
      break;
    case "7d":
      start.setDate(start.getDate() - 6);
      break;
    case "14d":
      start.setDate(start.getDate() - 13);
      break;
    case "30d":
      start.setDate(start.getDate() - 29);
      break;
    case "90d":
      start.setDate(start.getDate() - 89);
      break;
    case "6m":
      start.setMonth(start.getMonth() - 6);
      break;
    case "1y":
      start.setFullYear(start.getFullYear() - 1);
      break;
    case "all":
      start.setFullYear(2020, 0, 1);
      break;
  }

  return { start, end };
}

// ─── Date Arithmetic ────────────────────────────────────────────────────────

/** Get N days ago from today (midnight) */
export function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get start of day */
export function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get end of day */
export function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Get start of week (Monday) */
export function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  d.setDate(diff);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** Get start of month */
export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

/** Add days to a date */
export function addDays(date: Date, days: number): Date {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

/** Difference in days between two dates */
export function daysBetween(a: Date, b: Date): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.round(Math.abs(b.getTime() - a.getTime()) / msPerDay);
}

// ─── Date Iteration ─────────────────────────────────────────────────────────

/** Generate array of dates in a range (inclusive) */
export function eachDayInRange(range: DateRange): Date[] {
  const days: Date[] = [];
  const current = startOfDay(range.start);
  const last = startOfDay(range.end);

  while (current <= last) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  return days;
}

/** Generate week boundaries for a date range */
export function eachWeekInRange(range: DateRange): DateRange[] {
  const weeks: DateRange[] = [];
  let current = startOfWeek(range.start);
  const last = range.end;

  while (current <= last) {
    const weekEnd = addDays(current, 6);
    weeks.push({
      start: new Date(current),
      end: weekEnd > last ? last : weekEnd,
    });
    current = addDays(current, 7);
  }

  return weeks;
}

// ─── Formatting Helpers ─────────────────────────────────────────────────────

/** ISO date string: "2024-03-15" */
export function toDateString(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Parse ISO date string to Date */
export function parseDate(dateStr: string): Date {
  const [year, month, day] = dateStr.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** Check if two dates are the same calendar day */
export function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

/** Check if a date is today */
export function isToday(date: Date): boolean {
  return isSameDay(date, new Date());
}

/** Get day of week label: "Mon", "Tue", etc. */
export function dayOfWeekLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

/** Get month label: "January", "February", etc. */
export function monthLabel(date: Date): string {
  return date.toLocaleDateString("en-US", { month: "long" });
}

// ─── Health-Specific Date Helpers ───────────────────────────────────────────

/** Get CGM reading intervals for a day (every 5 minutes = 288 readings) */
export function cgmIntervals(date: Date): Date[] {
  const intervals: Date[] = [];
  const base = startOfDay(date);
  for (let i = 0; i < 288; i++) {
    const t = new Date(base.getTime() + i * 5 * 60 * 1000);
    intervals.push(t);
  }
  return intervals;
}

/** Standard sleep window check (10 PM - 8 AM) */
export function isInSleepWindow(date: Date): boolean {
  const hour = date.getHours();
  return hour >= 22 || hour < 8;
}

/** Fasting window calculator */
export function fastingWindow(
  startTime: Date,
  durationHours: number
): { start: Date; end: Date; isActive: boolean } {
  const end = new Date(startTime.getTime() + durationHours * 60 * 60 * 1000);
  const now = new Date();
  return {
    start: startTime,
    end,
    isActive: now >= startTime && now <= end,
  };
}
