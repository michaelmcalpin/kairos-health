/**
 * Health / Biometrics tab.
 *
 * Full-featured health screen displaying a date range selector, health score
 * summary, biometric categories grid, recent readings timeline, and an
 * AI-generated insight card.
 *
 * Uses tRPC hooks (useBiometricCategories, useHealthScore) for live data with
 * automatic sample-data fallback when the API is unreachable.
 */

import React, { useState, useCallback } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
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
import { useBiometricCategories, useHealthScore } from "@/hooks/useHealthData";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Icon map — categories from the hook carry no JSX; we resolve
// the icon here so the data layer stays serialisable.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  sleep: <Moon size={14} color="#60A5FA" />,
  heartRate: <Heart size={14} color={Colors.danger} />,
  bloodPressure: <Activity size={14} color={Colors.danger} />,
  glucose: <Droplets size={14} color="#F59E0B" />,
  hrv: <Brain size={14} color="#A78BFA" />,
  weight: <Scale size={14} color={Colors.gold} />,
  steps: <Footprints size={14} color={Colors.success} />,
  temperature: <Thermometer size={14} color="#FB923C" />,
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Recent readings — still inline (no dedicated tRPC endpoint yet)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

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

  // ── tRPC data hooks ─────────────────────────────────────────
  const {
    categories,
    isLoading: categoriesLoading,
    refetch: refetchCategories,
  } = useBiometricCategories();

  const {
    healthScoreDetail,
    isLoading: scoreLoading,
    refetch: refetchScore,
  } = useHealthScore();

  const isLoading = categoriesLoading || scoreLoading;

  // ── Pull-to-refresh ─────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchScore()]);
    setRefreshing(false);
  }, [refetchCategories, refetchScore]);

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

  // ── Initial loading state ───────────────────────────────────
  if (isLoading && categories.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.gold} />
          <Text style={styles.loadingText}>Loading health data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
          score={healthScoreDetail.overall}
          trend={healthScoreDetail.trend}
          trendDelta={healthScoreDetail.trendDelta}
          trendLabel={healthScoreDetail.trendLabel}
          subScores={healthScoreDetail.subScores}
        />

        {/* ─── 3. Biometric Categories Grid ────────────────── */}
        <SectionHeader title="Biometrics" />
        <View style={styles.biometricsGrid}>
          {chunkPairs(categories).map((pair, rowIdx) => (
            <View key={rowIdx} style={styles.biometricsRow}>
              {pair.map((item) => (
                <BiometricCard
                  key={item.id}
                  icon={CATEGORY_ICONS[item.id]}
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
          {categories.map((item) => (
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

  // Loading state
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: Spacing.md,
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
