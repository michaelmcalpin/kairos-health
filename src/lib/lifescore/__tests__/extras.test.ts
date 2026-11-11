import { describe, it, expect } from "vitest";

import {
  scoreWorkouts, scoreBodyGoal, scoreBodyGoals, scoreNutrition, scoreProteinDay, scoreCalorieDay, mindfulBonus,
} from "../extras";
import { blendExtras, nutritionByDay, latestValues } from "../physical";

const END = "2026-11-11";
const daysAgo = (n: number) => {
  const d = new Date(END + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString();
};

describe("scoreWorkouts", () => {
  it("is null for people who don't record workouts", () => {
    expect(scoreWorkouts([], END)).toBeNull();
    expect(scoreWorkouts([{ activity: "Walk", startAt: daysAgo(80), durationMin: 30 }], END)).toBeNull();
  });

  it("scores 4+ a week with variety at 100", () => {
    const ws = Array.from({ length: 16 }, (_, i) => ({ activity: ["Run", "Strength", "Yoga"][i % 3], startAt: daysAgo(i), durationMin: 40 }));
    const s = scoreWorkouts(ws, END)!;
    expect(s.value).toBe(4);
    expect(s.score).toBe(100);
  });

  it("scores one kind, 2 a week, at 40 and ignores very short sessions", () => {
    const ws = Array.from({ length: 8 }, (_, i) => ({ activity: "Run", startAt: daysAgo(i * 3), durationMin: 30 }));
    ws.push({ activity: "Walk", startAt: daysAgo(1), durationMin: 5 });
    const s = scoreWorkouts(ws, END)!;
    expect(s.value).toBe(2);
    expect(s.score).toBe(40);
  });

  it("is a real low (not null) when someone who records workouts stopped", () => {
    const s = scoreWorkouts([{ activity: "Run", startAt: daysAgo(45), durationMin: 30 }], END)!;
    expect(s.score).toBe(0);
  });
});

describe("scoreBodyGoal", () => {
  const base = { category: "weight", title: "Lose 20 lb", targetUnit: "lb", targetDirection: "decrease", startValue: 220, targetValue: 200, currentValue: 220, startDate: "2026-09-01", targetDate: null as string | null };

  it("no date: 50 at the start, 75 halfway, 100 reached", () => {
    expect(scoreBodyGoal(base, 220, END)).toBe(50);
    expect(scoreBodyGoal(base, 210, END)).toBe(75);
    expect(scoreBodyGoal(base, 199, END)).toBe(100);
  });

  it("drops when moving the wrong way", () => {
    expect(scoreBodyGoal(base, 230, END)).toBe(25);
  });

  it("with a date: 100 when on pace, lower when behind", () => {
    const dated = { ...base, startDate: "2026-09-01", targetDate: "2027-01-25" }; // just under half elapsed on Nov 11
    expect(scoreBodyGoal(dated, 210, END)).toBe(100);
    expect(scoreBodyGoal(dated, 215, END)).toBeLessThan(80);
    expect(scoreBodyGoal(dated, 220, END)).toBe(30);
  });

  it("maintain: 100 within 2%, 0 at 8% away", () => {
    const keep = { ...base, targetDirection: "maintain", targetValue: 200, startValue: 200 };
    expect(scoreBodyGoal(keep, 203, END)).toBe(100);
    expect(scoreBodyGoal(keep, 216, END)).toBe(0);
  });

  it("uses the device reading and converts lb to kg for kg goals", () => {
    const kg = { ...base, targetUnit: "kg", startValue: 100, targetValue: 90, currentValue: 100 };
    const [s] = scoreBodyGoals([kg], new Map([["weight", 209.4]]), END); // 209.4 lb ≈ 95 kg
    expect(s.value).toBeCloseTo(95, 0);
    expect(s.score).toBe(75);
  });

  it("falls back to the goal's own value and skips other goal types", () => {
    const out = scoreBodyGoals([{ ...base, currentValue: 210 }, { ...base, category: "sleep" }], new Map(), END);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(75);
  });
});

describe("scoreNutrition", () => {
  const days = (n: number, calories: number, protein: number) =>
    Array.from({ length: n }, (_, i) => ({ date: daysAgo(i).slice(0, 10), calories, protein }));

  it("needs a plan and 3+ logged days", () => {
    expect(scoreNutrition(null, days(7, 2000, 150), END)).toEqual([]);
    expect(scoreNutrition({ calories: 2000, protein: 150 }, days(2, 2000, 150), END)).toEqual([]);
  });

  it("scores on-target days at 100", () => {
    const out = scoreNutrition({ calories: 2000, protein: 150 }, days(5, 2050, 145), END);
    expect(out.map((o) => [o.key, o.score])).toEqual([["nutrition_protein", 100], ["nutrition_calories", 100]]);
  });

  it("accepts the proteinG key from meal libraries", () => {
    const out = scoreNutrition({ proteinG: 100 }, days(4, 1800, 70), END);
    expect(out).toHaveLength(1);
    expect(out[0].score).toBe(50);
  });

  it("day scores fall off as expected", () => {
    expect(scoreProteinDay(75, 150)).toBe(0);
    expect(scoreProteinDay(105, 150)).toBe(50);
    expect(scoreCalorieDay(2200, 2000)).toBe(100);
    expect(scoreCalorieDay(2700, 2000)).toBe(0);
  });
});

describe("mindfulBonus", () => {
  it("is null with no mindful sessions in 30 days", () => {
    expect(mindfulBonus(undefined, END)).toBeNull();
    expect(mindfulBonus(new Map([["2026-09-01", 20]]), END)).toBeNull();
  });

  it("10+ minutes a day gives the full +6; less gives less; none this week gives 0", () => {
    const all = new Map(Array.from({ length: 7 }, (_, i) => [daysAgo(i).slice(0, 10), 12]));
    expect(mindfulBonus(all, END)).toEqual({ minPerDay: 12, bonus: 6 });
    const some = new Map(Array.from({ length: 7 }, (_, i) => [daysAgo(i).slice(0, 10), 5]));
    expect(mindfulBonus(some, END)!.bonus).toBe(3);
    expect(mindfulBonus(new Map([[daysAgo(20).slice(0, 10), 10]]), END)!.bonus).toBe(0);
  });
});

describe("physical helpers", () => {
  it("blendExtras weights extras alongside device measures", () => {
    const r = blendExtras({ score: 80, metrics: [{ key: "steps", label: "Steps", value: 9000, score: 80 }], weightSum: 2 },
      [{ key: "workouts_per_week", label: "Workouts per week", value: 1, score: 20, weight: 2 }]);
    expect(r.score).toBe(50);
    expect(r.metrics[0].key).toBe("workouts_per_week");
  });

  it("blendExtras works with no device data", () => {
    expect(blendExtras({ score: null, metrics: [], weightSum: 0 }, []).score).toBeNull();
    expect(blendExtras({ score: null, metrics: [], weightSum: 0 }, [{ key: "x", label: "x", value: 1, score: 70, weight: 1 }]).score).toBe(70);
  });

  it("nutritionByDay prefers in-app meal logs, else Apple Health", () => {
    const series = new Map([
      ["diet_kcal", new Map([["2026-11-11", { value: 1500, source: "apple_health" }], ["2026-11-10", { value: 1900, source: "apple_health" }]])],
      ["diet_protein", new Map([["2026-11-10", { value: 120, source: "apple_health" }]])],
    ]);
    const meals = [
      { date: "2026-11-11", calories: 700, protein: 50 },
      { date: "2026-11-11", calories: 1300, protein: 90 },
    ];
    const out = nutritionByDay(series, meals, END);
    expect(out.find((d) => d.date === "2026-11-11")).toEqual({ date: "2026-11-11", calories: 2000, protein: 140 });
    expect(out.find((d) => d.date === "2026-11-10")).toEqual({ date: "2026-11-10", calories: 1900, protein: 120 });
  });

  it("latestValues picks the newest reading on or before the end date", () => {
    const series = new Map([["weight", new Map([["2026-10-01", { value: 210, source: "a" }], ["2026-11-05", { value: 205, source: "a" }], ["2026-11-20", { value: 1, source: "a" }]])]]);
    expect(latestValues(series, ["weight", "body_fat"], END)).toEqual(new Map([["weight", 205]]));
  });
});
