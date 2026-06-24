/**
 * Health / Biometrics tab.
 *
 * Full-featured health screen displaying a date range selector, health score
 * summary, biometric categories grid, recent readings timeline, and an
 * AI-generated insight card.
 *
 * Currently uses inline sample data; will be wired to tRPC later.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Moon,
  Heart,
  Footprints,
  Activity,
  Droplets,
  Scale,
  Brain,
  Thermometer,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { BiometricCard } from "@/components/dashboard/BiometricCard";
import { SectionHeader } from "@/components/dashboard/SectionHeader";
import {
  DateRangeSelector,
  HealthScoreSummary,
  RecentReadingItem,
  InsightsCard,
} from "@/components/health";
import type { DateRange } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HEALTH_SCORE = {
  overall: 82,
  trend: "up" as const,
  trendDelta: 3,
  trendLabel: "Up 3 points from last week",
  subScores: [
    { label: "Cardio", value: 85 },
    { label: "Metabolic", value: 78 },
    { label: "Recovery", value: 84 },
  ],
};

const BIOMETRIC_CATEGORIES = [
  {
    id: "sleep",
    label: "Sleep",
    value: "7.4",
    unit: "hrs",
    status: "optimal" as const,
    lastUpdated: "2h ago",
    sparkData: [6.8, 7.1, 7.5, 6.9, 7.2, 7.8, 7.4],
    sparkColor: "#60A5FA",
    iconBgColor: "rgba(96, 165, 250, 0.12)",
    icon: <Moon size={14} color="#60A5FA" />,
  },
  {
    id: "heartRate",
    label: "Heart Rate",
    value: "62",
    unit: "bpm",
    status: "optimal" as const,
    lastUpdated: "5m ago",
    sparkData: [64, 61, 63, 60, 62, 59, 62],
    sparkColor: Colors.danger,
    iconBgColor: "rgba(198, 93, 93, 0.12)",
    icon: <Heart size={14} color={Colors.danger} />,
  },
  {
    id: "bloodPressure",
    label: "Blood Pressure",
    value: "118/76",
    unit: "mmHg",
    status: "normal" as const,
    lastUpdated: "1h ago",
    sparkData: [122, 120, 119, 121, 118, 117, 118],
    sparkColor: Colors.danger,
    iconBgColor: "rgba(198, 93, 93, 0.12)",
    icon: <Activity size={14} color={Colors.danger} />,
  },
  {
    id: "glucose",
    label: "Blood Glucose",
    value: "92",
    unit: "mg/dL",
    status: "normal" as const,
    lastUpdated: "3h ago",
    sparkData: [98, 95, 91, 94, 89, 93, 92],
    sparkColor: "#F59E0B",
    iconBgColor: "rgba(245, 158, 11, 0.12)",
    icon: <Droplets size={14} color="#F59E0B" />,
  },
  {
    id: "hrv",
    label: "HRV",
    value: "48",
    unit: "ms",
    status: "normal" as const,
    lastUpdated: "5m ago",
    sparkData: [42, 45, 44, 47, 43, 49, 48],
    sparkColor: "#A78BFA",
    iconBgColor: "rgba(167, 139, 250, 0.12)",
    icon: <Brain size={14} color="#A78BFA" />,
  },
  {
    id: "weight",
    label: "Body Weight",
    value: "178.4",
    unit: "lbs",
    status: "normal" as const,
    lastUpdated: "6h ago",
    sparkData: [181.2, 180.5, 180.1, 179.6, 179.2, 178.8, 178.4],
    sparkColor: Colors.gold,
    iconBgColor: "rgba(74, 144, 217, 0.12)",
    icon: <Scale size={14} color={Colors.gold} />,
  },
  {
    id: "steps",
    label: "Steps",
    value: "8,742",
    unit: "steps",
    status: "normal" as const,
    lastUpdated: "Live",
    sparkData: [6200, 9100, 7800, 10200, 8400, 11300, 8742],
    sparkColor: Colors.success,
    iconBgColor: "rgba(74, 157, 91, 0.12)",
    icon: <Footprints size={14} color={Colors.success} />,
  },
  {
    id: "temperature",
    label: "Body Temp",
    value: "98.2",
    unit: "°F",
    status: "normal" as const,
    lastUpdated: "4h ago",
    sparkData: [98.4, 98.1, 98.3, 98.0, 98.2, 98.1, 98.2],
    sparkColor: "#FB923C",
    iconBgColor: "rgba(251, 146, 60, 0.12)",
    icon: <Thermometer size={14} color="#FB923C" />,
  },
];

interface RecentReading {
  id: string;
  time: string;
  type: string;
  value: string;
  source: string;
  icon: React.ReactNode;
  iconBgColor: string;
}

interface RecentGroup {
  date: string;
  readings: RecentReading[];
}

const RECENT_READINGS: RecentGroup[] = [
  {
    date: "Today",
    readings: [
      {
        id: "r1",
        time: "8:42 AM",
        type: "Heart Rate",
        value: "62 bpm (resting)",
        source: "Apple Watch Ultra",
        icon: <Heart size={12} color={Colors.danger} />,
        iconBgColor: "rgba(198, 93, 93, 0.12)",
      },
      {
        id: "r2",
        time: "7:15 AM",
        type: "Blood Pressure",
        value: "118/76 mmHg",
        source: "Withings BPM Connect",
        icon: <Activity size={12} color={Colors.danger} />,
        iconBgColor: "rgba(198, 93, 93, 0.12)",
      },
      {
        id: "r3",
        time: "6:50 AM",
        type: "Sleep",
        value: "7.4 hrs -- 88% quality",
        source: "Oura Ring Gen 3",
        icon: <Moon size={12} color="#60A5FA" />,
        iconBgColor: "rgba(96, 165, 250, 0.12)",
      },
      {
        id: "r4",
        time: "6:50 AM",
        type: "HRV",
        value: "48 ms",
        source: "Oura Ring Gen 3",
        icon: <Brain size={12} color="#A78BFA" />,
        iconBgColor: "rgba(167, 139, 250, 0.12)",
      },
    ],
  },
  {
    date: "Yesterday",
    readings: [
      {
        id: "r5",
        time: "9:30 PM",
        type: "Blood Glucose",
        value: "105 mg/dL (post-meal)",
        source: "Dexcom G7",
        icon: <Droplets size={12} color="#F59E0B" />,
        iconBgColor: "rgba(245, 158, 11, 0.12)",
      },
      {
        id: "r6",
        time: "6:00 PM",
        type: "Body Weight",
        value: "178.8 lbs",
        source: "Withings Body+",
        icon: <Scale size={12} color={Colors.gold} />,
        iconBgColor: "rgba(74, 144, 217, 0.12)",
      },
      {
        id: "r7",
        time: "11:59 PM",
        type: "Steps",
        value: "11,302 steps",
        source: "Apple Watch Ultra",
        icon: <Footprints size={12} color={Colors.success} />,
        iconBgColor: "rgba(74, 157, 91, 0.12)",
      },
    ],
  },
];

const AI_INSIGHT =
  "Your sleep quality has improved 12% this week. HRV readings suggest good recovery. Consider maintaining your current sleep schedule and evening magnesium supplementation for continued improvement.";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Health Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function HealthScreen() {
  const router = useRouter();
  const [dateRange, setDateRange] = useState<DateRange>("week");
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate data refresh (will be replaced with real tRPC refetch later)
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const biometricRoutes: Record<string, string> = {
    sleep: "/health/sleep",
    heartRate: "/health/body",
    bloodPressure: "/health/blood-pressure",
    glucose: "/health/glucose",
    hrv: "/health/body",
    weight: "/health/body",
    steps: "/health/goals",
    temperature: "/health/body",
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={Colors.gold}
            colors={[Colors.gold]}
          />
        }
      >
        {/* ─── Header ──────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Health</Text>
          <Text style={styles.headerSubtitle}>Biometrics Overview</Text>
        </View>

        {/* ─── 1. Date Range Selector ──────────────────────── */}
        <DateRangeSelector selected={dateRange} onChange={setDateRange} />

        {/* ─── 2. Health Score Summary ─────────────────────── */}
        <HealthScoreSummary
          score={HEALTH_SCORE.overall}
          trend={HEALTH_SCORE.trend}
          trendDelta={HEALTH_SCORE.trendDelta}
          trendLabel={HEALTH_SCORE.trendLabel}
          subScores={HEALTH_SCORE.subScores}
        />

        {/* ─── 3. Biometric Categories Grid ────────────────── */}
        <SectionHeader title="Biometrics" />
        <View style={styles.biometricsGrid}>
          {chunkPairs(BIOMETRIC_CATEGORIES).map((pair, rowIdx) => (
            <View key={rowIdx} style={styles.biometricsRow}>
              {pair.map((item) => (
                <BiometricCard
                  key={item.id}
                  icon={item.icon}
                  label={item.label}
                  value={item.value}
                  unit={item.unit}
                  status={item.status}
                  sparkData={item.sparkData}
                  sparkColor={item.sparkColor}
                  iconBgColor={item.iconBgColor}
                  onPress={() => router.push(biometricRoutes[item.id] as any)}
                />
              ))}
            </View>
          ))}
        </View>

        {/* ─── Last Updated Timestamps ─────────────────────── */}
        <View style={styles.timestampsCard}>
          {BIOMETRIC_CATEGORIES.map((item) => (
            <View key={item.id} style={styles.timestampRow}>
              <Text style={styles.timestampLabel}>{item.label}</Text>
              <Text style={styles.timestampValue}>{item.lastUpdated}</Text>
            </View>
          ))}
        </View>

        {/* ─── 4. Recent Readings ──────────────────────────── */}
        <SectionHeader
          title="Recent Readings"
          actionLabel="View all"
          onAction={() => router.push("/health/goals")}
        />
        {RECENT_READINGS.map((group) => (
          <View key={group.date} style={styles.readingGroup}>
            <Text style={styles.dateLabel}>{group.date}</Text>
            <Card style={styles.readingsCard}>
              {group.readings.map((reading, idx) => (
                <React.Fragment key={reading.id}>
                  <RecentReadingItem
                    time={reading.time}
                    type={reading.type}
                    value={reading.value}
                    source={reading.source}
                    icon={reading.icon}
                    iconBgColor={reading.iconBgColor}
                  />
                  {idx < group.readings.length - 1 && (
                    <View style={styles.readingSeparator} />
                  )}
                </React.Fragment>
              ))}
            </Card>
          </View>
        ))}

        {/* ─── 5. AI Insight ───────────────────────────────── */}
        <SectionHeader title="Insights" />
        <InsightsCard insight={AI_INSIGHT} onAction={() => router.push("/insights")} />

        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Split an array into pairs for a 2-column grid layout. */
function chunkPairs<T>(arr: T[]): T[][] {
  const result: T[][] = [];
  for (let i = 0; i < arr.length; i += 2) {
    result.push(arr.slice(i, i + 2));
  }
  return result;
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

  // Header
  headerRow: {
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: "800",
  },
  headerSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },

  // Biometrics grid
  biometricsGrid: {
    gap: Spacing.sm,
  },
  biometricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  // Timestamps card
  timestampsCard: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginTop: Spacing.sm,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  timestampRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexBasis: "48%",
    paddingVertical: 3,
    paddingHorizontal: 6,
  },
  timestampLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
  },
  timestampValue: {
    color: Colors.goldLight,
    fontSize: 10,
    fontWeight: "600",
  },

  // Recent Readings
  readingGroup: {
    marginBottom: Spacing.sm,
  },
  dateLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: Spacing.sm,
  },
  readingsCard: {
    paddingBottom: 0,
  },
  readingSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
    marginLeft: 44,
    marginBottom: Spacing.sm,
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
