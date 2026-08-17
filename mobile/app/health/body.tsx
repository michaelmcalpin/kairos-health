/**
 * Body Measurements detail screen.
 *
 * Displays current body stats, weight trend, body composition breakdown,
 * and goal progress toward target weight.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { TrendingDown, TrendingUp, Watch, Plus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { BarChart, StackedBar } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BodyScreen() {
  const router = useRouter();

  // ── tRPC: fetch latest measurement and history ──
  const latestQuery = trpc.clientPortal.measurements.latest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  // measurements.list requires a { startDate, endDate } range (last 180 days).
  const rangeEnd = new Date().toISOString().split("T")[0];
  const rangeStart = new Date(Date.now() - 180 * 86400000).toISOString().split("T")[0];
  const historyQuery = trpc.clientPortal.measurements.list.useQuery(
    { startDate: rangeStart, endDate: rangeEnd },
    DEFAULT_QUERY_OPTIONS,
  );

  // ── Map real API data ONLY — no sample fallbacks ──
  const latestRaw = latestQuery.data as any;
  const historyRaw = historyQuery.data as any[] | undefined;

  const isLoading = latestQuery.isLoading;
  const hasData = !!latestRaw;

  // Current stats cards — real values, "—" when a field is absent
  const currentStats = [
    {
      label: "Weight",
      value: latestRaw?.weightLbs != null ? String(latestRaw.weightLbs) : "—",
      unit: latestRaw?.weightLbs != null ? "lbs" : "",
      color: Colors.gold,
    },
    {
      label: "BMI",
      value: latestRaw?.bmi != null ? String(latestRaw.bmi) : "—",
      unit: "",
      color: Colors.info,
    },
    {
      label: "Body Fat",
      value: latestRaw?.bodyFatPct != null ? String(latestRaw.bodyFatPct) : "—",
      unit: latestRaw?.bodyFatPct != null ? "%" : "",
      color: "#F97316",
    },
    {
      label: "Muscle Mass",
      value: latestRaw?.muscleMassLbs != null ? String(Math.round(latestRaw.muscleMassLbs)) : "—",
      unit: latestRaw?.muscleMassLbs != null ? "lbs" : "",
      color: Colors.success,
    },
  ];

  // Weight trend (up to 10 points from real history for chart readability)
  const weightTrend =
    historyRaw && historyRaw.length > 0
      ? historyRaw
          .filter((m: any) => m.weightLbs != null)
          .slice(0, 10)
          .reverse()
          .map((m: any, idx: number, arr: any[]) => ({
            label: idx === arr.length - 1 ? "Now" : idx % 2 === 0 ? `W${Math.floor(idx / 2) + 1}` : "",
            value: m.weightLbs,
          }))
      : [];

  // Compute weight change from real data only (null when insufficient history)
  const weightChange =
    weightTrend.length >= 2
      ? +(weightTrend[weightTrend.length - 1].value - weightTrend[0].value).toFixed(1)
      : null;
  const isWeightDown = weightChange != null ? weightChange <= 0 : true;

  // Body composition — only segments backed by real measurements
  const bodyComposition: { label: string; value: number; color: string }[] = [];
  if (latestRaw?.muscleMassLbs != null) {
    bodyComposition.push({ label: "Muscle", value: latestRaw.muscleMassLbs, color: Colors.success });
  }
  if (latestRaw?.bodyFatPct != null && latestRaw?.weightLbs != null) {
    bodyComposition.push({
      label: "Fat",
      value: +((latestRaw.bodyFatPct / 100) * latestRaw.weightLbs).toFixed(1),
      color: "#F97316",
    });
  }

  // Source — real data only (omit the row entirely when unknown)
  const source: string | null =
    latestRaw?.source ?? latestRaw?.deviceSource ?? latestRaw?.dataSource ?? null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isLoading ? (
        <View style={styles.centerFill}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      ) : !hasData ? (
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <EmptyState
            icon="activity"
            title="No body measurements yet"
            message="Log a measurement or connect a scale to see your weight, body composition, and trends here."
            actionLabel="Log Measurement"
            onAction={() => router.push("/data-entry/log" as any)}
          />
        </ScrollView>
      ) : (
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* ─── Current Stats ────────────────────────────────── */}
          <View style={styles.statsGrid}>
            {currentStats.map((stat) => (
              <Card key={stat.label} style={styles.statCard}>
                <Text style={styles.statLabel}>{stat.label}</Text>
                <View style={styles.statValueRow}>
                  <Text style={[styles.statValue, { color: stat.color }]}>
                    {stat.value}
                  </Text>
                  {stat.unit ? (
                    <Text style={styles.statUnit}>{stat.unit}</Text>
                  ) : null}
                </View>
              </Card>
            ))}
          </View>

          {/* ─── Weight Trend ─────────────────────────────────── */}
          {weightTrend.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Weight Trend</Text>
              <Card>
                {weightChange != null && (
                  <View style={styles.trendHeader}>
                    <View style={styles.trendChange}>
                      {isWeightDown ? (
                        <TrendingDown size={16} color={Colors.success} />
                      ) : (
                        <TrendingUp size={16} color={Colors.warning} />
                      )}
                      <Text
                        style={[
                          styles.trendChangeText,
                          { color: isWeightDown ? Colors.success : Colors.warning },
                        ]}
                      >
                        {weightChange > 0 ? "+" : ""}{weightChange} lbs
                      </Text>
                    </View>
                  </View>
                )}
                <BarChart
                  data={weightTrend}
                  color={Colors.gold}
                  height={130}
                  unit=""
                  decimals={1}
                />
              </Card>
            </>
          )}

          {/* ─── Body Composition ─────────────────────────────── */}
          {bodyComposition.length > 0 && (
            <>
              <Text style={styles.sectionTitle}>Body Composition</Text>
              <Card>
                <StackedBar
                  segments={bodyComposition}
                  height={28}
                  unit=" lbs"
                />
                <View style={styles.compositionDetails}>
                  {bodyComposition.map((comp) => {
                    const pct =
                      (comp.value /
                        bodyComposition.reduce((s, c) => s + c.value, 0)) *
                      100;
                    return (
                      <View key={comp.label} style={styles.compositionRow}>
                        <View
                          style={[
                            styles.compositionDot,
                            { backgroundColor: comp.color },
                          ]}
                        />
                        <Text style={styles.compositionLabel}>{comp.label}</Text>
                        <Text style={styles.compositionValue}>
                          {comp.value} lbs
                        </Text>
                        <Text style={styles.compositionPct}>
                          {pct.toFixed(1)}%
                        </Text>
                      </View>
                    );
                  })}
                </View>
              </Card>
            </>
          )}

          {/* ─── Log Measurement ──────────────────────────────── */}
          <TouchableOpacity
            style={styles.logButton}
            onPress={() => router.push("/data-entry/log" as any)}
            activeOpacity={0.7}
          >
            <Plus size={18} color={Colors.dark} />
            <Text style={styles.logButtonText}>Log Measurement</Text>
          </TouchableOpacity>

          {/* ─── Source ───────────────────────────────────────── */}
          {source ? (
            <View style={styles.sourceRow}>
              <Watch size={14} color={Colors.silver} />
              <Text style={styles.sourceText}>Source: {source}</Text>
            </View>
          ) : null}

          <View style={styles.bottomSpacer} />
        </ScrollView>
      )}
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
  centerFill: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.sm,
  },
  statCard: {
    flexBasis: "48%",
    flexGrow: 1,
    alignItems: "center",
    paddingVertical: Spacing.md,
  },
  statLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  statValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  statValue: {
    fontSize: FontSizes.xxl,
    fontWeight: "800",
  },
  statUnit: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },

  // Section
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Trend header
  trendHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  trendChange: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trendChangeText: {
    color: Colors.success,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },

  // Composition
  compositionDetails: {
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  compositionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  compositionDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  compositionLabel: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    flex: 1,
  },
  compositionValue: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  compositionPct: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
    width: 50,
    textAlign: "right",
  },

  // Goal
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  goalIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  goalDeadline: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  goalPct: {
    color: Colors.gold,
    fontSize: FontSizes.xl,
    fontWeight: "800",
  },
  goalBar: {
    marginBottom: Spacing.md,
  },
  goalDetails: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  goalDetailItem: {
    alignItems: "center",
    gap: 2,
  },
  goalDetailLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  goalDetailValue: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  goalRemaining: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  goalRemainingText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },

  // Log button
  logButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.gold,
    paddingVertical: Spacing.md,
    borderRadius: Radii.lg,
    marginTop: Spacing.lg,
  },
  logButtonText: {
    color: Colors.dark,
    fontSize: FontSizes.md,
    fontWeight: "700",
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

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
