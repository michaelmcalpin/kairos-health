/**
 * Goals screen.
 *
 * Displays active health goals with progress bars, current/target values,
 * deadlines, and navigation to create-goal and goal-detail screens.
 * Includes a completed goals section at the bottom.
 */

import React, { useCallback, useMemo, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Target,
  Scale,
  Moon,
  Footprints,
  Droplets,
  Plus,
  CheckCircle2,
  ChevronRight,
  Dumbbell,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { ProgressBar } from "@/components/health";
import { useGoals } from "@/hooks";
import type { GoalSummary } from "@/hooks/useGoals";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Display helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GoalDisplay {
  id: string;
  title: string;
  target: string;
  current: string;
  progress: number;
  deadline: string;
  icon: React.ReactNode;
  iconBgColor: string;
  color: string;
  status: "on_track" | "at_risk" | "ahead";
}

interface CompletedGoalDisplay {
  id: string;
  title: string;
  completedDate: string;
  icon: React.ReactNode;
  iconBgColor: string;
}

const CATEGORY_STYLES: Record<string, { icon: React.ReactNode; iconBgColor: string; color: string }> = {
  weight: {
    icon: <Scale size={18} color={Colors.gold} />,
    iconBgColor: "rgba(74, 144, 217, 0.12)",
    color: Colors.gold,
  },
  sleep: {
    icon: <Moon size={18} color="#60A5FA" />,
    iconBgColor: "rgba(96, 165, 250, 0.12)",
    color: "#60A5FA",
  },
  fitness: {
    icon: <Footprints size={18} color={Colors.success} />,
    iconBgColor: "rgba(74, 157, 91, 0.12)",
    color: Colors.success,
  },
  clinical: {
    icon: <Droplets size={18} color="#F59E0B" />,
    iconBgColor: "rgba(245, 158, 11, 0.12)",
    color: "#F59E0B",
  },
  nutrition: {
    icon: <Droplets size={18} color="#EC4899" />,
    iconBgColor: "rgba(236, 72, 153, 0.12)",
    color: "#EC4899",
  },
  mental: {
    icon: <Moon size={18} color="#A78BFA" />,
    iconBgColor: "rgba(167, 139, 250, 0.12)",
    color: "#A78BFA",
  },
  other: {
    icon: <Target size={18} color={Colors.gold} />,
    iconBgColor: "rgba(74, 144, 217, 0.12)",
    color: Colors.gold,
  },
};

function mapGoalToDisplay(goal: GoalSummary): GoalDisplay {
  const catStyle = CATEGORY_STYLES[goal.category ?? "other"] ?? CATEGORY_STYLES.other;
  const targetStr = goal.targetValue != null && goal.targetUnit
    ? `${goal.targetValue} ${goal.targetUnit}`
    : goal.title;
  const currentStr = goal.currentValue != null && goal.targetUnit
    ? `${goal.currentValue} ${goal.targetUnit}`
    : "---";
  const deadlineStr = goal.targetDate
    ? formatDeadline(goal.targetDate)
    : "Ongoing";
  const progress = goal.progress ?? 0;
  const statusKey: GoalDisplay["status"] =
    progress >= 80 ? "ahead" : progress < 50 ? "at_risk" : "on_track";

  return {
    id: goal.id,
    title: goal.title,
    target: targetStr,
    current: currentStr,
    progress,
    deadline: deadlineStr,
    icon: catStyle.icon,
    iconBgColor: catStyle.iconBgColor,
    color: catStyle.color,
    status: statusKey,
  };
}

function mapCompletedGoalToDisplay(goal: GoalSummary): CompletedGoalDisplay {
  return {
    id: goal.id,
    title: goal.title,
    completedDate: goal.targetDate ? formatDeadline(goal.targetDate) : "",
    icon: <Dumbbell size={18} color={Colors.success} />,
    iconBgColor: "rgba(74, 157, 91, 0.12)",
  };
}

function formatDeadline(dateStr: string): string {
  try {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

const STATUS_LABELS: Record<GoalDisplay["status"], { label: string; variant: "success" | "warning" | "info" }> = {
  on_track: { label: "On Track", variant: "success" },
  at_risk: { label: "At Risk", variant: "warning" },
  ahead: { label: "Ahead", variant: "info" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GoalsScreen() {
  const router = useRouter();

  // ── API data ──────────────────────────────────────────────
  const { goals: activeGoalsRaw, isLoading: loadingActive, refetch: refetchActive } = useGoals("active");
  const { goals: completedGoalsRaw, isLoading: loadingCompleted, refetch: refetchCompleted } = useGoals("completed");

  // Map API data to display format
  const goals = useMemo(() => activeGoalsRaw.map(mapGoalToDisplay), [activeGoalsRaw]);
  const completedGoals = useMemo(() => completedGoalsRaw.map(mapCompletedGoalToDisplay), [completedGoalsRaw]);

  const avgProgress = goals.length > 0
    ? Math.round(goals.reduce((s, g) => s + g.progress, 0) / goals.length)
    : 0;

  // Pull-to-refresh
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchActive(), refetchCompleted()]);
    setRefreshing(false);
  }, [refetchActive, refetchCompleted]);

  const isLoading = loadingActive || loadingCompleted;

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
        {/* ─── Summary ──────────────────────────────────────── */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Target size={24} color={Colors.gold} />
          </View>
          <Text style={styles.summaryTitle}>Active Goals</Text>
          <Text style={styles.summaryCount}>{goals.length}</Text>
          <Text style={styles.summarySubtitle}>
            Average progress: {avgProgress}%
          </Text>
        </Card>

        {/* ─── Goals List ───────────────────────────────────── */}
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Your Goals</Text>
          <Pressable
            onPress={() => router.push("/health/create-goal")}
            style={styles.addIconButton}
          >
            <Plus size={20} color={Colors.gold} />
          </Pressable>
        </View>

        {isLoading && goals.length === 0 && (
          <View style={{ paddingVertical: Spacing.xxl, alignItems: "center" }}>
            <ActivityIndicator size="large" color={Colors.gold} />
          </View>
        )}

        {goals.map((goal) => {
          const statusInfo = STATUS_LABELS[goal.status];
          return (
            <Pressable
              key={goal.id}
              onPress={() =>
                router.push({
                  pathname: "/health/goal-detail",
                  params: { id: goal.id },
                })
              }
            >
              <Card style={styles.goalCard}>
                {/* Goal header */}
                <View style={styles.goalHeader}>
                  <View
                    style={[
                      styles.goalIconWrap,
                      { backgroundColor: goal.iconBgColor },
                    ]}
                  >
                    {goal.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.goalTitle}>{goal.title}</Text>
                    <Text style={styles.goalDeadline}>{goal.deadline}</Text>
                  </View>
                  <Badge
                    label={statusInfo.label}
                    variant={statusInfo.variant}
                  />
                  <ChevronRight
                    size={18}
                    color={Colors.silver}
                    style={{ marginLeft: Spacing.xs }}
                  />
                </View>

                {/* Progress */}
                <View style={styles.progressSection}>
                  <View style={styles.progressHeader}>
                    <Text style={styles.progressPct}>{goal.progress}%</Text>
                  </View>
                  <ProgressBar
                    progress={goal.progress}
                    color={goal.color}
                    height={8}
                  />
                </View>

                {/* Current / Target */}
                <View style={styles.goalValues}>
                  <View style={styles.goalValueItem}>
                    <Text style={styles.goalValueLabel}>Current</Text>
                    <Text style={styles.goalValueText}>{goal.current}</Text>
                  </View>
                  <View style={styles.goalValueDivider} />
                  <View style={styles.goalValueItem}>
                    <Text style={styles.goalValueLabel}>Target</Text>
                    <Text
                      style={[
                        styles.goalValueText,
                        { color: goal.color },
                      ]}
                    >
                      {goal.target}
                    </Text>
                  </View>
                </View>
              </Card>
            </Pressable>
          );
        })}

        {/* ─── Add New Goal ─────────────────────────────────── */}
        <Button
          title="Add New Goal"
          variant="secondary"
          size="lg"
          icon={<Plus size={18} color={Colors.gold} />}
          onPress={() => router.push("/health/create-goal")}
          style={styles.addButton}
        />

        {/* ─── Completed Goals ──────────────────────────────── */}
        {completedGoals.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {completedGoals.map((goal) => (
              <Card key={goal.id} style={styles.completedCard}>
                <View style={styles.completedRow}>
                  <View
                    style={[
                      styles.goalIconWrap,
                      { backgroundColor: goal.iconBgColor },
                    ]}
                  >
                    {goal.icon}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.completedTitle}>{goal.title}</Text>
                    <Text style={styles.completedDate}>
                      Completed {goal.completedDate}
                    </Text>
                  </View>
                  <CheckCircle2 size={22} color={Colors.success} />
                </View>
              </Card>
            ))}
          </>
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

  // Summary
  summaryCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  summaryIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.sm,
  },
  summaryTitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  summaryCount: {
    color: Colors.white,
    fontSize: 44,
    fontWeight: "800",
    marginVertical: 4,
  },
  summarySubtitle: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "500",
  },

  // Section
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  addIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Goal card
  goalCard: {
    marginBottom: Spacing.sm,
  },
  goalHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  goalIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  goalTitle: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  goalDeadline: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },

  // Progress
  progressSection: {
    marginBottom: Spacing.md,
  },
  progressHeader: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 4,
  },
  progressPct: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },

  // Values
  goalValues: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
  },
  goalValueItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  goalValueLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  goalValueText: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  goalValueDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: Colors.border,
  },

  // Add button
  addButton: {
    marginTop: Spacing.lg,
  },

  // Completed goals
  completedCard: {
    marginBottom: Spacing.sm,
  },
  completedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
  },
  completedTitle: {
    color: Colors.silverLight,
    fontSize: FontSizes.md,
    fontWeight: "600",
  },
  completedDate: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
