/**
 * Goals screen.
 *
 * Displays active health goals with progress bars, current/target values,
 * deadlines, and navigation to create-goal and goal-detail screens.
 * Includes a completed goals section at the bottom.
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Pressable,
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

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface Goal {
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

interface CompletedGoal {
  id: string;
  title: string;
  completedDate: string;
  icon: React.ReactNode;
  iconBgColor: string;
}

const GOALS: Goal[] = [
  {
    id: "1",
    title: "Reach 175 lbs",
    target: "175 lbs",
    current: "183 lbs",
    progress: 60,
    deadline: "Aug 15, 2026",
    icon: <Scale size={18} color={Colors.gold} />,
    iconBgColor: "rgba(74, 144, 217, 0.12)",
    color: Colors.gold,
    status: "on_track",
  },
  {
    id: "2",
    title: "Sleep 8+ hrs",
    target: "8.0 hrs",
    current: "7.4 hrs avg",
    progress: 85,
    deadline: "Ongoing",
    icon: <Moon size={18} color="#60A5FA" />,
    iconBgColor: "rgba(96, 165, 250, 0.12)",
    color: "#60A5FA",
    status: "ahead",
  },
  {
    id: "3",
    title: "Steps 10K daily",
    target: "10,000 steps",
    current: "8,742 avg",
    progress: 87,
    deadline: "Ongoing",
    icon: <Footprints size={18} color={Colors.success} />,
    iconBgColor: "rgba(74, 157, 91, 0.12)",
    color: Colors.success,
    status: "on_track",
  },
  {
    id: "4",
    title: "Reduce A1C to 5.2",
    target: "5.2%",
    current: "5.4%",
    progress: 72,
    deadline: "Sep 30, 2026",
    icon: <Droplets size={18} color="#F59E0B" />,
    iconBgColor: "rgba(245, 158, 11, 0.12)",
    color: "#F59E0B",
    status: "at_risk",
  },
];

const COMPLETED_GOALS: CompletedGoal[] = [
  {
    id: "c1",
    title: "Run 5K without stopping",
    completedDate: "Feb 28, 2026",
    icon: <Dumbbell size={18} color={Colors.success} />,
    iconBgColor: "rgba(74, 157, 91, 0.12)",
  },
  {
    id: "c2",
    title: "Reduce LDL below 100",
    completedDate: "Jan 15, 2026",
    icon: <Droplets size={18} color={Colors.success} />,
    iconBgColor: "rgba(74, 157, 91, 0.12)",
  },
];

const STATUS_LABELS: Record<Goal["status"], { label: string; variant: "success" | "warning" | "info" }> = {
  on_track: { label: "On Track", variant: "success" },
  at_risk: { label: "At Risk", variant: "warning" },
  ahead: { label: "Ahead", variant: "info" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GoalsScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Summary ──────────────────────────────────────── */}
        <Card style={styles.summaryCard}>
          <View style={styles.summaryIconWrap}>
            <Target size={24} color={Colors.gold} />
          </View>
          <Text style={styles.summaryTitle}>Active Goals</Text>
          <Text style={styles.summaryCount}>{GOALS.length}</Text>
          <Text style={styles.summarySubtitle}>
            Average progress: {Math.round(GOALS.reduce((s, g) => s + g.progress, 0) / GOALS.length)}%
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

        {GOALS.map((goal) => {
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
        {COMPLETED_GOALS.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Completed</Text>
            {COMPLETED_GOALS.map((goal) => (
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
