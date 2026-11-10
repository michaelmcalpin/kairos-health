/**
 * Pure helpers that turn raw Apple Health samples into daily metrics.
 * Self-contained so the iOS app carries an identical copy at
 * mobile/lib/health/derive.ts (kept in sync by a web test).
 */

export interface RawCategorySample { start: number; end: number; value: number; source: string; sourceId: string }
export interface DailyMetric { date: string; metric: string; value: number }

const MIN = 60_000;

/** Local YYYY-MM-DD for a timestamp. */
export function localDay(ms: number): string {
  const d = new Date(ms);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/**
 * A night belongs to the day you wake up. Anything ending after 6 pm counts
 * toward the next day, so a 10 pm–6 am night lands on the morning date.
 */
export function sleepDay(endMs: number): string {
  return localDay(endMs + 6 * 60 * MIN);
}

// HKCategoryValueSleepAnalysis
const IN_BED = 0, ASLEEP = 1, AWAKE = 2, CORE = 3, DEEP = 4, REM = 5;

interface Night { inBed: number; asleep: number; core: number; deep: number; rem: number; awake: number; staged: boolean; first: number; last: number }

/**
 * Sleep stages per night. When several apps write sleep (Watch, Oura app,
 * AutoSleep…) we keep ONE source per night instead of adding them up: the one
 * with stage data, then the most time asleep; Apple Watch wins ties.
 */
export function deriveSleep(samples: RawCategorySample[]): Array<DailyMetric & { bedtime?: string; wakeTime?: string }> {
  const byDaySource = new Map<string, Map<string, Night>>();
  for (const s of samples) {
    const mins = Math.max(0, (s.end - s.start) / MIN);
    if (mins <= 0) continue;
    const day = sleepDay(s.end);
    const src = s.sourceId || s.source || "unknown";
    let perSource = byDaySource.get(day);
    if (!perSource) byDaySource.set(day, (perSource = new Map()));
    let n = perSource.get(src);
    if (!n) perSource.set(src, (n = { inBed: 0, asleep: 0, core: 0, deep: 0, rem: 0, awake: 0, staged: false, first: s.start, last: s.end }));
    n.first = Math.min(n.first, s.start);
    n.last = Math.max(n.last, s.end);
    switch (s.value) {
      case IN_BED: n.inBed += mins; break;
      case ASLEEP: n.asleep += mins; n.core += mins; break;
      case CORE: n.asleep += mins; n.core += mins; n.staged = true; break;
      case DEEP: n.asleep += mins; n.deep += mins; n.staged = true; break;
      case REM: n.asleep += mins; n.rem += mins; n.staged = true; break;
      case AWAKE: n.awake += mins; break;
    }
  }

  const out: Array<DailyMetric & { bedtime?: string; wakeTime?: string }> = [];
  for (const [date, perSource] of Array.from(byDaySource)) {
    const ranked = Array.from(perSource.entries()).sort(([aId, a], [bId, b]) =>
      Number(b.staged) - Number(a.staged) ||
      b.asleep - a.asleep ||
      Number(bId.startsWith("com.apple.health")) - Number(aId.startsWith("com.apple.health")),
    );
    const [, n] = ranked[0];
    if (n.asleep < 60) continue; // a nap or stray sample, not a night
    const hhmm = (ms: number) => {
      const d = new Date(ms);
      return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
    };
    const push = (metric: string, value: number) => out.push({ date, metric, value: Math.round(value) });
    push("sleep_total_min", n.asleep);
    const total = out[out.length - 1];
    total.bedtime = hhmm(n.first);
    total.wakeTime = hhmm(n.last);
    if (n.inBed > 0) push("sleep_in_bed_min", Math.max(n.inBed, n.asleep));
    if (n.staged) {
      push("sleep_deep_min", n.deep);
      push("sleep_rem_min", n.rem);
      push("sleep_core_min", n.core);
    }
    push("sleep_awake_min", n.awake);
  }
  return out;
}

/** Roll category samples (alerts, mindful sessions, cycle logs…) into one number per day. */
export function deriveCategoryDaily(
  metric: string,
  identifier: string,
  agg: "minutes" | "count" | "value",
  samples: RawCategorySample[],
): DailyMetric[] {
  const byDay = new Map<string, number>();
  for (const s of samples) {
    // Stand hours: value 0 = stood that hour, 1 = idle.
    if (identifier === "HKCategoryTypeIdentifierAppleStandHour" && s.value !== 0) continue;
    const day = localDay(s.start);
    const prev = byDay.get(day) ?? 0;
    if (agg === "minutes") byDay.set(day, prev + Math.max(0, (s.end - s.start) / MIN));
    else if (agg === "count") byDay.set(day, prev + 1);
    else byDay.set(day, Math.max(prev, s.value));
  }
  return Array.from(byDay, ([date, value]) => ({ date, metric, value: Math.round(value * 10) / 10 }));
}

const WORKOUT_NAMES: Record<number, string> = {
  1: "American football", 4: "Badminton", 5: "Baseball", 6: "Basketball", 7: "Bowling", 8: "Boxing",
  9: "Climbing", 11: "Cross training", 13: "Cycling", 14: "Dance", 16: "Elliptical", 20: "Strength (functional)",
  21: "Golf", 22: "Gymnastics", 24: "Hiking", 25: "Hockey", 28: "Martial arts", 29: "Mind and body",
  30: "Mixed cardio", 31: "Paddling", 33: "Recovery", 34: "Racquetball", 35: "Rowing", 37: "Running",
  39: "Skating", 40: "Snow sports", 41: "Soccer", 43: "Squash", 44: "Stair climbing", 45: "Surfing",
  46: "Swimming", 47: "Table tennis", 48: "Tennis", 50: "Strength training", 51: "Volleyball", 52: "Walking",
  53: "Water fitness", 57: "Yoga", 58: "Barre", 59: "Core training", 60: "Cross-country skiing",
  61: "Downhill skiing", 62: "Flexibility", 63: "HIIT", 64: "Jump rope", 65: "Kickboxing", 66: "Pilates",
  67: "Snowboarding", 68: "Stairs", 69: "Step training", 72: "Tai chi", 73: "Mixed cardio", 74: "Hand cycling",
  76: "Fitness gaming", 77: "Cardio dance", 78: "Social dance", 79: "Pickleball", 80: "Cooldown",
  82: "Multisport", 84: "Diving", 3000: "Other",
};

export function workoutName(activityType: number): string {
  return WORKOUT_NAMES[activityType] ?? "Workout";
}
