/**
 * Apple Health Integration screen.
 *
 * Allows the user to manage their Apple Health connection, toggle
 * individual data categories for read/write sync, set sync frequency,
 * and view connection status.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Switch,
  Pressable,
  Alert,
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
  CheckCircle,
  Clock,
  ChevronDown,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface DataToggle {
  id: string;
  label: string;
  icon: React.ReactNode;
  enabled: boolean;
}

type SyncFrequency = "realtime" | "hourly" | "6hours" | "manual";

const SYNC_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: "realtime", label: "Real-time" },
  { value: "hourly", label: "Every hour" },
  { value: "6hours", label: "Every 6 hours" },
  { value: "manual", label: "Manual only" },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function AppleHealthScreen() {
  const router = useRouter();

  /* -- Connection state -- */
  const isConnected = true;
  const lastSyncTime = "2 minutes ago";

  /* -- Sync frequency -- */
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("realtime");
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

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
  const handleSyncNow = () => {
    Alert.alert("Syncing", "Syncing data with Apple Health...", [
      { text: "OK" },
    ]);
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
        },
      ]
    );
  };

  const currentFreqLabel =
    SYNC_OPTIONS.find((o) => o.value === syncFrequency)?.label ?? "";

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
        <Card style={styles.statusCard}>
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View style={styles.statusDot} />
              <View>
                <Text style={styles.statusLabel}>Connection Status</Text>
                <Text style={styles.statusValue}>Connected</Text>
              </View>
            </View>
            <View style={styles.syncTimeCol}>
              <Text style={styles.syncTimeLabel}>Last sync</Text>
              <Text style={styles.syncTimeValue}>{lastSyncTime}</Text>
            </View>
          </View>

          <Button
            title="Sync Now"
            variant="secondary"
            size="sm"
            icon={<RefreshCw size={14} color={Colors.gold} />}
            onPress={handleSyncNow}
            style={styles.syncBtn}
          />
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

          <Pressable
            style={styles.frequencySelector}
            onPress={() => setShowFrequencyPicker(!showFrequencyPicker)}
          >
            <View style={styles.frequencySelectorLeft}>
              <Clock size={18} color={Colors.silver} />
              <Text style={styles.frequencySelectorLabel}>
                {currentFreqLabel}
              </Text>
            </View>
            <ChevronDown
              size={18}
              color={Colors.silver}
              style={
                showFrequencyPicker ? { transform: [{ rotate: "180deg" }] } : {}
              }
            />
          </Pressable>

          {showFrequencyPicker && (
            <View style={styles.frequencyOptions}>
              {SYNC_OPTIONS.map((option) => (
                <Pressable
                  key={option.value}
                  style={[
                    styles.frequencyOption,
                    syncFrequency === option.value &&
                      styles.frequencyOptionActive,
                  ]}
                  onPress={() => {
                    setSyncFrequency(option.value);
                    setShowFrequencyPicker(false);
                  }}
                >
                  <Text
                    style={[
                      styles.frequencyOptionText,
                      syncFrequency === option.value &&
                        styles.frequencyOptionTextActive,
                    ]}
                  >
                    {option.label}
                  </Text>
                  {syncFrequency === option.value && (
                    <CheckCircle size={16} color={Colors.gold} />
                  )}
                </Pressable>
              ))}
            </View>
          )}
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
              Health data is synced from the last 90 days. Older data can be
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
  statusLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  statusValue: {
    color: Colors.success,
    fontSize: FontSizes.md,
    fontWeight: "700",
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
