/**
 * Vitals detail screen.
 *
 * Surfaces the four generic single-value vitals persisted in `vitalsReadings`:
 * blood oxygen (SpO2), respiratory rate, VO2max, and body temperature.
 * Each shows its latest reading (from Apple Health sync or manual entry) and
 * an honest empty state until data exists. A single Add-reading modal lets the
 * user log any of the four manually via `clientPortal.vitals.log`.
 *
 * tRPC paths used (under `clientPortal`):
 *   - vitals.getLatest  -> latest reading per type
 *   - vitals.log        -> insert a manual reading (source "manual")
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  Modal,
  Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity, Wind, Gauge, Thermometer, Plus, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/data-entry/FormField";
import { SegmentedControl } from "@/components/data-entry/SegmentedControl";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Config
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

type VitalType = "spo2" | "respiratory_rate" | "vo2max" | "body_temp";

interface VitalDef {
  type: VitalType;
  label: string;
  unit: string;
  color: string;
  icon: React.ReactNode;
  placeholder: string;
}

const VITALS: VitalDef[] = [
  {
    type: "spo2",
    label: "Blood Oxygen",
    unit: "%",
    color: "#4A9D5B",
    icon: <Activity size={24} color="#4A9D5B" />,
    placeholder: "98",
  },
  {
    type: "respiratory_rate",
    label: "Respiratory Rate",
    unit: "br/min",
    color: "#4A90D9",
    icon: <Wind size={24} color="#4A90D9" />,
    placeholder: "14",
  },
  {
    type: "vo2max",
    label: "VO2max",
    unit: "mL/kg/min",
    color: "#A78BFA",
    icon: <Gauge size={24} color="#A78BFA" />,
    placeholder: "42",
  },
  {
    type: "body_temp",
    label: "Body Temperature",
    unit: "°F",
    color: "#FB923C",
    icon: <Thermometer size={24} color="#FB923C" />,
    placeholder: "98.6",
  },
];

const TYPE_BY_LABEL: Record<string, VitalType> = Object.fromEntries(
  VITALS.map((v) => [v.label, v.type])
);

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  if (source === "apple_health") return "Apple Health";
  if (source === "manual") return "Manual Entry";
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

export default function VitalsScreen() {
  const utils = trpc.useUtils();

  // One latest-value query per vital type
  const spo2Query = trpc.clientPortal.vitals.getLatest.useQuery({ type: "spo2" }, DEFAULT_QUERY_OPTIONS);
  const respQuery = trpc.clientPortal.vitals.getLatest.useQuery({ type: "respiratory_rate" }, DEFAULT_QUERY_OPTIONS);
  const vo2Query = trpc.clientPortal.vitals.getLatest.useQuery({ type: "vo2max" }, DEFAULT_QUERY_OPTIONS);
  const tempQuery = trpc.clientPortal.vitals.getLatest.useQuery({ type: "body_temp" }, DEFAULT_QUERY_OPTIONS);

  const latestByType: Record<VitalType, any> = {
    spo2: spo2Query.data,
    respiratory_rate: respQuery.data,
    vo2max: vo2Query.data,
    body_temp: tempQuery.data,
  };

  const isLoading =
    spo2Query.isLoading || respQuery.isLoading || vo2Query.isLoading || tempQuery.isLoading;

  const logMutation = trpc.clientPortal.vitals.log.useMutation();

  // ── Add-reading modal state ──
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedLabel, setSelectedLabel] = useState<string>(VITALS[0].label);
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const selectedDef = VITALS.find((v) => v.label === selectedLabel) ?? VITALS[0];

  const openModal = () => {
    setValue("");
    setError(null);
    setModalVisible(true);
  };

  const refetchAll = () => {
    utils.clientPortal.vitals.getLatest.invalidate();
    utils.clientPortal.vitals.getRecent.invalidate();
  };

  const handleSave = async () => {
    const num = Number(value);
    if (!value.trim() || isNaN(num) || num <= 0) {
      setError("Enter a valid value.");
      return;
    }
    setError(null);
    try {
      const type = TYPE_BY_LABEL[selectedLabel];
      await logMutation.mutateAsync({
        type,
        value: num,
        unit: selectedDef.unit,
      });
      setModalVisible(false);
      refetchAll();
    } catch {
      setError("Failed to save. Please try again.");
    }
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
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
        {VITALS.map((v) => {
          const latest = latestByType[v.type];
          const num = latest?.value != null ? Number(latest.value) : null;
          const timestamp = formatTimestamp(latest?.recordedAt);
          const source = formatSource(latest?.source);
          return (
            <Card key={v.type} style={styles.vitalCard}>
              <View style={styles.vitalHeader}>
                <View
                  style={[
                    styles.vitalIconWrap,
                    { backgroundColor: v.color + "1F" },
                  ]}
                >
                  {v.icon}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.vitalLabel}>{v.label}</Text>
                  <Text style={styles.vitalTimestamp}>
                    {timestamp ?? "No readings yet"}
                  </Text>
                </View>
              </View>
              <View style={styles.vitalValueRow}>
                {num != null ? (
                  <>
                    <Text style={styles.vitalValue}>{num}</Text>
                    <Text style={styles.vitalUnit}>{latest?.unit ?? v.unit}</Text>
                  </>
                ) : (
                  <Text style={styles.vitalEmpty}>—</Text>
                )}
              </View>
              {source ? (
                <View style={styles.sourceRow}>
                  <Watch size={12} color={Colors.silver} />
                  <Text style={styles.sourceText}>Source: {source}</Text>
                </View>
              ) : null}
            </Card>
          );
        })}

        <Button
          title="Add Reading"
          variant="primary"
          size="lg"
          onPress={openModal}
          style={styles.addBtn}
          icon={<Plus size={18} color={Colors.dark} />}
        />

        <View style={styles.bottomSpacer} />
      </ScrollView>

      {/* ── Add-reading modal ── */}
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

            <Text style={styles.modalTitle}>Log a Vital</Text>

            <SegmentedControl
              label="Metric"
              options={VITALS.map((v) => v.label)}
              selected={selectedLabel}
              onSelect={setSelectedLabel}
            />

            <FormField
              label="Value"
              value={value}
              onChangeText={setValue}
              placeholder={selectedDef.placeholder}
              unit={selectedDef.unit}
              numeric
            />

            {error ? <Text style={styles.errorText}>{error}</Text> : null}

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

  // Vital card
  vitalCard: {
    marginBottom: Spacing.md,
    paddingVertical: Spacing.lg,
  },
  vitalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  vitalIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  vitalLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  vitalTimestamp: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  vitalValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  vitalValue: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: "800",
  },
  vitalUnit: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    fontWeight: "500",
    marginLeft: Spacing.sm,
  },
  vitalEmpty: {
    color: Colors.silver,
    fontSize: 48,
    fontWeight: "800",
  },

  // Source
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.md,
    justifyContent: "center",
  },
  sourceText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },

  // Add button
  addBtn: {
    marginTop: Spacing.sm,
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
