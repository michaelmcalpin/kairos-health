/**
 * useDevices — Custom hooks for connected device management.
 *
 * Tries to fetch device data from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - devices.listConnected   -> connected devices with sync status
 *   - devices.listAvailable   -> devices that can be connected
 *   - devices.sync            -> trigger a manual sync
 *   - devices.disconnect      -> disconnect a device
 */

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type DeviceSyncStatus = "synced" | "syncing" | "error" | "pending";

export interface ConnectedDevice {
  id: string;
  name: string;
  type: "wearable" | "scale" | "cgm" | "bp_monitor" | "ring" | "other";
  manufacturer: string;
  model: string;
  syncStatus: DeviceSyncStatus;
  lastSyncedAt: string;
  batteryLevel?: number;
  firmwareVersion?: string;
  dataTypes: string[];
}

export interface AvailableDevice {
  id: string;
  name: string;
  type: ConnectedDevice["type"];
  manufacturer: string;
  description: string;
  iconUrl?: string;
  supported: boolean;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_CONNECTED_DEVICES: ConnectedDevice[] = [
  {
    id: "dev-1",
    name: "Apple Watch Ultra 2",
    type: "wearable",
    manufacturer: "Apple",
    model: "Watch Ultra 2",
    syncStatus: "synced",
    lastSyncedAt: "2026-06-14T08:30:00Z",
    batteryLevel: 72,
    firmwareVersion: "11.2",
    dataTypes: ["heart_rate", "hrv", "sleep", "steps", "blood_oxygen", "ecg"],
  },
  {
    id: "dev-2",
    name: "Dexcom G7",
    type: "cgm",
    manufacturer: "Dexcom",
    model: "G7",
    syncStatus: "synced",
    lastSyncedAt: "2026-06-14T09:15:00Z",
    batteryLevel: 88,
    dataTypes: ["glucose"],
  },
  {
    id: "dev-3",
    name: "Withings Body+",
    type: "scale",
    manufacturer: "Withings",
    model: "Body+",
    syncStatus: "synced",
    lastSyncedAt: "2026-06-14T07:00:00Z",
    batteryLevel: 95,
    dataTypes: ["weight", "body_fat", "bmi", "muscle_mass"],
  },
  {
    id: "dev-4",
    name: "Oura Ring Gen 3",
    type: "ring",
    manufacturer: "Oura",
    model: "Gen 3 Heritage",
    syncStatus: "error",
    lastSyncedAt: "2026-06-13T22:00:00Z",
    batteryLevel: 34,
    firmwareVersion: "2.8.1",
    dataTypes: ["sleep", "hrv", "body_temperature", "readiness"],
  },
  {
    id: "dev-5",
    name: "Omron Evolv",
    type: "bp_monitor",
    manufacturer: "Omron",
    model: "Evolv",
    syncStatus: "pending",
    lastSyncedAt: "2026-06-12T18:30:00Z",
    batteryLevel: 60,
    dataTypes: ["blood_pressure", "pulse"],
  },
];

const SAMPLE_AVAILABLE_DEVICES: AvailableDevice[] = [
  {
    id: "avail-1",
    name: "Whoop 4.0",
    type: "wearable",
    manufacturer: "Whoop",
    description: "Continuous heart rate, HRV, respiratory rate, and strain tracking.",
    supported: true,
  },
  {
    id: "avail-2",
    name: "Levels CGM",
    type: "cgm",
    manufacturer: "Levels",
    description: "Continuous glucose monitoring with metabolic insights.",
    supported: true,
  },
  {
    id: "avail-3",
    name: "Garmin Fenix 8",
    type: "wearable",
    manufacturer: "Garmin",
    description: "Advanced multisport GPS watch with health monitoring.",
    supported: true,
  },
  {
    id: "avail-4",
    name: "Eight Sleep Pod 4",
    type: "other",
    manufacturer: "Eight Sleep",
    description: "Smart mattress cover with sleep tracking and temperature control.",
    supported: false,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useConnectedDevices — list connected devices with sync status
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useConnectedDevices() {
  const query = trpc.clientPortal.devices.list.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // Show real data only — never show sample devices as "connected"
  const devices: ConnectedDevice[] = query.data
    ? (query.data as any[]).map(mapApiConnectedDevice)
    : [];

  return {
    devices,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAvailableDevices — list devices that can be connected
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAvailableDevices() {
  // Backend does not have a listAvailable endpoint — return sample data directly
  const devices: AvailableDevice[] = SAMPLE_AVAILABLE_DEVICES;

  return {
    devices,
    isLoading: false,
    error: null,
    refetch: async () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSyncDevice — mutation to trigger device sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useSyncDevice() {
  const mutation = trpc.clientPortal.devices.syncNow.useMutation();

  const sync = (provider: string) => {
    mutation.mutate({ provider });
  };

  return {
    sync,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useDisconnectDevice — mutation to disconnect a device
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDisconnectDevice() {
  const mutation = trpc.clientPortal.devices.disconnect.useMutation();

  const disconnect = (provider: string) => {
    mutation.mutate({ provider });
  };

  return {
    disconnect,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Provider metadata lookup for building display objects from the backend's
 * response shape: { id, provider, status, lastSyncAt, scopes, tokenExpiresAt }
 */
const PROVIDER_DISPLAY: Record<string, {
  name: string;
  type: ConnectedDevice["type"];
  manufacturer: string;
  model: string;
  dataTypes: string[];
}> = {
  oura: {
    name: "Oura Ring",
    type: "ring",
    manufacturer: "Oura",
    model: "Ring Gen 3",
    dataTypes: ["sleep", "hrv", "body_temperature", "readiness"],
  },
  apple_health: {
    name: "Apple Health",
    type: "wearable",
    manufacturer: "Apple",
    model: "HealthKit",
    dataTypes: ["heart_rate", "hrv", "sleep", "steps", "weight", "glucose"],
  },
  dexcom: {
    name: "Dexcom CGM",
    type: "cgm",
    manufacturer: "Dexcom",
    model: "G7",
    dataTypes: ["glucose"],
  },
  garmin: {
    name: "Garmin Watch",
    type: "wearable",
    manufacturer: "Garmin",
    model: "Fenix",
    dataTypes: ["heart_rate", "steps", "sleep", "activity"],
  },
  whoop: {
    name: "WHOOP Band",
    type: "wearable",
    manufacturer: "WHOOP",
    model: "4.0",
    dataTypes: ["heart_rate", "hrv", "sleep", "strain"],
  },
  withings: {
    name: "Withings Scale",
    type: "scale",
    manufacturer: "Withings",
    model: "Body+",
    dataTypes: ["weight", "body_fat", "bmi"],
  },
  fitbit: {
    name: "Fitbit",
    type: "wearable",
    manufacturer: "Fitbit",
    model: "Sense",
    dataTypes: ["heart_rate", "sleep", "steps", "activity"],
  },
  hume: {
    name: "Hume AI",
    type: "other",
    manufacturer: "Hume",
    model: "Hume AI",
    dataTypes: ["mood", "voice_analysis"],
  },
};

/**
 * Maps backend device connection to a ConnectedDevice display object.
 * Backend returns: { id, provider, status, lastSyncAt, scopes, tokenExpiresAt }
 */
function mapApiConnectedDevice(raw: any): ConnectedDevice {
  const providerKey = (raw.provider ?? "").toLowerCase();
  const display = PROVIDER_DISPLAY[providerKey];

  // Map backend status to DeviceSyncStatus
  const mapStatus = (s?: string): DeviceSyncStatus => {
    switch (s) {
      case "connected": return "synced";
      case "syncing": return "syncing";
      case "error": return "error";
      case "disconnected":
      default: return "pending";
    }
  };

  return {
    id: raw.id,
    name: display?.name ?? raw.provider ?? "Unknown Device",
    type: display?.type ?? "other",
    manufacturer: display?.manufacturer ?? "",
    model: display?.model ?? "",
    syncStatus: mapStatus(raw.status),
    lastSyncedAt: raw.lastSyncAt ?? "",
    batteryLevel: undefined,
    firmwareVersion: undefined,
    dataTypes: display?.dataTypes ?? raw.scopes ?? [],
  };
}

function mapApiAvailableDevice(raw: any): AvailableDevice {
  return {
    id: raw.id,
    name: raw.name ?? "",
    type: raw.type ?? "other",
    manufacturer: raw.manufacturer ?? "",
    description: raw.description ?? "",
    iconUrl: raw.iconUrl ?? undefined,
    supported: raw.supported ?? true,
  };
}
