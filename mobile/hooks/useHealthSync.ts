/**
 * useHealthSync — Hooks for Apple HealthKit connection and data sync.
 *
 * Provides two hooks:
 *   - `useHealthKitStatus`: check/request HealthKit permissions
 *   - `useHealthSync`: read data from HealthKit and push to the backend
 */

import { useState, useCallback, useEffect } from "react";
import { Alert, Platform } from "react-native";
import { trpc } from "@/lib/api";
import * as HealthKit from "@/lib/healthkit";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useHealthKitStatus — check and request HealthKit permissions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useHealthKitStatus() {
  const [status, setStatus] = useState<HealthKit.HealthKitStatus>({
    isAvailable: Platform.OS === "ios",
    isAuthorized: false,
  });
  const [isChecking, setIsChecking] = useState(false);

  // Check availability on mount (does not prompt the user)
  useEffect(() => {
    setStatus((prev) => ({
      ...prev,
      isAvailable: HealthKit.isHealthKitAvailable(),
    }));
  }, []);

  /**
   * Request HealthKit permissions.
   * On iOS this shows the native HealthKit permission dialog.
   */
  const checkAndRequest = useCallback(async () => {
    if (Platform.OS !== "ios") {
      const result: HealthKit.HealthKitStatus = {
        isAvailable: false,
        isAuthorized: false,
        error: "HealthKit is only available on iOS",
      };
      setStatus(result);
      return result;
    }

    setIsChecking(true);
    try {
      const result = await HealthKit.requestHealthKitPermissions();
      setStatus(result);
      return result;
    } finally {
      setIsChecking(false);
    }
  }, []);

  return { status, isChecking, checkAndRequest };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useHealthSync — read HealthKit data and push to backend
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Extract the YYYY-MM-DD portion of an ISO timestamp (device-local as reported by HealthKit). */
function dateOf(iso: string | undefined | null): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().split("T")[0];
}

