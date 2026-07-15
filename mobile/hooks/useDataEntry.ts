/**
 * useDataEntry — Custom hooks for manual health data entry.
 *
 * Wired to real tRPC endpoints for fetching and submitting data.
 *
 * tRPC paths used (under `clientPortal`):
 *   - measurements.list / measurements.latest -> weight & body measurements
 *   - bloodPressure.getHistory / bloodPressure.add -> blood pressure
 *   - glucose.list / glucose.create -> blood glucose
 *   - checkin.submit -> general check-in data (mood, stress, sleep, etc.)
 */

import { useMemo } from "react";
import { Alert } from "react-native";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

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
// Entry Type Metadata (static UI config — no fake values)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const ENTRY_TYPES_METADATA: Omit<EntryType, "lastEntryAt" | "lastValue">[] = [
  {
    id: "blood_pressure",
    label: "Blood Pressure",
    category: "vitals",
    unit: "mmHg",
    icon: "heart",
    inputType: "text",
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useRecentEntries — recent manual entries by type
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useRecentEntries(type?: string) {
  // Query real endpoints — each is enabled only when relevant
  const measurementsQuery = trpc.clientPortal.measurements.list.useQuery(
    { limit: 10 },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && (!type || type === "weight"),
    },
  );
  const bpQuery = trpc.clientPortal.bloodPressure.getHistory.useQuery(
    { limit: 10 },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && (!type || type === "blood_pressure"),
    },
  );
  const glucoseQuery = trpc.clientPortal.glucose.list.useQuery(
    { limit: 10 },
    {
      ...DEFAULT_QUERY_OPTIONS,
      enabled: DEFAULT_QUERY_OPTIONS.enabled && (!type || type === "blood_glucose"),
    },
  );

  // Map API data into unified ManualEntry format
  const entries = useMemo<ManualEntry[]>(() => {
    const result: ManualEntry[] = [];

    // Weight / body measurements
    if (!type || type === "weight") {
      const rawMeasurements = measurementsQuery.data;
      if (rawMeasurements && Array.isArray(rawMeasurements)) {
        for (const m of rawMeasurements as any[]) {
          if (m.weightLbs != null) {
            result.push({
              id: m.id ?? `m-${m.date}`,
              type: "weight",
              value: m.weightLbs,
              unit: "lbs",
              notes: m.notes ?? undefined,
              recordedAt: m.date ?? m.createdAt ?? "",
              source: "manual",
            });
          }
        }
      }
    }

    // Blood pressure
    if (!type || type === "blood_pressure") {
      const rawBp = bpQuery.data;
      if (rawBp && Array.isArray(rawBp)) {
        for (const bp of rawBp as any[]) {
          result.push({
            id: bp.id ?? `bp-${bp.date}`,
            type: "blood_pressure",
            value: `${bp.systolic}/${bp.diastolic}`,
            unit: "mmHg",
            notes: bp.notes ?? undefined,
            recordedAt: bp.date ?? bp.createdAt ?? "",
            source: "manual",
          });
        }
      }
    }

    // Blood glucose
    if (!type || type === "blood_glucose") {
      const rawGlucose = glucoseQuery.data;
      if (rawGlucose && Array.isArray(rawGlucose)) {
        for (const g of rawGlucose as any[]) {
          result.push({
            id: g.id ?? `g-${g.timestamp}`,
            type: "blood_glucose",
            value: g.valueMgdl ?? g.value ?? 0,
            unit: "mg/dL",
            notes: g.notes ?? g.timingContext ?? undefined,
            recordedAt: g.timestamp ?? g.createdAt ?? "",
            source: "manual",
          });
        }
      }
    }

    // Sort by date, most recent first
    result.sort((a, b) => {
      const dateA = new Date(a.recordedAt).getTime() || 0;
      const dateB = new Date(b.recordedAt).getTime() || 0;
      return dateB - dateA;
    });

    return result;
  }, [type, measurementsQuery.data, bpQuery.data, glucoseQuery.data]);

  const isLoading = measurementsQuery.isLoading || bpQuery.isLoading || glucoseQuery.isLoading;

  return {
    entries,
    isLoading,
    error: measurementsQuery.error ?? bpQuery.error ?? glucoseQuery.error ?? null,
    refetch: async () => {
      await Promise.all([
        measurementsQuery.refetch(),
        bpQuery.refetch(),
        glucoseQuery.refetch(),
      ]);
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useLogEntry — mutation to save a manual entry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useLogEntry() {
  const glucoseMutation = trpc.clientPortal.glucose.create.useMutation();
  const bpMutation = trpc.clientPortal.bloodPressure.add.useMutation();
  const weightMutation = trpc.clientPortal.measurements.create.useMutation();
  const checkinMutation = trpc.clientPortal.checkin.submit.useMutation();

  const logEntry = (entry: {
    type: string;
    value: number | string;
    unit: string;
    notes?: string;
    recordedAt?: string;
  }) => {
    const date = entry.recordedAt
      ? new Date(entry.recordedAt).toISOString().split("T")[0]
      : new Date().toISOString().split("T")[0];

    try {
      switch (entry.type) {
        case "blood_glucose": {
          const valueMgdl = typeof entry.value === "number"
            ? entry.value
            : parseFloat(String(entry.value)) || 0;
          glucoseMutation.mutate({
            valueMgdl,
            notes: entry.notes,
            source: "manual",
            date,
          });
          break;
        }

        case "blood_pressure": {
          // Parse "systolic/diastolic" format
          const parts = String(entry.value).split("/");
          const systolic = parseInt(parts[0], 10) || 0;
          const diastolic = parseInt(parts[1], 10) || 0;
          bpMutation.mutate({
            systolic,
            diastolic,
            source: "manual",
            date,
          });
          break;
        }

        case "weight": {
          const weightLbs = typeof entry.value === "number"
            ? entry.value
            : parseFloat(String(entry.value)) || 0;
          weightMutation.mutate({
            weightLbs,
            notes: entry.notes,
            source: "manual",
            date,
          });
          break;
        }

        default: {
          // For mood, stress, sleep, exercise, etc. — use checkin endpoint
          const checkinData: Record<string, any> = { date };

          if (entry.type === "mood") {
            checkinData.mood = typeof entry.value === "number" ? entry.value : parseInt(String(entry.value), 10);
          } else if (entry.type === "stress_level") {
            checkinData.stressLevel = typeof entry.value === "number" ? entry.value : parseInt(String(entry.value), 10);
          } else if (entry.type === "exercise_duration") {
            checkinData.exerciseMinutes = typeof entry.value === "number" ? entry.value : parseInt(String(entry.value), 10);
          } else if (entry.type === "pain_level") {
            checkinData.notes = `Pain level: ${entry.value}/10${entry.notes ? ` — ${entry.notes}` : ""}`;
          } else {
            // body_temperature, water_intake, calories, etc.
            checkinData.notes = `${entry.type}: ${entry.value} ${entry.unit}${entry.notes ? ` — ${entry.notes}` : ""}`;
          }

          checkinMutation.mutate(checkinData);
          break;
        }
      }
    } catch (error: any) {
      Alert.alert("Error", error.message ?? "Failed to log entry. Please try again.");
    }
  };

  const isLoading =
    glucoseMutation.isPending ||
    bpMutation.isPending ||
    weightMutation.isPending ||
    checkinMutation.isPending;

  const isSuccess =
    glucoseMutation.isSuccess ||
    bpMutation.isSuccess ||
    weightMutation.isSuccess ||
    checkinMutation.isSuccess;

  return {
    logEntry,
    isLoading,
    error:
      glucoseMutation.error ??
      bpMutation.error ??
      weightMutation.error ??
      checkinMutation.error ??
      null,
    isSuccess,
    reset: () => {
      glucoseMutation.reset();
      bpMutation.reset();
      weightMutation.reset();
      checkinMutation.reset();
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useEntryTypes — available entry types with metadata
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useEntryTypes() {
  // Fetch latest values from real endpoints to populate lastEntryAt / lastValue
  const latestMeasurement = trpc.clientPortal.measurements.latest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const latestBp = trpc.clientPortal.bloodPressure.getLatest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const entryTypes = useMemo<EntryType[]>(() => {
    return ENTRY_TYPES_METADATA.map((meta) => {
      const entry: EntryType = { ...meta };

      // Enrich with real latest data where available
      if (meta.id === "weight" && latestMeasurement.data) {
        const m = latestMeasurement.data as any;
        if (m.weightLbs != null) {
          entry.lastValue = String(m.weightLbs);
          entry.lastEntryAt = m.date ?? m.createdAt;
        }
      }

      if (meta.id === "blood_pressure" && latestBp.data) {
        const bp = latestBp.data as any;
        if (bp.systolic != null && bp.diastolic != null) {
          entry.lastValue = `${bp.systolic}/${bp.diastolic}`;
          entry.lastEntryAt = bp.date ?? bp.createdAt;
        }
      }

      return entry;
    });
  }, [latestMeasurement.data, latestBp.data]);

  return {
    entryTypes,
    isLoading: latestMeasurement.isLoading || latestBp.isLoading,
    error: latestMeasurement.error ?? latestBp.error ?? null,
    refetch: async () => {
      await Promise.all([
        latestMeasurement.refetch(),
        latestBp.refetch(),
      ]);
    },
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
