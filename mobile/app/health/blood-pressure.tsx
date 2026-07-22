/**
 * Blood Pressure detail screen.
 *
 * Displays latest reading, BP classification guide, recent readings
 * history, and 7-day systolic/diastolic trend — all from real backend
 * data. Shows an honest empty state when no readings exist yet.
 *
 * tRPC paths used (under `clientPortal`):
 *   - bloodPressure.getHistory  -> readings within a date range
 *   - bloodPressure.getLatest   -> most recent reading
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Activity, Heart, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorView } from "@/components/ui/ErrorView";
import type { StatusVariant } from "@/lib/types";
import { TrendLine } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Constants & Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const CLASSIFICATIONS = [
  { label: "Optimal", range: "<120/80", color: Colors.success },
  { label: "Normal", range: "120-129/80-84", color: Colors.info },
  { label: "Elevated", range: "130-139/85-89", color: Colors.warning },
  { label: "Stage 1", range: "140-159/90-99", color: "#F97316" },
  { label: "Stage 2", range: "160+/100+", color: Colors.danger },
];

function getClassification(sys: number): {
  label: string;
  color: string;
  variant: StatusVariant;
} {
  if (sys < 120) return { label: "Optimal", color: Colors.success, variant: "success" };
  if (sys < 130) return { label: "Normal", color: Colors.info, variant: "info" };
  if (sys < 140) return { label: "Elevated", color: Colors.warning, variant: "warning" };
  if (sys < 160) return { label: "Stage 1", color: "#F97316", variant: "danger" };
  return { label: "Stage 2", color: Colors.danger, variant: "danger" };
}

function isoDate(offsetDays = 0): string {
  return new Date(Date.now() + offsetDays * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0];
}

function formatSource(source?: string | null): string | null {
  if (!source) return null;
  if (source === "manual") return "Manual Entry";
  if (source === "apple_health") return "Apple Health";
  return source;
}

/** Derive a 7-point weekly trend from the history readings by day. */
function deriveWeeklyTrend(
  readings: { date: string; sys: number; dia: number }[],
  key: "sys" | "dia",
): { label: string; value: number }[] {
  const dayMap = new Map<string, number[]>();
  for (const r of readings) {
    const existing = dayMap.get(r.date) ?? [];
    existing.push(r[key]);
    dayMap.set(r.date, existing);
  }
  const entries = Array.from(dayMap.entries()).slice(0, 7).reverse();
  return entries.map(([date, values]) => ({
    label: new Date(date + "T12:00:00").toLocaleDateString([], { weekday: "short" }),
    value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BloodPressureScreen() {
  const router = useRouter();
  const today = isoDate();
  const monthAgo = isoDate(-30);

  // ─── tRPC Queries ───────────────────────────────────────
  const historyQuery = trpc.clientPortal.bloodPressure.getHistory.useQuery(
    { startDate: monthAgo, endDate: today },
    DEFAULT_QUERY_OPTIONS,
  );
  const latestQuery = trpc.clientPortal.bloodPressure.getLatest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // ─── Loading state ──────────────────────────────────────
  if (historyQuery.isLoading || latestQuery.isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.gold} />
        </View>
      </SafeAreaView>
    );
  }

  // ─── Error state ────────────────────────────────────────
  if (historyQuery.error) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <ErrorView
          title="Couldn't load blood pressure data"
          message="We couldn't reach the server. Please try again."
          onRetry={() => {
            historyQuery.refetch();
            latestQuery.refetch();
          }}
        />
      </SafeAreaView>
    );
  }

  // ─── Real data mapping (no fabricated fallbacks) ────────
  const rawHistory = (historyQuery.data ?? []) as any[];
  const latestRaw = (latestQuery.data ?? null) as any;

  // ─── Empty state — no readings at all ───────────────────
  if (rawHistory.length === 0 && !latestRaw) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.center}>
          <EmptyState
            icon="heart"
            title="No blood pressure readings yet"
            message="Connect a blood pressure monitor or log a manual reading to see your history here."
            actionLabel="Connect a device"
            onAction={() => router.push("/devices/connect" as any)}
          />
        </View>
      </SafeAreaView>
    );
  }

  const latestReading = latestRaw
    ? {
        systolic: latestRaw.systolic as number,
        diastolic: latestRaw.diastolic as number,
        pulse: (latestRaw.pulse ?? null) as number | null,
        timestamp: latestRaw.date
          ? new Date(latestRaw.date + "T12:00:00").toLocaleDateString([], {
              weekday: "short",
              month: "short",
              day: "numeric",
            })
          : "",
      }
    : null;

  const history = rawHistory.map((r, idx) => ({
    id: r.id || String(idx + 1),
    date: r.date as string,
    displayDate: new Date(r.date + "T12:00:00").toLocaleDateString(),
    sys: r.systolic as number,
    dia: r.diastolic as number,
    pulse: (r.pulse ?? null) as number | null,
  }));

  const trendInput = history.map((h) => ({ date: h.date, sys: h.sys, dia: h.dia }));
  const systolicTrend = deriveWeeklyTrend(trendInput, "sys");
  const diastolicTrend = deriveWeeklyTrend(trendInput, "dia");

  const source = formatSource(latestRaw?.source);
  const latestClass = latestReading ? getClassification(latestReading.systolic) : null;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Latest Reading ───────────────────────────────── */}
        {latestReading && latestClass && (
          <Card style={styles.latestCard}>
            <View style={styles.latestHeader}>
              <View style={styles.latestIconWrap}>
                <Activity size={24} color="#C65D5D" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.latestLabel}>Latest Reading</Text>
                <Text style={styles.latestTimestamp}>{latestReading.timestamp}</Text>
              </View>
              <Badge label={latestClass.label} variant={latestClass.variant} />
            </View>

            <View style={styles.latestValueRow}>
              <Text style={styles.latestValue}>
                {latestReading.systolic}/{latestReading.diastolic}
              </Text>
              <Text style={styles.latestUnit}>mmHg</Text>
            </View>

            {latestReading.pulse != null && (
              <View style={styles.pulseRow}>
                <Heart size={14} color={Colors.danger} />
                <Text style={styles.pulseLabel}>Pulse</Text>
                <Text style={styles.pulseValue}>{latestReading.pulse} bpm</Text>
              </View>
            )}
          </Card>
        )}

        {/* ─── Classification Guide ─────────────────────────── */}
        <Text style={styles.sectionTitle}>Classification Guide</Text>
        <Card>
          {CLASSIFICATIONS.map((cls, idx) => (
            <React.Fragment key={cls.label}>
              <View style={styles.classRow}>
                <View
                  style={[
                    styles.classDot,
                    { backgroundColor: cls.color },
                  ]}
                />
                <Text style={styles.classLabel}>{cls.label}</Text>
                <Text style={styles.classRange}>{cls.range}</Text>
                {latestClass && cls.label === latestClass.label && (
                  <View style={styles.classCurrentBadge}>
                    <Text style={styles.classCurrentText}>You</Text>
                  </View>
                )}
              </View>
              {idx < CLASSIFICATIONS.length - 1 && (
                <View style={styles.classSeparator} />
              )}
            </React.Fragment>
          ))}
        </Card>

        {/* ─── Recent Readings ──────────────────────────────── */}
        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent Readings</Text>
            <Card>
              {/* Header row */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderCell, { flex: 2 }]}>Date</Text>
                <Text style={styles.tableHeaderCell}>Sys/Dia</Text>
                <Text style={styles.tableHeaderCell}>Pulse</Text>
              </View>
              {history.map((reading, idx) => {
                const cls = getClassification(reading.sys);
                return (
                  <React.Fragment key={reading.id}>
                    <View style={styles.tableRow}>
                      <View style={{ flex: 2 }}>
                        <Text style={styles.tableDate}>{reading.displayDate}</Text>
                      </View>
                      <View style={styles.tableCellCenter}>
                        <Text style={styles.tableBP}>
                          {reading.sys}/{reading.dia}
                        </Text>
                        <View
                          style={[
                            styles.tableDot,
                            { backgroundColor: cls.color },
                          ]}
                        />
                      </View>
                      <Text style={styles.tablePulse}>
                        {reading.pulse != null ? reading.pulse : "—"}
                      </Text>
                    </View>
                    {idx < history.length - 1 && (
                      <View style={styles.classSeparator} />
                    )}
                  </React.Fragment>
                );
              })}
            </Card>
          </>
        )}

        {/* ─── 7-Day Trend ──────────────────────────────────── */}
        {systolicTrend.length > 1 && (
          <>
            <Text style={styles.sectionTitle}>7-Day Trend</Text>
            <Card>
              <View style={styles.trendLegend}>
                <View style={styles.trendLegendItem}>
                  <View
                    style={[
                      styles.trendLegendDot,
                      { backgroundColor: "#C65D5D" },
                    ]}
                  />
                  <Text style={styles.trendLegendLabel}>Systolic</Text>
                </View>
                <View style={styles.trendLegendItem}>
                  <View
                    style={[
                      styles.trendLegendDot,
                      { backgroundColor: Colors.info },
                    ]}
                  />
                  <Text style={styles.trendLegendLabel}>Diastolic</Text>
                </View>
              </View>
              <TrendLine
                data={systolicTrend}
                color="#C65D5D"
                secondaryData={diastolicTrend}
                secondaryColor={Colors.info}
                height={120}
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

  // Latest
  latestCard: {
    paddingVertical: Spacing.lg,
  },
  latestHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  latestIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(198, 93, 93, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },
  latestLabel: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  latestTimestamp: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  latestValueRow: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "center",
    marginTop: Spacing.md,
  },
  latestValue: {
    color: Colors.white,
    fontSize: 48,
    fontWeight: "800",
  },
  latestUnit: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "500",
    marginLeft: Spacing.sm,
  },
  pulseRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    marginTop: Spacing.sm,
  },
  pulseLabel: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  pulseValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },

  // Section
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Classification
  classRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  classDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  classLabel: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    flex: 1,
  },
  classRange: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },
  classCurrentBadge: {
    backgroundColor: Colors.goldDark,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: Radii.full,
    marginLeft: Spacing.sm,
  },
  classCurrentText: {
    color: Colors.dark,
    fontSize: 10,
    fontWeight: "700",
  },
  classSeparator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: Colors.border,
  },

  // Table
  tableHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    marginBottom: Spacing.xs,
  },
  tableHeaderCell: {
    flex: 1,
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  tableDate: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  tableCellCenter: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  tableBP: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },
  tableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tablePulse: {
    flex: 1,
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
    textAlign: "right",
  },

  // Trend legend
  trendLegend: {
    flexDirection: "row",
    gap: Spacing.md,
    marginBottom: Spacing.md,
  },
  trendLegendItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  trendLegendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  trendLegendLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
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
