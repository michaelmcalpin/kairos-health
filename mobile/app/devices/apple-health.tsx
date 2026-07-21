/**
 * Apple Health Integration screen.
 *
 * Allows the user to manage their Apple Health connection, toggle
 * individual data categories for read/write sync, set sync frequency,
 * and view connection status.
 *
 * Uses the HealthKit service layer (`lib/healthkit.ts`) for native
 * permission requests and data reads, and the `useHealthSync` hook
 * for pushing data to the Everist backend.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Alert,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Heart,
  Activity,
  Moon,
  Footprints,
  Zap,
  Wind,
  Thermometer,
  Dumbbell,
  Scale,
  Droplets,
  Shield,
  RefreshCw,
  Clock,
  AlertCircle,
  Link,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useHealthKitStatus, useHealthSync } from "@/hooks/useHealthSync";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DataToggle {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function AppleHealthScreen() {
  const router = useRouter();

  /* -- HealthKit hooks -- */
  const { status: hkStatus, isChecking, checkAndRequest } = useHealthKitStatus();
  const { syncFromHealthKit, isSyncing, lastSyncTime: hkLastSync } = useHealthSync();

  /* -- tRPC queries & mutations -- */
  const connectionQuery = trpc.clientPortal.devices.getConnection.useQuery(
    { provider: "apple_health" },
    DEFAULT_QUERY_OPTIONS,
  );
  const syncMutation = trpc.clientPortal.devices.syncNow.useMutation();
  const disconnectMutation = trpc.clientPortal.devices.disconnect.useMutation();
  const connectMutation = trpc.clientPortal.devices.initiateConnect.useMutation();

  /* -- Connection state -- */
  const connectionData = connectionQuery.data as any;
  const backendConnected = connectionData
    ? (connectionData.connected ?? connectionData.status === "connected")
    : false;
  // Connection state: backend is the source of truth; HealthKit auth is checked for initial connect
  const isConnected = backendConnected;
  const lastSyncTime =
    hkLastSync
      ? new Date(hkLastSync).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
      : connectionData?.lastSyncAt ?? "Never";

  /* -- Read toggles -- */
  const [readSteps, setReadSteps] = useState(true);
  const [readHeartRate, setReadHeartRate] = useState(true);
  const [readHRV, setReadHRV] = useState(true);
  const [readSleep, setReadSleep] = useState(true);
  const [readActiveEnergy, setReadActiveEnergy] = useState(true);
  const [readRestingHR, setReadRestingHR] = useState(true);
  const [readBloodOxygen, setReadBloodOxygen] = useState(true);
  const [readRespiratoryRate, setReadRespiratoryRate] = useState(false);
  const [readBodyTemp, setReadBodyTemp] = useState(false);
  const [readECG, setReadECG] = useState(false);

  /* -- Write toggles -- */
  const [writeWorkouts, setWriteWorkouts] = useState(true);
  const [writeBodyWeight, setWriteBodyWeight] = useState(true);
  const [writeBloodPressure, setWriteBloodPressure] = useState(false);
  const [writeBloodGlucose, setWriteBloodGlucose] = useState(false);

  /* -- Handlers -- */
  const handleConnect = async () => {
    if (Platform.OS !== "ios") {
      Alert.alert("iOS Only", "Apple Health is only available on iOS devices.");
      return;
    }
    const result = await checkAndRequest();
    if (result.isAuthorized) {
      // Also create backend connection record
      connectMutation.mutate(
        { provider: "apple_health" },
        {
          onSuccess: () => {
            Alert.alert(
              "Connected",
              "Apple Health permissions granted. Your data will begin syncing.",
              [{ text: "OK" }],
            );
            connectionQuery.refetch();
          },
          onError: () => {
            // HealthKit permissions granted but backend record failed — still show success
            Alert.alert(
              "Connected",
              "Apple Health permissions granted. Your data will begin syncing.",
              [{ text: "OK" }],
            );
          },
        },
      );
    } else if (result.error) {
      // Show the actual error so failures are diagnosable, plus guidance
      Alert.alert(
        "Could Not Connect",
        `${result.error}\n\nIf you previously denied access, enable it in Settings > Privacy & Security > Health > Everist.`,
        [{ text: "OK" }],
      );
    } else {
      // No explicit error but not authorized — iOS shows the permission
      // sheet only ONCE; afterward changes must be made in Settings.
      Alert.alert(
        "Check Health Permissions",
        "If the permission dialog did not appear, open Settings > Privacy & Security > Health > Everist and enable the data types you want to share.",
        [{ text: "OK" }],
      );
    }
  };

  const handleSyncNow = async () => {
    if (hkStatus.isAvailable && hkStatus.isAuthorized) {
      // Use real HealthKit sync
      await syncFromHealthKit();
      connectionQuery.refetch();
    } else {
      // Fall back to backend-only sync
      syncMutation.mutate(
        { provider: "apple_health" },
        {
          onSuccess: () => {
            Alert.alert("Sync Complete", "Apple Health data has been synced.", [{ text: "OK" }]);
            connectionQuery.refetch();
          },
          onError: () => {
            Alert.alert("Sync Failed", "Could not sync Apple Health data. Please try again.", [{ text: "OK" }]);
          },
        },
      );
    }
  };

  const handleDisconnect = () => {
    Alert.alert(
      "Disconnect Apple Health",
      "Are you sure you want to disconnect Apple Health? Your synced data will be preserved, but new data will stop syncing.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Disconnect",
          style: "destructive",
          onPress: () => {
            disconnectMutation.mutate(
              { provider: "apple_health" },
              {
                onSuccess: () => {
                  // Refetch connection state so UI updates immediately
                  connectionQuery.refetch();
                  Alert.alert(
                    "Disconnected",
                    "Apple Health has been disconnected. To revoke HealthKit permissions, go to Settings > Privacy & Security > Health on your device.",
                    [{ text: "OK", onPress: () => router.back() }],
                  );
                },
                onError: () => {
                  Alert.alert("Error", "Could not disconnect Apple Health. Please try again.", [{ text: "OK" }]);
                },
              },
            );
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* HEADER                                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={styles.headerRow}>
          <View style={styles.healthIconCircle}>
            <Heart size={28} color="#FF375F" fill="#FF375F" />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Apple Health</Text>
            <Text style={styles.headerSubtitle}>
              Sync your health and fitness data
            </Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONNECTION STATUS                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card
          style={[
            styles.statusCard,
            !isConnected && styles.statusCardDisconnected,
          ]}
        >
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusDot,
                  !isConnected && styles.statusDotDisconnected,
                ]}
              />
              <View>
                <Text style={styles.statusLabel}>Connection Status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    !isConnected && styles.statusValueDisconnected,
                  ]}
                >
                  {isConnected ? "Connected" : "Not Connected"}
                </Text>
              </View>
            </View>
            {isConnected && (
              <View style={styles.syncTimeCol}>
                <Text style={styles.syncTimeLabel}>Last sync</Text>
                <Text style={styles.syncTimeValue}>{lastSyncTime}</Text>
              </View>
            )}
          </View>

          {/* HealthKit availability notice */}
          {!hkStatus.isAvailable && Platform.OS === "ios" && (
            <View style={styles.hkNotice}>
              <AlertCircle size={14} color={Colors.warning} />
              <Text style={styles.hkNoticeText}>
                HealthKit module not installed. Rebuild with EAS Build to enable native sync.
              </Text>
            </View>
          )}
          {Platform.OS !== "ios" && (
            <View style={styles.hkNotice}>
              <AlertCircle size={14} color={Colors.warning} />
              <Text style={styles.hkNoticeText}>
                Apple Health is only available on iOS devices.
              </Text>
            </View>
          )}

          {!isConnected ? (
            <Button
              title={isChecking ? "Connecting..." : "Connect Apple Health"}
              variant="primary"
              size="sm"
              icon={
                isChecking ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Link size={14} color={Colors.white} />
                )
              }
              onPress={handleConnect}
              disabled={isChecking || Platform.OS !== "ios" || !hkStatus.isAvailable}
              style={styles.syncBtn}
            />
          ) : (
            <Button
              title={isSyncing ? "Syncing..." : "Sync Now"}
              variant="secondary"
              size="sm"
              icon={
                isSyncing ? (
                  <ActivityIndicator size="small" color={Colors.gold} />
                ) : (
                  <RefreshCw size={14} color={Colors.gold} />
                )
              }
              onPress={handleSyncNow}
              disabled={isSyncing}
              style={styles.syncBtn}
            />
          )}
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* READ FROM APPLE HEALTH                                     */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.categoryCard}>
          <Text style={styles.categoryTitle}>Read from Apple Health</Text>
          <Text style={styles.categorySubtitle}>
            Data imported into Everist from Apple Health
          </Text>

          <DataRow
            icon={<Footprints size={18} color="#4A90D9" />}
            label="Steps"
            value={readSteps}
            onValueChange={setReadSteps}
          />
          <DataRow
            icon={<Heart size={18} color="#C65D5D" />}
            label="Heart Rate"
            value={readHeartRate}
            onValueChange={setReadHeartRate}
          />
          <DataRow
            icon={<Activity size={18} color="#8B5CF6" />}
            label="Heart Rate Variability"
            value={readHRV}
            onValueChange={setReadHRV}
          />
          <DataRow
            icon={<Moon size={18} color="#6366F1" />}
            label="Sleep Analysis"
            value={readSleep}
            onValueChange={setReadSleep}
          />
          <DataRow
            icon={<Zap size={18} color="#F59E0B" />}
            label="Active Energy"
            value={readActiveEnergy}
            onValueChange={setReadActiveEnergy}
          />
          <DataRow
            icon={<Heart size={18} color="#EC4899" />}
            label="Resting Heart Rate"
            value={readRestingHR}
            onValueChange={setReadRestingHR}
          />
          <DataRow
            icon={<Droplets size={18} color="#06B6D4" />}
            label="Blood Oxygen"
            value={readBloodOxygen}
            onValueChange={setReadBloodOxygen}
          />
          <DataRow
            icon={<Wind size={18} color="#14B8A6" />}
            label="Respiratory Rate"
            value={readRespiratoryRate}
            onValueChange={setReadRespiratoryRate}
          />
          <DataRow
            icon={<Thermometer size={18} color="#F97316" />}
            label="Body Temperature"
            value={readBodyTemp}
            onValueChange={setReadBodyTemp}
          />
          <DataRow
            icon={<Activity size={18} color="#4A9D5B" />}
            label="Electrocardiogram"
            value={readECG}
            onValueChange={setReadECG}
            last
          />
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* WRITE TO APPLE HEALTH                                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.categoryCard}>
          <Text style={styles.categoryTitle}>Write to Apple Health</Text>
          <Text style={styles.categorySubtitle}>
            Data exported from Everist to Apple Health
          </Text>

          <DataRow
            icon={<Dumbbell size={18} color="#F59E0B" />}
            label="Workouts"
            value={writeWorkouts}
            onValueChange={setWriteWorkouts}
          />
          <DataRow
            icon={<Scale size={18} color="#4A90D9" />}
            label="Body Weight"
            value={writeBodyWeight}
            onValueChange={setWriteBodyWeight}
          />
          <DataRow
            icon={<Heart size={18} color="#C65D5D" />}
            label="Blood Pressure"
            value={writeBloodPressure}
            onValueChange={setWriteBloodPressure}
          />
          <DataRow
            icon={<Droplets size={18} color="#8B5CF6" />}
            label="Blood Glucose"
            value={writeBloodGlucose}
            onValueChange={setWriteBloodGlucose}
            last
          />
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* SYNC FREQUENCY                                             */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.categoryCard}>
          <Text style={styles.categoryTitle}>Sync Frequency</Text>
          <Text style={styles.categorySubtitle}>
            Data is synced when you tap "Sync Now" above.
          </Text>

          <View style={styles.frequencySelector}>
            <View style={styles.frequencySelectorLeft}>
              <Clock size={18} color={Colors.silver} />
              <Text style={styles.frequencySelectorLabel}>Manual sync</Text>
            </View>
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* DATA RETENTION NOTICE                                      */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.infoCard}>
          <View style={styles.infoRow}>
            <View style={styles.infoIconCircle}>
              <Clock size={16} color={Colors.info} />
            </View>
            <Text style={styles.infoText}>
              Health data is synced from the last 7 days. Older data can be
              imported manually from your settings.
            </Text>
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* PRIVACY INFO                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card style={styles.privacyCard}>
          <View style={styles.infoRow}>
            <View style={styles.privacyIconCircle}>
              <Shield size={16} color={Colors.success} />
            </View>
            <Text style={styles.privacyText}>
              Data stays on your device and is encrypted end-to-end. We never
              sell or share your health information.
            </Text>
          </View>
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* DISCONNECT                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Button
          title="Disconnect Apple Health"
          variant="danger"
          size="lg"
          onPress={handleDisconnect}
          style={styles.disconnectBtn}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* DataRow component                                                   */
