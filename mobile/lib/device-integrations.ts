/**
 * Device Integration Service
 *
 * Manages connections to health device platforms:
 *   - Apple Health: native HealthKit integration (iOS only)
 *   - Oura, Garmin, WHOOP, Dexcom, Hume AI, etc.: OAuth-based cloud integrations
 *
 * Each provider has its own connection flow. OAuth providers use the
 * backend's `devices.initiateConnect` tRPC procedure which returns an
 * authorization URL. Native integrations (Apple Health) use the
 * HealthKit permission dialog directly.
 */

import { Platform } from "react-native";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DeviceProvider =
  | "apple_health"
  | "oura"
  | "garmin"
  | "whoop"
  | "dexcom"
  | "withings"
  | "fitbit"
  | "hume";

export type ConnectionType = "native" | "oauth" | "external";

export interface DeviceProviderInfo {
  id: DeviceProvider;
  name: string;
  description: string;
  icon: string;
  connectionType: ConnectionType;
  supported: boolean;
  dataTypes: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Provider registry
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export const DEVICE_PROVIDERS: DeviceProviderInfo[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    description:
      "Sync steps, heart rate, sleep, workouts, and more from Apple Health.",
    icon: "heart",
    connectionType: "native",
    supported: Platform.OS === "ios",
    dataTypes: [
      "steps",
      "heart_rate",
      "hrv",
      "sleep",
      "weight",
      "blood_glucose",
      "blood_pressure",
      "workouts",
    ],
  },
  {
    id: "oura",
    name: "Oura Ring",
    description:
      "Sleep tracking, readiness scores, activity, and body temperature from Oura.",
    icon: "circle",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["sleep", "hrv", "body_temperature", "readiness", "activity"],
  },
  {
    id: "garmin",
    name: "Garmin",
    description:
      "Activity, heart rate, sleep, stress, and body battery from Garmin devices.",
    icon: "watch",
    connectionType: "oauth",
    supported: true,
    dataTypes: [
      "steps",
      "heart_rate",
      "sleep",
      "stress",
      "body_battery",
      "workouts",
    ],
  },
  {
    id: "whoop",
    name: "WHOOP",
    description:
      "Recovery, strain, sleep performance, and HRV from WHOOP.",
    icon: "activity",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["recovery", "strain", "sleep", "hrv", "heart_rate"],
  },
  {
    id: "dexcom",
    name: "Dexcom CGM",
    description: "Continuous glucose monitoring data from Dexcom G6/G7.",
    icon: "droplets",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["glucose"],
  },
  {
    id: "withings",
    name: "Withings",
    description:
      "Weight, body composition, blood pressure, and sleep from Withings devices.",
    icon: "scale",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["weight", "body_fat", "blood_pressure", "sleep"],
  },
  {
    id: "fitbit",
    name: "Fitbit",
    description:
      "Steps, heart rate, sleep, and activity from Fitbit devices.",
    icon: "footprints",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["steps", "heart_rate", "sleep", "activity", "workouts"],
  },
  {
    id: "hume",
    name: "Hume AI",
    description:
      "Emotional wellbeing tracking powered by Hume AI's expression and voice analysis.",
    icon: "brain",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["emotion", "wellbeing", "voice_analysis", "expression_metrics"],
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Lookup helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Get provider info by ID. */
export function getProviderInfo(
  provider: DeviceProvider,
): DeviceProviderInfo | undefined {
  return DEVICE_PROVIDERS.find((p) => p.id === provider);
}
