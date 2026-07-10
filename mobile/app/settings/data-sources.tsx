/**
 * Data Sources settings screen.
 *
 * Shows connected integrations with sync status, health data categories
 * with source counts, and options to sync historical data.
 * Mirrors Bevel's "Data Sources" layout.
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  Alert,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Plus,
  ChevronRight,
  Moon,
  Heart,
  Activity,
  Zap,
  Footprints,
  Scale,
  Dumbbell,
  Droplets,
  Thermometer,
  RefreshCw,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { useConnectedDevices, useSyncDevice } from "@/hooks";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Sample integration data                                             */
/* ------------------------------------------------------------------ */

interface Integration {
  id: string;
  name: string;
  status: "synced" | "syncing" | "not_synced" | "error";
  lastSync?: string;
  icon: React.ReactNode;
  iconBg: string;
}

const FALLBACK_INTEGRATIONS: Integration[] = [
  {
    id: "apple_health",
    name: "Apple Health",
    status: "synced",
    lastSync: "5 min ago",
    icon: <Heart size={20} color="#FF375F" fill="#FF375F" />,
    iconBg: "rgba(255, 55, 95, 0.12)",
  },
  {
    id: "oura",
    name: "Oura",
    status: "synced",
    lastSync: "2h ago",
    icon: <Moon size={20} color="#A78BFA" />,
    iconBg: "rgba(167, 139, 250, 0.12)",
  },
];

/* ------------------------------------------------------------------ */
/* Health data categories                                              */
/* ------------------------------------------------------------------ */

interface DataCategory {
  id: string;
  label: string;
  sources: number;
  icon: React.ReactNode;
  iconColor: string;
}

