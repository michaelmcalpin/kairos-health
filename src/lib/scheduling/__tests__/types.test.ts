import { describe, it, expect } from "vitest";
import {
  uid,
  parseTime,
  timeToMinutes,
  minutesToTime,
  addMinutesToTime,
  formatTimeDisplay,
  formatDateDisplay,
  getWeekDates,
  getSessionTypeInfo,
  SESSION_TYPES,
  DAY_NAMES,
  MEETING_TYPE_LABELS,
  STATUS_LABELS,
  STATUS_COLORS,
} from "../types";

describe("uid", () => {
  it("generates unique ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 50; i++) ids.add(uid());
    expect(ids.size).toBe(50);
  });
});

describe("parseTime", () => {
  it("parses HH:MM format", () => {
    expect(parseTime("09:30")).toEqual({ hours: 9, minutes: 30 });
    expect(parseTime("14:00")).toEqual({ hours: 14, minutes: 0 });
    expect(parseTime("00:00")).toEqual({ hours: 0, minutes: 0 });
  });
});

describe("timeToMinutes", () => {
  it("converts time to total minutes", () => {
    expect(timeToMinutes("00:00")).toBe(0);
    expect(timeToMinutes("01:00")).toBe(60);
    expect(timeToMinutes("09:30")).toBe(570);
    expect(timeToMinutes("14:45")).toBe(885);
  });
});

describe("minutesToTime", () => {
  it("converts minutes to HH:MM", () => {
    expect(minutesToTime(0)).toBe("00:00");
    expect(minutesToTime(60)).toBe("01:00");
    expect(minutesToTime(570)).toBe("09:30");
    expect(minutesToTime(885)).toBe("14:45");
  });
});

describe("addMinutesToTime", () => {
  it("adds minutes to time string", () => {
    expect(addMinutesToTime("09:00", 30)).toBe("09:30");
    expect(addMinutesToTime("09:00", 60)).toBe("10:00");
    expect(addMinutesToTime("16:00", 45)).toBe("16:45");
  });
});

describe("formatTimeDisplay", () => {
  it("formats 24h time to 12h display", () => {
    expect(formatTimeDisplay("09:00")).toBe("9:00 AM");
    expect(formatTimeDisplay("13:30")).toBe("1:30 PM");
    expect(formatTimeDisplay("00:00")).toBe("12:00 AM");
    expect(formatTimeDisplay("12:00")).toBe("12:00 PM");
  });
});

describe("formatDateDisplay", () => {
  it("formats date string", () => {
    const result = formatDateDisplay("2026-03-15");
    expect(result).toMatch(/Sun/);
    expect(result).toMatch(/Mar/);
    expect(result).toMatch(/15/);
  });
});

describe("getWeekDates", () => {
  it("returns 7 consecutive dates", () => {
    const dates = getWeekDates("2026-03-09");
    expect(dates).toHaveLength(7);
    expect(dates[0]).toBe("2026-03-09");
    expect(dates[6]).toBe("2026-03-15");
  });
});

describe("getSessionTypeInfo", () => {
  it("returns info for known session type", () => {
    const info = getSessionTypeInfo("follow_up");
    expect(info.label).toBe("Follow-Up");
    expect(info.durationMinutes).toBe(30);
  });

  it("returns fallback for unknown type", () => {
    const info = getSessionTypeInfo("unknown" as "follow_up");
    expect(info).toBeTruthy();
  });
});

describe("constants", () => {
  it("has all session types", () => {
    expect(SESSION_TYPES.length).toBe(7);
  });

  it("has 7 day names", () => {
    expect(DAY_NAMES).toHaveLength(7);
    expect(DAY_NAMES[0]).toBe("Sun");
  });

  it("has meeting type labels", () => {
    expect(MEETING_TYPE_LABELS.video).toBe("Video Call");
    expect(MEETING_TYPE_LABELS.phone).toBe("Phone Call");
    expect(MEETING_TYPE_LABELS.in_person).toBe("In-Person");
  });

  it("has status labels and colors", () => {
    expect(STATUS_LABELS.confirmed).toBe("Confirmed");
    expect(STATUS_COLORS.confirmed).toBeTruthy();
    expect(Object.keys(STATUS_LABELS)).toHaveLength(6);
  });
});
