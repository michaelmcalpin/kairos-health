/**
 * All Health Data — every daily number from Apple Health, Oura and other
 * devices, grouped by body system, with latest value, 7/30-day averages,
 * a 30-day trend line, and recent workouts.
 *
 * tRPC: clientPortal.healthData.summary
 */
import React, { useState } from "react";
import { View, Text, ScrollView, Pressable, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import Svg, { Path } from "react-native-svg";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ErrorView } from "@/components/ui/ErrorView";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { useHealthSync } from "@/hooks/useHealthSync";

interface Metric {
  key: string; label: string; unit: string; decimals: number; about: string;
  latest: number | null; latestDate: string | null; avg7: number | null; avg30: number | null;
  trendPct: number | null; better: string | null; source: string | null; series: Array<number | null>;
}
interface Summary {
  metricCount: number;
  groups: Array<{ key: string; title: string; blurb: string; metrics: Metric[] }>;
  workouts: Array<{ id: string; activity: string; startAt: string; durationMin: number | null; energyKcal: number | null; distanceM: number | null; avgHr: number | null }>;
}

const SOURCE_LABEL: Record<string, string> = {
  apple_health: "Apple Health", oura: "Oura", garmin: "Garmin", whoop: "WHOOP", fitbit: "Fitbit",
  withings: "Withings", dexcom: "Dexcom", manual: "Manual", checkin: "Check-in",
};

const isSleepMinutes = (m: Metric) => m.unit === "min" && m.key.startsWith("sleep_");
function fmt(m: Metric, v: number | null): string {
  if (v == null) return "—";
  if (isSleepMinutes(m) && v >= 60) return `${Math.floor(v / 60)}h ${Math.round(v % 60)}m`;
  return v.toLocaleString("en-US", { maximumFractionDigits: m.decimals });
}

function tone(m: Metric): "good" | "bad" | "flat" {
  if (m.trendPct == null || Math.abs(m.trendPct) < 3) return "flat";
  const up = m.trendPct > 0;
  if (m.better === "higher" || m.better === "baseline") return up ? "good" : "bad";
  if (m.better === "lower") return up ? "bad" : "good";
  return "flat";
}
const TONE_COLOR = { good: Colors.success, bad: Colors.warning, flat: Colors.info };

