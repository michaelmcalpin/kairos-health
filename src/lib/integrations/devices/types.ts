/**
 * KAIROS Device Integration Types
 *
 * Unified type system for wearable device data from
 * Oura Ring, Whoop, Dexcom, Apple Health, etc.
 */

// ─── Provider Registry ──────────────────────────────────────────────────────

export type DeviceProvider = "oura" | "whoop" | "dexcom" | "apple_health" | "garmin" | "fitbit";

export interface ProviderConfig {
  id: DeviceProvider;
  name: string;
  description: string;
  oauthUrl: string;
  tokenUrl: string;
  scopes: string[];
  dataTypes: DataType[];
  iconUrl?: string;
  webhookSupported: boolean;
}

export type DataType =
  | "glucose"
  | "sleep"
  | "heart_rate"
  | "hrv"
  | "steps"
  | "calories"
  | "workouts"
  | "body_temperature"
  | "spo2"
  | "respiratory_rate"
  | "strain";

// ─── Sync State ─────────────────────────────────────────────────────────────

export type SyncStatus = "idle" | "syncing" | "success" | "error" | "rate_limited";

export interface SyncState {
  provider: DeviceProvider;
  status: SyncStatus;
  lastSyncAt: string | null;
  nextSyncAt: string | null;
  recordsSynced: number;
  error?: string;
}

export interface DeviceConnection {
  id: string;
  userId: string;
  provider: DeviceProvider;
  accessToken: string;
  refreshToken: string;
  tokenExpiresAt: string;
  scopes: string[];
  providerUserId?: string;
  connectedAt: string;
  lastSyncAt: string | null;
  isActive: boolean;
}

// ─── Normalized Data Models ─────────────────────────────────────────────────

export interface NormalizedGlucose {
  timestamp: string;
  value: number;
  unit: "mg/dL";
  trend?: string;
  source: DeviceProvider;
  rawId?: string;
}

export interface NormalizedSleep {
  date: string;
  totalMinutes: number;
  deepMinutes: number;
  remMinutes: number;
  lightMinutes: number;
  awakeMinutes: number;
  score: number;
  efficiency: number;
  source: DeviceProvider;
  rawId?: string;
}

export interface NormalizedHeartRate {
  timestamp: string;
  bpm: number;
  source: DeviceProvider;
  context?: "resting" | "active" | "sleep";
}

export interface NormalizedHRV {
  timestamp: string;
  rmssd: number;
  source: DeviceProvider;
  context?: "resting" | "sleep";
}

export interface NormalizedWorkout {
  startTime: string;
  endTime: string;
  type: string;
  durationMinutes: number;
  caloriesBurned: number;
  avgHeartRate?: number;
  maxHeartRate?: number;
  strain?: number;
  source: DeviceProvider;
  rawId?: string;
}

// ─── Sync Results ───────────────────────────────────────────────────────────

export interface SyncResult {
  provider: DeviceProvider;
  dataType: DataType;
  recordsProcessed: number;
  recordsInserted: number;
  recordsUpdated: number;
  recordsSkipped: number;
  startDate: string;
  endDate: string;
  durationMs: number;
  errors: string[];
}
