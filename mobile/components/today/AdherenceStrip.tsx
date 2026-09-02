/**
 * AdherenceStrip — compact daily-task completion summary shown above the
 * home checklist.
 *
 *   • a big "Today NN%" (from the live checklist progress when available, so
 *     it matches the list exactly; falls back to the server's todayPct);
 *   • a row of 7 small day bars colored by that day's completion (faint/empty
 *     for days with no completable tasks);
 *   • a "🔥 N-day streak" pill when the streak is non-zero.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { useAdherence } from "@/hooks/useAdherence";

/** Color for a day's completion percentage (null = no completable tasks). */
function pctColor(pct: number | null): string {
  if (pct == null) return Colors.navyLight;
  if (pct >= 80) return Colors.success;
  if (pct >= 50) return Colors.gold;
  if (pct > 0) return Colors.warning;
  return Colors.danger;
}

const BAR_MAX_HEIGHT = 28;

export function AdherenceStrip({ todayPct }: { todayPct?: number | null }) {
  const { data } = useAdherence(7);
  if (!data) return null;

  // Prefer the live checklist number so the strip and the list never disagree.
  const bigPct = todayPct ?? data.todayPct;

  return (
    <Card style={styles.card}>
      <View style={styles.topRow}>
        <View style={styles.todayWrap}>
          <Text style={styles.todayLabel}>Today</Text>
          <Text style={styles.todayPct}>{bigPct != null ? `${bigPct}%` : "—"}</Text>
        </View>
        {data.streak > 0 && (
          <View style={styles.streakPill}>
            <Text style={styles.streakText}>🔥 {data.streak}-day streak</Text>
          </View>
        )}
      </View>

      <View style={styles.barsRow}>
        {data.days.map((d) => {
          const filled = d.pct != null ? Math.max(3, Math.round((d.pct / 100) * BAR_MAX_HEIGHT)) : 0;
          const weekday = new Date(`${d.date}T00:00:00`).toLocaleDateString("en-US", { weekday: "narrow" });
          return (
            <View key={d.date} style={styles.barCol}>
              <View style={styles.barTrack}>
                {d.pct != null ? (
                  <View style={[styles.barFill, { height: filled, backgroundColor: pctColor(d.pct) }]} />
                ) : (
                  <View style={styles.barEmpty} />
                )}
              </View>
              <Text style={styles.barDay}>{weekday}</Text>
            </View>
          );
        })}
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  todayWrap: { flexDirection: "row", alignItems: "baseline", gap: Spacing.sm },
  todayLabel: {
    color: Colors.silver,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  todayPct: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: "800" },
  streakPill: {
    backgroundColor: Colors.warningMuted,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  streakText: { color: Colors.warning, fontSize: 11, fontWeight: "700" },
  barsRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "flex-end" },
  barCol: { alignItems: "center", flex: 1, gap: 4 },
  barTrack: { height: BAR_MAX_HEIGHT, justifyContent: "flex-end" },
  barFill: { width: 8, borderRadius: Radii.sm },
  barEmpty: {
    width: 8,
    height: 3,
    borderRadius: Radii.full,
    backgroundColor: Colors.navyLight,
  },
  barDay: { color: Colors.silver, fontSize: 9, fontWeight: "600" },
});
