/**
 * Sleep tracking detail screen.
 *
 * Displays sleep score, last night summary, sleep stage breakdown, and
 * 7-day trend — all from real backend data. Shows an honest empty state
 * when no sleep sessions have been recorded yet.
 *
 * tRPC paths used (under `clientPortal`):
 *   - sleep.list -> sleep sessions within a date range
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Moon, Bed, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import type { StatusVariant } from "@/lib/types";
import { StackedBar, BarChart } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  if (source === "apple_health") return "Apple Health";
  if (source === "oura") return "Oura Ring";
  if (source === "manual") return "Manual Entry";
  return source;
}

function qualityForScore(score: number): { label: string; variant: StatusVariant } {
  if (score >= 85) return { label: "Excellent", variant: "success" };
  if (score >= 70) return { label: "Good", variant: "success" };
  if (score >= 50) return { label: "Fair", variant: "warning" };
  return { label: "Poor", variant: "danger" };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function SleepScreen() {
  const router = useRouter();

  // ── tRPC: fetch sleep sessions from the dedicated sleep endpoint ──
  const endDate = new Date().toISOString().split("T")[0];
  const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];

  const sleepQuery = trpc.clientPortal.sleep.list.useQuery(
    { startDate, endDate },
    DEFAULT_QUERY_OPTIONS,
  );

  // ── Loading state ────────────────────────────────────────
  if (sleepQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ── Error state ──────────────────────────────────────────
  if (sleepQuery.error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load sleep data"
          message="We couldn't reach the server. Please try again."
          onRetry={() => sleepQuery.refetch()}
        />
      </SafeAreaView>
    );
  }

  // Backend returns: Array<{ id, date, totalMinutes, deepMinutes, remMinutes, lightMinutes, awakeMinutes, score, source }>
  const sleepData = ((sleepQuery.data ?? []) as any[])
    .filter((s: any) => s.totalMinutes != null)
    .map((s: any) => ({
      date: s.date as string,
      hours: Math.round((s.totalMinutes / 60) * 10) / 10,
      score: (s.score ?? null) as number | null,
      deepMinutes: (s.deepMinutes ?? null) as number | null,
      remMinutes: (s.remMinutes ?? null) as number | null,
      lightMinutes: (s.lightMinutes ?? null) as number | null,
      awakeMinutes: (s.awakeMinutes ?? null) as number | null,
      source: (s.source ?? null) as string | null,
    }));

  // ── Empty state — no sleep data at all ───────────────────
  if (sleepData.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon={<Moon size={40} color={Colors.gold} strokeWidth={1.5} />}
            title="No sleep data yet"
            message="Connect a wearable or sync Apple Health to see your sleep trends here."
            actionLabel="Connect a device"
            onAction={() => router.push("/devices/connect" as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  // ── Real data mapping (no fabricated fallbacks) ──────────
  const weekDays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const weeklyTrend = sleepData.slice(0, 7).reverse().map((d) => ({
    label: weekDays[new Date(d.date + "T12:00:00").getDay()] ?? "",
    value: d.hours,
  }));

  const latestSleep = sleepData[0];
  const quality = latestSleep.score != null ? qualityForScore(latestSleep.score) : null;

  const timeInBed =
    latestSleep.awakeMinutes != null
      ? Math.round((latestSleep.hours + latestSleep.awakeMinutes / 60) * 10) / 10
      : null;

  const sleepStages =
    latestSleep.deepMinutes != null
      ? [
          { label: "Deep", value: Math.round((latestSleep.deepMinutes / 60) * 10) / 10, color: "#4A90D9" },
          { label: "REM", value: Math.round(((latestSleep.remMinutes ?? 0) / 60) * 10) / 10, color: "#8B5CF6" },
          { label: "Light", value: Math.round(((latestSleep.lightMinutes ?? 0) / 60) * 10) / 10, color: "#60A5FA" },
          { label: "Awake", value: Math.round(((latestSleep.awakeMinutes ?? 0) / 60) * 10) / 10, color: "#C65D5D" },
        ]
      : null;

  const source = formatSource(latestSleep.source);

  const lastNightDate = new Date(latestSleep.date + "T12:00:00").toLocaleDateString([], {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Sleep Score Card ──────────────────────────────── */}
        {latestSleep.score != null && quality ? (
          <Card style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <View style={styles.scoreIconWrap}>
                <Moon size={24} color="#60A5FA" />
              </View>
              <View style={styles.scoreTextWrap}>
                <Text style={styles.scoreLabel}>Sleep Score</Text>
                <Badge label={quality.label} variant={quality.variant} />
              </View>
            </View>
            <View style={styles.scoreValueRow}>
              <Text style={styles.scoreValue}>{latestSleep.score}</Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>
            <View style={styles.scoreBar}>
              <View
                style={[
                  styles.scoreBarFill,
                  { width: `${Math.min(latestSleep.score, 100)}%` },
                ]}
              />
            </View>
          </Card>
        ) : (
          <Card style={styles.scoreCard}>
            <View style={styles.scoreHeader}>
              <View style={styles.scoreIconWrap}>
                <Moon size={24} color="#60A5FA" />
              </View>
              <View style={styles.scoreTextWrap}>
                <Text style={styles.scoreLabel}>Sleep</Text>
                <Text style={styles.scoreSubLabel}>
                  No sleep score available from your data source
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ─── Last Night Summary ───────────────────────────── */}
        <Text style={styles.sectionTitle}>Most Recent Night</Text>
        <Card>
          <Text style={styles.nightDate}>{lastNightDate}</Text>
          <View style={styles.summaryGrid}>
            <SummaryItem
              icon={<Moon size={16} color="#60A5FA" />}
              label="Total Sleep"
              value={`${latestSleep.hours}h`}
            />
            {timeInBed != null && (
              <SummaryItem
                icon={<Bed size={16} color={Colors.silver} />}
                label="Time in Bed"
                value={`${timeInBed}h`}
              />
            )}
          </View>
        </Card>

        {/* ─── Sleep Stages ─────────────────────────────────── */}
        {sleepStages && (
          <>
            <Text style={styles.sectionTitle}>Sleep Stages</Text>
            <Card>
              <StackedBar segments={sleepStages} height={28} />
            </Card>
          </>
        )}

        {/* ─── 7-Day Trend ──────────────────────────────────── */}
        {weeklyTrend.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>7-Day Trend</Text>
            <Card>
              <BarChart
                data={weeklyTrend}
                color="#60A5FA"
                height={120}
                unit="h"
              />
            </Card>
          </>
        )}

        {/* ─── Source ───────────────────────────────────────── */}
        {source && (
          <View style={styles.sourceRow}>
            <Watch size={14} color={Colors.silver} />
            <Text style={styles.sourceText}>Source: {source}</Text>
          </View>
        )}

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
  center: {
    flex: 1,
    justifyContent: "center",
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
    flexShrink: 1,
  },
  scoreLabel: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  scoreSubLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
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

  // Night summary
  nightDate: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
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
