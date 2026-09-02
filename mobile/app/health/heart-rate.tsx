/**
 * Heart Rate detail screen.
 *
 * Mirrors the web client portal, which surfaces heart rate as a latest-value
 * KPI (there is no dedicated heart-rate history/list procedure on the client
 * router). Reads the most recent reading from the shared dashboard overview
 * and shows an honest empty state until a device or manual entry provides data.
 *
 * tRPC path used (under `clientPortal`):
 *   - dashboard.getOverview  -> kpis.heartRate { value(bpm), timestamp }
 */

import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Heart, Watch, Plus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/data-entry/FormField";
import type { StatusVariant } from "@/lib/types";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Resting-heart-rate zones for context (bpm). */
const HR_ZONES = [
  { label: "Low", range: "<60", color: Colors.info },
  { label: "Normal", range: "60-100", color: Colors.success },
  { label: "Elevated", range: "100-120", color: Colors.warning },
  { label: "High", range: "120+", color: Colors.danger },
];

function hrStatus(bpm: number): { label: string; variant: StatusVariant } {
  if (bpm < 60) return { label: "Low", variant: "info" };
  if (bpm <= 100) return { label: "Normal", variant: "success" };
  if (bpm <= 120) return { label: "Elevated", variant: "warning" };
  return { label: "High", variant: "danger" };
}

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  if (source === "apple_health") return "Apple Health";
  if (source === "manual") return "Manual Entry";
  if (source === "oura") return "Oura Ring";
  return source;
}

