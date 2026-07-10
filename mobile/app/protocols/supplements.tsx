/**
 * Supplements screen — current stack grouped by timing, with adherence tracking.
 *
 * Wired to tRPC API:
 *   - clientPortal.supplements.getActiveProtocol  (current supplement protocol)
 *   - clientPortal.supplements.adherenceStats     (weekly adherence %)
 *   - clientPortal.supplements.logAdherence       (mark a supplement taken/skipped)
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  SafeAreaView,
  Alert,
  RefreshControl,
  Pressable,
} from "react-native";
import { Stack } from "expo-router";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface Supplement {
  id?: string;
  name: string;
  dosage: string;
  brand: string;
  purpose: string;
  taken: boolean;
}

interface TimingGroup {
  label: string;
  time: string;
  supplements: Supplement[];
}

/* ------------------------------------------------------------------ */
/* Sample data — used as fallback when backend is unreachable          */
/* ------------------------------------------------------------------ */

const SAMPLE_TIMING_GROUPS: TimingGroup[] = [
  {
    label: "Morning",
    time: "7:00 AM",
    supplements: [
      {
        name: "Vitamin D3",
        dosage: "5,000 IU",
        brand: "Thorne",
        purpose: "Immune function, bone health",
        taken: true,
      },
      {
        name: "Omega-3 Fish Oil",
        dosage: "2,000 mg EPA/DHA",
        brand: "Nordic Naturals",
        purpose: "Cardiovascular, anti-inflammatory",
        taken: true,
      },
      {
        name: "Methylated B-Complex",
        dosage: "1 capsule",
        brand: "Thorne",
        purpose: "Methylation support (MTHFR)",
        taken: true,
      },
    ],
  },
  {
    label: "Afternoon",
    time: "1:00 PM",
    supplements: [
      {
        name: "Creatine Monohydrate",
        dosage: "5 g",
        brand: "Creapure",
        purpose: "Muscle performance, cognitive",
        taken: false,
      },
      {
        name: "CoQ10 (Ubiquinol)",
        dosage: "200 mg",
        brand: "Jarrow",
        purpose: "Mitochondrial energy",
        taken: false,
      },
    ],
  },
  {
    label: "Evening",
    time: "6:00 PM",
    supplements: [
      {
        name: "Curcumin",
        dosage: "500 mg",
        brand: "Meriva",
        purpose: "Anti-inflammatory",
        taken: false,
      },
    ],
  },
  {
    label: "Bedtime",
    time: "10:00 PM",
    supplements: [
      {
        name: "Magnesium Glycinate",
        dosage: "400 mg",
        brand: "Pure Encapsulations",
        purpose: "Sleep quality, muscle recovery",
        taken: false,
      },
      {
        name: "Apigenin",
        dosage: "50 mg",
        brand: "Swanson",
        purpose: "Sleep onset, anxiolytic",
        taken: false,
      },
    ],
  },
];

const SAMPLE_ADHERENCE = { rate: 94, period: "this week" };

/* ------------------------------------------------------------------ */
/* API → UI mappers                                                    */
/* ------------------------------------------------------------------ */

/** Map a protocol item from the API to our display Supplement type. */
function mapApiSupplement(raw: any, adherenceMap?: Record<string, boolean>): Supplement {
  return {
    id: raw.id ?? raw._id ?? undefined,
    name: raw.name ?? raw.supplementName ?? "Supplement",
    dosage: raw.dose ?? raw.dosage ?? "",
    brand: raw.brand ?? "",
    purpose: raw.purpose ?? raw.notes ?? "",
    taken: adherenceMap?.[raw.id] ?? raw.taken ?? false,
  };
}

/**
 * Group flat API items into TimingGroups based on each item's `timing`
 * field (e.g. "morning", "evening", "bedtime", "with meals").
 */
