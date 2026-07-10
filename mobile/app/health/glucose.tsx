/**
 * Glucose monitoring detail screen.
 *
 * Displays current reading, daily range, key readings throughout the day,
 * 7-day average trend, and time-in-range breakdown.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Droplets, TrendingDown, TrendingUp, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendLine, DonutChart } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_CURRENT_READING = {
  value: 92,
  unit: "mg/dL",
  status: "Normal" as const,
  timestamp: "8:45 AM",
  trend: "stable" as const,
};

const SAMPLE_DAILY_RANGE = {
  low: 78,
  high: 124,
  average: 95,
};

const SAMPLE_READINGS = [
  { id: "1", time: "6:30 AM", label: "Fasting", value: 82, status: "optimal" },
  { id: "2", time: "8:15 AM", label: "Post-breakfast", value: 118, status: "normal" },
  { id: "3", time: "11:45 AM", label: "Pre-lunch", value: 89, status: "optimal" },
  { id: "4", time: "1:30 PM", label: "Post-lunch", value: 124, status: "normal" },
  { id: "5", time: "5:45 PM", label: "Pre-dinner", value: 91, status: "optimal" },
  { id: "6", time: "8:00 PM", label: "Post-dinner", value: 105, status: "normal" },
];

const SAMPLE_WEEKLY_TREND = [
  { label: "Mon", value: 98 },
  { label: "Tue", value: 95 },
  { label: "Wed", value: 91 },
  { label: "Thu", value: 94 },
  { label: "Fri", value: 89 },
  { label: "Sat", value: 93 },
  { label: "Sun", value: 92 },
];

const SAMPLE_TIME_IN_RANGE = [
  { label: "In Range (70-140)", value: 85, color: Colors.success },
  { label: "Below Range", value: 10, color: Colors.info },
  { label: "Above Range", value: 5, color: Colors.warning },
];

const SAMPLE_SOURCE = "Dexcom G7";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GlucoseScreen() {
  // ─── tRPC Queries ───────────────────────────────────────
  const glucoseListQuery = trpc.clientPortal.glucose.list.useQuery(
    { limit: 100 },
    DEFAULT_QUERY_OPTIONS,
  );
  const glucoseStatsQuery = trpc.clientPortal.glucose.stats.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );
  const dailyAvgQuery = trpc.clientPortal.glucose.dailyAverages.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // ─── Map API data with sample fallback ──────────────────
  const readings = glucoseListQuery.data
    ? (glucoseListQuery.data as any[]).map((r, idx) => ({
        id: r.id || String(idx + 1),
        time: new Date(r.timestamp || r.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        label: r.timingContext || "Reading",
        value: r.valueMgdl,
        status: r.valueMgdl >= 70 && r.valueMgdl <= 100 ? "optimal" : "normal",
      }))
    : SAMPLE_READINGS;

  const statsData = glucoseStatsQuery.data as any;
  const currentReading = statsData
    ? {
        value: statsData.latest?.valueMgdl ?? statsData.average ?? SAMPLE_CURRENT_READING.value,
        unit: "mg/dL",
        status: (statsData.latest?.valueMgdl ?? statsData.average ?? 92) < 140 ? ("Normal" as const) : ("High" as const),
        timestamp: statsData.latest
          ? new Date(statsData.latest.timestamp || statsData.latest.createdAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            })
          : SAMPLE_CURRENT_READING.timestamp,
        trend: "stable" as const,
      }
    : SAMPLE_CURRENT_READING;

  const dailyRange = statsData
    ? {
        low: statsData.min ?? statsData.low ?? SAMPLE_DAILY_RANGE.low,
        high: statsData.max ?? statsData.high ?? SAMPLE_DAILY_RANGE.high,
        average: statsData.average ?? SAMPLE_DAILY_RANGE.average,
      }
    : SAMPLE_DAILY_RANGE;

  const weeklyTrend = dailyAvgQuery.data
    ? (dailyAvgQuery.data as any[]).slice(-7).map((d) => ({
        label: new Date(d.date).toLocaleDateString([], { weekday: "short" }),
        value: Math.round(d.average ?? d.avgValue ?? d.valueMgdl ?? 0),
      }))
    : SAMPLE_WEEKLY_TREND;

  const timeInRange = statsData?.timeInRange
    ? [
        { label: "In Range (70-140)", value: statsData.timeInRange.inRange ?? 85, color: Colors.success },
        { label: "Below Range", value: statsData.timeInRange.belowRange ?? 10, color: Colors.info },
        { label: "Above Range", value: statsData.timeInRange.aboveRange ?? 5, color: Colors.warning },
      ]
    : SAMPLE_TIME_IN_RANGE;

  const inRangePercent = timeInRange[0].value;
  const source = statsData?.source ?? SAMPLE_SOURCE;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Current Reading Card ─────────────────────────── */}
        <Card style={styles.currentCard}>
          <View style={styles.currentHeader}>
            <View style={styles.currentIconWrap}>
              <Droplets size={24} color="#F59E0B" />
            </View>
            <View>
              <Text style={styles.currentLabel}>Current Glucose</Text>
              <Text style={styles.currentTimestamp}>
                {currentReading.timestamp}
              </Text>
            </View>
            <Badge label={currentReading.status} variant="success" />
          </View>
          <View style={styles.currentValueRow}>
            <Text style={styles.currentValue}>{currentReading.value}</Text>
            <Text style={styles.currentUnit}>{currentReading.unit}</Text>
          </View>
        </Card>

        {/* ─── Daily Range ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Daily Range</Text>
        <Card>
          <View style={styles.rangeRow}>
            <RangeItem
              label="Low"
              value={dailyRange.low}
              icon={<TrendingDown size={14} color={Colors.info} />}
            />
            <View style={styles.rangeDivider} />
            <RangeItem
              label="Average"
              value={dailyRange.average}
              icon={<Droplets size={14} color={Colors.gold} />}
              highlighted
            />
            <View style={styles.rangeDivider} />
            <RangeItem
              label="High"
              value={dailyRange.high}
              icon={<TrendingUp size={14} color={Colors.warning} />}
            />
          </View>
          {/* Range bar */}
          <View style={styles.rangeBar}>
            <View style={styles.rangeBarTrack}>
              {/* Normal range zone */}
              <View style={styles.rangeBarNormal} />
              {/* Current value marker */}
              <View
                style={[
                  styles.rangeBarMarker,
                  {
                    left: `${((dailyRange.average - 60) / (160 - 60)) * 100}%`,
                  },
                ]}
              />
            </View>
            <View style={styles.rangeLabels}>
              <Text style={styles.rangeMinMax}>60</Text>
              <Text style={styles.rangeMinMax}>160</Text>
            </View>
          </View>
        </Card>

        {/* ─── Today's Readings ─────────────────────────────── */}
        <Text style={styles.sectionTitle}>Today's Readings</Text>
        <Card>
          {readings.map((reading, idx) => (
            <React.Fragment key={reading.id}>
              <View style={styles.readingRow}>
                <View style={styles.readingTime}>
                  <Text style={styles.readingTimeText}>{reading.time}</Text>
                </View>
                <View style={styles.readingInfo}>
                  <Text style={styles.readingLabel}>{reading.label}</Text>
                </View>
                <View style={styles.readingValueWrap}>
                  <Text
                    style={[
                      styles.readingValue,
                      reading.status === "optimal" && styles.readingOptimal,
                    ]}
                  >
                    {reading.value}
                  </Text>
                  <Text style={styles.readingUnit}>mg/dL</Text>
                </View>
              </View>
              {idx < readings.length - 1 && (
                <View style={styles.readingSeparator} />
              )}
            </React.Fragment>
          ))}
        </Card>

        {/* ─── 7-Day Average Trend ──────────────────────────── */}
        <Text style={styles.sectionTitle}>7-Day Average</Text>
        <Card>
          <TrendLine
            data={weeklyTrend}
            color="#F59E0B"
            height={100}
            unit=""
          />
        </Card>

        {/* ─── Time in Range ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Time in Range</Text>
        <Card style={styles.donutCard}>
          <DonutChart
            segments={timeInRange}
            centerLabel={`${inRangePercent}%`}
            centerSublabel="In Range"
            size={150}
            strokeWidth={14}
          />
        </Card>

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
// Subcomponents
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function RangeItem({
  label,
  value,
  icon,
  highlighted = false,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  highlighted?: boolean;
}) {
  return (
    <View style={styles.rangeItem}>
      {icon}
      <Text style={styles.rangeItemLabel}>{label}</Text>
      <Text
        style={[
          styles.rangeItemValue,
          highlighted && styles.rangeItemHighlighted,
        ]}
      >
        {value}
      </Text>
    </View>
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

  // Current reading
  currentCard: {
    paddingVertical: Spacing.lg,
  },
  currentHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  currentIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(245, 158, 11, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  currentLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  currentTimestamp: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  currentValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  currentValue: {
    color: Colors.white,
    fontSize: 56,
    fontWeight: "800",
  },
  currentUnit: {
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

  // Range
  rangeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  rangeItem: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  rangeItemLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  rangeItemValue: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
  },
  rangeItemHighlighted: {
    color: Colors.gold,
  },
  rangeDivider: {
    width: StyleSheet.hairlineWidth,
    height: 40,
    backgroundColor: Colors.border,
  },
  rangeBar: {
    marginTop: Spacing.sm,
  },
  rangeBarTrack: {
    height: 8,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
    overflow: "hidden",
    position: "relative",
  },
  rangeBarNormal: {
    position: "absolute",
    left: "10%",
    right: "20%",
    top: 0,
    bottom: 0,
    backgroundColor: "rgba(74, 157, 91, 0.25)",
    borderRadius: Radii.full,
  },
  rangeBarMarker: {
    position: "absolute",
    top: -2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.gold,
    transform: [{ translateX: -6 }],
  },
  rangeLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 4,
  },
  rangeMinMax: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
  },

  // Readings list
  readingRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  readingTime: {
    width: 70,
  },
  readingTimeText: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  readingInfo: {
    flex: 1,
  },
  readingLabel: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  readingValueWrap: {
    flexDirection: "row",
    alignItems: "baseline",
    gap: 2,
  },
  readingValue: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  readingOptimal: {
    color: Colors.success,
  },
  readingUnit: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  readingSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  // Donut card
  donutCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
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
