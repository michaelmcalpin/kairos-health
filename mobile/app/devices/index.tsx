/**
 * Connected Devices screen.
 *
 * Shows all currently connected health devices with sync status,
 * data types, and action buttons. Also presents a grid of supported
 * device platforms that can be connected.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Shield,
  Plus,
  Smartphone,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DeviceCard, ConnectedDevice } from "@/components/devices/DeviceCard";
import { AddDeviceCard, SupportedDevice } from "@/components/devices/AddDeviceCard";
import { useConnectedDevices, ConnectedDevice as HookConnectedDevice } from "@/hooks/useDevices";

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Map the hook's ConnectedDevice to the DeviceCard's ConnectedDevice shape. */
const DEVICE_TYPE_TO_ICON: Record<string, ConnectedDevice["iconType"]> = {
  wearable: "watch",
  ring: "ring",
  cgm: "cgm",
  scale: "scale",
  bp_monitor: "bp",
  other: "phone",
};

const DEVICE_TYPE_TO_COLOR: Record<string, string> = {
  wearable: "#4A90D9",
  ring: "#A78BFA",
  cgm: "#4A9D5B",
  scale: "#D4A843",
  bp_monitor: "#C65D5D",
  other: "#06B6D4",
};

const SYNC_STATUS_TO_STATUS: Record<string, ConnectedDevice["status"]> = {
  synced: "connected",
  syncing: "syncing",
  error: "disconnected",
  pending: "connected",
};

function mapHookDeviceToCard(device: HookConnectedDevice): ConnectedDevice {
  return {
    id: device.id,
    name: device.name,
    model: device.model,
    status: SYNC_STATUS_TO_STATUS[device.syncStatus] ?? "connected",
    syncMode: device.syncStatus === "synced" ? "Continuous syncing" : device.syncStatus === "syncing" ? "Syncing..." : "On-demand",
    lastSync: device.lastSyncedAt ? formatRelativeTime(device.lastSyncedAt) : "Never",
    dataTypes: device.dataTypes.map(formatDataType),
    iconType: DEVICE_TYPE_TO_ICON[device.type] ?? "phone",
    iconColor: DEVICE_TYPE_TO_COLOR[device.type] ?? "#4A90D9",
  };
}

function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function formatDataType(dt: string): string {
  return dt
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

const SUPPORTED_DEVICES: SupportedDevice[] = [
  { id: "apple-health", name: "Apple Health", iconType: "health", iconColor: "#C65D5D" },
  { id: "oura", name: "Oura Ring", iconType: "ring", iconColor: "#A78BFA" },
  { id: "hume", name: "Hume AI", iconType: "brain", iconColor: "#E879A8" },
  { id: "google-fit", name: "Google Fit", iconType: "fitness", iconColor: "#4A9D5B", comingSoon: true },
  { id: "garmin", name: "Garmin", iconType: "garmin", iconColor: "#4A90D9", comingSoon: true },
  { id: "fitbit", name: "Fitbit", iconType: "fitbit", iconColor: "#06B6D4" },
  { id: "whoop", name: "Whoop", iconType: "whoop", iconColor: "#F97316" },
  { id: "eight-sleep", name: "Eight Sleep", iconType: "sleep", iconColor: "#8B5CF6", comingSoon: true },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DevicesScreen() {
  const router = useRouter();

  /* -- Connected devices from hook (empty array when API unreachable) -- */
  const { devices: hookDevices, isLoading, refetch: refetchDevices } = useConnectedDevices();
  const devices: ConnectedDevice[] = hookDevices.map(mapHookDeviceToCard);

  /* -- tRPC mutations -- */
  const syncMutation = trpc.clientPortal.devices.syncNow.useMutation();
  const disconnectMutation = trpc.clientPortal.devices.disconnect.useMutation();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetchDevices();
    setRefreshing(false);
  }, [refetchDevices]);

  const handleSync = (device: ConnectedDevice) => {
    syncMutation.mutate(
      { provider: (device as any).provider ?? device.id },
      {
        onSuccess: () => {
          Alert.alert("Sync Started", `Syncing data from ${device.name}...`, [{ text: "OK" }]);
          refetchDevices();
        },
        onError: () => {
          Alert.alert("Sync Failed", `Could not sync ${device.name}. Please try again.`, [{ text: "OK" }]);
        },
      }
    );
  };

  const handleDisconnect = (device: ConnectedDevice) => {
    Alert.alert(
      "Disconnect Device",
      `Are you sure you want to disconnect ${device.name}? You can reconnect it later.`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            disconnectMutation.mutate(
              { provider: (device as any).provider ?? device.id },
              {
                onSuccess: () => {
                  Alert.alert("Disconnected", `${device.name} has been disconnected.`, [{ text: "OK" }]);
                  refetchDevices();
                },
                onError: () => {
                  Alert.alert("Error", `Could not disconnect ${device.name}. Please try again.`, [{ text: "OK" }]);
                },
              }
            );
          },
        },
      ]
    );
  };

  // OAuth providers that should go through the connect flow (not BLE pairing)
  const OAUTH_PROVIDERS = new Set(["oura", "garmin", "whoop", "dexcom", "fitbit", "withings", "hume"]);

  const handleConnect = (device: SupportedDevice) => {
    if (device.id === "apple-health") {
      router.push("/devices/apple-health");
    } else if (OAUTH_PROVIDERS.has(device.id)) {
      // Route all OAuth-based providers to the connect screen
      router.push("/devices/connect");
    } else {
      router.push("/devices/add");
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Connected Devices                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Devices</Text>
          {devices.length > 0 && (
            <Text style={styles.sectionCount}>
              {devices.length} connected
            </Text>
          )}
        </View>

        {devices.length === 0 ? (
          <Card style={styles.emptyState}>
            <Smartphone size={32} color={Colors.silver} />
            <Text style={styles.emptyTitle}>No devices connected yet</Text>
            <Text style={styles.emptySubtitle}>
              Connect a health device below to start syncing your data.
            </Text>
            <Button
              title="Connect a Device"
              variant="secondary"
              size="sm"
              icon={<Plus size={16} color={Colors.gold} />}
              onPress={() => router.push("/devices/add")}
            />
          </Card>
        ) : (
          devices.map((device) => (
            <DeviceCard
              key={device.id}
              device={device}
              onSync={() => handleSync(device)}
              onDisconnect={() => handleDisconnect(device)}
            />
          ))
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Add Device                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Add a Device</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          Connect additional health platforms to sync your data automatically.
        </Text>

        <View style={styles.grid}>
          {SUPPORTED_DEVICES.map((device) => (
            <View key={device.id} style={styles.gridItem}>
              <AddDeviceCard
                device={device}
                onConnect={() => handleConnect(device)}
              />
            </View>
          ))}
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Privacy info card                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Shield size={18} color={Colors.gold} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Your Data is Protected</Text>
              <Text style={styles.infoText}>
                Your data is encrypted and only accessible to you and your care
                team. We never sell or share your health information.
              </Text>
            </View>
          </View>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  sectionCount: {
    color: Colors.success,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  sectionSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.md,
    lineHeight: 20,
  },
  emptyState: {
    alignItems: "center",
    paddingVertical: Spacing.xl,
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.xs,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  gridItem: {
    width: "48.5%",
  },
  infoCard: {
    backgroundColor: "rgba(74, 144, 217, 0.08)",
    borderColor: "rgba(74, 144, 217, 0.2)",
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: Colors.gold,
    fontSize: FontSizes.sm,
    fontWeight: "700",
    marginBottom: 4,
  },
  infoText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
  },
});
