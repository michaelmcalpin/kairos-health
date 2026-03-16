// ─── Import Validation & Column Mapping ─────────────────────────

import type {
  ImportCategory,
  ColumnMapping,
  ImportValidationError,
  ImportRow,
} from "./types";
import { IMPORT_CATEGORIES } from "./types";

// ─── Auto-Mapping ───────────────────────────────────────────────

const FIELD_ALIASES: Record<string, string[]> = {
  // Common aliases for target fields
  timestamp: ["timestamp", "time", "datetime", "date_time", "recorded_at", "created_at"],
  date: ["date", "day", "recorded_date", "log_date"],
  value: ["value", "reading", "result", "amount", "measurement"],
  unit: ["unit", "units", "uom"],
  source: ["source", "device", "provider", "origin"],
  notes: ["notes", "note", "comment", "comments", "memo"],
  type: ["type", "kind", "category", "workout_type", "measurement_type"],
  name: ["name", "supplement", "supplement_name", "item"],

  // Glucose-specific
  meal_context: ["meal_context", "meal", "context", "meal_tag", "event"],

  // Sleep-specific
  duration_hours: ["duration_hours", "duration", "total_sleep", "sleep_hours", "hours"],
  score: ["score", "sleep_score", "quality_score", "quality"],
  deep_hours: ["deep_hours", "deep_sleep", "deep"],
  rem_hours: ["rem_hours", "rem_sleep", "rem"],
  light_hours: ["light_hours", "light_sleep", "light"],
  awake_hours: ["awake_hours", "awake", "awake_time"],
  heart_rate_avg: ["heart_rate_avg", "avg_hr", "resting_hr", "hr_avg"],
  hrv_avg: ["hrv_avg", "hrv", "heart_rate_variability"],

  // Workout-specific
  duration_minutes: ["duration_minutes", "duration_min", "minutes", "duration"],
  calories: ["calories", "cal", "kcal", "energy", "calories_burned"],
  avg_heart_rate: ["avg_heart_rate", "avg_hr", "mean_hr"],
  max_heart_rate: ["max_heart_rate", "max_hr", "peak_hr"],
  distance_miles: ["distance_miles", "distance", "miles", "km"],

  // Nutrition-specific
  meal_type: ["meal_type", "meal", "meal_name"],
  protein_g: ["protein_g", "protein", "prot"],
  carbs_g: ["carbs_g", "carbs", "carbohydrates", "carb"],
  fat_g: ["fat_g", "fat", "fats", "total_fat"],
  fiber_g: ["fiber_g", "fiber", "dietary_fiber"],
  description: ["description", "food", "food_name", "item", "meal_description"],
  time: ["time", "meal_time", "logged_at"],

  // Supplement-specific
  dosage: ["dosage", "dose", "amount"],
  time_taken: ["time_taken", "taken_at", "time"],
  taken: ["taken", "completed", "adherence", "logged"],

  // Lab-specific
  biomarker: ["biomarker", "marker", "test", "test_name", "analyte"],
  reference_low: ["reference_low", "ref_low", "low", "normal_low", "range_low"],
  reference_high: ["reference_high", "ref_high", "high", "normal_high", "range_high"],
  lab_name: ["lab_name", "lab", "facility", "provider"],
};

export function autoMapColumns(
  sourceHeaders: string[],
  category: ImportCategory,
): ColumnMapping[] {
  const catMeta = IMPORT_CATEGORIES.find((c) => c.id === category);
  if (!catMeta) return [];

  const allTargetFields = [...catMeta.requiredFields, ...catMeta.optionalFields];

  return sourceHeaders.map((header) => {
    const normalized = header.toLowerCase().replace(/[^a-z0-9]/g, "_").replace(/_+/g, "_");
    let bestMatch: string | null = null;

    // Try exact match first
    if (allTargetFields.includes(normalized)) {
      bestMatch = normalized;
    }

    // Try alias match
    if (!bestMatch) {
      for (const [targetField, aliases] of Object.entries(FIELD_ALIASES)) {
        if (allTargetFields.includes(targetField) && aliases.includes(normalized)) {
          bestMatch = targetField;
          break;
        }
      }
    }

    return {
      sourceColumn: header,
      targetField: bestMatch,
      transform: "none" as const,
    };
  });
}

// ─── Row Validation ─────────────────────────────────────────────

