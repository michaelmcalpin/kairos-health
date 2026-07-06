/**
 * Health / Biometrics tab.
 *
 * Full-featured health screen displaying a date range selector, health score
 * summary, biometric categories grid, recent readings section, and an
 * AI-generated insight card.
 *
 * Uses tRPC hooks (useBiometricCategories, useHealthScore, useHealthAnalysis)
 * for live data with automatic fallback when the API is unreachable.
 * Recent readings show an empty state until a dedicated endpoint is available.
 * AI insights are powered by the insights.getAnalysis endpoint with a
 * placeholder fallback.
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
  InsightsCard,
} from "@/components/health";
import type { DateRange } from "@/components/health";
import { useBiometricCategories, useHealthScore } from "@/hooks/useHealthData";
import { useHealthAnalysis } from "@/hooks/useInsights";

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

// No hardcoded readings — the section shows an empty state until
// a dedicated recent-readings tRPC endpoint is available.

// AI insight — powered by the insights.getAnalysis hook when connected,
// otherwise shows a placeholder.

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

  const {
    analysis: overallAnalysis,
    isLoading: insightLoading,
    refetch: refetchInsight,
  } = useHealthAnalysis("overall", "7d");

  const aiInsightText = overallAnalysis?.summary ?? null;

  const isLoading = categoriesLoading || scoreLoading;

  // ── Pull-to-refresh ─────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchCategories(), refetchScore(), refetchInsight()]);
    setRefreshing(false);
  }, [refetchCategories, refetchScore, refetchInsight]);

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
        <Card style={styles.emptyReadingsCard}>
          <Text style={styles.emptyReadingsText}>
            Connect a device or log data to see your readings here
          </Text>
        </Card>

        {/* ─── 5. AI Insight ───────────────────────────────── */}
        <SectionHeader title="Insights" />
        <InsightsCard
          insight={aiInsightText ?? "Log more health data to unlock AI insights"}
          onAction={() => router.push("/insights")}
        />

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

  // Recent Readings (kept for future use with real data)
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

  // Empty readings state
  emptyReadingsCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyReadingsText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
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
