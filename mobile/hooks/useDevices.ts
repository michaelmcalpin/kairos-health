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

import { trpc, DEFAULT_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";
import { isDevFallbackMode } from "@/lib/api";

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
  const query = trpc.clientPortal.devices.listConnected.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const devices: ConnectedDevice[] = query.data
    ? (query.data as any[]).map(mapApiConnectedDevice)
    : SAMPLE_CONNECTED_DEVICES;

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
  const query = trpc.clientPortal.devices.listAvailable.useQuery(
    undefined,
    STATIC_QUERY_OPTIONS,
  );

  const devices: AvailableDevice[] = query.data
    ? (query.data as any[]).map(mapApiAvailableDevice)
    : SAMPLE_AVAILABLE_DEVICES;

  return {
    devices,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSyncDevice — mutation to trigger device sync
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useSyncDevice() {
  const mutation = trpc.clientPortal.devices.sync.useMutation();

  const sync = (deviceId: string) => {
    mutation.mutate({ deviceId });
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

  const disconnect = (deviceId: string) => {
    mutation.mutate({ deviceId });
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

function mapApiConnectedDevice(raw: any): ConnectedDevice {
  return {
    id: raw.id,
    name: raw.name ?? raw.model ?? "Unknown Device",
    type: raw.type ?? "other",
    manufacturer: raw.manufacturer ?? "",
    model: raw.model ?? "",
    syncStatus: raw.syncStatus ?? "pending",
    lastSyncedAt: raw.lastSyncedAt ?? raw.lastSync ?? "",
    batteryLevel: raw.batteryLevel ?? undefined,
    firmwareVersion: raw.firmwareVersion ?? undefined,
    dataTypes: raw.dataTypes ?? [],
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