export function validateRows(
  rawRows: string[][],
  headers: string[],
  mappings: ColumnMapping[],
  category: ImportCategory,
): ImportRow[] {
  const catMeta = IMPORT_CATEGORIES.find((c) => c.id === category);
  if (!catMeta) return [];

  // Build a quick lookup from targetField to column index
  const fieldToIndex = new Map<string, number>();
  for (let i = 0; i < mappings.length; i++) {
    if (mappings[i].targetField) {
      fieldToIndex.set(mappings[i].targetField!, i);
    }
  }

  return rawRows.map((rawRow, rowIdx) => {
    const errors: ImportValidationError[] = [];
    const data: Record<string, string> = {};

    // Extract mapped values
    for (const mapping of mappings) {
      if (!mapping.targetField) continue;
      const colIdx = headers.indexOf(mapping.sourceColumn);
      if (colIdx === -1) continue;

      let value = rawRow[colIdx] ?? "";
      value = applyTransform(value, mapping.transform ?? "none");
      data[mapping.targetField] = value;
    }

    // Validate required fields
    for (const field of catMeta.requiredFields) {
      const value = data[field];
      if (!value || value.trim() === "") {
        errors.push({
          row: rowIdx + 1,
          column: field,
          value: "",
          message: `Required field "${field}" is missing`,
          severity: "error",
        });
      }
    }

    // Type-specific validation
    const typeErrors = validateFieldTypes(data, category, rowIdx + 1);
    errors.push(...typeErrors);

    return {
      rowIndex: rowIdx,
      data,
      errors,
      skip: errors.some((e) => e.severity === "error"),
    };
  });
}

function applyTransform(value: string, transform: string): string {
  switch (transform) {
    case "date_parse": {
      const d = new Date(value);
      return isNaN(d.getTime()) ? value : d.toISOString();
    }
    case "number_parse": {
      const n = parseFloat(value.replace(/[^0-9.\-]/g, ""));
      return isNaN(n) ? value : String(n);
    }
    case "lowercase":
      return value.toLowerCase();
    case "uppercase":
      return value.toUpperCase();
    default:
      return value;
  }
}

function validateFieldTypes(
  data: Record<string, string>,
  category: ImportCategory,
  rowNum: number,
): ImportValidationError[] {
  const errors: ImportValidationError[] = [];

  // Date fields
  const dateFields = ["date", "timestamp"];
  for (const field of dateFields) {
    if (data[field]) {
      const d = new Date(data[field]);
      if (isNaN(d.getTime())) {
        errors.push({
          row: rowNum,
          column: field,
          value: data[field],
          message: `Invalid date format: "${data[field]}"`,
          severity: "error",
        });
      } else if (d.getTime() > Date.now() + 86400000) {
        // More than 1 day in the future
        errors.push({
          row: rowNum,
          column: field,
          value: data[field],
          message: "Date is in the future",
          severity: "warning",
        });
      }
    }
  }

  // Numeric fields by category
  const numericFields = getNumericFields(category);
  for (const field of numericFields) {
    if (data[field] && data[field].trim() !== "") {
      const num = parseFloat(data[field]);
      if (isNaN(num)) {
        errors.push({
          row: rowNum,
          column: field,
          value: data[field],
          message: `Expected a number for "${field}", got "${data[field]}"`,
          severity: "error",
        });
      } else if (num < 0) {
        errors.push({
          row: rowNum,
          column: field,
          value: data[field],
          message: `Negative value for "${field}"`,
          severity: "warning",
        });
      }
    }
  }

  // Glucose-specific range check
  if (category === "glucose" && data.value) {
    const glucoseVal = parseFloat(data.value);
    if (!isNaN(glucoseVal) && (glucoseVal < 20 || glucoseVal > 600)) {
      errors.push({
        row: rowNum,
        column: "value",
        value: data.value,
        message: `Glucose value ${glucoseVal} mg/dL is outside expected range (20-600)`,
        severity: "warning",
      });
    }
  }

  return errors;
}

function getNumericFields(category: ImportCategory): string[] {
  switch (category) {
    case "glucose":
      return ["value"];
    case "sleep":
      return ["duration_hours", "score", "deep_hours", "rem_hours", "light_hours", "awake_hours", "heart_rate_avg", "hrv_avg"];
    case "workouts":
      return ["duration_minutes", "calories", "avg_heart_rate", "max_heart_rate", "distance_miles"];
    case "nutrition":
      return ["calories", "protein_g", "carbs_g", "fat_g", "fiber_g"];
    case "measurements":
      return ["value"];
    case "supplements":
      return ["dosage"];
    case "labs":
      return ["value", "reference_low", "reference_high"];
    default:
      return [];
  }
}

// ─── Summary Stats ──────────────────────────────────────────────

export function computePreviewStats(rows: ImportRow[]) {
  let validCount = 0;
  let errorCount = 0;
  let warningCount = 0;
  let skipCount = 0;

  for (const row of rows) {
    if (row.skip) {
      skipCount++;
      continue;
    }
    const hasError = row.errors.some((e) => e.severity === "error");
    const hasWarning = row.errors.some((e) => e.severity === "warning");
    if (hasError) errorCount++;
    else if (hasWarning) warningCount++;
    else validCount++;
  }

  return { total: rows.length, validCount, errorCount, warningCount, skipCount };
}
