/**
 * KAIROS CSV Export Utility
 *
 * Generates CSV strings from structured health data.
 * Works in both server and client contexts.
 */

// ─── Types ───────────────────────────────────────────────────────────────────

export interface CSVColumn<T> {
  header: string;
  accessor: (row: T) => string | number | boolean | null | undefined;
}

export interface CSVExportOptions {
  delimiter?: string;
  includeHeader?: boolean;
  nullValue?: string;
  dateFormat?: "iso" | "locale" | "short";
}

// ─── Core CSV Builder ────────────────────────────────────────────────────────

export function toCSV<T>(
  rows: T[],
  columns: CSVColumn<T>[],
  options: CSVExportOptions = {}
): string {
  const {
    delimiter = ",",
    includeHeader = true,
    nullValue = "",
  } = options;

  const lines: string[] = [];

  if (includeHeader) {
    lines.push(columns.map((c) => escapeCSV(c.header, delimiter)).join(delimiter));
  }

  for (const row of rows) {
    const values = columns.map((col) => {
      const raw = col.accessor(row);
      if (raw === null || raw === undefined) return nullValue;
      return escapeCSV(String(raw), delimiter);
    });
    lines.push(values.join(delimiter));
  }

  return lines.join("\n");
}

function escapeCSV(value: string, delimiter: string): string {
  if (value.includes(delimiter) || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

// ─── Pre-built Export Schemas ────────────────────────────────────────────────

export interface GlucoseExportRow {
  timestamp: string;
  valueMgdl: number;
  source?: string;
  trend?: string;
}

export const glucoseCSVColumns: CSVColumn<GlucoseExportRow>[] = [
  { header: "Timestamp", accessor: (r) => r.timestamp },
  { header: "Glucose (mg/dL)", accessor: (r) => r.valueMgdl },
  { header: "Source", accessor: (r) => r.source },
  { header: "Trend", accessor: (r) => r.trend },
];

export interface SleepExportRow {
  date: string;
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  score: number;
  efficiency: number;
}

export const sleepCSVColumns: CSVColumn<SleepExportRow>[] = [
  { header: "Date", accessor: (r) => r.date },
  { header: "Total (min)", accessor: (r) => r.totalMinutes },
  { header: "Deep (min)", accessor: (r) => r.deepMinutes },
  { header: "REM (min)", accessor: (r) => r.remMinutes },
  { header: "Light (min)", accessor: (r) => r.lightMinutes },
  { header: "Awake (min)", accessor: (r) => r.awakeMinutes },
  { header: "Score", accessor: (r) => r.score },
  { header: "Efficiency (%)", accessor: (r) => r.efficiency },
];

export interface NutritionExportRow {
  date: string;
  mealType: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
}

export const nutritionCSVColumns: CSVColumn<NutritionExportRow>[] = [
  { header: "Date", accessor: (r) => r.date },
  { header: "Meal", accessor: (r) => r.mealType },
  { header: "Calories", accessor: (r) => r.calories },
  { header: "Protein (g)", accessor: (r) => r.protein },
  { header: "Carbs (g)", accessor: (r) => r.carbs },
  { header: "Fat (g)", accessor: (r) => r.fat },
  { header: "Fiber (g)", accessor: (r) => r.fiber },
];

export interface MeasurementExportRow {
  date: string;
  weightLbs: number;
  bodyFatPct?: number;
  waistInches?: number;
  chestInches?: number;
}

export const measurementCSVColumns: CSVColumn<MeasurementExportRow>[] = [
  { header: "Date", accessor: (r) => r.date },
  { header: "Weight (lbs)", accessor: (r) => r.weightLbs },
  { header: "Body Fat (%)", accessor: (r) => r.bodyFatPct },
  { header: "Waist (in)", accessor: (r) => r.waistInches },
  { header: "Chest (in)", accessor: (r) => r.chestInches },
];

export interface WorkoutExportRow {
  date: string;
  durationMinutes: number;
  exercisesCompleted: number;
  notes?: string;
}

export const workoutCSVColumns: CSVColumn<WorkoutExportRow>[] = [
  { header: "Date", accessor: (r) => r.date },
  { header: "Duration (min)", accessor: (r) => r.durationMinutes },
  { header: "Exercises", accessor: (r) => r.exercisesCompleted },
  { header: "Notes", accessor: (r) => r.notes },
];

export interface LabResultExportRow {
  date: string;
  biomarker: string;
  value: number;
  unit: string;
  refRangeLow: number;
  refRangeHigh: number;
  flag: string;
}

export const labResultCSVColumns: CSVColumn<LabResultExportRow>[] = [
  { header: "Date", accessor: (r) => r.date },
  { header: "Biomarker", accessor: (r) => r.biomarker },
  { header: "Value", accessor: (r) => r.value },
  { header: "Unit", accessor: (r) => r.unit },
  { header: "Ref Low", accessor: (r) => r.refRangeLow },
  { header: "Ref High", accessor: (r) => r.refRangeHigh },
  { header: "Flag", accessor: (r) => r.flag },
];

// ─── Client-side download helper ─────────────────────────────────────────────

export function downloadCSV(csvContent: string, filename: string): void {
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename.endsWith(".csv") ? filename : `${filename}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
