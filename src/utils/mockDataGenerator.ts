import { getDatesBetween } from "./dateRange";

// Seeded random for consistent mock data based on date
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function dateSeed(date: Date, offset = 0): number {
  return date.getFullYear() * 10000 + (date.getMonth() + 1) * 100 + date.getDate() + offset;
}

// ─── Glucose ───────────────────────────────────────────────

export interface GlucoseReading {
  time: string;
  value: number;
  hour: number;
  date: Date;
}

export function generateGlucoseData(startDate: Date, endDate: Date): GlucoseReading[] {
  const dates = getDatesBetween(startDate, endDate);
  const readings: GlucoseReading[] = [];

  for (const date of dates) {
    const seed = dateSeed(date);
    for (let i = 0; i < 288; i++) {
      const hour = (i * 5) / 60;
      const base = 90 + seededRandom(seed + 1) * 10;
      const spike8 = Math.max(0, (30 + seededRandom(seed + 2) * 20) * Math.exp(-0.5 * Math.pow(hour - 8, 2)));
      const spike12 = Math.max(0, (25 + seededRandom(seed + 3) * 20) * Math.exp(-0.5 * Math.pow(hour - 12.5, 2)));
      const spike19 = Math.max(0, (35 + seededRandom(seed + 4) * 20) * Math.exp(-0.5 * Math.pow(hour - 19, 2)));
      const noise = (seededRandom(seed + i * 7) - 0.5) * 8;
      readings.push({
        time: `${String(Math.floor(hour)).padStart(2, "0")}:${String(Math.floor((hour % 1) * 60)).padStart(2, "0")}`,
        value: Math.round(base + spike8 + spike12 + spike19 + noise),
        hour,
        date: new Date(date),
      });
    }
  }
  return readings;
}

export interface DailyGlucoseSummary {
  date: Date;
  dateLabel: string;
  avg: number;
  min: number;
  max: number;
  timeInRange: number;
}

export function aggregateGlucoseDaily(readings: GlucoseReading[]): DailyGlucoseSummary[] {
  const byDay = new Map<string, GlucoseReading[]>();
  for (const r of readings) {
    const key = r.date.toISOString().slice(0, 10);
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(r);
  }

  const summaries: DailyGlucoseSummary[] = [];
  byDay.forEach((dayReadings, key) => {
    const values = dayReadings.map((r) => r.value);
    const avg = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    const inRange = values.filter((v) => v >= 70 && v <= 140).length;
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const d = new Date(key + "T12:00:00");
    summaries.push({
      date: d,
      dateLabel: days[d.getDay()],
      avg,
      min: Math.min(...values),
      max: Math.max(...values),
      timeInRange: Math.round((inRange / values.length) * 100),
    });
  });

  return summaries.sort((a, b) => a.date.getTime() - b.date.getTime());
}

export interface WeeklyGlucoseSummary {
  weekLabel: string;
  avg: number;
  min: number;
  max: number;
  timeInRange: number;
}

export function aggregateGlucoseWeekly(dailySummaries: DailyGlucoseSummary[]): WeeklyGlucoseSummary[] {
  const weeks: WeeklyGlucoseSummary[] = [];
  for (let i = 0; i < dailySummaries.length; i += 7) {
    const chunk = dailySummaries.slice(i, i + 7);
    if (chunk.length === 0) continue;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const first = chunk[0].date;
    const last = chunk[chunk.length - 1].date;
    weeks.push({
      weekLabel: `${months[first.getMonth()]} ${first.getDate()}–${last.getDate()}`,
      avg: Math.round(chunk.reduce((s, d) => s + d.avg, 0) / chunk.length),
      min: Math.min(...chunk.map((d) => d.min)),
      max: Math.max(...chunk.map((d) => d.max)),
      timeInRange: Math.round(chunk.reduce((s, d) => s + d.timeInRange, 0) / chunk.length),
    });
  }
  return weeks;
}

// ─── Sleep ─────────────────────────────────────────────────

export interface SleepRecord {
  date: Date;
  dateLabel: string;
  total: number;
  deep: number;
  rem: number;
  light: number;
  awake: number;
  score: number;
  bedtime: string;
  wake: string;
}

