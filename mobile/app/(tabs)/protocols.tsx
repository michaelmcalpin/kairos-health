/**
 * Protocols tab — the full daily plan as a one-tap checklist, mirroring the
 * Guided home view: EVERY item for the day (coach tasks, meetings, workout,
 * meals, supplements, medications, peptides, fasting), grouped and completable.
 *
 * Unlike the home view it's day-navigable: step back to complete something you
 * forgot to mark yesterday, or step forward to preview tomorrow's plan. Both the
 * data and the complete/undo mutation are keyed by the selected date server-side
 * (clientPortal.today.getToday / toggleComplete), so past + future days work.
 */

import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { TodayChecklist } from "@/components/today/TodayChecklist";
import { AdherenceStrip } from "@/components/today/AdherenceStrip";
import { useToday, localDate, type TodayData } from "@/hooks/useToday";

// Local (not UTC) YYYY-MM-DD for a given Date.
function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function ProtocolsScreen() {
  const [selectedDate, setSelectedDate] = useState(() => new Date());

  const dateStr = toDateStr(selectedDate);
  const todayStr = localDate();
  const isToday = dateStr === todayStr;

  const { data, isLoading, refetch, toggleItem } = useToday(dateStr);
  const today = data as TodayData | undefined;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const shiftDay = (delta: number) =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });

  // Relative label ("Today"/"Yesterday"/"Tomorrow") + the full calendar date.
  const { relLabel, fullLabel } = useMemo(() => {
    const y = new Date();
    y.setDate(y.getDate() - 1);
    const t = new Date();
    t.setDate(t.getDate() + 1);
    const rel = isToday
      ? "Today"
      : dateStr === toDateStr(y)
        ? "Yesterday"
        : dateStr === toDateStr(t)
          ? "Tomorrow"
          : selectedDate.toLocaleDateString("en-US", { weekday: "long" });
    const full = selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return { relLabel: rel, fullLabel: full };
  }, [dateStr, isToday, selectedDate]);

  const progress = today?.progress ?? { done: 0, total: 0 };
  const pct = progress.total > 0 ? Math.round((progress.done / progress.total) * 100) : 0;

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      {isLoading && !refreshing && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      )}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} colors={[Colors.gold]} />
        }
      >
        {/* Title */}
        <Text style={styles.headerTitle}>Protocol</Text>

        {/* Day stepper */}
        <View style={styles.dayNav}>
          <Pressable onPress={() => shiftDay(-1)} hitSlop={10} style={styles.navBtn}>
            <ChevronLeft size={22} color={Colors.gold} />
          </Pressable>
          <View style={styles.dayNavCenter}>
            <Text style={styles.dayRel}>{relLabel}</Text>
            <Text style={styles.dayFull}>{fullLabel}</Text>
          </View>
          <Pressable onPress={() => shiftDay(1)} hitSlop={10} style={styles.navBtn}>
            <ChevronRight size={22} color={Colors.gold} />
          </Pressable>
        </View>

        {/* Jump back to today when viewing another day */}
        {!isToday && (
          <Pressable onPress={() => setSelectedDate(new Date())} style={styles.jumpToday} hitSlop={6}>
            <CalendarDays size={13} color={Colors.gold} />
            <Text style={styles.jumpTodayText}>Back to today</Text>
          </Pressable>
        )}

        {/* Advice + progress (advice only meaningful for today) */}
        <Card style={styles.adviceCard}>
          {isToday && today?.advice ? (
            <>
              <Text style={styles.adviceLabel}>Today's focus</Text>
              <Text style={styles.adviceText}>{today.advice}</Text>
            </>
          ) : (
            <Text style={styles.adviceLabel}>
              {isToday ? "Your plan" : relLabel === "Tomorrow" ? "Coming up" : `${relLabel}'s plan`}
            </Text>
          )}
          {progress.total > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressText}>
                {progress.done}/{progress.total} done
              </Text>
            </View>
          )}
        </Card>

        {/* Adherence strip — only for today (7-day history + streak) */}
        {isToday && <AdherenceStrip todayPct={progress.total > 0 ? pct : null} />}

        {/* The full checklist for the selected day */}
        {today ? (
          <TodayChecklist sections={today.sections} onToggle={toggleItem} />
        ) : !isLoading ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nothing on your plan for this day.</Text>
          </Card>
        ) : null}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { padding: Spacing.md },
  loadingBar: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    alignItems: "center",
    paddingVertical: 4,
    backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerTitle: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: "800", marginBottom: Spacing.sm },

  // Day stepper
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  dayNavCenter: { alignItems: "center", flex: 1 },
  dayRel: { color: Colors.white, fontSize: FontSizes.md, fontWeight: "700" },
  dayFull: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 1 },
  jumpToday: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "center",
    gap: 5,
    marginTop: Spacing.sm,
    paddingVertical: 4,
    paddingHorizontal: 10,
  },
  jumpTodayText: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },

  adviceCard: { marginTop: Spacing.md, marginBottom: Spacing.md },
  adviceLabel: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: 6,
  },
  adviceText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: "600", lineHeight: 22 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.dark,
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: Colors.gold, borderRadius: Radii.full },
  progressText: { color: Colors.gold, fontSize: 11, fontWeight: "600" },

  emptyCard: { alignItems: "center", paddingVertical: Spacing.lg },
  emptyText: { color: Colors.silver, fontSize: FontSizes.sm },
  bottomSpacer: { height: Spacing.xxl },
});
