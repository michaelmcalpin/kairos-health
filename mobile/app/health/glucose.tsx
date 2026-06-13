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
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendLine, DonutChart } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CURRENT_READING = {
  value: 92,
  unit: "mg/dL",
  status: "Normal" as const,
  timestamp: "8:45 AM",
  trend: "stable" as const,
};

const DAILY_RANGE = {
  low: 78,
  high: 124,
  average: 95,
};

const KEY_READINGS = [
  { id: "1", time: "6:30 AM", label: "Fasting", value: 82, status: "optimal" },
  { id: "2", time: "8:15 AM", label: "Post-breakfast", value: 118, status: "normal" },
  { id: "3", time: "11:45 AM", label: "Pre-lunch", value: 89, status: "optimal" },
  { id: "4", time: "1:30 PM", label: "Post-lunch", value: 124, status: "normal" },
  { id: "5", time: "5:45 PM", label: "Pre-dinner", value: 91, status: "optimal" },
  { id: "6", time: "8:00 PM", label: "Post-dinner", value: 105, status: "normal" },
];

const WEEKLY_TREND = [
  { label: "Mon", value: 98 },
  { label: "Tue", value: 95 },
  { label: "Wed", value: 91 },
  { label: "Thu", value: 94 },
  { label: "Fri", value: 89 },
  { label: "Sat", value: 93 },
  { label: "Sun", value: 92 },
];

const TIME_IN_RANGE = [
  { label: "In Range (70-140)", value: 85, color: Colors.success },
  { label: "Below Range", value: 10, color: Colors.info },
  { label: "Above Range", value: 5, color: Colors.warning },
];

const SOURCE = "Dexcom G7";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GlucoseScreen() {
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
                {CURRENT_READING.timestamp}
              </Text>
            </View>
            <Badge label={CURRENT_READING.status} variant="success" />
          </View>
          <View style={styles.currentValueRow}>
            <Text style={styles.currentValue}>{CURRENT_READING.value}</Text>
            <Text style={styles.currentUnit}>{CURRENT_READING.unit}</Text>
          </View>
        </Card>

        {/* ─── Daily Range ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Daily Range</Text>
        <Card>
          <View style={styles.rangeRow}>
            <RangeItem
              label="Low"
              value={DAILY_RANGE.low}
              icon={<TrendingDown size={14} color={Colors.info} />}
            />
            <View style={styles.rangeDivider} />
            <RangeItem
              label="Average"
              value={DAILY_RANGE.average}
              icon={<Droplets size={14} color={Colors.gold} />}
              highlighted
            />
            <View style={styles.rangeDivider} />
            <RangeItem
              label="High"
              value={DAILY_RANGE.high}
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
                    left: `${((DAILY_RANGE.average - 60) / (160 - 60)) * 100}%`,
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
          {KEY_READINGS.map((reading, idx) => (
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
              {idx < KEY_READINGS.length - 1 && (
                <View style={styles.readingSeparator} />
              )}
            </React.Fragment>
          ))}
        </Card>

        {/* ─── 7-Day Average Trend ──────────────────────────── */}
        <Text style={styles.sectionTitle}>7-Day Average</Text>
        <Card>
          <TrendLine
            data={WEEKLY_TREND}
            color="#F59E0B"
            height={100}
            unit=""
          />
        </Card>

        {/* ─── Time in Range ────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Time in Range</Text>
        <Card style={styles.donutCard}>
          <DonutChart
            segments={TIME_IN_RANGE}
            centerLabel="85%"
            centerSublabel="In Range"
            size={150}
            strokeWidth={14}
          />
        </Card>

        {/* ─── Source ───────────────────────────────────────── */}
        <View style={styles.sourceRow}>
          <Watch size={14} color={Colors.silver} />
          <Text style={styles.sourceText}>Source: {SOURCE}</Text>
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
    backgroundColor: "rgba(34, 197, 94, 0.25)",
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
