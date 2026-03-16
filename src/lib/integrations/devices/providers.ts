/**
 * KAIROS Device Provider Registry
 *
 * Configuration for each supported wearable device provider.
 * OAuth credentials are stored in environment variables.
 */

import type { ProviderConfig } from "./types";

export const PROVIDERS: Record<string, ProviderConfig> = {
  oura: {
    id: "oura",
    name: "Oura Ring",
    description: "Sleep, readiness, heart rate, HRV, body temperature, and SpO2",
    oauthUrl: "https://cloud.ouraring.com/oauth/authorize",
    tokenUrl: "https://api.ouraring.com/oauth/token",
    scopes: ["daily", "heartrate", "personal", "session", "sleep", "workout"],
    dataTypes: ["sleep", "heart_rate", "hrv", "body_temperature", "spo2", "workouts"],
    webhookSupported: true,
  },
  whoop: {
    id: "whoop",
    name: "WHOOP",
    description: "Recovery, strain, sleep, heart rate, and workout performance",
    oauthUrl: "https://api.prod.whoop.com/oauth/oauth2/auth",
    tokenUrl: "https://api.prod.whoop.com/oauth/oauth2/token",
    scopes: ["read:recovery", "read:cycles", "read:sleep", "read:workout", "read:body_measurement"],
    dataTypes: ["sleep", "heart_rate", "hrv", "strain", "workouts", "calories"],
    webhookSupported: true,
  },
  dexcom: {
    id: "dexcom",
    name: "Dexcom CGM",
    description: "Continuous glucose monitoring with 5-minute readings",
    oauthUrl: "https://api.dexcom.com/v2/oauth2/login",
    tokenUrl: "https://api.dexcom.com/v2/oauth2/token",
    scopes: ["offline_access"],
    dataTypes: ["glucose"],
    webhookSupported: false,
  },
  apple_health: {
    id: "apple_health",
    name: "Apple Health",
    description: "Steps, heart rate, workouts, and health metrics via HealthKit",
    oauthUrl: "", // Uses native HealthKit SDK, not OAuth
    tokenUrl: "",
    scopes: [],
    dataTypes: ["heart_rate", "steps", "workouts", "calories", "spo2", "respiratory_rate"],
    webhookSupported: false,
  },
  garmin: {
    id: "garmin",
    name: "Garmin Connect",
    description: "Activities, sleep, heart rate, body composition, and stress",
    oauthUrl: "https://connect.garmin.com/oauthConfirm",
    tokenUrl: "https://connectapi.garmin.com/oauth-service/oauth/access_token",
    scopes: [],
    dataTypes: ["sleep", "heart_rate", "hrv", "steps", "workouts", "calories", "spo2"],
    webhookSupported: true,
  },
  fitbit: {
    id: "fitbit",
    name: "Fitbit",
    description: "Activity, sleep, heart rate, and health metrics",
    oauthUrl: "https://www.fitbit.com/oauth2/authorize",
    tokenUrl: "https://api.fitbit.com/oauth2/token",
    scopes: ["activity", "heartrate", "sleep", "nutrition", "weight"],
    dataTypes: ["sleep", "heart_rate", "steps", "workouts", "calories"],
    webhookSupported: true,
  },
};

/**
 * Get environment variable keys for a provider's OAuth credentials
 */
export function getProviderEnvKeys(providerId: string) {
  const prefix = providerId.toUpperCase();
  return {
    clientId: `${prefix}_CLIENT_ID`,
    clientSecret: `${prefix}_CLIENT_SECRET`,
    webhookSecret: `${prefix}_WEBHOOK_SECRET`,
  };
}
