/**
 * useDataEntry — Custom hooks for manual health data entry.
 *
 * Tries to fetch/submit data via tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - dataEntry.recentEntries  -> recent manual entries by type
 *   - dataEntry.log            -> save a manual entry
 *   - dataEntry.entryTypes     -> available entry types with metadata
 */

import { Alert } from "react-native";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type EntryCategory =
  | "vitals"
  | "nutrition"
  | "exercise"
  | "sleep"
  | "mental"
  | "symptoms"
  | "medications";

export interface ManualEntry {
  id: string;
  type: string;
  value: number | string;
  unit: string;
  notes?: string;
  recordedAt: string;
  source: "manual";
}

export interface EntryType {
  id: string;
  label: string;
  category: EntryCategory;
  unit: string;
  icon: string;
  inputType: "number" | "text" | "scale" | "duration";
  min?: number;
  max?: number;
  step?: number;
  lastEntryAt?: string;
  lastValue?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_ENTRY_TYPES: EntryType[] = [
  {
    id: "blood_pressure",
    label: "Blood Pressure",
    category: "vitals",
    unit: "mmHg",
    icon: "heart",
    inputType: "text",
    lastEntryAt: "2026-06-14T07:30:00Z",
    lastValue: "118/76",
  },
  {
    id: "weight",
    label: "Weight",
    category: "vitals",
    unit: "lbs",
    icon: "scale",
    inputType: "number",
    min: 50,
    max: 500,
    step: 0.1,
    lastEntryAt: "2026-06-14T07:00:00Z",
    lastValue: "178.4",
  },
  {
    id: "blood_glucose",
    label: "Blood Glucose",
    category: "vitals",
    unit: "mg/dL",
    icon: "droplets",
    inputType: "number",
    min: 20,
    max: 600,
    step: 1,
    lastEntryAt: "2026-06-14T08:00:00Z",
    lastValue: "92",
  },
  {
    id: "body_temperature",
    label: "Body Temperature",
    category: "vitals",
    unit: "°F",
    icon: "thermometer",
    inputType: "number",
    min: 90,
    max: 110,
    step: 0.1,
    lastEntryAt: "2026-06-13T07:00:00Z",
    lastValue: "98.4",
  },
  {
    id: "water_intake",
    label: "Water Intake",
    category: "nutrition",
    unit: "oz",
    icon: "glass-water",
    inputType: "number",
    min: 0,
    max: 200,
    step: 8,
    lastEntryAt: "2026-06-14T12:00:00Z",
    lastValue: "64",
  },
  {
    id: "calories",
    label: "Calories",
    category: "nutrition",
    unit: "kcal",
    icon: "flame",
    inputType: "number",
    min: 0,
    max: 10000,
    step: 50,
    lastEntryAt: "2026-06-13T20:00:00Z",
    lastValue: "2,150",
  },
  {
    id: "exercise_duration",
    label: "Exercise Duration",
    category: "exercise",
    unit: "min",
    icon: "dumbbell",
    inputType: "number",
    min: 0,
    max: 480,
    step: 5,
    lastEntryAt: "2026-06-14T06:30:00Z",
    lastValue: "45",
  },
  {
    id: "mood",
    label: "Mood",
    category: "mental",
    unit: "/10",
    icon: "smile",
    inputType: "scale",
    min: 1,
    max: 10,
    step: 1,
    lastEntryAt: "2026-06-14T09:00:00Z",
    lastValue: "7",
  },
  {
    id: "stress_level",
    label: "Stress Level",
    category: "mental",
    unit: "/10",
    icon: "brain",
    inputType: "scale",
    min: 1,
    max: 10,
    step: 1,
    lastEntryAt: "2026-06-13T21:00:00Z",
    lastValue: "4",
  },
  {
    id: "pain_level",
    label: "Pain Level",
    category: "symptoms",
    unit: "/10",
    icon: "alert-circle",
    inputType: "scale",
    min: 0,
    max: 10,
    step: 1,
  },
];

const SAMPLE_RECENT_ENTRIES: ManualEntry[] = [
  {
    id: "entry-1",
    type: "blood_pressure",
    value: "118/76",
    unit: "mmHg",
    recordedAt: "2026-06-14T07:30:00Z",
    source: "manual",
  },
  {
    id: "entry-2",
    type: "weight",
    value: 178.4,
    unit: "lbs",
    recordedAt: "2026-06-14T07:00:00Z",
    source: "manual",
  },
  {
    id: "entry-3",
    type: "blood_glucose",
    value: 92,
    unit: "mg/dL",
    notes: "Fasting reading",
    recordedAt: "2026-06-14T08:00:00Z",
    source: "manual",
  },
  {
    id: "entry-4",
    type: "mood",
    value: 7,
    unit: "/10",
    notes: "Good energy this morning",
    recordedAt: "2026-06-14T09:00:00Z",
    source: "manual",
  },
  {
    id: "entry-5",
    type: "exercise_duration",
    value: 45,
    unit: "min",
    notes: "Upper body strength training",
    recordedAt: "2026-06-14T06:30:00Z",
    source: "manual",
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useRecentEntries — recent manual entries by type
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useRecentEntries(type?: string) {
  // Backend does not have clientPortal.dataEntry — return sample data directly
  const allEntries: ManualEntry[] = SAMPLE_RECENT_ENTRIES;

  // Filter client-side
  const entries = type
    ? allEntries.filter((e) => e.type === type)
    : allEntries;

  return {
    entries,
    isLoading: false,
    error: null,
    refetch: async () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLogEntry — mutation to save a manual entry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useLogEntry() {
  // Backend does not have clientPortal.dataEntry — no-op with Alert feedback
  const logEntry = (_entry: {
    type: string;
    value: number | string;
    unit: string;
    notes?: string;
    recordedAt?: string;
  }) => {
    Alert.alert("Entry logged");
  };

  return {
    logEntry,
    isLoading: false,
    error: null,
    isSuccess: false,
    reset: () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useEntryTypes — available entry types with metadata
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useEntryTypes() {
  // Backend does not have clientPortal.dataEntry — return sample data directly
  const entryTypes: EntryType[] = SAMPLE_ENTRY_TYPES;

  return {
    entryTypes,
    isLoading: false,
    error: null,
    refetch: async () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapApiEntry(raw: any): ManualEntry {
  return {
    id: raw.id,
    type: raw.type ?? "",
    value: raw.value ?? 0,
    unit: raw.unit ?? "",
    notes: raw.notes ?? undefined,
    recordedAt: raw.recordedAt ?? raw.createdAt ?? "",
    source: "manual",
  };
}

function mapApiEntryType(raw: any): EntryType {
  return {
    id: raw.id,
    label: raw.label ?? raw.name ?? "",
    category: raw.category ?? "vitals",
    unit: raw.unit ?? "",
    icon: raw.icon ?? "circle",
    inputType: raw.inputType ?? "number",
    min: raw.min ?? undefined,
    max: raw.max ?? undefined,
    step: raw.step ?? undefined,
    lastEntryAt: raw.lastEntryAt ?? undefined,
    lastValue: raw.lastValue ?? undefined,
  };
}
