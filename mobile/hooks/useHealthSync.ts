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

export function useHealthSync() {
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);

  // Backend mutations for syncing health data
  const syncMutation = trpc.clientPortal.devices.syncNow.useMutation();
  const glucoseCreate = trpc.clientPortal.glucose.create.useMutation();
  const measurementsCreate = trpc.clientPortal.measurements.create.useMutation();
  const sleepCreate = trpc.clientPortal.sleep.create.useMutation();
  const checkinSubmit = trpc.clientPortal.checkin.submit.useMutation();

  /**
   * Read the last 24 hours of health data from HealthKit and push
   * it to the Everist backend. Shows an alert on completion/failure.
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
    const errors: string[] = [];
    let sentCount = 0;

    try {
      // Read last 24 hours of data from HealthKit
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const [steps, heartRate, hrv, sleep, weight, glucose] = await Promise.all([
        HealthKit.readHealthData("HKQuantityTypeIdentifierStepCount", yesterday),
        HealthKit.readHealthData("HKQuantityTypeIdentifierHeartRate", yesterday),
        HealthKit.readHealthData("HKQuantityTypeIdentifierHeartRateVariabilitySDNN", yesterday),
        HealthKit.readHealthData("HKCategoryTypeIdentifierSleepAnalysis", yesterday),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBodyMass", yesterday),
        HealthKit.readHealthData("HKQuantityTypeIdentifierBloodGlucose", yesterday),
      ]);

      const totalSamples =
        steps.length +
        heartRate.length +
        hrv.length +
        sleep.length +
        weight.length +
        glucose.length;

      if (totalSamples === 0) {
        Alert.alert(
          "No New Data",
          "No health data was found in the last 24 hours. Make sure Apple Health has data from your devices.",
        );
        return;
      }

      // ── Send glucose readings to backend ──
      for (const reading of glucose) {
        try {
          // HealthKit blood glucose is in mg/dL
          const value = reading.value;
          if (value != null && value > 0) {
            await new Promise<void>((resolve, reject) => {
              glucoseCreate.mutate(
                {
                  valueMgdl: Number(value),
                  timestamp: reading.startDate ?? new Date().toISOString(),
                  source: "apple_health",
                },
                { onSuccess: () => { sentCount++; resolve(); }, onError: (e: any) => reject(e) },
              );
            });
          }
        } catch (e: any) {
          errors.push(`glucose: ${e.message ?? "failed"}`);
        }
      }

      // ── Send weight to backend (most recent only) ──
      if (weight.length > 0) {
        try {
          const latest = weight[weight.length - 1];
          const kg = latest.value;
          if (kg != null && kg > 0) {
            // HealthKit weight is in kg; backend expects lbs
            const lbs = Number(kg) * 2.20462;
            await new Promise<void>((resolve, reject) => {
              measurementsCreate.mutate(
                {
                  weightLbs: Math.round(lbs * 10) / 10,
                  date: (latest.startDate ?? new Date().toISOString()).split("T")[0],
                  source: "apple_health",
                },
                { onSuccess: () => { sentCount++; resolve(); }, onError: (e: any) => reject(e) },
              );
            });
          }
        } catch (e: any) {
          errors.push(`weight: ${e.message ?? "failed"}`);
        }
      }

      // ── Send sleep data to backend ──
      if (sleep.length > 0) {
        try {
          // HealthKit sleep analysis has multiple samples (inBed, asleep, etc.)
          // Sum total sleep duration from asleep samples
          let totalMinutes = 0;
          let earliestStart: string | null = null;
          let latestEnd: string | null = null;

          for (const s of sleep) {
            const start = s.startDate;
            const end = s.endDate;
            if (start && end) {
              const durationMs = new Date(end).getTime() - new Date(start).getTime();
              totalMinutes += durationMs / 60000;
              if (!earliestStart || start < earliestStart) earliestStart = start;
              if (!latestEnd || end > latestEnd) latestEnd = end;
            }
          }

          if (totalMinutes > 0) {
            const sessionDate = earliestStart
              ? new Date(earliestStart).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0];

            await new Promise<void>((resolve, reject) => {
              sleepCreate.mutate(
                {
                  date: sessionDate,
                  totalMinutes: Math.round(totalMinutes),
                  source: "apple_health",
                },
                { onSuccess: () => { sentCount++; resolve(); }, onError: (e: any) => reject(e) },
              );
            });
          }
        } catch (e: any) {
          errors.push(`sleep: ${e.message ?? "failed"}`);
        }
      }

      // ── Send steps, heart rate, and HRV via daily check-in ──
      try {
        const checkinData: Record<string, any> = {
          date: new Date().toISOString().split("T")[0],
          dataSources: { steps: "apple_health", heartRate: "apple_health", hrv: "apple_health" },
        };

        // Sum total steps
        if (steps.length > 0) {
          const totalSteps = steps.reduce(
            (sum: number, s: any) => sum + (Number(s.value ?? s.quantity) || 0),
            0,
          );
          if (totalSteps > 0) checkinData.steps = Math.round(totalSteps);
        }

        // Average resting heart rate (not directly stored per-reading in backend)
        // Use HRV if available
        if (hrv.length > 0) {
          const avgHrv = hrv.reduce(
            (sum: number, h: any) => sum + (Number(h.value ?? h.quantity) || 0),
            0,
          ) / hrv.length;
          if (avgHrv > 0) checkinData.hrvScore = Math.round(avgHrv);
        }

        if (Object.keys(checkinData).length > 2) {
          // Has actual health data beyond just date and dataSources
          await new Promise<void>((resolve, reject) => {
            checkinSubmit.mutate(checkinData, {
              onSuccess: () => { sentCount++; resolve(); },
              onError: (e: any) => reject(e),
            });
          });
        }
      } catch (e: any) {
        errors.push(`checkin: ${e.message ?? "failed"}`);
      }

      // ── Update sync timestamp on backend ──
      try {
        await new Promise<void>((resolve) => {
          syncMutation.mutate(
            { provider: "apple_health" },
            {
              onSuccess: () => resolve(),
              onError: () => resolve(), // Don't fail on sync log errors
            },
          );
        });
      } catch {
        // Sync log update is non-critical
      }

      setLastSyncTime(new Date().toISOString());

      if (errors.length > 0) {
        Alert.alert(
          "Partial Sync",
          `Synced ${sentCount} data points from Apple Health. Some data types could not be sent: ${errors.join(", ")}`,
        );
      } else {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${sentCount} data points from Apple Health to your Everist account.`,
        );
      }
    } catch (error: any) {
      Alert.alert(
        "Sync Error",
        error.message ?? "Failed to sync health data. Please try again.",
      );
    } finally {
      setIsSyncing(false);
    }
  }, [syncMutation, glucoseCreate, measurementsCreate, sleepCreate, checkinSubmit]);

  return { syncFromHealthKit, isSyncing, lastSyncTime };
}
