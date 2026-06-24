/**
 * Goal Detail screen.
 *
 * Displays comprehensive information about a single health goal including
 * progress ring, weekly progress chart, milestones, activity log, and stats.
 * Route param: id (goal identifier).
 */

import React from "react";
import {
  View,
  Text,
  ScrollView,
  StyleSheet,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  Scale,
  Moon,
  Footprints,
  Droplets,
  Calendar,
  TrendingDown,
  Clock,
  Pencil,
  Trash2,
  Activity,
  BarChart3,
  Flag,
  Info,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import {
  GoalProgressRing,
  MilestoneItem,
  GoalActivityItem,
  BarChart,
} from "@/components/health";
import type { MilestoneStatus, ActivityTrend } from "@/components/health";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

interface GoalDetail {
  id: string;
  title: string;
  category: string;
  categoryVariant: "success" | "warning" | "info" | "danger" | "default";
  startValue: number;
  currentValue: number;
  targetValue: number;
  unit: string;
  progress: number;
  status: "on_track" | "at_risk" | "ahead";
  startDate: string;
  targetDate: string;
  daysRemaining: number;
  rateOfProgress: string;
  color: string;
  icon: React.ReactNode;
  weeklyData: { label: string; value: number }[];
  milestones: {
    label: string;
    status: MilestoneStatus;
    date?: string;
  }[];
  activityLog: {
    label: string;
    value: string;
    date: string;
    trend?: ActivityTrend;
  }[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const GOALS_DATA: Record<string, GoalDetail> = {
  "1": {
    id: "1",
    title: "Reach 175 lbs",
    category: "Weight",
    categoryVariant: "warning",
    startValue: 195,
    currentValue: 183,
    targetValue: 175,
    unit: "lbs",
    progress: 60,
    status: "on_track",
    startDate: "Mar 1, 2026",
    targetDate: "Aug 15, 2026",
    daysRemaining: 60,
    rateOfProgress: "-1.5 lbs/week",
    color: Colors.gold,
    icon: <Scale size={22} color={Colors.gold} />,
    weeklyData: [
      { label: "W1", value: 195 },
      { label: "W2", value: 193 },
      { label: "W3", value: 192 },
      { label: "W4", value: 190 },
      { label: "W5", value: 188 },
      { label: "W6", value: 186 },
      { label: "W7", value: 184 },
      { label: "W8", value: 183 },
    ],
    milestones: [
      { label: "25% reached (190 lbs)", status: "completed", date: "Apr 2, 2026" },
      { label: "50% reached (185 lbs)", status: "completed", date: "May 8, 2026" },
      { label: "75% reached (180 lbs)", status: "upcoming" },
      { label: "Goal achieved (175 lbs)", status: "locked" },
    ],
    activityLog: [
      { label: "Weight", value: "183 lbs", date: "Jun 14", trend: "down" },
      { label: "Weight", value: "183.5 lbs", date: "Jun 12", trend: "down" },
      { label: "Weight", value: "184 lbs", date: "Jun 10", trend: "down" },
      { label: "Weight", value: "184.2 lbs", date: "Jun 7", trend: "flat" },
      { label: "Weight", value: "185 lbs", date: "Jun 4", trend: "down" },
    ],
  },
  "2": {
    id: "2",
    title: "Sleep 8+ hrs",
    category: "Sleep",
    categoryVariant: "info",
    startValue: 6.5,
    currentValue: 7.4,
    targetValue: 8.0,
    unit: "hrs",
    progress: 85,
    status: "ahead",
    startDate: "Jan 1, 2026",
    targetDate: "Ongoing",
    daysRemaining: -1,
    rateOfProgress: "+0.1 hrs/week",
    color: "#60A5FA",
    icon: <Moon size={22} color="#60A5FA" />,
    weeklyData: [
      { label: "W1", value: 6.8 },
      { label: "W2", value: 6.9 },
      { label: "W3", value: 7.0 },
      { label: "W4", value: 7.1 },
      { label: "W5", value: 7.2 },
      { label: "W6", value: 7.3 },
      { label: "W7", value: 7.4 },
      { label: "W8", value: 7.4 },
    ],
    milestones: [
      { label: "25% reached (6.9 hrs)", status: "completed", date: "Feb 10, 2026" },
      { label: "50% reached (7.3 hrs)", status: "completed", date: "Apr 5, 2026" },
      { label: "75% reached (7.6 hrs)", status: "upcoming" },
      { label: "Goal achieved (8.0 hrs)", status: "locked" },
    ],
    activityLog: [
      { label: "Sleep", value: "7.5 hrs", date: "Jun 15", trend: "up" },
      { label: "Sleep", value: "7.2 hrs", date: "Jun 14", trend: "down" },
      { label: "Sleep", value: "7.8 hrs", date: "Jun 13", trend: "up" },
      { label: "Sleep", value: "7.1 hrs", date: "Jun 12", trend: "down" },
    ],
  },
  "3": {
    id: "3",
    title: "Steps 10K daily",
    category: "Activity",
    categoryVariant: "success",
    startValue: 5000,
    currentValue: 8742,
    targetValue: 10000,
    unit: "steps",
    progress: 87,
    status: "on_track",
    startDate: "Feb 1, 2026",
    targetDate: "Ongoing",
    daysRemaining: -1,
    rateOfProgress: "+450 steps/week",
    color: Colors.success,
    icon: <Footprints size={22} color={Colors.success} />,
    weeklyData: [
      { label: "W1", value: 6200 },
      { label: "W2", value: 6800 },
      { label: "W3", value: 7100 },
      { label: "W4", value: 7500 },
      { label: "W5", value: 7900 },
      { label: "W6", value: 8200 },
      { label: "W7", value: 8500 },
      { label: "W8", value: 8742 },
    ],
    milestones: [
      { label: "25% reached (6,250 steps)", status: "completed", date: "Feb 20, 2026" },
      { label: "50% reached (7,500 steps)", status: "completed", date: "Apr 1, 2026" },
      { label: "75% reached (8,750 steps)", status: "upcoming" },
      { label: "Goal achieved (10,000 steps)", status: "locked" },
    ],
    activityLog: [
      { label: "Steps", value: "9,124", date: "Jun 15", trend: "up" },
      { label: "Steps", value: "8,742", date: "Jun 14", trend: "down" },
      { label: "Steps", value: "8,930", date: "Jun 13", trend: "up" },
      { label: "Steps", value: "7,812", date: "Jun 12", trend: "down" },
    ],
  },
  "4": {
    id: "4",
    title: "Reduce A1C to 5.2",
    category: "Blood Work",
    categoryVariant: "warning",
    startValue: 5.8,
    currentValue: 5.4,
    targetValue: 5.2,
    unit: "%",
    progress: 72,
    status: "at_risk",
    startDate: "Jan 15, 2026",
    targetDate: "Sep 30, 2026",
    daysRemaining: 106,
    rateOfProgress: "-0.05%/month",
    color: "#F59E0B",
    icon: <Droplets size={22} color="#F59E0B" />,
    weeklyData: [
      { label: "Jan", value: 5.8 },
      { label: "Feb", value: 5.7 },
      { label: "Mar", value: 5.65 },
      { label: "Apr", value: 5.6 },
      { label: "May", value: 5.5 },
      { label: "Jun", value: 5.4 },
    ],
    milestones: [
      { label: "25% reached (5.65%)", status: "completed", date: "Mar 10, 2026" },
      { label: "50% reached (5.5%)", status: "completed", date: "May 1, 2026" },
      { label: "75% reached (5.35%)", status: "upcoming" },
      { label: "Goal achieved (5.2%)", status: "locked" },
    ],
    activityLog: [
      { label: "A1C", value: "5.4%", date: "Jun 1", trend: "down" },
      { label: "A1C", value: "5.5%", date: "May 1", trend: "down" },
      { label: "A1C", value: "5.6%", date: "Apr 1", trend: "down" },
    ],
  },
};

const STATUS_LABELS: Record<
  GoalDetail["status"],
  { label: string; variant: "success" | "warning" | "info" }
> = {
  on_track: { label: "On Track", variant: "success" },
  at_risk: { label: "At Risk", variant: "warning" },
  ahead: { label: "Ahead", variant: "info" },
};

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function GoalDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const goal = GOALS_DATA[id ?? "1"];

  if (!goal) {
    return (
      <SafeAreaView style={styles.container} edges={["bottom"]}>
        <View style={styles.notFound}>
          <Text style={styles.notFoundText}>Goal not found.</Text>
          <Button
            title="Go Back"
            variant="secondary"
            onPress={() => router.back()}
          />
        </View>
      </SafeAreaView>
    );
  }

  const statusInfo = STATUS_LABELS[goal.status];
  const isWeightGoal = goal.category === "Weight";

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ─── Hero Card ─────────────────────────────────────── */}
        <Card style={styles.heroCard}>
          <View style={styles.heroHeader}>
            <View style={styles.heroTitleRow}>
              {goal.icon}
              <Text style={styles.heroTitle}>{goal.title}</Text>
            </View>
            <Badge
              label={goal.category}
              variant={goal.categoryVariant}
            />
          </View>

          <View style={styles.heroRing}>
            <GoalProgressRing
              progress={goal.progress}
              color={goal.color}
              size={180}
              strokeWidth={14}
              centerLabel={`${goal.progress}%`}
              centerSublabel="complete"
            />
          </View>

          <View style={styles.heroValues}>
            <View style={styles.heroValueItem}>
              <Text style={styles.heroValueLabel}>Start</Text>
              <Text style={styles.heroValueText}>
                {goal.startValue} {goal.unit}
              </Text>
            </View>
            <View style={styles.heroValueDivider} />
            <View style={styles.heroValueItem}>
              <Text style={styles.heroValueLabel}>Current</Text>
              <Text style={[styles.heroValueText, { color: Colors.white }]}>
                {goal.currentValue} {goal.unit}
              </Text>
            </View>
            <View style={styles.heroValueDivider} />
            <View style={styles.heroValueItem}>
              <Text style={styles.heroValueLabel}>Target</Text>
              <Text style={[styles.heroValueText, { color: goal.color }]}>
                {goal.targetValue} {goal.unit}
              </Text>
            </View>
          </View>

          <View style={styles.statusRow}>
            <Badge label={statusInfo.label} variant={statusInfo.variant} />
          </View>
        </Card>

        {/* ─── Weekly Progress Chart ─────────────────────────── */}
        <Text style={styles.sectionTitle}>
          <BarChart3 size={16} color={Colors.gold} /> Weekly Progress
        </Text>
        <Card style={styles.chartCard}>
          <BarChart
            data={goal.weeklyData}
            color={goal.color}
            height={140}
            showValues
            unit={goal.unit === "lbs" || goal.unit === "%" ? "" : ""}
            decimals={goal.unit === "%" ? 2 : goal.unit === "hrs" ? 1 : 0}
          />
        </Card>

        {/* ─── Milestones ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>
          <Flag size={16} color={Colors.gold} /> Milestones
        </Text>
        <Card>
          {goal.milestones.map((milestone, idx) => (
            <MilestoneItem
              key={idx}
              label={milestone.label}
              status={milestone.status}
              date={milestone.date}
              showConnector={idx < goal.milestones.length - 1}
            />
          ))}
        </Card>

        {/* ─── Activity Log ──────────────────────────────────── */}
        <Text style={styles.sectionTitle}>
          <Activity size={16} color={Colors.gold} /> Recent Activity
        </Text>
        <Card>
          {goal.activityLog.map((entry, idx) => (
            <GoalActivityItem
              key={idx}
              label={entry.label}
              value={entry.value}
              date={entry.date}
              trend={entry.trend}
              downIsGood={isWeightGoal || goal.category === "Blood Work"}
            />
          ))}
        </Card>

        {/* ─── Stats Card ────────────────────────────────────── */}
        <Text style={styles.sectionTitle}>
          <Info size={16} color={Colors.gold} /> Goal Stats
        </Text>
        <Card>
          <View style={styles.statsGrid}>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Calendar size={16} color={Colors.gold} />
              </View>
              <Text style={styles.statLabel}>Start Date</Text>
              <Text style={styles.statValue}>{goal.startDate}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Calendar size={16} color={Colors.gold} />
              </View>
              <Text style={styles.statLabel}>Target Date</Text>
              <Text style={styles.statValue}>{goal.targetDate}</Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <Clock size={16} color={Colors.gold} />
              </View>
              <Text style={styles.statLabel}>Days Remaining</Text>
              <Text style={styles.statValue}>
                {goal.daysRemaining > 0 ? goal.daysRemaining : "Ongoing"}
              </Text>
            </View>
            <View style={styles.statItem}>
              <View style={styles.statIconWrap}>
                <TrendingDown size={16} color={Colors.gold} />
              </View>
              <Text style={styles.statLabel}>Rate of Progress</Text>
              <Text style={styles.statValue}>{goal.rateOfProgress}</Text>
            </View>
          </View>
        </Card>

        {/* ─── Action Buttons ────────────────────────────────── */}
        <View style={styles.actions}>
          <Button
            title="Edit Goal"
            variant="secondary"
            size="lg"
            icon={<Pencil size={16} color={Colors.gold} />}
            onPress={() =>
              router.push({
                pathname: "/health/create-goal",
                params: { goalId: goal.id },
              })
            }
            style={styles.actionButton}
          />
          <Button
            title="Delete Goal"
            variant="danger"
            size="lg"
            icon={<Trash2 size={16} color={Colors.danger} />}
            onPress={() =>
              Alert.alert(
                "Delete Goal",
                `Are you sure you want to delete "${goal.title}"? This cannot be undone.`,
                [
                  { text: "Cancel", style: "cancel" },
                  {
                    text: "Delete",
                    style: "destructive",
                    onPress: () => router.back(),
                  },
                ]
              )
            }
            style={styles.actionButton}
          />
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

  // Not found
  notFound: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.md,
  },
  notFoundText: {
    color: Colors.silver,
    fontSize: FontSizes.lg,
    fontWeight: "600",
  },

  // Hero
  heroCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: Spacing.lg,
  },
  heroTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    flex: 1,
  },
  heroTitle: {
    color: Colors.white,
    fontSize: FontSizes.xl,
    fontWeight: "700",
    flex: 1,
  },
  heroRing: {
    marginVertical: Spacing.md,
  },
  heroValues: {
    flexDirection: "row",
    alignItems: "center",
    width: "100%",
    paddingTop: Spacing.md,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    marginTop: Spacing.md,
  },
  heroValueItem: {
    flex: 1,
    alignItems: "center",
    gap: 2,
  },
  heroValueLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
  },
  heroValueText: {
    color: Colors.silverLight,
    fontSize: FontSizes.md,
    fontWeight: "700",
  },
  heroValueDivider: {
    width: StyleSheet.hairlineWidth,
    height: 30,
    backgroundColor: Colors.border,
  },
  statusRow: {
    marginTop: Spacing.md,
  },

  // Section titles
  sectionTitle: {
    color: Colors.white,
    fontSize: FontSizes.lg,
    fontWeight: "700",
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },

  // Chart
  chartCard: {
    paddingVertical: Spacing.md,
  },

  // Stats grid
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: Spacing.md,
  },
  statItem: {
    width: "47%",
    alignItems: "center",
    paddingVertical: Spacing.sm,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xs,
  },
  statLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "500",
    marginTop: 4,
  },
  statValue: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
    marginTop: 2,
  },

  // Actions
  actions: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  actionButton: {
    width: "100%",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
