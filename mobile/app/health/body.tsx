/**
 * Body Measurements detail screen.
 *
 * Displays current body stats, weight trend, body composition breakdown,
 * and goal progress toward target weight.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Scale, Target, TrendingDown, TrendingUp, Watch, Plus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { BarChart, ProgressBar, StackedBar } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample / Fallback Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_CURRENT_STATS = [
  { label: "Weight", value: "178.4", unit: "lbs", color: Colors.gold },
  { label: "BMI", value: "24.2", unit: "", color: Colors.info },
  { label: "Body Fat", value: "16.8", unit: "%", color: "#F97316" },
  { label: "Muscle Mass", value: "142", unit: "lbs", color: Colors.success },
];

/** 30-day weight trend — show last 10 data points for readability */
const SAMPLE_WEIGHT_TREND = [
  { label: "W1", value: 181.2 },
  { label: "", value: 180.8 },
  { label: "W2", value: 180.5 },
  { label: "", value: 180.1 },
  { label: "W3", value: 179.6 },
  { label: "", value: 179.4 },
  { label: "W4", value: 179.2 },
  { label: "", value: 178.8 },
  { label: "Now", value: 178.4 },
];

const SAMPLE_BODY_COMPOSITION = [
  { label: "Muscle", value: 142, color: Colors.success },
  { label: "Fat", value: 30, color: "#F97316" },
  { label: "Bone", value: 6.4, color: Colors.silver },
];

const SAMPLE_GOAL = {
  target: 175,
  current: 178.4,
  start: 185,
  progress: 68,
  remaining: 3.4,
  deadline: "Aug 15, 2026",
};

const SAMPLE_SOURCE = "Withings Body+";

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
  const historyQuery = trpc.clientPortal.measurements.list.useQuery(
    { limit: 30 },
    DEFAULT_QUERY_OPTIONS,
  );

  // ── Map API data with sample fallbacks ──
  const latestRaw = latestQuery.data as any;
  const historyRaw = historyQuery.data as any[] | undefined;

  // Current stats cards
  const currentStats = latestRaw
    ? [
        {
          label: "Weight",
          value: latestRaw.weightLbs != null ? String(latestRaw.weightLbs) : SAMPLE_CURRENT_STATS[0].value,
          unit: "lbs",
          color: Colors.gold,
        },
        {
          label: "BMI",
          value: latestRaw.bmi != null ? String(latestRaw.bmi) : SAMPLE_CURRENT_STATS[1].value,
          unit: "",
          color: Colors.info,
        },
        {
          label: "Body Fat",
          value: latestRaw.bodyFatPct != null ? String(latestRaw.bodyFatPct) : SAMPLE_CURRENT_STATS[2].value,
          unit: "%",
          color: "#F97316",
        },
        {
          label: "Muscle Mass",
          value: latestRaw.muscleMassLbs != null ? String(Math.round(latestRaw.muscleMassLbs)) : SAMPLE_CURRENT_STATS[3].value,
          unit: "lbs",
          color: Colors.success,
        },
      ]
    : SAMPLE_CURRENT_STATS;

  // Weight trend (up to 10 points from history for chart readability)
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
      : SAMPLE_WEIGHT_TREND;

  // Compute weight change for trend header
  const weightChange =
    weightTrend.length >= 2
      ? +(weightTrend[weightTrend.length - 1].value - weightTrend[0].value).toFixed(1)
      : -2.8; // sample fallback
  const isWeightDown = weightChange <= 0;

  // Body composition from latest measurement
  const bodyComposition = latestRaw
    ? [
        { label: "Muscle", value: latestRaw.muscleMassLbs ?? SAMPLE_BODY_COMPOSITION[0].value, color: Colors.success },
        {
          label: "Fat",
          value:
            latestRaw.bodyFatPct != null && latestRaw.weightLbs != null
              ? +((latestRaw.bodyFatPct / 100) * latestRaw.weightLbs).toFixed(1)
              : SAMPLE_BODY_COMPOSITION[1].value,
          color: "#F97316",
        },
        { label: "Bone", value: SAMPLE_BODY_COMPOSITION[2].value, color: Colors.silver },
      ]
    : SAMPLE_BODY_COMPOSITION;

  // Goal — keep sample for now (goals come from a separate API in Sprint 4)
  const goal = latestRaw
    ? {
        ...SAMPLE_GOAL,
        current: latestRaw.weightLbs ?? SAMPLE_GOAL.current,
        remaining: +((latestRaw.weightLbs ?? SAMPLE_GOAL.current) - SAMPLE_GOAL.target).toFixed(1),
        progress: Math.min(
          100,
          Math.round(
            ((SAMPLE_GOAL.start - (latestRaw.weightLbs ?? SAMPLE_GOAL.current)) /
              (SAMPLE_GOAL.start - SAMPLE_GOAL.target)) *
              100,
          ),
        ),
      }
    : SAMPLE_GOAL;

  // Source
  const source = SAMPLE_SOURCE;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
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

        {/* ─── Weight Trend (30 days) ───────────────────────── */}
        <Text style={styles.sectionTitle}>Weight Trend (30 days)</Text>
        <Card>
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
            <Badge
              label={isWeightDown ? "On Track" : "Above Target"}
              variant={isWeightDown ? "success" : "warning"}
            />
          </View>
          <BarChart
            data={weightTrend}
            color={Colors.gold}
            height={130}
            unit=""
            decimals={1}
          />
        </Card>

        {/* ─── Body Composition ─────────────────────────────── */}
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

        {/* ─── Goal Progress ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Goal Progress</Text>
        <Card>
          <View style={styles.goalHeader}>
            <View style={styles.goalIconWrap}>
              <Target size={20} color={Colors.gold} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.goalTitle}>Target Weight</Text>
              <Text style={styles.goalDeadline}>
                Deadline: {goal.deadline}
              </Text>
            </View>
            <Text style={styles.goalPct}>{goal.progress}%</Text>
          </View>

          <ProgressBar
            progress={goal.progress}
            color={Colors.gold}
            height={10}
            style={styles.goalBar}
          />

          <View style={styles.goalDetails}>
            <View style={styles.goalDetailItem}>
              <Text style={styles.goalDetailLabel}>Start</Text>
              <Text style={styles.goalDetailValue}>{goal.start} lbs</Text>
            </View>
            <View style={styles.goalDetailItem}>
              <Text style={styles.goalDetailLabel}>Current</Text>
              <Text style={[styles.goalDetailValue, { color: Colors.gold }]}>
                {goal.current} lbs
              </Text>
            </View>
            <View style={styles.goalDetailItem}>
              <Text style={styles.goalDetailLabel}>Target</Text>
              <Text
                style={[styles.goalDetailValue, { color: Colors.success }]}
              >
                {goal.target} lbs
              </Text>
            </View>
          </View>

          <View style={styles.goalRemaining}>
            <Scale size={14} color={Colors.silver} />
            <Text style={styles.goalRemainingText}>
              {goal.remaining} lbs to go
            </Text>
          </View>
        </Card>

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
        <View style={styles.sourceRow}>
          <Watch size={14} color={Colors.silver} />
          <Text style={styles.sourceText}>Source: {source}</Text>
        </View>

        <View style={styles.bottomSpacer} />
      </ScrollView>
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
