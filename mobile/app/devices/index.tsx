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
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { DeviceCard, ConnectedDevice } from "@/components/devices/DeviceCard";
import { AddDeviceCard, SupportedDevice } from "@/components/devices/AddDeviceCard";

/* ------------------------------------------------------------------ */
/* Sample data                                                         */
/* ------------------------------------------------------------------ */

const CONNECTED_DEVICES: ConnectedDevice[] = [
  {
    id: "apple-watch",
    name: "Apple Watch Ultra",
    model: "Series 2, 49mm",
    status: "connected",
    syncMode: "Continuous syncing",
    lastSync: "5 min ago",
    dataTypes: ["Heart Rate", "Steps", "HRV", "Sleep", "SpO2", "ECG"],
    iconType: "watch",
    iconColor: "#3B82F6",
  },
  {
    id: "oura-ring",
    name: "Oura Ring",
    model: "Gen 3, Size 10",
    status: "connected",
    syncMode: "Continuous syncing",
    lastSync: "2h ago",
    dataTypes: ["Sleep", "HRV", "Temperature", "Activity", "Readiness"],
    iconType: "ring",
    iconColor: "#A78BFA",
  },
  {
    id: "dexcom-g7",
    name: "Dexcom G7",
    model: "Continuous Glucose Monitor",
    status: "connected",
    syncMode: "Real-time",
    lastSync: "3 min ago",
    dataTypes: ["Blood Glucose", "Glucose Trends", "Time in Range"],
    iconType: "cgm",
    iconColor: "#22C55E",
  },
  {
    id: "withings-scale",
    name: "Withings Body+",
    model: "Smart Scale",
    status: "connected",
    syncMode: "Daily sync",
    lastSync: "6h ago",
    dataTypes: ["Weight", "Body Fat %", "Muscle Mass", "BMI"],
    iconType: "scale",
    iconColor: "#EAB308",
  },
  {
    id: "withings-bpm",
    name: "Withings BPM Connect",
    model: "Blood Pressure Monitor",
    status: "connected",
    syncMode: "On-demand",
    lastSync: "1h ago",
    dataTypes: ["Systolic", "Diastolic", "Pulse"],
    iconType: "bp",
    iconColor: "#EF4444",
  },
];

const SUPPORTED_DEVICES: SupportedDevice[] = [
  { id: "apple-health", name: "Apple Health", iconType: "health", iconColor: "#EF4444" },
  { id: "google-fit", name: "Google Fit", iconType: "fitness", iconColor: "#22C55E" },
  { id: "garmin", name: "Garmin", iconType: "garmin", iconColor: "#3B82F6" },
  { id: "fitbit", name: "Fitbit", iconType: "fitbit", iconColor: "#06B6D4" },
  { id: "whoop", name: "Whoop", iconType: "whoop", iconColor: "#F97316" },
  { id: "eight-sleep", name: "Eight Sleep", iconType: "sleep", iconColor: "#8B5CF6" },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DevicesScreen() {
  const router = useRouter();

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await new Promise((resolve) => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const handleSync = (device: ConnectedDevice) => {
    Alert.alert(
      "Sync Started",
      `Syncing data from ${device.name}...`,
      [{ text: "OK" }]
    );
  };

  const handleDisconnect = (device: ConnectedDevice) => {
    Alert.alert(
      "Disconnect Device",
      `Are you sure you want to disconnect ${device.name}? You can reconnect it later.`,
      [
        { text: "Cancel", style: "cancel" },
        { text: "Disconnect", style: "destructive" },
      ]
    );
  };

  const handleConnect = (device: SupportedDevice) => {
    router.push("/devices/add");
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
          <Text style={styles.sectionCount}>
            {CONNECTED_DEVICES.length} connected
          </Text>
        </View>

        {CONNECTED_DEVICES.map((device) => (
          <DeviceCard
            key={device.id}
            device={device}
            onSync={() => handleSync(device)}
            onDisconnect={() => handleDisconnect(device)}
          />
        ))}

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
    backgroundColor: "rgba(200, 169, 81, 0.08)",
    borderColor: "rgba(200, 169, 81, 0.2)",
  },
  infoRow: {
    flexDirection: "row",
    gap: Spacing.md,
  },
  infoIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(200, 169, 81, 0.15)",
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