function groupByTiming(items: any[], adherenceMap?: Record<string, boolean>): TimingGroup[] {
  const buckets: Record<string, { label: string; time: string; supplements: Supplement[] }> = {};

  const timingMeta: Record<string, { label: string; time: string }> = {
    morning: { label: "Morning", time: "7:00 AM" },
    afternoon: { label: "Afternoon", time: "1:00 PM" },
    evening: { label: "Evening", time: "6:00 PM" },
    bedtime: { label: "Bedtime", time: "10:00 PM" },
    "with meals": { label: "With Meals", time: "Meals" },
  };

  for (const item of items) {
    const key = (item.timing ?? item.timeOfDay ?? "morning").toLowerCase();
    if (!buckets[key]) {
      const meta = timingMeta[key] ?? { label: key.charAt(0).toUpperCase() + key.slice(1), time: "" };
      buckets[key] = { ...meta, supplements: [] };
    }
    buckets[key].supplements.push(mapApiSupplement(item, adherenceMap));
  }

  // Return in a predictable order
  const order = ["morning", "afternoon", "evening", "bedtime"];
  const sorted = order.filter((k) => buckets[k]).map((k) => buckets[k]);
  // Append any buckets not in the predefined order
  for (const key of Object.keys(buckets)) {
    if (!order.includes(key)) sorted.push(buckets[key]);
  }
  return sorted;
}

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function SupplementsScreen() {
  /* ---- tRPC queries ---- */
  const protocolQuery = trpc.clientPortal.supplements.getActiveProtocol.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const adherenceQuery = trpc.clientPortal.supplements.adherenceStats.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const logAdherenceMutation = trpc.clientPortal.supplements.logAdherence.useMutation({
    onSuccess: () => {
      protocolQuery.refetch();
      adherenceQuery.refetch();
    },
    onError: (err: any) => {
      Alert.alert("Error", err.message ?? "Could not log adherence.");
    },
  });

  /* ---- Derive display data (API with sample fallback) ---- */
  const timingGroups: TimingGroup[] = protocolQuery.data
    ? groupByTiming(
        (protocolQuery.data as any).items ?? (protocolQuery.data as any).supplements ?? [protocolQuery.data].flat(),
      )
    : SAMPLE_TIMING_GROUPS;

  const adherenceRate: number = adherenceQuery.data
    ? ((adherenceQuery.data as any).rate ?? (adherenceQuery.data as any).adherenceRate ?? SAMPLE_ADHERENCE.rate)
    : SAMPLE_ADHERENCE.rate;

  const totalSupps = timingGroups.reduce((s, g) => s + g.supplements.length, 0);
  const takenCount = timingGroups.reduce(
    (s, g) => s + g.supplements.filter((sup) => sup.taken).length,
    0,
  );

  /* ---- Pull-to-refresh ---- */
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([protocolQuery.refetch(), adherenceQuery.refetch()]);
    setRefreshing(false);
  }, [protocolQuery, adherenceQuery]);

  /* ---- Toggle adherence handler ---- */
  const handleToggleTaken = (sup: Supplement) => {
    if (sup.id) {
      logAdherenceMutation.mutate({
        supplementId: sup.id,
        taken: !sup.taken,
        date: new Date().toISOString().split("T")[0],
      });
    } else {
      Alert.alert("Logged", `${sup.name} marked as ${sup.taken ? "not taken" : "taken"}.`);
    }
  };

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ title: "Supplements" }} />

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} />
        }
      >
        {/* Adherence Card */}
        <Card style={styles.adherenceCard}>
          <View style={styles.rowBetween}>
            <View>
              <Text style={styles.adherenceLabel}>Weekly Adherence</Text>
              <Text style={styles.adherenceRate}>{adherenceRate}%</Text>
            </View>
            <Badge label={adherenceRate >= 80 ? "On Track" : "Needs Attention"} variant={adherenceRate >= 80 ? "success" : "warning"} />
          </View>

          {/* Progress bar */}
          <View style={styles.progressTrack}>
            <View
              style={[styles.progressFill, { width: `${adherenceRate}%` }]}
            />
          </View>
          <Text style={styles.dailyCount}>
            Today: {takenCount}/{totalSupps} taken
          </Text>
        </Card>

        {/* Timing Groups */}
        {timingGroups.map((group) => (
          <Card key={group.label} style={styles.groupCard}>
            <View style={styles.groupHeader}>
              <Text style={styles.groupLabel}>{group.label}</Text>
              <Text style={styles.groupTime}>{group.time}</Text>
            </View>

            {group.supplements.map((sup, idx) => (
              <View
                key={sup.id ?? idx}
                style={[
                  styles.suppRow,
                  idx < group.supplements.length - 1 && styles.suppBorder,
                ]}
              >
                <Pressable
                  style={styles.checkCol}
                  onPress={() => handleToggleTaken(sup)}
                  hitSlop={8}
                >
                  <View
                    style={[
                      styles.checkbox,
                      sup.taken && styles.checkboxDone,
                    ]}
                  >
                    {sup.taken && <Text style={styles.checkmark}>{"✓"}</Text>}
                  </View>
                </Pressable>

                <View style={styles.suppInfo}>
                  <View style={styles.rowBetween}>
                    <Text
                      style={[
                        styles.suppName,
                        sup.taken && styles.takenText,
                      ]}
                    >
                      {sup.name}
                    </Text>
                    <Text style={styles.suppDosage}>{sup.dosage}</Text>
                  </View>
                  <Text style={styles.suppBrand}>{sup.brand}</Text>
                  <Text style={styles.suppPurpose}>{sup.purpose}</Text>
                </View>
              </View>
            ))}
          </Card>
        ))}

        {/* Add Button */}
        <Button
          title="Add Supplement"
          variant="secondary"
          size="lg"
          style={styles.addButton}
          onPress={() => Alert.alert("Add Supplement", "Your coach manages your supplement protocol. Contact them to make changes.")}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl,
    gap: Spacing.md,
  },

  /* Adherence */
  adherenceCard: {
    gap: Spacing.sm,
  },
  adherenceLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.gold,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  adherenceRate: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
  },
  progressTrack: {
    height: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.success,
    borderRadius: Radii.full,
  },
  dailyCount: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },

  /* Groups */
  groupCard: {
    gap: Spacing.xs,
  },
  groupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: Spacing.xs,
  },
  groupLabel: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.white,
  },
  groupTime: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
  },

  /* Supplement rows */
  suppRow: {
    flexDirection: "row",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  suppBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  checkCol: {
    paddingTop: 2,
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: Radii.sm,
    borderWidth: 1.5,
    borderColor: Colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: Colors.successMuted,
    borderColor: Colors.success,
  },
  checkmark: {
    fontSize: 13,
    color: Colors.success,
    fontWeight: "700",
  },
  suppInfo: {
    flex: 1,
    gap: 2,
  },
  suppName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
    flex: 1,
  },
  takenText: {
    opacity: 0.5,
    textDecorationLine: "line-through",
  },
  suppDosage: {
    fontSize: FontSizes.sm,
    color: Colors.goldLight,
    fontWeight: "500",
  },
  suppBrand: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
  },
  suppPurpose: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    fontStyle: "italic",
  },

  /* Shared */
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  /* Add button */
  addButton: {
    marginTop: Spacing.xs,
  },
});
