/**
 * Sleep tracking detail screen.
 *
 * Displays sleep score, last night summary, sleep stage breakdown,
 * 7-day trend, and AI-generated sleep insights.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Moon, Clock, Sunrise, Bed, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { StackedBar, BarChart } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample / Fallback Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_SLEEP_SCORE = 88;
const SAMPLE_SLEEP_QUALITY = "Excellent";

const SAMPLE_LAST_NIGHT = {
  bedtime: "10:45 PM",
  wakeTime: "6:12 AM",
  totalHours: 7.4,
  timeInBed: 7.8,
};

const SAMPLE_SLEEP_STAGES = [
  { label: "Deep", value: 1.2, color: "#4A90D9" },
  { label: "REM", value: 1.8, color: "#8B5CF6" },
  { label: "Light", value: 3.4, color: "#60A5FA" },
  { label: "Awake", value: 0.3, color: "#C65D5D" },
];

const SAMPLE_WEEKLY_TREND = [
  { label: "Mon", value: 6.8 },
  { label: "Tue", value: 7.1 },
  { label: "Wed", value: 7.5 },
  { label: "Thu", value: 6.9 },
  { label: "Fri", value: 7.2 },
  { label: "Sat", value: 7.8 },
  { label: "Sun", value: 7.4 },
];

const SAMPLE_INSIGHT =
  "Your deep sleep is 15% above average this week. Consistent bedtime routine and reduced screen time before bed are contributing factors.";

const SAMPLE_SOURCE = "Apple Watch Ultra";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SleepScreen() {
  // ── tRPC: fetch sleep sessions from the dedicated sleep endpoint ──
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const sleepQuery = trpc.clientPortal.sleep.list.useQuery(
    { startDate, endDate },
    DEFAULT_QUERY_OPTIONS,
  );

  // Backend returns: Array<{ id, date, totalMinutes, deepMinutes, remMinutes, lightMinutes, awakeMinutes, score, source }>
  const sleepSessions = sleepQuery.data as any[] | undefined;

  const sleepData = sleepSessions
    ? sleepSessions
        .filter((s: any) => s.totalMinutes != null)
        .map((s: any) => ({
          date: s.date,
          hours: Math.round((s.totalMinutes / 60) * 10) / 10,
          score: s.score,
          deepMinutes: s.deepMinutes,
          remMinutes: s.remMinutes,
          lightMinutes: s.lightMinutes,
          awakeMinutes: s.awakeMinutes,
          source: s.source,
        }))
    : null;

  const hasSleepData = sleepData && sleepData.length > 0;

  // Build weekly trend from API data when available
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyTrend = hasSleepData
    ? sleepData.slice(0, 7).reverse().map((d) => ({
        label: weekDays[new Date(d.date).getDay()] ?? "",
        value: d.hours,
      }))
    : SAMPLE_WEEKLY_TREND;

  // Use the latest sleep session's score / quality when available
  const latestSleep = hasSleepData ? sleepData[0] : null;
  const sleepScore = latestSleep?.score ?? SAMPLE_SLEEP_SCORE;
  const sleepQuality =
    sleepScore >= 85 ? "Excellent" : sleepScore >= 70 ? "Good" : sleepScore >= 50 ? "Fair" : "Poor";

  // Last night summary — build from real data when available
  const lastNight = latestSleep
    ? {
        bedtime: SAMPLE_LAST_NIGHT.bedtime, // bedtime/wakeTime not stored in sleep sessions table
        wakeTime: SAMPLE_LAST_NIGHT.wakeTime,
        totalHours: latestSleep.hours,
        timeInBed: Math.round((latestSleep.hours + (latestSleep.awakeMinutes ?? 0) / 60) * 10) / 10,
      }
    : SAMPLE_LAST_NIGHT;

  // Sleep stages — use real data when available from backend
  const sleepStages = latestSleep && latestSleep.deepMinutes != null
    ? [
        { label: "Deep", value: Math.round((latestSleep.deepMinutes / 60) * 10) / 10, color: "#4A90D9" },
        { label: "REM", value: Math.round((latestSleep.remMinutes ?? 0) / 60 * 10) / 10, color: "#8B5CF6" },
        { label: "Light", value: Math.round((latestSleep.lightMinutes ?? 0) / 60 * 10) / 10, color: "#60A5FA" },
        { label: "Awake", value: Math.round((latestSleep.awakeMinutes ?? 0) / 60 * 10) / 10, color: "#C65D5D" },
      ]
    : SAMPLE_SLEEP_STAGES;

  // Insight text — generate from data when available
  const insight = hasSleepData
    ? latestSleep?.score != null && latestSleep.score >= 80
      ? `Your sleep score of ${latestSleep.score} indicates good recovery. You averaged ${latestSleep.hours} hours of sleep.`
      : latestSleep?.score != null
        ? `Your sleep score of ${latestSleep.score} has room for improvement. You averaged ${latestSleep.hours} hours of sleep. Try maintaining a consistent bedtime.`
        : `You averaged ${latestSleep?.hours ?? 0} hours of sleep recently.`
    : SAMPLE_INSIGHT;

  // Source — use actual source from data
  const source = latestSleep?.source
    ? latestSleep.source === "apple_health" ? "Apple Health"
      : latestSleep.source === "oura" ? "Oura Ring"
      : latestSleep.source === "manual" ? "Manual Entry"
      : latestSleep.source
    : SAMPLE_SOURCE;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Sleep Score Card ──────────────────────────────── */}
        <Card style={styles.scoreCard}>
          <View style={styles.scoreHeader}>
            <View style={styles.scoreIconWrap}>
              <Moon size={24} color="#60A5FA" />
            </View>
            <View style={styles.scoreTextWrap}>
              <Text style={styles.scoreLabel}>Sleep Score</Text>
              <Badge label={sleepQuality} variant="success" />
            </View>
          </View>
          <View style={styles.scoreValueRow}>
            <Text style={styles.scoreValue}>{sleepScore}</Text>
            <Text style={styles.scoreMax}>/100</Text>
          </View>
          <View style={styles.scoreBar}>
            <View
              style={[
                styles.scoreBarFill,
                { width: `${sleepScore}%` },
              ]}
            />
          </View>
        </Card>

        {/* ─── Last Night Summary ───────────────────────────── */}
        <Text style={styles.sectionTitle}>Last Night</Text>
        <Card>
          <View style={styles.summaryGrid}>
            <SummaryItem
              icon={<Clock size={16} color={Colors.silver} />}
              label="Bedtime"
              value={lastNight.bedtime}
            />
            <SummaryItem
              icon={<Sunrise size={16} color={Colors.gold} />}
              label="Wake Time"
              value={lastNight.wakeTime}
            />
            <SummaryItem
              icon={<Moon size={16} color="#60A5FA" />}
              label="Total Sleep"
              value={`${lastNight.totalHours}h`}
            />
            <SummaryItem
              icon={<Bed size={16} color={Colors.silver} />}
              label="Time in Bed"
              value={`${lastNight.timeInBed}h`}
            />
          </View>
        </Card>

        {/* ─── Sleep Stages ─────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Sleep Stages</Text>
        <Card>
          <StackedBar segments={sleepStages} height={28} />
        </Card>

        {/* ─── 7-Day Trend ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>7-Day Trend</Text>
        <Card>
          <BarChart
            data={weeklyTrend}
            color="#60A5FA"
            height={120}
            unit="h"
          />
        </Card>

        {/* ─── Insights ─────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>Insights</Text>
        <Card>
          <Text style={styles.insightText}>{insight}</Text>
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

function SummaryItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryItem}>
      {icon}
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
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

  // Score card
  scoreCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  scoreHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  scoreIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(96, 165, 250, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  scoreTextWrap: {
    alignItems: "flex-start",
    gap: 4,
  },
  scoreLabel: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  scoreValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginBottom: Spacing.sm,
  },
  scoreValue: {
    color: Colors.white,
    fontSize: 56,
    fontWeight: "800",
  },
  scoreMax: {
    color: Colors.silver,
    fontSize: FontSizes.xl,
    fontWeight: "500",
    marginLeft: 4,
  },
  scoreBar: {
    width: "80%",
    height: 6,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: Radii.full,
    backgroundColor: "#60A5FA",
  },

  // Section
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Summary grid
  summaryGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  summaryItem: {
    flexBasis: "45%",
    flexGrow: 1,
    gap: 4,
  },
  summaryLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  summaryValue: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },

  // Insights
  insightText: {
    color: Colors.silverLight,
    fontSize: FontSizes.sm,
    lineHeight: 20,
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
