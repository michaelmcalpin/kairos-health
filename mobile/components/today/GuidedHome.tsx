/**
 * Guided home ("Soldier mode: tell me what to do and when").
 *
 * Shows today's daily LifeScore check-in, the advice line, and a one-tap
 * checklist. Day-navigable: step back to complete something you forgot to mark
 * yesterday, or forward to preview tomorrow's plan (data + complete/undo are
 * keyed by the selected date server-side). No charts.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { SummitGlyph } from "@/components/brand";
import { TodayChecklist } from "@/components/today/TodayChecklist";
import { ModeToggle } from "@/components/today/ModeToggle";
import { AdherenceStrip } from "@/components/today/AdherenceStrip";
import { DayNav, useDayNav } from "@/components/today/DayNav";
import { LifeScoreCheckinCard } from "@/components/lifescore/LifeScoreCheckinCard";
import { useToday, useViewMode } from "@/hooks/useToday";

export default function GuidedHome() {
  const { mode, setMode } = useViewMode();
  const nav = useDayNav();
  const { data, isLoading, refetch, toggleItem } = useToday(nav.dateStr);

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const progress = data?.progress ?? { done: 0, total: 0 };
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
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.gold} colors={[Colors.gold]} />
        }
      >
        {/* Header */}
        <View style={styles.headerRow}>
          <View style={styles.headerTitleRow}>
            <SummitGlyph size={32} />
            <View>
              <Text style={styles.headerTitle}>Today</Text>
              <Text style={styles.tagline}>Tell me what to do and when</Text>
            </View>
          </View>
          <ModeToggle mode={mode} onChange={setMode} />
        </View>

        {/* Day stepper */}
        <View style={{ marginBottom: Spacing.md }}>
          <DayNav nav={nav} />
        </View>

        {/* Advice + progress (advice only meaningful for today) */}
        <Card style={styles.adviceCard}>
          {nav.isToday && data?.advice ? (
            <>
              <Text style={styles.adviceLabel}>Today&apos;s focus</Text>
              <Text style={styles.adviceText}>{data.advice}</Text>
            </>
          ) : (
            <Text style={styles.adviceLabel}>
              {nav.isToday ? "Your plan" : nav.relLabel === "Tomorrow" ? "Coming up" : `${nav.relLabel}'s plan`}
            </Text>
          )}
          {progress.total > 0 && (
            <View style={styles.progressWrap}>
              <View style={styles.progressTrack}>
                <View style={[styles.progressFill, { width: `${pct}%` }]} />
              </View>
              <Text style={styles.progressText}>{progress.done}/{progress.total} done</Text>
            </View>
          )}
        </Card>

        {/* Adherence strip — today only (7-day history, streak) */}
        {nav.isToday && <AdherenceStrip todayPct={progress.total > 0 ? pct : null} />}

        {/* Checklist for the selected day */}
        {data ? (
          <TodayChecklist sections={data.sections} onToggle={toggleItem} />
        ) : !isLoading ? (
          <Card style={styles.emptyCard}>
            <Text style={styles.emptyText}>Nothing on your plan for this day.</Text>
          </Card>
        ) : null}

        {/* Daily LifeScore check-in — at the bottom of the day, today only.
            Completing it marks the "LifeScore check-in" to-do above as done. */}
        {nav.isToday && (
          <View style={{ marginTop: Spacing.sm }}>
            <LifeScoreCheckinCard onSaved={refetch} />
          </View>
        )}

        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark },
  scrollContent: { padding: Spacing.md },
  loadingBar: {
    position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
    alignItems: "center", paddingVertical: 4, backgroundColor: "rgba(0, 0, 0, 0.3)",
  },
  headerRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitleRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  headerTitle: { color: Colors.white, fontSize: FontSizes.xxl, fontWeight: "800" },
  tagline: { color: Colors.silver, fontSize: FontSizes.xs, fontStyle: "italic", marginTop: 2 },
  adviceCard: { marginBottom: Spacing.md },
  adviceLabel: {
    color: Colors.gold, fontSize: 11, fontWeight: "700",
    textTransform: "uppercase", letterSpacing: 1, marginBottom: 6,
  },
  adviceText: { color: Colors.white, fontSize: FontSizes.md, fontWeight: "600", lineHeight: 22 },
  progressWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md },
  progressTrack: {
    flex: 1, height: 6, backgroundColor: Colors.navyLight, borderRadius: Radii.full, overflow: "hidden",
  },
  progressFill: { height: "100%", backgroundColor: Colors.gold, borderRadius: Radii.full },
  progressText: { color: Colors.gold, fontSize: 11, fontWeight: "600" },
  emptyCard: { alignItems: "center", paddingVertical: Spacing.lg },
  emptyText: { color: Colors.silver, fontSize: FontSizes.sm },
  bottomSpacer: { height: Spacing.xxl },
});