export function generateSleepData(startDate: Date, endDate: Date): SleepRecord[] {
  const dates = getDatesBetween(startDate, endDate);
  return dates.map((date) => {
    const seed = dateSeed(date);
    const total = 6 + seededRandom(seed + 10) * 2.5;
    const deep = 1.2 + seededRandom(seed + 11) * 1.2;
    const rem = 1.0 + seededRandom(seed + 12) * 1.2;
    const awake = 0.3 + seededRandom(seed + 13) * 0.5;
    const light = Math.max(total - deep - rem - awake, 1.5);
    const score = Math.round(55 + seededRandom(seed + 14) * 40);
    const bedHour = 22 + Math.floor(seededRandom(seed + 15) * 3);
    const bedMin = Math.floor(seededRandom(seed + 16) * 60);
    const wakeHour = 5 + Math.floor(seededRandom(seed + 17) * 2);
    const wakeMin = Math.floor(seededRandom(seed + 18) * 60);
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

    const formatTime = (h: number, m: number) => {
      const period = h >= 12 && h < 24 ? "PM" : "AM";
      const displayH = h > 12 ? h - 12 : h === 0 ? 12 : h;
      return `${displayH}:${String(m).padStart(2, "0")} ${period}`;
    };

    return {
      date: new Date(date),
      dateLabel: days[date.getDay()],
      total: parseFloat(total.toFixed(1)),
      deep: parseFloat(deep.toFixed(1)),
      rem: parseFloat(rem.toFixed(1)),
      light: parseFloat(light.toFixed(1)),
      awake: parseFloat(awake.toFixed(1)),
      score,
      bedtime: formatTime(bedHour, bedMin),
      wake: formatTime(wakeHour, wakeMin),
    };
  });
}

export interface WeeklySleepSummary {
  weekLabel: string;
  avgScore: number;
  avgTotal: number;
  avgDeep: number;
  avgRem: number;
}

export function aggregateSleepWeekly(records: SleepRecord[]): WeeklySleepSummary[] {
  const weeks: WeeklySleepSummary[] = [];
  for (let i = 0; i < records.length; i += 7) {
    const chunk = records.slice(i, i + 7);
    if (chunk.length === 0) continue;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const first = chunk[0].date;
    const last = chunk[chunk.length - 1].date;
    weeks.push({
      weekLabel: `${months[first.getMonth()]} ${first.getDate()}–${last.getDate()}`,
      avgScore: Math.round(chunk.reduce((s, d) => s + d.score, 0) / chunk.length),
      avgTotal: parseFloat((chunk.reduce((s, d) => s + d.total, 0) / chunk.length).toFixed(1)),
      avgDeep: parseFloat((chunk.reduce((s, d) => s + d.deep, 0) / chunk.length).toFixed(1)),
      avgRem: parseFloat((chunk.reduce((s, d) => s + d.rem, 0) / chunk.length).toFixed(1)),
    });
  }
  return weeks;
}

// ─── Measurements ──────────────────────────────────────────

export interface MeasurementRecord {
  date: string;
  weight: number;
  bodyFat: number;
  leanMass: number;
  bmi: number;
  waistCircumference: number;
  systolic: number;
  diastolic: number;
  restingHR: number;
  vo2Max: number;
}

export function generateMeasurementData(startDate: Date, endDate: Date): MeasurementRecord[] {
  const records: MeasurementRecord[] = [];
  const current = new Date(endDate);
  current.setHours(0, 0, 0, 0);
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);

  let weekIndex = 0;
  while (current >= start) {
    const seed = dateSeed(current);
    const baseWeight = 185 - weekIndex * 0.8;
    const weight = parseFloat((baseWeight + (seededRandom(seed + 20) - 0.5) * 2).toFixed(1));
    const bodyFat = parseFloat((21 - weekIndex * 0.3 + (seededRandom(seed + 21) - 0.5) * 0.5).toFixed(1));
    const leanMass = parseFloat((weight * (1 - bodyFat / 100)).toFixed(1));
    const bmi = parseFloat(((weight * 0.453592) / (1.78 * 1.78)).toFixed(1));
    records.push({
      date: current.toISOString().slice(0, 10),
      weight,
      bodyFat: Math.max(bodyFat, 10),
      leanMass,
      bmi,
      waistCircumference: parseFloat((34 - weekIndex * 0.15 + (seededRandom(seed + 22) - 0.5) * 0.4).toFixed(1)),
      systolic: Math.round(125 - weekIndex * 0.5 + (seededRandom(seed + 23) - 0.5) * 4),
      diastolic: Math.round(82 - weekIndex * 0.3 + (seededRandom(seed + 24) - 0.5) * 3),
      restingHR: Math.round(65 - weekIndex * 0.4 + (seededRandom(seed + 25) - 0.5) * 3),
      vo2Max: parseFloat((45 + weekIndex * 0.3 + (seededRandom(seed + 26) - 0.5) * 0.5).toFixed(1)),
    });
    current.setDate(current.getDate() - 7);
    weekIndex++;
  }
  return records;
}

