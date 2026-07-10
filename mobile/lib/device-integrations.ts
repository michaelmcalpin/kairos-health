/**
 * Device Integration Service
 *
 * Manages connections to health device platforms:
 *   - Apple Health: native HealthKit integration (iOS only)
 *   - Oura, Garmin, WHOOP, Dexcom, etc.: OAuth-based cloud integrations
 *   - Hume AI: API-key based emotional wellbeing integration
 *
 * Each provider has its own connection flow. OAuth providers open a
 * browser-based authorization flow. Native integrations (Apple Health)
 * use the HealthKit permission dialog directly.
 */

import { Linking, Alert, Platform } from "react-native";

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
  | "hume"
  | "strava";

export type ConnectionType = "native" | "oauth" | "api_key";

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
    id: "strava",
    name: "Strava",
    description: "Workouts, running, cycling, and activity data from Strava.",
    icon: "activity",
    connectionType: "oauth",
    supported: true,
    dataTypes: ["workouts", "activity"],
  },
  {
    id: "hume",
    name: "Hume AI",
    description:
      "Emotional wellbeing tracking powered by Hume AI's expression analysis.",
    icon: "brain",
    connectionType: "api_key",
    supported: true,
    dataTypes: ["emotion", "wellbeing", "stress"],
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

/** Get the backend OAuth connect URL for a provider. */
export function getOAuthConnectUrl(
  provider: DeviceProvider,
  apiUrl: string,
): string {
  return `${apiUrl}/api/integrations/${provider}/connect`;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Connection flow
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Initiate an OAuth connection for a provider.
 *
 * Opens the user's browser to the backend authorization endpoint,
 * which handles the full OAuth dance and redirects back to the app
 * via the `everist://` deep link scheme.
 *
 * For native providers (Apple Health), this is a no-op — use the
 * HealthKit permission flow from `lib/healthkit.ts` instead.
 */
export async function initiateOAuthConnection(
  provider: DeviceProvider,
  apiUrl: string,
): Promise<void> {
  const info = getProviderInfo(provider);
  if (!info) {
    Alert.alert("Error", "Unknown device provider.");
    return;
  }

  if (info.connectionType === "native") {
    Alert.alert(
      "Native Connection",
      "This device uses native iOS integration. Use the Apple Health settings screen to connect.",
    );
    return;
  }

  const connectUrl = getOAuthConnectUrl(provider, apiUrl);

  try {
    const canOpen = await Linking.canOpenURL(connectUrl);
    if (canOpen) {
      await Linking.openURL(connectUrl);
    } else {
      Alert.alert(
        "Connection",
        `To connect ${info.name}, please visit your Everist dashboard on the web and go to Settings > Data Sources > ${info.name}.`,
      );
    }
  } catch {
    Alert.alert(
      "Connection Error",
      `Could not open the ${info.name} authorization page. Please try again or connect via the web dashboard.`,
    );
  }
}