/** HH:MM from an ISO timestamp (local time). */
function timeOf(iso: string): string {
  const d = new Date(iso);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/**
 * Defensively decide whether a HealthKit sleep sample counts as actual
 * sleep. react-native-health returns `value` as a string on sleep
 * samples ("INBED" | "ASLEEP" | "AWAKE", newer versions also
 * "CORE"/"DEEP"/"REM"). Some shapes return the raw HKCategoryValue
 * number (0 = inBed, 1 = asleep, 2 = awake).
 */
function isAsleepSample(sample: any): boolean {
  const v = sample?.value;
  if (typeof v === "string") {
    const upper = v.toUpperCase();
    if (upper === "INBED" || upper === "AWAKE") return false;
    return (
      upper === "ASLEEP" ||
      upper.startsWith("ASLEEP") ||
      upper === "CORE" ||
      upper === "DEEP" ||
      upper === "REM"
    );
  }
  if (typeof v === "number") return v === 1;
  // Unknown shape — count it rather than dropping sleep entirely
  return true;
}

export function useHealthSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Single bulk-ingest mutation — replaces the old per-category mutations
  const healthkitSync = trpc.clientPortal.devices.healthkitSync.useMutation();

  /**
   * Read the last 7 days of health data from HealthKit and push it to
   * the Everist backend in one bulk `healthkitSync` call. The backend
   * dedups by source + timestamp window / date, so re-syncing the same
   * window is safe.
   */
  const syncFromHealthKit = useCallback(async () => {
    if (!HealthKit.isHealthKitAvailable()) {
      Alert.alert(
        "Not Available",
        Platform.OS !== "ios"
          ? "Apple Health is only available on iOS devices."
          : "HealthKit module is not installed. Please rebuild the app with EAS Build.",
      );
      return;
    }

    setIsSyncing(true);

    try {
      // Sync window: last 7 days
      const windowStart = new Date();
      windowStart.setDate(windowStart.getDate() - 7);

      const [
        steps,
        heartRate,
        restingHR,
        hrv,
        sleep,
        weight,
        bodyFat,
        glucose,
        bpSystolic,
        bpDiastolic,
        activeEnergy,
      ] = await Promise.all([
        HealthKit.readHealthData("HKQuantityTypeIdentifierStepCount", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierHeartRate", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierRestingHeartRate", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", windowStart),
        HealthKit.readHealthData("HKCategoryTypeIdentifierSleepAnalysis", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBodyMass", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBodyFatPercentage", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBloodGlucose", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBloodPressureSystolic", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBloodPressureDiastolic", windowStart),
        HealthKit.readHealthData("HKQuantityTypeIdentifierActiveEnergyBurned", windowStart),
      ]);

      // ── Heart rate: per-sample, plus resting HR folded in ──
      const heartRatePayload: { timestamp: string; bpm: number }[] = [];
      for (const s of [...heartRate, ...restingHR]) {
        const bpm = Number(s.value);
        if (s.startDate && bpm > 0) {
          heartRatePayload.push({ timestamp: s.startDate, bpm: Math.round(bpm) });
        }
      }

      // ── HRV: native returns SECONDS — convert to ms, per-sample ──
      const hrvPayload: { timestamp: string; ms: number }[] = [];
      for (const s of hrv) {
        const seconds = Number(s.value);
        if (s.startDate && seconds > 0) {
          hrvPayload.push({ timestamp: s.startDate, ms: seconds * 1000 });
        }
      }

      // ── Glucose: native returns mg/dL (explicit unit) — use directly ──
      const glucosePayload: { timestamp: string; valueMgdl: number }[] = [];
      for (const s of glucose) {
        const mgdl = Number(s.value);
        if (s.startDate && mgdl > 0) {
          glucosePayload.push({ timestamp: s.startDate, valueMgdl: mgdl });
        }
      }

      // ── Blood pressure: pair systolic/diastolic samples by timestamp ──
      const bpPayload: { date: string; systolic: number; diastolic: number }[] = [];
      {
        const diastolicByTs = new Map<string, number>();
        for (const d of bpDiastolic) {
          if (d.startDate && Number(d.value) > 0) {
            diastolicByTs.set(d.startDate, Number(d.value));
          }
        }
        for (const s of bpSystolic) {
          const sys = Number(s.value);
          const dia = s.startDate ? diastolicByTs.get(s.startDate) : undefined;
          const date = dateOf(s.startDate);
          if (date && sys > 0 && dia != null && dia > 0) {
            bpPayload.push({ date, systolic: Math.round(sys), diastolic: Math.round(dia) });
          }
        }
      }

      // ── Sleep: only ASLEEP samples, aggregated per wake date ──
      const sleepPayload: {
        date: string;
        totalMinutes: number;
        bedtime?: string;
        wakeTime?: string;
      }[] = [];
      {
        const byDate = new Map<
          string,
          { totalMinutes: number; earliestStart: string; latestEnd: string }
        >();
        for (const s of sleep) {
          if (!isAsleepSample(s)) continue;
          if (!s.startDate || !s.endDate) continue;
          const durationMin =
            (new Date(s.endDate).getTime() - new Date(s.startDate).getTime()) / 60000;
          if (!(durationMin > 0)) continue;
          // Attribute the session to the wake date (end of the sample)
          const date = dateOf(s.endDate);
          if (!date) continue;
          const existing = byDate.get(date);
          if (existing) {
            existing.totalMinutes += durationMin;
            if (s.startDate < existing.earliestStart) existing.earliestStart = s.startDate;
            if (s.endDate > existing.latestEnd) existing.latestEnd = s.endDate;
          } else {
            byDate.set(date, {
              totalMinutes: durationMin,
              earliestStart: s.startDate,
              latestEnd: s.endDate,
            });
          }
        }
        for (const [date, agg] of byDate) {
          sleepPayload.push({
            date,
            totalMinutes: Math.round(agg.totalMinutes),
            bedtime: timeOf(agg.earliestStart),
            wakeTime: timeOf(agg.latestEnd),
          });
        }
      }

      // ── Weight (native returns POUNDS via explicit unit) + body fat ──
      const weightPayload: { date: string; weightLbs?: number; bodyFatPct?: number }[] = [];
      {
        const byDate = new Map<string, { weightLbs?: number; bodyFatPct?: number }>();
        for (const s of weight) {
          const lbs = Number(s.value);
          const date = dateOf(s.startDate);
          if (date && lbs > 0) {
            const entry = byDate.get(date) ?? {};
            entry.weightLbs = Math.round(lbs * 10) / 10;
            byDate.set(date, entry);
          }
        }
        // Merge body fat into the same-date entry when possible; otherwise
        // create its own entry
        for (const s of bodyFat) {
          const pct = Number(s.value);
          const date = dateOf(s.startDate);
          if (date && pct > 0) {
            const entry = byDate.get(date) ?? {};
            entry.bodyFatPct = Math.round(pct * 10) / 10;
            byDate.set(date, entry);
          }
        }
        for (const [date, entry] of byDate) {
          weightPayload.push({ date, ...entry });
        }
      }

      // ── Activity: steps + active calories aggregated per day ──
      const activityPayload: { date: string; steps?: number; caloriesActive?: number }[] = [];
      {
        const byDate = new Map<string, { steps?: number; caloriesActive?: number }>();
        for (const s of steps) {
          const count = Number(s.value);
          const date = dateOf(s.startDate);
          if (date && count > 0) {
            const entry = byDate.get(date) ?? {};
            entry.steps = (entry.steps ?? 0) + count;
            byDate.set(date, entry);
          }
        }
        for (const s of activeEnergy) {
          const kcal = Number(s.value);
          const date = dateOf(s.startDate);
          if (date && kcal > 0) {
            const entry = byDate.get(date) ?? {};
            entry.caloriesActive = (entry.caloriesActive ?? 0) + kcal;
            byDate.set(date, entry);
          }
        }
        for (const [date, entry] of byDate) {
          activityPayload.push({
            date,
            steps: entry.steps != null ? Math.round(entry.steps) : undefined,
            caloriesActive:
              entry.caloriesActive != null ? Math.round(entry.caloriesActive) : undefined,
          });
        }
      }

      // ── Build the bulk payload — only include categories with data ──
      const payload: Record<string, unknown> = {};
      if (heartRatePayload.length > 0) payload.heartRate = heartRatePayload.slice(0, 2000);
      if (hrvPayload.length > 0) payload.hrv = hrvPayload.slice(0, 2000);
      if (glucosePayload.length > 0) payload.glucose = glucosePayload.slice(0, 2000);
      if (bpPayload.length > 0) payload.bloodPressure = bpPayload.slice(0, 2000);
      if (sleepPayload.length > 0) payload.sleep = sleepPayload.slice(0, 2000);
      if (weightPayload.length > 0) payload.weight = weightPayload.slice(0, 2000);
      if (activityPayload.length > 0) payload.activity = activityPayload.slice(0, 2000);

      if (Object.keys(payload).length === 0) {
        Alert.alert(
          "No New Data",
          "No health data was found in the last 7 days. Make sure Apple Health has data from your devices.",
        );
        return;
      }

      // ── One bulk call to the backend ──
      const result: any = await healthkitSync.mutateAsync(payload as any);

      setLastSyncTime(new Date().toISOString());

      // Honest reporting: only mention categories that actually had samples
      const counts: Record<string, number> = result?.counts ?? {};
      const labels: Record<string, string> = {
        heartRate: "heart rate",
        hrv: "HRV",
        glucose: "glucose",
        bloodPressure: "blood pressure",
        sleep: "sleep",
        weight: "weight",
        activity: "activity",
      };
      const summary = Object.entries(counts)
        .filter(([, n]) => Number(n) > 0)
        .map(([key, n]) => `${labels[key] ?? key}: ${n}`)
        .join(", ");
      const total = Number(result?.total ?? 0);

      Alert.alert(
        "Sync Complete",
        summary.length > 0
          ? `Synced ${total} records from Apple Health (${summary}).`
          : "Sync finished, but no records were stored.",
      );
    } catch (error: any) {
      Alert.alert(
        "Sync Error",
        error?.message ?? "Failed to sync health data. Please try again.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [healthkitSync]);

  return { syncFromHealthKit, isSyncing, lastSyncTime };
}
