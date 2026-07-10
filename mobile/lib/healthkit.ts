/**
 * Apple HealthKit integration service.
 *
 * Wraps HealthKit calls behind a safe abstraction that:
 * 1. Checks if HealthKit is available (iOS only)
 * 2. Requests permissions for specific data types
 * 3. Reads health data (steps, heart rate, sleep, weight, etc.)
 * 4. Provides a sync function to push data to the backend
 *
 * Gracefully handles the case where `react-native-health` is not yet
 * installed — callers get "not available" instead of a crash.
 */

import { Platform } from "react-native";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HealthKit data type identifiers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const HEALTHKIT_READ_TYPES = [
  "HKQuantityTypeIdentifierStepCount",
  "HKQuantityTypeIdentifierHeartRate",
  "HKQuantityTypeIdentifierRestingHeartRate",
  "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
  "HKQuantityTypeIdentifierActiveEnergyBurned",
  "HKQuantityTypeIdentifierBodyMass",
  "HKQuantityTypeIdentifierBodyFatPercentage",
  "HKQuantityTypeIdentifierBloodGlucose",
  "HKQuantityTypeIdentifierBloodPressureSystolic",
  "HKQuantityTypeIdentifierBloodPressureDiastolic",
  "HKQuantityTypeIdentifierOxygenSaturation",
  "HKQuantityTypeIdentifierBodyTemperature",
  "HKQuantityTypeIdentifierRespiratoryRate",
  "HKCategoryTypeIdentifierSleepAnalysis",
] as const;

export type HealthKitDataType = (typeof HEALTHKIT_READ_TYPES)[number];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HealthKitSample {
  type: string;
  value: number;
  unit: string;
  startDate: string;
  endDate: string;
  source?: string;
}

