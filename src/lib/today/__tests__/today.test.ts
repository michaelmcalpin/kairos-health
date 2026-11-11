import { describe, it, expect } from "vitest";

import { selectInsight, dayPart, baselineExcludingLatest, type InsightMetric } from "../insight";
import { firstRunSteps, isBrandNew } from "../first-run";
import { applyToggle, countProgress, isCheckinItem } from "../checklist";

const TODAY = "2026-11-11";

/** 30-day series (oldest first) with `latest` as today's value. */
function metric(key: string, normal: number | null, latest: number | null, opts: Partial<InsightMetric> = {}): InsightMetric {
  const series: Array<number | null> = Array.from({ length: 29 }, () => normal);
  series.push(latest);
  const vals = series.filter((v): v is number => v != null);
  return {
    key, label: key, unit: "", decimals: 0,
    latest, latestDate: latest == null ? null : TODAY,
    avg7: vals.length ? vals.slice(-7).reduce((a, b) => a + b, 0) / Math.min(7, vals.length) : null,
    avg30: vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null,
    series,
    ...opts,
  };
}

describe("dayPart", () => {
  it("splits the day", () => {
    expect(dayPart(7)).toBe("morning");
    expect(dayPart(13)).toBe("afternoon");
    expect(dayPart(21)).toBe("evening");
    expect(dayPart(2)).toBe("evening");
  });
});

describe("selectInsight", () => {
  it("reports short sleep vs the client's own normal", () => {
    const i = selectInsight({ metrics: [metric("sleep_total_min", 444, 366)], today: TODAY, hour: 8 });
    expect(i?.kind).toBe("deviation");
    expect(i?.text).toBe("Good morning. Sleep 6.1 h last night vs 7.4 h your normal.");
    expect(i?.href).toBe("/sleep");
  });

  it("changes only the wording with time of day", () => {
    const m = [metric("sleep_total_min", 444, 366)];
    const am = selectInsight({ metrics: m, today: TODAY, hour: 8 })!;
    const pm = selectInsight({ metrics: m, today: TODAY, hour: 20 })!;
    expect(pm.metricKey).toBe(am.metricKey);
    expect(pm.text.startsWith("Good evening.")).toBe(true);
    expect(pm.text.replace("Good evening.", "")).toBe(am.text.replace("Good morning.", ""));
  });

  it("ignores small changes and picks the biggest relative deviation", () => {
    const i = selectInsight({
      metrics: [metric("sleep_total_min", 444, 430), metric("hrv", 40, 52), metric("resting_hr", 60, 64)],
      today: TODAY, hour: 9,
    });
    expect(i?.metricKey).toBe("hrv");
    expect(i?.text).toContain("30% above your normal of 40 ms");
  });

  it("never compares against too little history", () => {
    const series: Array<number | null> = Array.from({ length: 30 }, () => null);
    series[27] = 420; series[28] = 430; series[29] = 300;
    const m: InsightMetric = { ...metric("sleep_total_min", null, 300), series };
    expect(baselineExcludingLatest(series)).toBeNull();
    expect(selectInsight({ metrics: [m], today: TODAY, hour: 9 })).toBeNull();
  });

  it("skips stale readings", () => {
    const m = { ...metric("sleep_total_min", 444, 300), latestDate: "2026-11-05" };
    expect(selectInsight({ metrics: [m], today: TODAY, hour: 9 })).toBeNull();
  });

  it("falls back to the strongest LifeScore measure, then the focus area", () => {
    const s = selectInsight({ metrics: [], today: TODAY, hour: 14, strengths: [{ key: "resting_hr", label: "Resting heart rate", score: 92 }] });
    expect(s?.text).toBe("Good afternoon. Your strongest area this week: Resting heart rate (score 92).");
    const f = selectInsight({ metrics: [], today: TODAY, hour: 14, focus: [{ key: "deep", label: "Deep sleep", score: 41 }] });
    expect(f?.kind).toBe("focus");
    expect(selectInsight({ metrics: [], today: TODAY, hour: 14 })).toBeNull();
  });

  it("uses the 7-day step trend when nothing else stands out", () => {
    const series: Array<number | null> = [...Array.from({ length: 23 }, () => 8000), ...Array.from({ length: 7 }, () => 5000)];
    const m: InsightMetric = { ...metric("steps", 8000, 5000), series, avg7: 5000 };
    const i = selectInsight({ metrics: [m], today: TODAY, hour: 10 });
    expect(i?.kind).toBe("steps_trend");
    expect(i?.text).toContain("5,000 a day vs 8,000 your normal");
  });
});

describe("first-run steps", () => {
  const none = { hasHealthData: false, hasLabs: false, hasCoach: false, hasCheckin: false, profileComplete: true };
  it("lists what to connect first, done only from real facts", () => {
    const steps = firstRunSteps(none);
    expect(steps.map((s) => s.key)).toEqual(["device", "labs", "coach", "checkin"]);
    expect(steps.every((s) => !s.done)).toBe(true);
    expect(steps[0].href).toBe("/settings?tab=integrations");
    expect(isBrandNew(none)).toBe(true);
    expect(isBrandNew({ ...none, hasCheckin: true })).toBe(false);
  });
  it("adds the health profile step only when known to be incomplete", () => {
    expect(firstRunSteps({ ...none, profileComplete: false })[0].key).toBe("profile");
    expect(firstRunSteps({ ...none, profileComplete: null }).some((s) => s.key === "profile")).toBe(false);
  });
});

describe("checklist optimistic toggle", () => {
  const payload = {
    date: TODAY,
    sections: [
      { key: "supplements", label: "Supplements", items: [
        { key: "pitem:1", completable: true, done: false },
        { key: "pitem:2", completable: true, done: true },
      ] },
      { key: "fasting", label: "Fasting", items: [{ key: "fasting:x", completable: false, done: false }] },
    ],
    progress: { done: 1, total: 2 },
  };
  it("flips one item and recomputes progress", () => {
    const next = applyToggle(payload, "pitem:1", true);
    expect(next.progress).toEqual({ done: 2, total: 2 });
    expect(next.sections[0].items[0].done).toBe(true);
    expect(payload.sections[0].items[0].done).toBe(false); // not mutated
    expect(next.date).toBe(TODAY);
  });
  it("never ticks informational rows", () => {
    expect(applyToggle(payload, "fasting:x", true).sections[1].items[0].done).toBe(false);
    expect(countProgress(payload.sections)).toEqual({ done: 1, total: 2 });
  });
  it("recognises the LifeScore check-in item", () => {
    expect(isCheckinItem(`lifescore:${TODAY}`)).toBe(true);
    expect(isCheckinItem("task:1")).toBe(false);
  });
});
