/**
 * Protocols tab -- Full daily protocol tracker.
 *
 * Displays a circular progress ring, time-of-day grouped protocol items
 * (supplements, medications, peptides, exercises), weekly adherence chart,
 * and action buttons.
 *
 * Data sourced from useActiveProtocol, useProtocolAdherence, and
 * useWeeklyAdherence hooks (with sample-data fallback built into the hooks).
 */

import React, { useCallback, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, RefreshControl, ActivityIndicator } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  TrendingUp,
  ClipboardList,
  Plus,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import {
  ProgressRing,
  ProtocolCheckItem,
  TimeSection,
  WeeklyAdherenceChart,
} from "@/components/protocols";
import type { ItemCategory } from "@/components/protocols";
import {
  useActiveProtocol,
  useProtocolAdherence,
  useLogAdherence,
  useWeeklyAdherence,
} from "@/hooks";

// ================================================================
// Types
// ================================================================

interface ProtocolItemData {
  id: string;
  title: string;
  dosage: string;
  form?: string;
  category: ItemCategory;
  timeSlot: "morning" | "afternoon" | "evening" | "bedtime";
  hasNotes?: boolean;
}

// ================================================================
// Time slot configuration
// ================================================================

const TIME_SLOTS = [
  {
    key: "morning" as const,
    icon: "☀️", // sun
    label: "Morning",
    timeRange: "6:00 AM - 12:00 PM",
  },
  {
    key: "afternoon" as const,
    icon: "🌤️", // sun behind cloud
    label: "Afternoon",
    timeRange: "12:00 PM - 5:00 PM",
  },
  {
    key: "evening" as const,
    icon: "🌅", // sunset
    label: "Evening",
    timeRange: "5:00 PM - 9:00 PM",
  },
  {
    key: "bedtime" as const,
    icon: "🌙", // crescent moon
    label: "Bedtime",
    timeRange: "9:00 PM+",
  },
];

// ================================================================
// Screen Component
// ================================================================