export interface HealthKitStatus {
  isAvailable: boolean;
  isAuthorized: boolean;
  error?: string;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Module-level state
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

let healthKitModule: any = null;
let _moduleChecked = false;

/**
 * Attempt to load the native module exactly once.
 * Returns the module or null if not installed.
 */
function loadModule(): any {
  if (_moduleChecked) return healthKitModule;
  _moduleChecked = true;

  if (Platform.OS !== "ios") return null;

  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    healthKitModule = require("react-native-health");
    return healthKitModule;
  } catch {
    // Module not installed — HealthKit not available in this build
    return null;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Public API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Check if HealthKit is available (iOS only, module installed). */
export function isHealthKitAvailable(): boolean {
  return loadModule() != null;
}

/**
 * Request HealthKit read permissions.
 * Safe to call on any platform — returns `isAvailable: false` on Android.
 */
export async function requestHealthKitPermissions(): Promise<HealthKitStatus> {
  const mod = loadModule();
  if (!mod) {
    return {
      isAvailable: false,
      isAuthorized: false,
      error: Platform.OS !== "ios"
        ? "HealthKit is only available on iOS"
        : "react-native-health module is not installed",
    };
  }

  try {
    const permissions = {
      permissions: {
        read: HEALTHKIT_READ_TYPES as unknown as string[],
        write: [] as string[], // Read-only — we don't write back to HealthKit
      },
    };

    return new Promise<HealthKitStatus>((resolve) => {
      const hk = mod.default ?? mod;
      hk.initHealthKit(permissions, (error: any) => {
        if (error) {
          resolve({
            isAvailable: true,
            isAuthorized: false,
            error: error.message ?? "Permission denied",
          });
        } else {
          resolve({ isAvailable: true, isAuthorized: true });
        }
      });
    });
  } catch (error: any) {
    return {
      isAvailable: true,
      isAuthorized: false,
      error: error.message ?? "Unexpected error requesting permissions",
    };
  }
}

/**
 * Read health samples for a given type within a date range.
 *
 * Routes to the correct `react-native-health` query method based on
 * the HealthKit type identifier. Returns an empty array if the module
 * is not installed or the query fails.
 */
export async function readHealthData(
  type: HealthKitDataType,
  startDate: Date,
  endDate: Date = new Date(),
): Promise<HealthKitSample[]> {
  const mod = loadModule();
  if (!mod) return [];

  const hk = mod.default ?? mod;

  try {
    const options = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100,
    };

    return new Promise<HealthKitSample[]>((resolve) => {
      const callback = (err: any, results: any[]) => {
        if (err || !results) {
          resolve([]);
          return;
        }
        resolve(
          results.map((r) => ({
            type,
            value: r.value ?? r.quantity ?? 0,
            unit: r.unit ?? "",
            startDate: r.startDate ?? r.start,
            endDate: r.endDate ?? r.end,
            source: r.sourceName,
          })),
        );
      };

      // Route to the correct HealthKit query method
      switch (type) {
        case "HKQuantityTypeIdentifierStepCount":
          hk.getDailyStepCountSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierHeartRate":
          hk.getHeartRateSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierRestingHeartRate":
          hk.getRestingHeartRateSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN":
          hk.getHeartRateVariabilitySamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierActiveEnergyBurned":
          hk.getActiveEnergyBurned(options, callback);
          break;
        case "HKQuantityTypeIdentifierBodyMass":
          hk.getWeightSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierBodyFatPercentage":
          hk.getBodyFatPercentageSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierBloodGlucose":
          hk.getBloodGlucoseSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierBloodPressureSystolic":
          hk.getBloodPressureSamples(options, (err: any, results: any[]) => {
            if (err || !results) {
              resolve([]);
              return;
            }
            resolve(
              results.map((r) => ({
                type,
                value: r.bloodPressureSystolicValue ?? r.value ?? 0,
                unit: "mmHg",
                startDate: r.startDate ?? r.start,
                endDate: r.endDate ?? r.end,
                source: r.sourceName,
              })),
            );
          });
          return; // Early return — custom callback above
        case "HKQuantityTypeIdentifierBloodPressureDiastolic":
          hk.getBloodPressureSamples(options, (err: any, results: any[]) => {
            if (err || !results) {
              resolve([]);
              return;
            }
            resolve(
              results.map((r) => ({
                type,
                value: r.bloodPressureDiastolicValue ?? r.value ?? 0,
                unit: "mmHg",
                startDate: r.startDate ?? r.start,
                endDate: r.endDate ?? r.end,
                source: r.sourceName,
              })),
            );
          });
          return;
        case "HKQuantityTypeIdentifierOxygenSaturation":
          hk.getOxygenSaturationSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierBodyTemperature":
          hk.getBodyTemperatureSamples(options, callback);
          break;
        case "HKQuantityTypeIdentifierRespiratoryRate":
          hk.getRespiratoryRateSamples(options, callback);
          break;
        case "HKCategoryTypeIdentifierSleepAnalysis":
          hk.getSleepSamples(options, callback);
          break;
        default:
          resolve([]);
      }
    });
  } catch {
    return [];
  }
}

/**
 * Get a quick summary of today's health data.
 * Useful for dashboard cards and status displays.
 */
export async function getTodaysSummary(): Promise<Record<string, number>> {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const summary: Record<string, number> = {};

  // Steps
  const steps = await readHealthData(
    "HKQuantityTypeIdentifierStepCount",
    today,
  );
  if (steps.length > 0) {
    summary.steps = steps.reduce((sum, s) => sum + s.value, 0);
  }

  // Heart rate (average)
  const heartRate = await readHealthData(
    "HKQuantityTypeIdentifierHeartRate",
    today,
  );
  if (heartRate.length > 0) {
    summary.heartRate = Math.round(
      heartRate.reduce((sum, s) => sum + s.value, 0) / heartRate.length,
    );
  }

  // Resting heart rate (latest)
  const restingHR = await readHealthData(
    "HKQuantityTypeIdentifierRestingHeartRate",
    today,
  );
  if (restingHR.length > 0) {
    summary.restingHeartRate = restingHR[restingHR.length - 1].value;
  }

  // HRV (latest)
  const hrv = await readHealthData(
    "HKQuantityTypeIdentifierHeartRateVariabilitySDNN",
    today,
  );
  if (hrv.length > 0) {
    summary.hrv = Math.round(hrv[hrv.length - 1].value);
  }

  // Active energy burned
  const energy = await readHealthData(
    "HKQuantityTypeIdentifierActiveEnergyBurned",
    today,
  );
  if (energy.length > 0) {
    summary.activeCalories = Math.round(
      energy.reduce((sum, s) => sum + s.value, 0),
    );
  }

  return summary;
}