const DATA_CATEGORIES: DataCategory[] = [
  { id: "active_energy", label: "Active Energy", sources: 4, icon: <Zap size={18} />, iconColor: "#F59E0B" },
  { id: "cycle", label: "Cycle", sources: 0, icon: <Activity size={18} />, iconColor: "#EC4899" },
  { id: "heart_rate", label: "Heart Rate", sources: 3, icon: <Heart size={18} />, iconColor: "#C65D5D" },
  { id: "hrv", label: "Heart Rate Variability", sources: 2, icon: <Activity size={18} />, iconColor: "#8B5CF6" },
  { id: "sleep", label: "Sleep", sources: 2, icon: <Moon size={18} />, iconColor: "#6366F1" },
  { id: "steps", label: "Steps", sources: 3, icon: <Footprints size={18} />, iconColor: "#4A90D9" },
  { id: "weight", label: "Weight", sources: 1, icon: <Scale size={18} />, iconColor: "#D4A843" },
  { id: "workouts", label: "Workouts", sources: 2, icon: <Dumbbell size={18} />, iconColor: "#F97316" },
  { id: "blood_oxygen", label: "Blood Oxygen", sources: 1, icon: <Droplets size={18} />, iconColor: "#06B6D4" },
  { id: "temperature", label: "Body Temperature", sources: 1, icon: <Thermometer size={18} />, iconColor: "#F97316" },
];

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function DataSourcesScreen() {
  const router = useRouter();
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  /* -- Device data from API with fallback -- */
  const { devices: connectedDevices } = useConnectedDevices();
  const { sync: syncDevice, isLoading: isSyncing } = useSyncDevice();

  /* -- Map connected devices to Integration format, fall back to hardcoded -- */
  const INTEGRATIONS: Integration[] = connectedDevices.length > 0
    ? connectedDevices.map((device) => ({
        id: device.id,
        name: device.name,
        status: device.syncStatus === "pending" ? "not_synced" as const : device.syncStatus,
        lastSync: device.lastSyncedAt
          ? formatTimeSince(device.lastSyncedAt)
          : undefined,
        icon: getDeviceIcon(device.manufacturer),
        iconBg: getDeviceIconBg(device.manufacturer),
      }))
    : FALLBACK_INTEGRATIONS;

  const handleManage = (integration: Integration) => {
    if (integration.id === "apple_health" || integration.name === "Apple Health") {
      router.push("/devices/apple-health");
    } else {
      // Show sync historical data option
      setSyncingProvider(integration.id);
      setShowSyncModal(true);
    }
  };

  const handleSyncHistorical = () => {
    if (syncingProvider) {
      syncDevice(syncingProvider);
    }
    setShowSyncModal(false);
    Alert.alert(
      "Sync Started",
      "Syncing historical data. This may take a few minutes. Please keep the app open.",
      [{ text: "OK" }],
    );
  };

  const statusLabel = (s: Integration["status"]) => {
    switch (s) {
      case "synced":
        return "Synced";
      case "syncing":
        return "Syncing...";
      case "not_synced":
        return "Not synced yet";
      case "error":
        return "Error";
    }
  };

  const statusColor = (s: Integration["status"]) => {
    switch (s) {
      case "synced":
        return Colors.success;
      case "syncing":
        return Colors.gold;
      case "not_synced":
        return Colors.silver;
      case "error":
        return Colors.danger;
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Integrations                                               */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Integrations</Text>
          <Pressable
            style={styles.addButton}
            onPress={() => router.push("/devices/connect" as any)}
          >
            <Plus size={18} color={Colors.gold} />
          </Pressable>
        </View>

        <Card style={styles.integrationsCard}>
          {INTEGRATIONS.map((integration, i) => (
            <Pressable
              key={integration.id}
              style={[
                styles.integrationRow,
                i < INTEGRATIONS.length - 1 && styles.integrationRowBorder,
              ]}
              onPress={() => handleManage(integration)}
            >
              <View
                style={[
                  styles.integrationIcon,
                  { backgroundColor: integration.iconBg },
                ]}
              >
                {integration.icon}
              </View>
              <View style={styles.integrationText}>
                <Text style={styles.integrationName}>{integration.name}</Text>
                <Text
                  style={[
                    styles.integrationStatus,
                    { color: statusColor(integration.status) },
                  ]}
                >
                  {statusLabel(integration.status)}
                  {integration.lastSync ? ` · ${integration.lastSync}` : ""}
                </Text>
              </View>
              <Pressable
                style={styles.manageButton}
                onPress={() => handleManage(integration)}
              >
                <Text style={styles.manageText}>Manage</Text>
              </Pressable>
            </Pressable>
          ))}
        </Card>

        {/* ═══════════════════════════════════════════════════════════ */}
        {/* Health Data                                                */}
        {/* ═══════════════════════════════════════════════════════════ */}
        <Text style={[styles.sectionTitle, styles.healthDataTitle]}>
          Health Data
        </Text>

        <Card style={styles.dataCard}>
          {DATA_CATEGORIES.map((cat, i) => (
            <Pressable
              key={cat.id}
              style={[
                styles.dataRow,
                i < DATA_CATEGORIES.length - 1 && styles.dataRowBorder,
              ]}
            >
              <View
                style={[
                  styles.dataIcon,
                  {
                    backgroundColor: `${cat.iconColor}15`,
                  },
                ]}
              >
                {React.cloneElement(cat.icon as React.ReactElement<any>, {
                  color: cat.iconColor,
                })}
              </View>
              <Text style={styles.dataLabel}>{cat.label}</Text>
              <Text style={styles.dataSources}>
                {cat.sources} {cat.sources === 1 ? "source" : "sources"}
              </Text>
              <ChevronRight size={16} color={Colors.silver} />
            </Pressable>
          ))}
        </Card>
      </ScrollView>

      {/* ═══════════════════════════════════════════════════════════ */}
      {/* Sync Historical Data Modal                                  */}
      {/* ═══════════════════════════════════════════════════════════ */}
      <Modal
        visible={showSyncModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowSyncModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Pressable
              style={styles.modalClose}
              onPress={() => setShowSyncModal(false)}
            >
              <Text style={styles.modalCloseText}>×</Text>
            </Pressable>

            <View style={styles.modalIconWrap}>
              <Moon size={32} color="#A78BFA" />
            </View>

            <Text style={styles.modalTitle}>Sync historical data</Text>
            <Text style={styles.modalBody}>
              Would you like to sync your historical{" "}
              {syncingProvider === "oura" ? "Oura" : "device"} data with
              Everist.ai? This will take a few minutes. Please keep the app
              open while your data syncs.
            </Text>

            <Button
              title="Sync historical data"
              variant="primary"
              size="lg"
              icon={<RefreshCw size={16} color={Colors.dark} />}
              onPress={handleSyncHistorical}
              style={styles.modalBtn}
            />

            <Pressable onPress={() => setShowSyncModal(false)}>
              <Text style={styles.dismissText}>Dismiss</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTimeSince(dateString: string): string {
  const now = Date.now();
  const then = new Date(dateString).getTime();
  const diffMs = now - then;
  const diffMins = Math.floor(diffMs / 60_000);
  if (diffMins < 1) return "just now";
  if (diffMins < 60) return `${diffMins} min ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

function getDeviceIcon(manufacturer: string): React.ReactNode {
  switch (manufacturer.toLowerCase()) {
    case "apple":
      return <Heart size={20} color="#FF375F" fill="#FF375F" />;
    case "oura":
      return <Moon size={20} color="#A78BFA" />;
    case "dexcom":
      return <Droplets size={20} color="#06B6D4" />;
    case "withings":
      return <Scale size={20} color="#D4A843" />;
    default:
      return <Activity size={20} color="#4A90D9" />;
  }
}

function getDeviceIconBg(manufacturer: string): string {
  switch (manufacturer.toLowerCase()) {
    case "apple":
      return "rgba(255, 55, 95, 0.12)";
    case "oura":
      return "rgba(167, 139, 250, 0.12)";
    case "dexcom":
      return "rgba(6, 182, 212, 0.12)";
    case "withings":
      return "rgba(212, 168, 67, 0.12)";
    default:
      return "rgba(74, 144, 217, 0.12)";
  }
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

  /* Sections */
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  addButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
  },
  healthDataTitle: {
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  /* Integrations card */
  integrationsCard: {
    padding: 0,
    overflow: "hidden",
  },
  integrationRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.md,
  },
  integrationRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  integrationIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  integrationText: {
    flex: 1,
  },
  integrationName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  integrationStatus: {
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  manageButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radii.sm,
    borderWidth: 1,
    borderColor: Colors.border,
    backgroundColor: Colors.navyLight,
  },
  manageText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
    color: Colors.silver,
  },

  /* Health data card */
  dataCard: {
    padding: 0,
    overflow: "hidden",
  },
  dataRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  dataRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  dataIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  dataLabel: {
    flex: 1,
    fontSize: FontSizes.md,
    fontWeight: "500",
    color: Colors.white,
  },
  dataSources: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    marginRight: Spacing.xs,
  },

  /* Modal */
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
    alignItems: "center",
  },
  modalClose: {
    alignSelf: "flex-start",
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalCloseText: {
    fontSize: 20,
    color: Colors.silver,
    lineHeight: 22,
  },
  modalIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(167, 139, 250, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.md,
  },
  modalTitle: {
    fontSize: FontSizes.xl,
    fontWeight: "800",
    color: Colors.white,
    marginBottom: Spacing.sm,
  },
  modalBody: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.md,
  },
  modalBtn: {
    width: "100%",
    marginBottom: Spacing.md,
  },
  dismissText: {
    fontSize: FontSizes.md,
    color: Colors.gold,
    fontWeight: "600",
  },
});