export default function ProtocolsScreen() {
  const router = useRouter();

  // ---- Hook data ----
  const {
    items: protocolItems,
    isLoading: protocolLoading,
    refetch: refetchProtocol,
  } = useActiveProtocol();

  const {
    completedIds: hookCompletedIds,
    isLoading: adherenceLoading,
    refetch: refetchAdherence,
  } = useProtocolAdherence();

  const { logItem } = useLogAdherence();

  const {
    weeklyData: hookWeeklyData,
    isLoading: weeklyLoading,
    refetch: refetchWeekly,
  } = useWeeklyAdherence();

  // Local optimistic state layered on top of the hook data
  const [localOverrides, setLocalOverrides] = useState<Record<string, boolean>>({});

  const completedIds = useMemo(() => {
    const base = new Set(hookCompletedIds);
    for (const [id, completed] of Object.entries(localOverrides)) {
      if (completed) {
        base.add(id);
      } else {
        base.delete(id);
      }
    }
    return base;
  }, [hookCompletedIds, localOverrides]);

  const isLoading = protocolLoading || adherenceLoading;

  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchProtocol(), refetchAdherence(), refetchWeekly()]);
    setLocalOverrides({});
    setRefreshing(false);
  }, [refetchProtocol, refetchAdherence, refetchWeekly]);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const toggleItem = useCallback(
    (id: string) => {
      setLocalOverrides((prev) => {
        const wasDone = hookCompletedIds.has(id)
          ? prev[id] !== false
          : !!prev[id];
        return { ...prev, [id]: !wasDone };
      });
      // Fire-and-forget mutation to persist on backend
      const wasDone = completedIds.has(id);
      logItem(id, !wasDone);
    },
    [hookCompletedIds, completedIds, logItem],
  );

  // Cast hook items to local ProtocolItemData shape (they already match)
  const items = protocolItems as ProtocolItemData[];

  // Group items by time slot
  const grouped = useMemo(() => {
    const groups: Record<string, ProtocolItemData[]> = {};
    for (const item of items) {
      if (!groups[item.timeSlot]) groups[item.timeSlot] = [];
      groups[item.timeSlot].push(item);
    }
    return groups;
  }, [items]);

  const totalItems = items.length;
  const completedCount = items.filter((i) =>
    completedIds.has(i.id)
  ).length;

  // Per-section counts
  const sectionCounts = useMemo(() => {
    const counts: Record<string, { completed: number; total: number }> = {};
    for (const slot of TIME_SLOTS) {
      const slotItems = grouped[slot.key] ?? [];
      counts[slot.key] = {
        total: slotItems.length,
        completed: slotItems.filter((i) => completedIds.has(i.id)).length,
      };
    }
    return counts;
  }, [completedIds, grouped]);

  // Merge today's live percentage into the weekly chart data
  const weeklyData = useMemo(() => {
    const todayPercent =
      totalItems > 0 ? Math.round((completedCount / totalItems) * 100) : 0;
    return hookWeeklyData.map((d) =>
      d.isToday ? { ...d, percent: todayPercent } : d
    );
  }, [completedCount, totalItems, hookWeeklyData]);

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
        {/* ---- Header ---- */}
        <View style={styles.headerRow}>
          <View>
            <Text style={styles.headerTitle}>Today's Protocol</Text>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
          <View style={styles.activeBadge}>
            <ClipboardList size={12} color={Colors.gold} />
            <Text style={styles.activeBadgeText}>Active</Text>
          </View>
        </View>

        {/* ---- Loading indicator ---- */}
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {/* ---- Progress Ring Hero ---- */}
        <Card style={styles.heroCard}>
          <ProgressRing
            completed={completedCount}
            total={totalItems}
            size={130}
            strokeWidth={11}
          />
          <Text style={styles.heroSubtitle}>Daily Completion</Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{totalItems}</Text>
              <Text style={styles.heroStatLabel}>Total</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: Colors.success }]}>
                {completedCount}
              </Text>
              <Text style={styles.heroStatLabel}>Done</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={[styles.heroStatValue, { color: Colors.warning }]}>
                {totalItems - completedCount}
              </Text>
              <Text style={styles.heroStatLabel}>Remaining</Text>
            </View>
          </View>
        </Card>

        {/* ---- Time-of-Day Sections ---- */}
        {TIME_SLOTS.map((slot) => {
          const items = grouped[slot.key];
          if (!items || items.length === 0) return null;
          const counts = sectionCounts[slot.key];

          return (
            <TimeSection
              key={slot.key}
              icon={slot.icon}
              label={slot.label}
              timeRange={slot.timeRange}
              completed={counts.completed}
              total={counts.total}
            >
              {items.map((item) => (
                <ProtocolCheckItem
                  key={item.id}
                  title={item.title}
                  dosage={item.dosage}
                  form={item.form}
                  category={item.category}
                  completed={completedIds.has(item.id)}
                  hasNotes={item.hasNotes}
                  onToggle={() => toggleItem(item.id)}
                />
              ))}
            </TimeSection>
          );
        })}

        {/* ---- Weekly Adherence Chart ---- */}
        <View style={styles.sectionHeaderRow}>
          <TrendingUp size={16} color={Colors.gold} />
          <Text style={styles.sectionTitle}>Weekly Adherence</Text>
        </View>
        <Card style={styles.chartCard}>
          <WeeklyAdherenceChart data={weeklyData} />
        </Card>

        {/* ---- Bottom Actions ---- */}
        <View style={styles.actionsRow}>
          <Button
            title="View Full Protocol"
            variant="secondary"
            size="md"
            onPress={() => router.push("/protocols/supplements")}
            style={styles.actionButton}
            icon={<ClipboardList size={16} color={Colors.gold} />}
          />
          <Button
            title="Log Custom Item"
            variant="tertiary"
            size="md"
            onPress={() => router.push("/protocols/add-item" as any)}
            style={styles.actionButton}
            icon={<Plus size={16} color={Colors.silverLight} />}
          />
        </View>

        {/* Bottom spacer for tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ================================================================
// Styles
// ================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
  },

  // Loading
  loadingContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: Spacing.lg,
  },

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitle: {
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: "800",
  },
  headerDate: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginTop: 2,
  },
  activeBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    paddingVertical: 5,
    paddingHorizontal: 12,
    borderRadius: Radii.full,
  },
  activeBadgeText: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "700",
  },

  // Hero card
  heroCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  heroSubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 1.2,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  heroStatsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  heroStat: {
    alignItems: "center",
    flex: 1,
  },
  heroStatValue: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },
  heroStatLabel: {
    color: Colors.silver,
    fontSize: 10,
    fontWeight: "500",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 2,
  },
  heroDivider: {
    width: StyleSheet.hairlineWidth,
    height: 28,
    backgroundColor: Colors.border,
  },

  // Section header
  sectionHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
  },

  // Chart card
  chartCard: {
    marginBottom: Spacing.md,
  },

  // Actions
  actionsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  actionButton: {
    flex: 1,
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