function formatTimestamp(ts?: string | number | Date | null): string | null {
  if (!ts) return null;
  const d = new Date(ts as any);
  if (isNaN(d.getTime())) return null;
  return d.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function HeartRateScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ─── tRPC Query — shared dashboard overview (same source the web uses) ──
  const overviewQuery = trpc.clientPortal.dashboard.getOverview.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // ─── Manual-entry modal ─────────────────────────────────
  const logMutation = trpc.clientPortal.measurements.logHeartRate.useMutation();
  const [modalVisible, setModalVisible] = useState(false);
  const [bpmInput, setBpmInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    const num = Number(bpmInput);
    if (!bpmInput.trim() || isNaN(num) || num < 20 || num > 250) {
      setFormError("Enter a heart rate between 20 and 250 bpm.");
      return;
    }
    setFormError(null);
    try {
      await logMutation.mutateAsync({ bpm: Math.round(num) });
      setModalVisible(false);
      setBpmInput("");
      utils.clientPortal.dashboard.getOverview.invalidate();
      utils.clientPortal.measurements.recentHeartRate.invalidate();
    } catch {
      setFormError("Failed to save. Please try again.");
    }
  };

  const renderAddModal = () => (
    <Modal
      visible={modalVisible}
      transparent
      animationType="slide"
      onRequestClose={() => setModalVisible(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Pressable style={styles.modalClose} onPress={() => setModalVisible(false)}>
            <Text style={styles.modalCloseText}>×</Text>
          </Pressable>
          <Text style={styles.modalTitle}>Log Heart Rate</Text>
          <FormField
            label="Heart Rate"
            value={bpmInput}
            onChangeText={setBpmInput}
            placeholder="72"
            unit="bpm"
            numeric
          />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <Button
            title="Save Reading"
            variant="primary"
            size="lg"
            onPress={handleSave}
            loading={logMutation.isPending}
            style={styles.modalBtn}
          />
          <Pressable onPress={() => setModalVisible(false)}>
            <Text style={styles.dismissText}>Cancel</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );

  // ─── Loading state ──────────────────────────────────────
  if (overviewQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ────────────────────────────────────────
  if (overviewQuery.error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load heart rate data"
          message="We couldn't reach the server. Please try again."
          onRetry={() => overviewQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  // ─── Real data mapping (no fabricated fallbacks) ────────
  const kpis = (overviewQuery.data as any)?.kpis ?? null;
  const hr = kpis?.heartRate ?? null;
  const bpm = hr?.value != null ? Number(hr.value) : null;

  // ─── Empty state — no reading yet ───────────────────────
  if (bpm == null) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon="heart"
            title="No heart rate data yet"
            message="Connect Apple Health or a wearable to sync your heart rate here — or log a reading manually."
            actionLabel="Add Reading"
            onAction={() => setModalVisible(true)}
          />
        </View>
        {renderAddModal()}
      </SafeAreaView>
    );
  }

  const status = hrStatus(bpm);
  const timestamp = formatTimestamp(hr?.timestamp);
  const source = formatSource(hr?.source);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Latest Reading ───────────────────────────────── */}
        <Card style={styles.latestCard}>
          <View style={styles.latestHeader}>
            <View style={styles.latestIconWrap}>
              <Heart size={24} color="#C65D5D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.latestLabel}>Latest Heart Rate</Text>
              {timestamp ? (
                <Text style={styles.latestTimestamp}>{timestamp}</Text>
              ) : null}
            </View>
            <Badge label={status.label} variant={status.variant} />
          </View>
          <View style={styles.latestValueRow}>
            <Text style={styles.latestValue}>{Math.round(bpm)}</Text>
            <Text style={styles.latestUnit}>bpm</Text>
          </View>
        </Card>

        {/* ─── Zone Guide ───────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Resting Heart Rate Zones</Text>
        <Card>
          {HR_ZONES.map((zone, idx) => (
            <React.Fragment key={zone.label}>
              <View style={styles.zoneRow}>
                <View style={[styles.zoneDot, { backgroundColor: zone.color }]} />
                <Text style={styles.zoneLabel}>{zone.label}</Text>
                <Text style={styles.zoneRange}>{zone.range} bpm</Text>
                {zone.label === status.label && (
                  <View style={styles.zoneCurrentBadge}>
                    <Text style={styles.zoneCurrentText}>You</Text>
                  </View>
                )}
              </View>
              {idx < HR_ZONES.length - 1 && <View style={styles.zoneSeparator} />}
            </React.Fragment>
          ))}
        </Card>

        {/* ─── Add Reading ──────────────────────────────────── */}
        <Button
          title="Add Reading"
          variant="primary"
          size="lg"
          onPress={() => setModalVisible(true)}
          style={styles.addBtn}
          icon={<Plus size={18} color={Colors.dark} />}
        />

        {/* ─── Source ───────────────────────────────────────── */}
        {source ? (
          <View style={styles.sourceRow}>
            <Watch size={14} color={Colors.silver} />
            <Text style={styles.sourceText}>Source: {source}</Text>
          </View>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
      {renderAddModal()}
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Styles
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
  },
  center: {
    flex: 1,
    justifyContent: "center",
  },

  // Latest
  latestCard: {
    paddingVertical: Spacing.lg,
  },
  latestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  latestIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(198, 93, 93, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  latestLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  latestTimestamp: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  latestValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  latestValue: {
    color: Colors.white,
    fontSize: 56,
    fontWeight: "800",
  },
  latestUnit: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "500",
    marginLeft: Spacing.sm,
  },

  // Section
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Zones
  zoneRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  zoneDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  zoneLabel: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    flex: 1,
  },
  zoneRange: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  zoneCurrentBadge: {
    backgroundColor: Colors.goldDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginLeft: Spacing.sm,
  },
  zoneCurrentText: {
    color: Colors.dark,
    fontSize: 10,
    fontWeight: "700",
  },
  zoneSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  // Source
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.lg,
    justifyContent: "center",
  },
  sourceText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },

  // Add button
  addBtn: {
    marginTop: Spacing.lg,
  },

  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: Colors.navy,
    borderTopLeftRadius: Radii.xl,
    borderTopRightRadius: Radii.xl,
    padding: Spacing.lg,
    paddingBottom: Spacing.xxl,
  },
  modalClose: {
    position: "absolute",
    top: Spacing.md,
    right: Spacing.md,
    zIndex: 1,
    padding: 4,
  },
  modalCloseText: {
    color: Colors.silver,
    fontSize: 28,
    fontWeight: "400",
    lineHeight: 28,
  },
  modalTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginBottom: Spacing.lg,
  },
  errorText: {
    color: Colors.danger,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  modalBtn: {
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  dismissText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
    textAlign: "center",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
