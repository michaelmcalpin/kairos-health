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
    try {
      // Tell the backend a sync is starting
      await new Promise<void>((resolve, reject) => {
        syncMutation.mutate(
          { provider: "apple_health" },
          {
            onSuccess: () => resolve(),
            onError: (err: any) => {
              // Don't block on backend errors — still read HealthKit
              console.warn("Backend sync notification failed:", err);
              resolve();
            },
          },
        );
      });

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

      setLastSyncTime(new Date().toISOString());

      if (totalSamples === 0) {
        Alert.alert(
          "No New Data",
          "No health data was found in the last 24 hours. Make sure Apple Health has data from your devices.",
        );
      } else {
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${totalSamples} health data points from Apple Health.`,
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
  }, [syncMutation]);

  return { syncFromHealthKit, isSyncing, lastSyncTime };
}