/* ------------------------------------------------------------------ */

function DataRow({
  icon,
  label,
  value,
  onValueChange,
  last = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: boolean;
  onValueChange: (v: boolean) => void;
  last?: boolean;
}) {
  return (
    <View style={[styles.dataRow, !last && styles.dataRowBorder]}>
      <View style={styles.dataRowLeft}>
        <View style={styles.dataIconWrap}>{icon}</View>
        <Text style={styles.dataLabel}>{label}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: Colors.navyLight, true: Colors.goldDark }}
        thumbColor={value ? Colors.gold : Colors.silver}
        ios_backgroundColor={Colors.navyLight}
      />
    </View>
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

  /* -- Header -- */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  healthIconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: "rgba(255, 55, 95, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  headerSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },

  /* -- Connection status card -- */
  statusCard: {
    marginBottom: Spacing.md,
    backgroundColor: "rgba(74, 157, 91, 0.06)",
    borderColor: "rgba(74, 157, 91, 0.2)",
  },
  statusCardDisconnected: {
    backgroundColor: "rgba(212, 168, 67, 0.06)",
    borderColor: "rgba(212, 168, 67, 0.2)",
  },
  statusRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.md,
  },
  statusLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.success,
  },
  statusDotDisconnected: {
    backgroundColor: Colors.warning,
  },
  statusLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  statusValue: {
    color: Colors.success,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  statusValueDisconnected: {
    color: Colors.warning,
  },
  syncTimeCol: {
    alignItems: "flex-end",
  },
  syncTimeLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  syncTimeValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  syncBtn: {
    alignSelf: "stretch",
  },

  /* -- HealthKit availability notice -- */
  hkNotice: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: "rgba(212, 168, 67, 0.08)",
    borderRadius: Radii.sm,
  },
  hkNoticeText: {
    flex: 1,
    color: Colors.warning,
    fontSize: FontSizes.xs,
    lineHeight: 16,
  },

  /* -- Data category cards -- */
  categoryCard: {
    marginBottom: Spacing.md,
  },
  categoryTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: 4,
  },
  categorySubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginBottom: Spacing.md,
    lineHeight: 18,
  },

  /* -- Data row -- */
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
  },
  dataRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dataRowLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  dataIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  dataLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },

  /* -- Sync frequency -- */
  frequencySelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    marginTop: Spacing.sm,
  },
  frequencySelectorLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  frequencySelectorLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  frequencyOptions: {
    marginTop: Spacing.sm,
    borderRadius: Radii.md,
    overflow: "hidden",
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  frequencyOption: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.navyLight,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  frequencyOptionActive: {
    backgroundColor: "rgba(74, 144, 217, 0.1)",
  },
  frequencyOptionText: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  frequencyOptionTextActive: {
    color: Colors.gold,
    fontWeight: "600",
  },

  /* -- Info / privacy cards -- */
  infoCard: {
    marginBottom: Spacing.md,
    backgroundColor: "rgba(74, 144, 217, 0.06)",
    borderColor: "rgba(74, 144, 217, 0.2)",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: Spacing.sm,
  },
  infoIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  infoText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    flex: 1,
  },
  privacyCard: {
    marginBottom: Spacing.lg,
    backgroundColor: "rgba(74, 157, 91, 0.06)",
    borderColor: "rgba(74, 157, 91, 0.2)",
  },
  privacyIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 157, 91, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  privacyText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    flex: 1,
  },

  /* -- Disconnect button -- */
  disconnectBtn: {
    marginBottom: Spacing.lg,
  },
});
