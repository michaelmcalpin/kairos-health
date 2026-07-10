/**
 * Blood Pressure detail screen.
 *
 * Displays latest reading, BP classification guide, recent readings
 * history, and 7-day systolic/diastolic trend.
 */

import React from "react";
import { View, Text, ScrollView, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Activity, Heart, Watch } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TrendLine } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_LATEST = {
  systolic: 118,
  diastolic: 76,
  pulse: 62,
  timestamp: "Today, 7:15 AM",
};

const CLASSIFICATIONS = [
  { label: "Optimal", range: "<120/80", color: Colors.success },
  { label: "Normal", range: "120-129/80-84", color: Colors.info },
  { label: "Elevated", range: "130-139/85-89", color: Colors.warning },
  { label: "Stage 1", range: "140-159/90-99", color: "#F97316" },
  { label: "Stage 2", range: "160+/100+", color: Colors.danger },
];

const SAMPLE_HISTORY = [
  { id: "1", date: "Today", time: "7:15 AM", sys: 118, dia: 76, pulse: 62 },
  { id: "2", date: "Today", time: "9:30 PM", sys: 122, dia: 78, pulse: 68 },
  { id: "3", date: "Yesterday", time: "7:00 AM", sys: 120, dia: 77, pulse: 64 },
  { id: "4", date: "Yesterday", time: "9:15 PM", sys: 119, dia: 75, pulse: 66 },
  { id: "5", date: "2 days ago", time: "7:20 AM", sys: 121, dia: 79, pulse: 63 },
  { id: "6", date: "2 days ago", time: "9:00 PM", sys: 117, dia: 74, pulse: 65 },
  { id: "7", date: "3 days ago", time: "7:10 AM", sys: 122, dia: 80, pulse: 61 },
  { id: "8", date: "3 days ago", time: "9:45 PM", sys: 120, dia: 78, pulse: 64 },
  { id: "9", date: "4 days ago", time: "7:30 AM", sys: 119, dia: 76, pulse: 62 },
  { id: "10", date: "4 days ago", time: "9:30 PM", sys: 121, dia: 77, pulse: 67 },
  { id: "11", date: "5 days ago", time: "7:05 AM", sys: 123, dia: 81, pulse: 63 },
  { id: "12", date: "5 days ago", time: "9:20 PM", sys: 118, dia: 75, pulse: 66 },
  { id: "13", date: "6 days ago", time: "7:25 AM", sys: 122, dia: 79, pulse: 64 },
  { id: "14", date: "6 days ago", time: "9:10 PM", sys: 120, dia: 76, pulse: 65 },
];

const SAMPLE_SYSTOLIC_TREND = [
  { label: "Mon", value: 122 },
  { label: "Tue", value: 120 },
  { label: "Wed", value: 119 },
  { label: "Thu", value: 121 },
  { label: "Fri", value: 118 },
  { label: "Sat", value: 117 },
  { label: "Sun", value: 118 },
];

const SAMPLE_DIASTOLIC_TREND = [
  { label: "Mon", value: 80 },
  { label: "Tue", value: 78 },
  { label: "Wed", value: 76 },
  { label: "Thu", value: 78 },
  { label: "Fri", value: 75 },
  { label: "Sat", value: 74 },
  { label: "Sun", value: 76 },
];

const SAMPLE_SOURCE = "Withings BPM Connect";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getClassification(sys: number): { label: string; color: string } {
  if (sys < 120) return { label: "Optimal", color: Colors.success };
  if (sys < 130) return { label: "Normal", color: Colors.info };
  if (sys < 140) return { label: "Elevated", color: Colors.warning };
  if (sys < 160) return { label: "Stage 1", color: "#F97316" };
  return { label: "Stage 2", color: Colors.danger };
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
  const entries = Array.from(dayMap.entries()).slice(0, 7);
  return entries.map(([date, values]) => ({
    label: date.length > 5 ? date.slice(0, 5) : date,
    value: Math.round(values.reduce((a, b) => a + b, 0) / values.length),
  }));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function BloodPressureScreen() {
  // ─── tRPC Queries ───────────────────────────────────────
  const historyQuery = trpc.clientPortal.bloodPressure.getHistory.useQuery(
    { limit: 30 },
    DEFAULT_QUERY_OPTIONS,
  );
  const latestQuery = trpc.clientPortal.bloodPressure.getLatest.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // ─── Map API data with sample fallback ──────────────────
  const latestReading = latestQuery.data
    ? {
        systolic: (latestQuery.data as any).systolic,
        diastolic: (latestQuery.data as any).diastolic,
        pulse: (latestQuery.data as any).pulse ?? SAMPLE_LATEST.pulse,
        timestamp: new Date(
          (latestQuery.data as any).date || (latestQuery.data as any).createdAt,
        ).toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }),
      }
    : SAMPLE_LATEST;

  const history = historyQuery.data
    ? (historyQuery.data as any[]).map((r, idx) => ({
        id: r.id || String(idx + 1),
        date: new Date(r.date || r.createdAt).toLocaleDateString(),
        time: new Date(r.date || r.createdAt).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        sys: r.systolic,
        dia: r.diastolic,
        pulse: r.pulse ?? 0,
      }))
    : SAMPLE_HISTORY;

  // Derive 7-day trend from history data
  const systolicTrend = historyQuery.data
    ? deriveWeeklyTrend(history, "sys")
    : SAMPLE_SYSTOLIC_TREND;
  const diastolicTrend = historyQuery.data
    ? deriveWeeklyTrend(history, "dia")
    : SAMPLE_DIASTOLIC_TREND;

  const source = (latestQuery.data as any)?.source ?? SAMPLE_SOURCE;

  const latestClass = getClassification(latestReading.systolic);

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Latest Reading ───────────────────────────────── */}
        <Card style={styles.latestCard}>
          <View style={styles.latestHeader}>
            <View style={styles.latestIconWrap}>
              <Activity size={24} color="#C65D5D" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.latestLabel}>Latest Reading</Text>
              <Text style={styles.latestTimestamp}>{latestReading.timestamp}</Text>
            </View>
            <Badge label={latestClass.label} variant="success" />
          </View>

          <View style={styles.latestValueRow}>
            <Text style={styles.latestValue}>
              {latestReading.systolic}/{latestReading.diastolic}
            </Text>
            <Text style={styles.latestUnit}>mmHg</Text>
          </View>

          <View style={styles.pulseRow}>
            <Heart size={14} color={Colors.danger} />
            <Text style={styles.pulseLabel}>Pulse</Text>
            <Text style={styles.pulseValue}>{latestReading.pulse} bpm</Text>
          </View>
        </Card>

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
                {cls.label === latestClass.label && (
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
                    <Text style={styles.tableDate}>{reading.date}</Text>
                    <Text style={styles.tableTime}>{reading.time}</Text>
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
                  <Text style={styles.tablePulse}>{reading.pulse}</Text>
                </View>
                {idx < history.length - 1 && (
                  <View style={styles.classSeparator} />
                )}
              </React.Fragment>
            );
          })}
        </Card>

        {/* ─── 7-Day Trend ──────────────────────────────────── */}
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
  tableTime: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
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
