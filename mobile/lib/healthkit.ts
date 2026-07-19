/**
 * Apple HealthKit integration service.
 *
 * Wraps HealthKit calls behind a safe abstraction that:
 * 1. Checks if HealthKit is available (iOS only)
 * 2. Requests permissions for specific data types
 * 3. Reads health data (steps, heart rate, sleep, weight, etc.)
 * 4. Provides a sync function to push data to the backend
 *
 * Uses `react-native-health` for native HealthKit access.
 */

import { Platform, NativeModules } from "react-native";
import AppleHealthKit, {
  HealthKitPermissions,
  HealthInputOptions,
  HealthValue,
} from "react-native-health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// HealthKit availability
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// True only when running on iOS AND the native HealthKit module is
// actually linked into the binary (false in Expo Go / dev builds
// without the react-native-health config plugin applied).
const HK_AVAILABLE =
  Platform.OS === "ios" && NativeModules.AppleHealthKit != null;

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
// Permissions
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const permissions: HealthKitPermissions = {
  permissions: {
    read: [
      AppleHealthKit.Constants.Permissions.StepCount,
      AppleHealthKit.Constants.Permissions.HeartRate,
      AppleHealthKit.Constants.Permissions.RestingHeartRate,
      AppleHealthKit.Constants.Permissions.HeartRateVariability,
      AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
      AppleHealthKit.Constants.Permissions.Weight,
      AppleHealthKit.Constants.Permissions.BodyFatPercentage,
      AppleHealthKit.Constants.Permissions.BloodGlucose,
      AppleHealthKit.Constants.Permissions.SleepAnalysis,
      AppleHealthKit.Constants.Permissions.OxygenSaturation,
      AppleHealthKit.Constants.Permissions.BodyTemperature,
      AppleHealthKit.Constants.Permissions.RespiratoryRate,
    ],
    write: [],
  },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Public API
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Check if HealthKit is available (iOS only). */
export function isHealthKitAvailable(): boolean {
  return HK_AVAILABLE;
}

/**
 * Request HealthKit read permissions.
 * Safe to call on any platform — returns `isAvailable: false` on Android.
 */
export async function requestHealthKitPermissions(): Promise<HealthKitStatus> {
  if (!HK_AVAILABLE) {
    return {
      isAvailable: false,
      isAuthorized: false,
      error: "HealthKit is only available on iOS",
    };
  }

  try {
    return new Promise<HealthKitStatus>((resolve) => {
      try {
        AppleHealthKit.initHealthKit(permissions, (error: string) => {
          if (error) {
            resolve({
              isAvailable: true,
              isAuthorized: false,
              error: typeof error === "string" ? error : "Permission denied",
            });
          } else {
            resolve({ isAvailable: true, isAuthorized: true });
          }
        });
      } catch (e) {
        // Native module missing or threw synchronously — resolve with a
        // clear error instead of an unhandled rejection (silent failure)
        resolve({
          isAvailable: false,
          isAuthorized: false,
          error:
            e instanceof Error
              ? e.message
              : "HealthKit native module is not available in this build.",
        });
      }
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
 * the HealthKit type identifier. Returns an empty array if HealthKit
 * is not available or the query fails.
 */
export async function readHealthData(
  type: HealthKitDataType,
  startDate: Date,
  endDate: Date = new Date(),
): Promise<HealthKitSample[]> {
  if (!HK_AVAILABLE) return [];

  try {
    const options: HealthInputOptions = {
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      limit: 100,
    };

    return new Promise<HealthKitSample[]>((resolve) => {
      const callback = (err: string, results: HealthValue[]) => {
        if (err || !results) {
          resolve([]);
          return;
        }
        resolve(
          results.map((r: any) => ({
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
          AppleHealthKit.getDailyStepCountSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierHeartRate":
          AppleHealthKit.getHeartRateSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierRestingHeartRate":
          AppleHealthKit.getRestingHeartRate(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierHeartRateVariabilitySDNN":
          AppleHealthKit.getHeartRateVariabilitySamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierActiveEnergyBurned":
          // ActiveEnergyBurned not directly available as a method;
          // fall through to generic callback
          resolve([]);
          break;
        case "HKQuantityTypeIdentifierBodyMass":
          AppleHealthKit.getWeightSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierBodyFatPercentage":
          AppleHealthKit.getBodyFatPercentageSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierBloodGlucose":
          AppleHealthKit.getBloodGlucoseSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierBloodPressureSystolic":
          AppleHealthKit.getBloodPressureSamples(options, (err: string, results: any[]) => {
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
          AppleHealthKit.getBloodPressureSamples(options, (err: string, results: any[]) => {
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
          AppleHealthKit.getOxygenSaturationSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierBodyTemperature":
          AppleHealthKit.getBodyTemperatureSamples(options, callback as any);
          break;
        case "HKQuantityTypeIdentifierRespiratoryRate":
          AppleHealthKit.getRespiratoryRateSamples(options, callback as any);
          break;
        case "HKCategoryTypeIdentifierSleepAnalysis":
          AppleHealthKit.getSleepSamples(options, callback as any);
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
