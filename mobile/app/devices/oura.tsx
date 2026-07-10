/**
 * Oura Ring Integration screen.
 *
 * Allows the user to manage their Oura Ring connection via OAuth2,
 * toggle individual data categories, set sync frequency,
 * and view connection status.
 *
 * Unlike Apple Health (which syncs locally), Oura uses an OAuth2 flow:
 * the app calls the backend to get an authorization URL, opens it in
 * the system browser, and the backend handles the callback.
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
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Moon,
  Activity,
  Thermometer,
  Zap,
  Heart,
  Shield,
  RefreshCw,
  CheckCircle,
  Clock,
  ChevronDown,
  Circle,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { useDeviceConnection } from "@/hooks/useDeviceConnection";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type SyncFrequency = "hourly" | "6hours" | "daily" | "manual";

const SYNC_OPTIONS: { value: SyncFrequency; label: string }[] = [
  { value: "hourly", label: "Every hour" },
  { value: "6hours", label: "Every 6 hours" },
  { value: "daily", label: "Once daily" },
  { value: "manual", label: "Manual only" },
];

/* ------------------------------------------------------------------ */
/* Accent color — Oura silver/gray                                     */
/* ------------------------------------------------------------------ */

const OURA_ACCENT = "#A78BFA"; // Soft purple (matches ring iconColor in index)
const OURA_ACCENT_BG = "rgba(167, 139, 250, 0.12)";
const OURA_ACCENT_BORDER = "rgba(167, 139, 250, 0.2)";

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function OuraScreen() {
  const router = useRouter();

  /* -- Device connection hook -- */
  const {
    isConnected,
    isConnecting,
    lastSync,
    isLoading,
    connect,
    disconnect,
    sync,
    isSyncing,
  } = useDeviceConnection("oura");

  /* -- Sync frequency -- */
  const [syncFrequency, setSyncFrequency] = useState<SyncFrequency>("hourly");
  const [showFrequencyPicker, setShowFrequencyPicker] = useState(false);

  /* -- Data toggles -- */
  const [readSleep, setReadSleep] = useState(true);
  const [readHRV, setReadHRV] = useState(true);
  const [readBodyTemp, setReadBodyTemp] = useState(true);
  const [readReadiness, setReadReadiness] = useState(true);
  const [readActivity, setReadActivity] = useState(true);

  const currentFreqLabel =
    SYNC_OPTIONS.find((o) => o.value === syncFrequency)?.label ?? "";

  /* -- Loading state -- */
  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={OURA_ACCENT} />
          <Text style={styles.loadingText}>Loading Oura connection...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          <View style={styles.iconCircle}>
            <Circle size={28} color={OURA_ACCENT} fill={OURA_ACCENT} />
          </View>
          <View style={styles.headerText}>
            <Text style={styles.headerTitle}>Oura Ring</Text>
            <Text style={styles.headerSubtitle}>
              Sleep, readiness, and recovery tracking
            </Text>
          </View>
        </View>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* CONNECTION STATUS                                          */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Card
          style={[
            styles.statusCard,
            isConnected
              ? styles.statusCardConnected
              : styles.statusCardDisconnected,
          ]}
        >
          <View style={styles.statusRow}>
            <View style={styles.statusLeft}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: isConnected ? Colors.success : Colors.silver },
                ]}
              />
              <View>
                <Text style={styles.statusLabel}>Connection Status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: isConnected ? Colors.success : Colors.silver },
                  ]}
                >
                  {isConnected ? "Connected" : "Not Connected"}
                </Text>
              </View>
            </View>
            {isConnected && (
              <View style={styles.syncTimeCol}>
                <Text style={styles.syncTimeLabel}>Last sync</Text>
                <Text style={styles.syncTimeValue}>
                  {lastSync ?? "Never"}
                </Text>
              </View>
            )}
          </View>

          {isConnected ? (
            <Button
              title={isSyncing ? "Syncing..." : "Sync Now"}
              variant="secondary"
              size="sm"
              icon={<RefreshCw size={14} color={Colors.gold} />}
              onPress={sync}
              loading={isSyncing}
              style={styles.syncBtn}
            />
          ) : (
            <Button
              title={isConnecting ? "Connecting..." : "Connect Oura Ring"}
              variant="primary"
              size="sm"
              onPress={connect}
              loading={isConnecting}
              style={styles.syncBtn}
            />
          )}
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* OAUTH INFO                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {!isConnected && (
          <Card style={styles.oauthInfoCard}>
            <View style={styles.infoRow}>
              <View style={styles.oauthIconCircle}>
                <Shield size={16} color={OURA_ACCENT} />
              </View>
              <Text style={styles.oauthInfoText}>
                Connecting opens the Oura website where you authorize Everist to
                read your ring data. Your Oura credentials are never shared with us.
              </Text>
            </View>
          </Card>
        )}

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* DATA TYPES                                                 */}
        {/* ═══════════════════════════════════════════════════════════ */}
        {isConnected && (
          <>
            <Card style={styles.categoryCard}>
              <Text style={styles.categoryTitle}>Data from Oura</Text>
              <Text style={styles.categorySubtitle}>
                Choose which Oura data to import into Everist
              </Text>

              <DataRow
                icon={<Moon size={18} color="#6366F1" />}
                label="Sleep"
                value={readSleep}
                onValueChange={setReadSleep}
              />
              <DataRow
                icon={<Activity size={18} color="#8B5CF6" />}
                label="Heart Rate Variability"
                value={readHRV}
                onValueChange={setReadHRV}
              />
              <DataRow
                icon={<Thermometer size={18} color="#F97316" />}
                label="Body Temperature"
                value={readBodyTemp}
                onValueChange={setReadBodyTemp}
              />
              <DataRow
                icon={<Zap size={18} color="#4A9D5B" />}
                label="Readiness Score"
                value={readReadiness}
                onValueChange={setReadReadiness}
              />
              <DataRow
                icon={<Heart size={18} color="#C65D5D" />}
                label="Activity"
                value={readActivity}
                onValueChange={setReadActivity}
                last
              />
            </Card>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* SYNC FREQUENCY                                         */}
            {/* ═══════════════════════════════════════════════════════ */}
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
                    showFrequencyPicker
                      ? { transform: [{ rotate: "180deg" }] }
                      : {}
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

            {/* ═══════════════════════════════════════════════════════ */}
            {/* DATA RETENTION NOTICE                                   */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Card style={styles.infoCard}>
              <View style={styles.infoRow}>
                <View style={styles.infoIconCircle}>
                  <Clock size={16} color={Colors.info} />
                </View>
                <Text style={styles.infoText}>
                  Oura data is synced from the last 90 days via the Oura Cloud
                  API. Data syncs happen server-side so your ring does not need
                  to be nearby.
                </Text>
              </View>
            </Card>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* PRIVACY INFO                                           */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Card style={styles.privacyCard}>
              <View style={styles.infoRow}>
                <View style={styles.privacyIconCircle}>
                  <Shield size={16} color={Colors.success} />
                </View>
                <Text style={styles.privacyText}>
                  Your Oura data is encrypted and only accessible to you and
                  your care team. You can revoke access at any time.
                </Text>
              </View>
            </Card>

            {/* ═══════════════════════════════════════════════════════ */}
            {/* DISCONNECT                                             */}
            {/* ═══════════════════════════════════════════════════════ */}
            <Button
              title="Disconnect Oura Ring"
              variant="danger"
              size="lg"
              onPress={disconnect}
              style={styles.disconnectBtn}
            />
          </>
        )}
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

  /* -- Loading -- */
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  loadingText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
  },

  /* -- Header -- */
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.md,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  iconCircle: {
    width: 56,
    height: 56,
    borderRadius: 16,
    backgroundColor: OURA_ACCENT_BG,
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
  },
  statusCardConnected: {
    backgroundColor: "rgba(74, 157, 91, 0.06)",
    borderColor: "rgba(74, 157, 91, 0.2)",
  },
  statusCardDisconnected: {
    backgroundColor: "rgba(192, 197, 206, 0.06)",
    borderColor: "rgba(192, 197, 206, 0.15)",
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
  },
  statusLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
  },
  statusValue: {
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

  /* -- OAuth info card -- */
  oauthInfoCard: {
    marginBottom: Spacing.md,
    backgroundColor: OURA_ACCENT_BG,
    borderColor: OURA_ACCENT_BORDER,
  },
  oauthIconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(167, 139, 250, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 2,
  },
  oauthInfoText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    flex: 1,
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