function Sparkline({ series, color }: { series: Array<number | null>; color: string }) {
  const pts = series.map((v, i) => ({ v, i })).filter((p): p is { v: number; i: number } => p.v != null);
  if (pts.length < 2) return <View style={{ width: 96, height: 28 }} />;
  const min = Math.min(...pts.map((p) => p.v));
  const max = Math.max(...pts.map((p) => p.v));
  const w = 96, h = 28, span = max - min || 1;
  const d = pts.map((p, j) => `${j ? "L" : "M"}${((p.i / (series.length - 1)) * w).toFixed(1)},${(h - 2 - ((p.v - min) / span) * (h - 4)).toFixed(1)}`).join(" ");
  return (
    <Svg width={w} height={h}>
      <Path d={d} stroke={color} strokeWidth={1.75} fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

function MetricRow({ m }: { m: Metric }) {
  const [open, setOpen] = useState(false);
  const t = tone(m);
  const arrow = m.trendPct == null || Math.abs(m.trendPct) < 3 ? "remove" : m.trendPct > 0 ? "arrow-up" : "arrow-down";
  return (
    <Pressable onPress={() => setOpen((o) => !o)} style={styles.metric}>
      <View style={styles.metricTop}>
        <View style={{ flex: 1 }}>
          <Text style={styles.metricLabel}>{m.label}</Text>
          <Text style={styles.metricValue}>
            {fmt(m, m.latest)}
            {!!m.unit && !(isSleepMinutes(m) && (m.latest ?? 0) >= 60) && <Text style={styles.metricUnit}> {m.unit}</Text>}
          </Text>
        </View>
        <View style={{ alignItems: "flex-end", gap: 2 }}>
          <Sparkline series={m.series} color={TONE_COLOR[t]} />
          <View style={styles.trend}>
            <Ionicons name={arrow as any} size={11} color={TONE_COLOR[t]} />
            {m.trendPct != null && Math.abs(m.trendPct) >= 3 && (
              <Text style={[styles.trendText, { color: TONE_COLOR[t] }]}>{Math.abs(m.trendPct)}%</Text>
            )}
          </View>
        </View>
      </View>
      <Text style={styles.metricMeta}>
        7-day {fmt(m, m.avg7)} · 30-day {fmt(m, m.avg30)}{m.source ? ` · ${SOURCE_LABEL[m.source] ?? m.source}` : ""}
      </Text>
      {open && <Text style={styles.about}>{m.about}</Text>}
    </Pressable>
  );
}

export default function AllHealthDataScreen() {
  const q = trpc.clientPortal.healthData.summary.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const { syncFromHealthKit, isSyncing } = useHealthSync();
  const [group, setGroup] = useState("all");

  const syncNow = async () => {
    await syncFromHealthKit();
    await q.refetch();
  };

  if (q.isLoading) {
    return <View style={styles.center}><ActivityIndicator color={Colors.gold} size="large" /></View>;
  }
  if (q.error || !q.data) {
    return <ErrorView title="Couldn't load health data" message="Please try again." onRetry={() => q.refetch()} />;
  }

  const data = q.data as Summary;
  const groups = group === "all" ? data.groups : data.groups.filter((g) => g.key === group);

  return (
    <ScrollView
      style={styles.flex}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={q.isRefetching} onRefresh={() => q.refetch()} tintColor={Colors.gold} />}
    >
      <Text style={styles.intro}>
        Everything your devices share. Tap any number to learn what it means. These feed the Physical part of your LifeScore.
      </Text>
      <Button title={isSyncing ? "Syncing…" : "Sync Apple Health now"} variant="secondary" onPress={syncNow} disabled={isSyncing} />

      {data.metricCount === 0 && data.workouts.length === 0 ? (
        <Card><Text style={styles.empty}>No device data yet. Connect Apple Health or Oura in Devices, then sync.</Text></Card>
      ) : (
        <>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.chips}>
            {[{ key: "all", title: `All (${data.metricCount})` }, ...data.groups.map((g) => ({ key: g.key, title: `${g.title} (${g.metrics.length})` }))].map((g) => (
              <Pressable key={g.key} onPress={() => setGroup(g.key)} style={[styles.chip, group === g.key && styles.chipOn]}>
                <Text style={[styles.chipText, group === g.key && styles.chipTextOn]}>{g.title}</Text>
              </Pressable>
            ))}
          </ScrollView>

          {groups.map((g) => (
            <Card key={g.key} style={styles.group}>
              <Text style={styles.groupTitle}>{g.title}</Text>
              <Text style={styles.groupBlurb}>{g.blurb}</Text>
              {g.metrics.map((m) => <MetricRow key={m.key} m={m} />)}
            </Card>
          ))}

          {(group === "all" || group === "activity") && data.workouts.length > 0 && (
            <Card style={styles.group}>
              <Text style={styles.groupTitle}>Workouts</Text>
              <Text style={styles.groupBlurb}>Recorded by your watch, phone or ring in the last 30 days.</Text>
              {data.workouts.map((w) => (
                <View key={w.id} style={styles.workout}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.metricLabel}>{w.activity}</Text>
                    <Text style={styles.metricMeta}>
                      {new Date(w.startAt).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                    </Text>
                  </View>
                  <View style={{ alignItems: "flex-end" }}>
                    <Text style={styles.workoutMain}>
                      {w.durationMin != null ? `${Math.round(w.durationMin)} min` : ""}{w.energyKcal != null ? ` · ${Math.round(w.energyKcal)} kcal` : ""}
                    </Text>
                    <Text style={styles.metricMeta}>
                      {w.distanceM ? `${(w.distanceM / 1609.344).toFixed(2)} mi` : ""}{w.avgHr != null ? `${w.distanceM ? " · " : ""}avg ${Math.round(w.avgHr)} bpm` : ""}
                    </Text>
                  </View>
                </View>
              ))}
            </Card>
          )}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: Colors.dark },
  center: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl, gap: Spacing.md },
  intro: { color: Colors.silver, fontSize: FontSizes.sm, lineHeight: 20 },
  empty: { color: Colors.silver, fontSize: FontSizes.sm, textAlign: "center" },
  chips: { gap: Spacing.xs, paddingVertical: 2 },
  chip: { borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, borderRadius: Radii.full, paddingVertical: 6, paddingHorizontal: 12 },
  chipOn: { backgroundColor: Colors.gold, borderColor: Colors.gold },
  chipText: { color: Colors.silver, fontSize: FontSizes.xs },
  chipTextOn: { color: Colors.dark, fontWeight: "700" },
  group: { gap: Spacing.xs },
  groupTitle: { color: Colors.gold, fontSize: FontSizes.md, fontWeight: "700" },
  groupBlurb: { color: Colors.silver, fontSize: FontSizes.xs, marginBottom: Spacing.xs },
  metric: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingVertical: Spacing.sm, gap: 2 },
  metricTop: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  metricLabel: { color: Colors.silverLight, fontSize: FontSizes.sm, fontWeight: "600" },
  metricValue: { color: Colors.white, fontSize: FontSizes.xl, fontWeight: "700" },
  metricUnit: { color: Colors.silver, fontSize: FontSizes.xs, fontWeight: "400" },
  metricMeta: { color: Colors.silver, fontSize: 11 },
  trend: { flexDirection: "row", alignItems: "center", gap: 2 },
  trendText: { fontSize: 11, fontWeight: "600" },
  about: { color: Colors.silverLight, fontSize: FontSizes.xs, lineHeight: 18, marginTop: 4 },
  workout: { flexDirection: "row", borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingVertical: Spacing.sm },
  workoutMain: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "600" },
});
