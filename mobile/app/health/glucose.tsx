/**
 * Glucose monitoring detail screen.
 *
 * Displays latest reading, daily range, today's readings, 7-day average
 * trend, and time-in-range — all from real backend data. Shows an honest
 * empty state when no glucose data has been recorded yet.
 *
 * tRPC paths used (under `clientPortal`):
 *   - glucose.list           -> readings within a date range
 *   - glucose.stats          -> min / max / avg / time-in-range
 *   - glucose.dailyAverages  -> daily averages for the trend chart
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Droplets, TrendingDown, TrendingUp, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import type { StatusVariant } from "@/lib/types";
import { TrendLine, DonutChart } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function isoDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

function glucoseStatus(value: number): { label: string; variant: StatusVariant } {
  if (value < 70) return { label: "Low", variant: "warning" };
  if (value <= 140) return { label: "Normal", variant: "success" };
  if (value <= 180) return { label: "High", variant: "warning" };
  return { label: "Very High", variant: "danger" };
}

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  if (source === "apple_health") return "Apple Health";
  if (source === "manual") return "Manual Entry";
  if (source === "oura") return "Oura Ring";
  return source;
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GlucoseScreen() {
  const router = useRouter();
  const today = isoDate();
  const weekAgo = isoDate(-6);

  // ─── tRPC Queries ───────────────────────────────────────
  const glucoseListQuery = trpc.clientPortal.glucose.list.useQuery(
    { startDate: today, endDate: today },
    DEFAULT_QUERY_OPTIONS,
  );
  const glucoseStatsQuery = trpc.clientPortal.glucose.stats.useQuery(
    { startDate: today, endDate: today },
    DEFAULT_QUERY_OPTIONS,
  );
  const dailyAvgQuery = trpc.clientPortal.glucose.dailyAverages.useQuery(
    { startDate: weekAgo, endDate: today },
    DEFAULT_QUERY_OPTIONS,
  );

  // ─── Loading state ──────────────────────────────────────
  if (glucoseListQuery.isLoading || dailyAvgQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ────────────────────────────────────────
  if (glucoseListQuery.error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load glucose data"
          message="We couldn't reach the server. Please try again."
          onRetry={() => {
            glucoseListQuery.refetch();
            glucoseStatsQuery.refetch();
            dailyAvgQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  // ─── Real data mapping (no fabricated fallbacks) ────────
  const todaysReadings = ((glucoseListQuery.data ?? []) as any[]).map((r, idx) => ({
    id: r.id || String(idx + 1),
    time: new Date(r.timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    }),
    label:
      typeof r.trendDirection === "string" && r.trendDirection.length > 0
        ? r.trendDirection.replace(/_/g, " ").replace(/\b\w/g, (c: string) => c.toUpperCase())
        : "Reading",
    value: r.valueMgdl as number,
    source: r.source as string | null,
  }));

  const dailyAverages = (dailyAvgQuery.data ?? []) as any[];

  // ─── Empty state — no glucose data at all ───────────────
  if (todaysReadings.length === 0 && dailyAverages.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon="activity"
            title="No glucose data yet"
            message="Connect a CGM or log a manual reading to see your glucose trends here."
            actionLabel="Connect a device"
            onAction={() => router.push("/devices/connect" as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const latestReading = todaysReadings[0] ?? null; // list is ordered DESC
  const latestStatus = latestReading ? glucoseStatus(latestReading.value) : null;

  const stats = glucoseStatsQuery.data as any;
  const dailyRange =
    stats && stats.count > 0
      ? { low: stats.min, high: stats.max, average: stats.avg }
      : null;

  const weeklyTrend = dailyAverages.slice(-7).map((d) => ({
    label: new Date(d.date + "T12:00:00").toLocaleDateString([], { weekday: "short" }),
    value: Math.round(d.avg ?? 0),
  }));

  const inRangePercent: number | null =
    stats?.timeInRange != null ? Number(stats.timeInRange) : null;
  const timeInRange =
    inRangePercent != null
      ? [
          { label: "In Range (70-140)", value: inRangePercent, color: Colors.success },
          { label: "Out of Range", value: Math.max(0, Math.round((100 - inRangePercent) * 10) / 10), color: Colors.warning },
        ]
      : null;

  const source = formatSource(latestReading?.source);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Current Reading Card ─────────────────────────── */}
        {latestReading && latestStatus ? (
          <Card style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <View style={styles.currentIconWrap}>
                <Droplets size={24} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.currentLabel}>Current Glucose</Text>
                <Text style={styles.currentTimestamp}>
                  {latestReading.time}
                </Text>
              </View>
              <Badge label={latestStatus.label} variant={latestStatus.variant} />
            </View>
            <View style={styles.currentValueRow}>
              <Text style={styles.currentValue}>{latestReading.value}</Text>
              <Text style={styles.currentUnit}>mg/dL</Text>
            </View>
          </Card>
        ) : (
          <Card style={styles.currentCard}>
            <View style={styles.currentHeader}>
              <View style={styles.currentIconWrap}>
                <Droplets size={24} color="#F59E0B" />
              </View>
              <View>
                <Text style={styles.currentLabel}>Current Glucose</Text>
                <Text style={styles.currentTimestamp}>
                  No readings recorded today
                </Text>
              </View>
            </View>
          </Card>
        )}

        {/* ─── Daily Range ──────────────────────────────────── */}
        {dailyRange && (
          <>
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
                        left: `${Math.min(Math.max(((dailyRange.average - 60) / (160 - 60)) * 100, 0), 100)}%`,
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
          </>
        )}

        {/* ─── Today's Readings ─────────────────────────────── */}
        {todaysReadings.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Today's Readings</Text>
            <Card>
              {todaysReadings.map((reading, idx) => {
                const status = glucoseStatus(reading.value);
                return (
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
                            status.variant === "success" && styles.readingOptimal,
                            status.variant === "danger" && styles.readingDanger,
                          ]}
                        >
                          {reading.value}
                        </Text>
                        <Text style={styles.readingUnit}>mg/dL</Text>
                      </View>
                    </View>
                    {idx < todaysReadings.length - 1 && (
                      <View style={styles.readingSeparator} />
                    )}
                  </React.Fragment>
                );
              })}
            </Card>
          </>
        )}

        {/* ─── 7-Day Average Trend ──────────────────────────── */}
        {weeklyTrend.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>7-Day Average</Text>
            <Card>
              <TrendLine
                data={weeklyTrend}
                color="#F59E0B"
                height={100}
                unit=""
              />
            </Card>
          </>
        )}

        {/* ─── Time in Range ────────────────────────────────── */}
        {timeInRange && inRangePercent != null && (
          <>
            <Text style={styles.sectionTitle}>Time in Range (Today)</Text>
            <Card style={styles.donutCard}>
              <DonutChart
                segments={timeInRange}
                centerLabel={`${inRangePercent}%`}
                centerSublabel="In Range"
                size={150}
                strokeWidth={14}
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
  center: {
    flex: 1,
    justifyContent: "center",
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
  readingDanger: {
    color: Colors.danger,
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