// ─── Workouts ──────────────────────────────────────────────

export interface WorkoutRecord {
  date: Date;
  dateLabel: string;
  type: string;
  duration: number;
  calories: number;
  intensity: "low" | "moderate" | "high";
  heartRateAvg: number;
}

const workoutTypes = ["Strength Training", "Running", "HIIT", "Yoga", "Cycling", "Swimming", "Walking"];

export function generateWorkoutData(startDate: Date, endDate: Date): WorkoutRecord[] {
  const dates = getDatesBetween(startDate, endDate);
  const records: WorkoutRecord[] = [];
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  for (const date of dates) {
    const seed = dateSeed(date);
    // ~70% chance of a workout each day
    if (seededRandom(seed + 30) > 0.3) {
      const typeIdx = Math.floor(seededRandom(seed + 31) * workoutTypes.length);
      const duration = Math.round(20 + seededRandom(seed + 32) * 60);
      const intensity: "low" | "moderate" | "high" = seededRandom(seed + 33) < 0.3 ? "low" : seededRandom(seed + 33) < 0.7 ? "moderate" : "high";
      records.push({
        date: new Date(date),
        dateLabel: days[date.getDay()],
        type: workoutTypes[typeIdx],
        duration,
        calories: Math.round(duration * (intensity === "high" ? 12 : intensity === "moderate" ? 8 : 5)),
        intensity,
        heartRateAvg: Math.round(intensity === "high" ? 155 + seededRandom(seed + 34) * 20 : intensity === "moderate" ? 130 + seededRandom(seed + 34) * 20 : 100 + seededRandom(seed + 34) * 20),
      });
    }
  }
  return records;
}

// ─── Nutrition ─────────────────────────────────────────────

export interface NutritionRecord {
  date: Date;
  dateLabel: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

export function generateNutritionData(startDate: Date, endDate: Date): NutritionRecord[] {
  const dates = getDatesBetween(startDate, endDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return dates.map((date) => {
    const seed = dateSeed(date);
    const calories = Math.round(1800 + seededRandom(seed + 40) * 800);
    return {
      date: new Date(date),
      dateLabel: days[date.getDay()],
      calories,
      protein: Math.round(calories * 0.3 / 4 + (seededRandom(seed + 41) - 0.5) * 20),
      carbs: Math.round(calories * 0.4 / 4 + (seededRandom(seed + 42) - 0.5) * 30),
      fat: Math.round(calories * 0.3 / 9 + (seededRandom(seed + 43) - 0.5) * 10),
      fiber: Math.round(20 + seededRandom(seed + 44) * 20),
      water: Math.round(6 + seededRandom(seed + 45) * 6),
    };
  });
}

// ─── Fasting ───────────────────────────────────────────────

export interface FastingRecord {
  date: Date;
  dateLabel: string;
  fastDuration: number;
  targetDuration: number;
  completed: boolean;
  startTime: string;
  endTime: string;
}

export function generateFastingData(startDate: Date, endDate: Date): FastingRecord[] {
  const dates = getDatesBetween(startDate, endDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return dates.map((date) => {
    const seed = dateSeed(date);
    const target = seededRandom(seed + 50) > 0.5 ? 16 : 18;
    const actual = Math.max(target - 3 + seededRandom(seed + 51) * 5, 8);
    return {
      date: new Date(date),
      dateLabel: days[date.getDay()],
      fastDuration: parseFloat(actual.toFixed(1)),
      targetDuration: target,
      completed: actual >= target,
      startTime: "8:00 PM",
      endTime: `${Math.round(8 + actual)}:00 ${8 + actual >= 12 ? "PM" : "AM"}`,
    };
  });
}

// ─── Supplements ───────────────────────────────────────────

export interface SupplementRecord {
  date: Date;
  dateLabel: string;
  taken: number;
  total: number;
  adherence: number;
  supplements: { name: string; taken: boolean }[];
}

const supplementList = ["Vitamin D3", "Omega-3", "Magnesium", "Creatine", "Ashwagandha", "NAC"];

export function generateSupplementData(startDate: Date, endDate: Date): SupplementRecord[] {
  const dates = getDatesBetween(startDate, endDate);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return dates.map((date) => {
    const seed = dateSeed(date);
    const supplements = supplementList.map((name, i) => ({
      name,
      taken: seededRandom(seed + 60 + i) > 0.15,
    }));
    const taken = supplements.filter((s) => s.taken).length;
    return {
      date: new Date(date),
      dateLabel: days[date.getDay()],
      taken,
      total: supplementList.length,
      adherence: Math.round((taken / supplementList.length) * 100),
      supplements,
    };
  });
}
