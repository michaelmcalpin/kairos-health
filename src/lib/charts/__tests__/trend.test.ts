import { describe, it, expect } from "vitest";
import { baselineBand, targetBand, bucketSeries, trendStats, niceTicks, quantile, weekStart, shiftDay, type DailyPoint } from "../trend";

const END = "2026-11-11";
const days = (vals: Array<number | null>, end = END): DailyPoint[] =>
  vals.map((v, i) => ({ date: shiftDay(end, -(vals.length - 1 - i)), value: v }));

describe("baselineBand", () => {
  it("is null with fewer than 7 days of data", () => {
    expect(baselineBand(days([1, 2, 3, 4, 5, 6]), END)).toBeNull();
    expect(baselineBand(days([1, 2, 3, null, 4, 5, 6, null]), END)).toBeNull();
  });

  it("mean ± 1 sample SD over the last 30 days only", () => {
    // 40 days: first 10 are huge and outside the window.
    const vals = [...Array(10).fill(1000), ...Array.from({ length: 30 }, (_, i) => (i % 2 === 0 ? 6 : 8))];
    const b = baselineBand(days(vals), END)!;
    expect(b.n).toBe(30);
    expect(b.mean).toBeCloseTo(7, 6);
    const sd = Math.sqrt((30 * 1) / 29);
    expect(b.low).toBeCloseTo(7 - sd, 6);
    expect(b.high).toBeCloseTo(7 + sd, 6);
  });

  it("ignores nulls and supports p25–p75", () => {
    const b = baselineBand(days([1, null, 2, 3, 4, null, 5, 6, 7, 8, 9]), END, { method: "iqr" })!;
    expect(b.n).toBe(9);
    expect(b.low).toBeCloseTo(3, 6);
    expect(b.high).toBeCloseTo(7, 6);
  });

  it("does not count days after endDate", () => {
    const pts = [...days(Array(7).fill(5)), { date: shiftDay(END, 1), value: 999 }];
    expect(baselineBand(pts, END)!.mean).toBe(5);
  });
});

describe("targetBand", () => {
  it("reads catalog targets", () => {
    expect(targetBand("sleep_total_min")).toEqual({ low: 420, high: 540 });
    expect(targetBand("glucose")).toEqual({ low: 70, high: 105 });
    expect(targetBand("bp_systolic")).toEqual({ low: 100, high: 120 });
    expect(targetBand("steps")).toEqual({ low: 9000, high: null });
    expect(targetBand("resting_hr")).toEqual({ low: null, high: 55 });
    expect(targetBand("hrv")).toBeNull(); // baseline-type target
    expect(targetBand("weight")).toBeNull();
  });
});

describe("bucketSeries", () => {
  it("Day view: 30 days, gaps stay null (never zero)", () => {
    const b = bucketSeries([{ date: END, value: 7, source: "oura" }, { date: shiftDay(END, -3), value: 0 }], "day", END);
    expect(b).toHaveLength(30);
    expect(b[29]).toMatchObject({ start: END, value: 7, n: 1, source: "oura" });
    expect(b[28].value).toBeNull();
    expect(b[26].value).toBe(0); // a real zero is kept
    expect(b[0].start).toBe(shiftDay(END, -29));
  });

  it("Week view: 12 Monday-based weeks averaging days with data", () => {
    const ws = weekStart(END); // 2026-11-09 (Mon)
    expect(ws).toBe("2026-11-09");
    const b = bucketSeries([{ date: ws, value: 4 }, { date: shiftDay(ws, 1), value: 6 }, { date: shiftDay(ws, 2), value: null }], "week", END);
    expect(b).toHaveLength(12);
    expect(b[11]).toMatchObject({ start: ws, end: END, value: 5, n: 2 });
    expect(b[10].value).toBeNull();
  });

  it("Month view: 12 calendar months", () => {
    const b = bucketSeries([{ date: "2026-11-01", value: 10 }, { date: "2026-10-31", value: 20 }, { date: "2025-12-15", value: 30 }], "month", END);
    expect(b).toHaveLength(12);
    expect(b[11]).toMatchObject({ start: "2026-11-01", end: END, value: 10 });
    expect(b[10]).toMatchObject({ start: "2026-10-01", end: "2026-10-31", value: 20 });
    expect(b[0]).toMatchObject({ start: "2025-12-01", value: 30 });
  });
});

describe("trendStats", () => {
  it("latest, 7/30-day averages and time in target", () => {
    const pts = days([...Array(23).fill(400), ...Array(7).fill(480)]);
    const s = trendStats(pts, END, targetBand("sleep_total_min"));
    expect(s.latest).toBe(480);
    expect(s.latestDate).toBe(END);
    expect(s.avg7).toBe(480);
    expect(s.avg30).toBeCloseTo((23 * 400 + 7 * 480) / 30, 6);
    expect(s.inTargetPct).toBe(23);
    expect(s.daysWithData30).toBe(30);
  });

  it("empty input gives nulls, not zeros", () => {
    const s = trendStats([], END, targetBand("glucose"));
    expect(s).toMatchObject({ latest: null, avg7: null, avg30: null, inTargetPct: null, daysWithData30: 0 });
  });
});

describe("helpers", () => {
  it("quantile interpolates", () => {
    expect(quantile([1, 2, 3, 4], 0.5)).toBe(2.5);
  });
  it("niceTicks covers the range with round steps", () => {
    const t = niceTicks(63, 139, 4);
    expect(t[0]).toBeLessThanOrEqual(63);
    expect(t[t.length - 1]).toBeGreaterThanOrEqual(139);
    expect(t).toEqual([60, 80, 100, 120, 140]);
  });
});
