/**
 * Activity / Steps detail screen.
 *
 * Mirrors the web client portal, which surfaces steps as a latest-value KPI
 * (there is no dedicated activity history/list procedure on the client
 * router). Reads today's step count from the shared dashboard overview and
 * the daily step goal from today's protocols, and shows an honest empty
 * state until a device provides data.
 *
 * tRPC paths used (under `clientPortal`):
 *   - dashboard.getOverview       -> kpis.steps { value, date }
 *   - dashboard.getTodayProtocols -> exercise.stepGoal
 */

import React, { useState } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Footprints, Target, Watch, Plus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/data-entry/FormField";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  if (source === "apple_health") return "Apple Health";
  if (source === "manual") return "Manual Entry";
  if (source === "oura") return "Oura Ring";
  return source;
}

function formatDate(date?: string | null): string | null {
  if (!date) return null;
  const d = new Date(date + "T12:00:00");
  if (isNaN(d.getTime())) return null;
  return d.toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" });
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ActivityScreen() {
  const router = useRouter();
  const utils = trpc.useUtils();

  // ─── tRPC Queries — same sources the web uses for steps ──
  const overviewQuery = trpc.clientPortal.dashboard.getOverview.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const protocolsQuery = trpc.clientPortal.dashboard.getTodayProtocols.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // ─── Manual-entry modal ─────────────────────────────────
  const logMutation = trpc.clientPortal.measurements.logSteps.useMutation();
  const [modalVisible, setModalVisible] = useState(false);
  const [stepsInput, setStepsInput] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const handleSave = async () => {
    const num = Number(stepsInput);
    if (!stepsInput.trim() || isNaN(num) || num < 0 || num > 200000) {
      setFormError("Enter a step count between 0 and 200,000.");
      return;
    }
    setFormError(null);
    try {
      await logMutation.mutateAsync({ steps: Math.round(num) });
      setModalVisible(false);
      setStepsInput("");
      utils.clientPortal.dashboard.getOverview.invalidate();
      utils.clientPortal.measurements.recentActivity.invalidate();
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
          <Text style={styles.modalTitle}>Log Steps (Today)</Text>
          <FormField
            label="Steps"
            value={stepsInput}
            onChangeText={setStepsInput}
            placeholder="8000"
            unit="steps"
            numeric
          />
          {formError ? <Text style={styles.errorText}>{formError}</Text> : null}
          <Button
            title="Save"
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
          title="Couldn't load activity data"
          message="We couldn't reach the server. Please try again."
          onRetry={() => {
            overviewQuery.refetch();
            protocolsQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  // ─── Real data mapping (no fabricated fallbacks) ────────
  const kpis = (overviewQuery.data as any)?.kpis ?? null;
  const stepsKpi = kpis?.steps ?? null;
  const steps = stepsKpi?.value != null ? Number(stepsKpi.value) : null;

  // ─── Empty state — no reading yet ───────────────────────
  if (steps == null) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon="activity"
            title="No activity data yet"
            message="Connect Apple Health or a wearable to sync your daily steps here — or log today's steps manually."
            actionLabel="Add Steps"
            onAction={() => setModalVisible(true)}
          />
        </View>
        {renderAddModal()}
      </SafeAreaView>
    );
  }

  const stepGoal =
    (protocolsQuery.data as any)?.exercise?.stepGoal != null
      ? Number((protocolsQuery.data as any).exercise.stepGoal)
      : null;
  const progressPct =
    stepGoal && stepGoal > 0
      ? Math.min(100, Math.round((steps / stepGoal) * 100))
      : null;
  const dateLabel = formatDate(stepsKpi?.date);
  const source = formatSource(stepsKpi?.source);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Steps Today ──────────────────────────────────── */}
        <Card style={styles.latestCard}>
          <View style={styles.latestHeader}>
            <View style={styles.latestIconWrap}>
              <Footprints size={24} color="#4A9D5B" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.latestLabel}>Steps</Text>
              {dateLabel ? (
                <Text style={styles.latestTimestamp}>{dateLabel}</Text>
              ) : null}
            </View>
          </View>
          <View style={styles.latestValueRow}>
            <Text style={styles.latestValue}>
              {Math.round(steps).toLocaleString()}
            </Text>
            <Text style={styles.latestUnit}>steps</Text>
          </View>
        </Card>

        {/* ─── Goal Progress ────────────────────────────────── */}
        {stepGoal != null && progressPct != null && (
          <>
            <Text style={styles.sectionTitle}>Daily Goal</Text>
            <Card>
              <View style={styles.goalHeader}>
                <View style={styles.goalLabelWrap}>
                  <Target size={16} color={Colors.gold} />
                  <Text style={styles.goalLabel}>
                    {Math.round(steps).toLocaleString()} / {stepGoal.toLocaleString()}
                  </Text>
                </View>
                <Text style={styles.goalPct}>{progressPct}%</Text>
              </View>
              <View style={styles.progressTrack}>
                <View
                  style={[
                    styles.progressFill,
                    {
                      width: `${progressPct}%`,
                      backgroundColor:
                        progressPct >= 100 ? Colors.success : Colors.gold,
                    },
                  ]}
                />
              </View>
            </Card>
          </>
        )}

        {/* ─── Add Steps ────────────────────────────────────── */}
        <Button
          title="Add Steps"
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
    backgroundColor: "rgba(74, 157, 91, 0.12)",
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
    fontSize: 48,
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

  // Goal
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  goalLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  goalLabel: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  goalPct: {
    color: Colors.gold,
    fontSize: FontSizes.lg,
    fontWeight: "800",
  },
  progressTrack: {
    height: 10,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: Radii.full,
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
