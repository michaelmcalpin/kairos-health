// ─── Data Import Pipeline Types ─────────────────────────────────
// Supports CSV and JSON imports for health data categories

import crypto from "crypto";

export type ImportFormat = "csv" | "json";

export type ImportCategory =
  | "glucose"
  | "sleep"
  | "workouts"
  | "nutrition"
  | "measurements"
  | "supplements"
  | "labs";

export interface ImportCategoryMeta {
  id: ImportCategory;
  label: string;
  description: string;
  requiredFields: string[];
  optionalFields: string[];
  sampleRow: Record<string, string>;
}

export const IMPORT_CATEGORIES: ImportCategoryMeta[] = [
  {
    id: "glucose",
    label: "Glucose Readings",
    description: "CGM or fingerstick blood glucose data",
    requiredFields: ["timestamp", "value"],
    optionalFields: ["unit", "source", "meal_context", "notes"],
    sampleRow: {
      timestamp: "2025-01-15T08:30:00Z",
      value: "95",
      unit: "mg/dL",
      source: "dexcom",
      meal_context: "fasting",
    },
  },
  {
    id: "sleep",
    label: "Sleep Sessions",
    description: "Sleep duration, quality, and stage data",
    requiredFields: ["date", "duration_hours"],
    optionalFields: ["score", "deep_hours", "rem_hours", "light_hours", "awake_hours", "heart_rate_avg", "hrv_avg", "source"],
    sampleRow: {
      date: "2025-01-15",
      duration_hours: "7.5",
      score: "82",
      deep_hours: "1.5",
      rem_hours: "2.0",
      source: "oura",
    },
  },
  {
    id: "workouts",
    label: "Workouts",
    description: "Exercise sessions with type, duration, and metrics",
    requiredFields: ["date", "type", "duration_minutes"],
    optionalFields: ["calories", "avg_heart_rate", "max_heart_rate", "distance_miles", "notes", "source"],
    sampleRow: {
      date: "2025-01-15",
      type: "running",
      duration_minutes: "45",
      calories: "380",
      avg_heart_rate: "145",
    },
  },
  {
    id: "nutrition",
    label: "Nutrition Logs",
    description: "Meals and macronutrient tracking",
    requiredFields: ["date", "meal_type", "calories"],
    optionalFields: ["protein_g", "carbs_g", "fat_g", "fiber_g", "description", "time"],
    sampleRow: {
      date: "2025-01-15",
      meal_type: "lunch",
      calories: "650",
      protein_g: "45",
      carbs_g: "60",
      fat_g: "25",
    },
  },
  {
    id: "measurements",
    label: "Body Measurements",
    description: "Weight, body fat, and other body metrics",
    requiredFields: ["date", "type", "value"],
    optionalFields: ["unit", "notes", "source"],
    sampleRow: {
      date: "2025-01-15",
      type: "weight",
      value: "175.5",
      unit: "lbs",
    },
  },
  {
    id: "supplements",
    label: "Supplement Logs",
    description: "Supplement adherence and dosage tracking",
    requiredFields: ["date", "name"],
    optionalFields: ["dosage", "unit", "time_taken", "taken"],
    sampleRow: {
      date: "2025-01-15",
      name: "Vitamin D3",
      dosage: "5000",
      unit: "IU",
      time_taken: "08:00",
      taken: "true",
    },
  },
  {
    id: "labs",
    label: "Lab Results",
    description: "Blood work and biomarker results",
    requiredFields: ["date", "biomarker", "value"],
    optionalFields: ["unit", "reference_low", "reference_high", "lab_name", "notes"],
    sampleRow: {
      date: "2025-01-15",
      biomarker: "HbA1c",
      value: "5.2",
      unit: "%",
      reference_low: "4.0",
      reference_high: "5.6",
    },
  },
];

// ─── Import Pipeline State ──────────────────────────────────────

export type ImportStatus = "idle" | "parsing" | "validating" | "mapping" | "previewing" | "importing" | "complete" | "error";

export interface ColumnMapping {
  sourceColumn: string;
  targetField: string | null;
  transform?: "none" | "date_parse" | "number_parse" | "lowercase" | "uppercase";
}

export interface ImportValidationError {
  row: number;
  column: string;
  value: string;
  message: string;
  severity: "error" | "warning";
}

export interface ImportRow {
  rowIndex: number;
  data: Record<string, string>;
  errors: ImportValidationError[];
  skip: boolean;
}

export interface ImportConflict {
  rowIndex: number;
  existingRecord: Record<string, unknown>;
  incomingRecord: Record<string, string>;
  resolution: "skip" | "overwrite" | "keep_both" | "unresolved";
}

export type ConflictStrategy = "skip_all" | "overwrite_all" | "keep_both_all" | "manual";

export interface ImportSummary {
  totalRows: number;
  validRows: number;
  errorRows: number;
  warningRows: number;
  skippedRows: number;
  conflicts: number;
  importedRows: number;
  duration: number; // ms
}

export interface ImportSession {
  id: string;
  category: ImportCategory;
  format: ImportFormat;
  fileName: string;
  fileSize: number;
  status: ImportStatus;
  rawData: string[][];
  headers: string[];
  mappings: ColumnMapping[];
  rows: ImportRow[];
  conflicts: ImportConflict[];
  conflictStrategy: ConflictStrategy;
  summary: ImportSummary | null;
  createdAt: string;
  updatedAt: string;
}

export function createImportSession(
  category: ImportCategory,
  fileName: string,
  fileSize: number,
): ImportSession {
  const now = new Date().toISOString();
  return {
    id: `imp_${Date.now().toString(36)}_${crypto.randomBytes(4).toString("hex")}`,
    category,
    format: fileName.endsWith(".json") ? "json" : "csv",
    fileName,
    fileSize,
    status: "idle",
    rawData: [],
    headers: [],
    mappings: [],
    rows: [],
    conflicts: [],
    conflictStrategy: "skip_all",
    summary: null,
    createdAt: now,
    updatedAt: now,
  };
}
