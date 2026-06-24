/**
 * Home / Dashboard tab.
 *
 * Full-featured health dashboard matching the Everist.ai web design.
 * Displays health score ring, KPI cards, today's schedule, biometrics
 * overview, active protocols, and recent alerts.
 *
 * Currently uses inline sample data; will be wired to tRPC later.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, RefreshControl } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import {
  Moon,
  Heart,
  Footprints,
  Activity,
  Droplets,
  Scale,
  Brain,
  Pill,
  Dumbbell,
  Syringe,
  Bell,
  AlertTriangle,
  MessageSquare,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import {
  HealthScoreRing,
  KPICard,
  BiometricCard,
  ScheduleItem,
  ProtocolItem,
  AlertItem,
  SectionHeader,
} from "@/components/dashboard";
import { SummitGlyph } from "@/components/brand";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Sample Data — will be replaced with tRPC queries
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const HEALTH_SCORE = 82;

const KPI_DATA = {
  sleep: {
    hours: 7.4,
    quality: 88,
    sparkData: [6.8, 7.1, 7.5, 6.9, 7.2, 7.8, 7.4],
  },
  heartRate: {
    bpm: 62,
    resting: 58,
    sparkData: [64, 61, 63, 60, 62, 59, 62],
  },
  steps: {
    count: 8742,
    goal: 10000,
    sparkData: [6200, 9100, 7800, 10200, 8400, 11300, 8742],
  },
  weight: {
    lbs: 178.4,
    trend: "down" as const,
    trendValue: "-1.2 lbs",
    sparkData: [181.2, 180.5, 180.1, 179.6, 179.2, 178.8, 178.4],
  },
};

const SCHEDULE_DATA = [
  {
    id: "1",
    time: "9:00 AM",
    title: "Blood Panel Review",
    type: "lab_review" as const,
    trainerName: "Dr. Chen",
    duration: "30 min",
  },
  {
    id: "2",
    time: "11:30 AM",
    title: "Strength Training",
    type: "workout" as const,
    trainerName: "Coach Marcus",
    duration: "60 min",
  },
  {
    id: "3",
    time: "2:00 PM",
    title: "Nutrition Consultation",
    type: "nutrition" as const,
    trainerName: "Sarah Miller, RD",
    duration: "45 min",
  },
  {
    id: "4",
    time: "5:30 PM",
    title: "Weekly Check-in",
    type: "check_in" as const,
    trainerName: "Dr. Chen",
    duration: "15 min",
  },
];

const BIOMETRICS_DATA = {
  bloodPressure: {
    value: "118/76",
    unit: "mmHg",
    status: "normal" as const,
    sparkData: [122, 120, 119, 121, 118, 117, 118],
    sparkColor: "#C65D5D",
    iconBg: "rgba(198, 93, 93, 0.12)",
  },
  glucose: {
    value: 92,
    unit: "mg/dL",
    status: "optimal" as const,
    sparkData: [98, 95, 91, 94, 89, 93, 92],
    sparkColor: "#F59E0B",
    iconBg: "rgba(245, 158, 11, 0.12)",
  },
  sleepScore: {
    value: 88,
    unit: "/100",
    status: "optimal" as const,
    sparkData: [82, 85, 79, 88, 84, 91, 88],
    sparkColor: "#60A5FA",
    iconBg: "rgba(96, 165, 250, 0.12)",
  },
  hrv: {
    value: 48,
    unit: "ms",
    status: "normal" as const,
    sparkData: [42, 45, 44, 47, 43, 49, 48],
    sparkColor: "#A78BFA",
    iconBg: "rgba(167, 139, 250, 0.12)",
  },
  bodyWeight: {
    value: 178.4,
    unit: "lbs",
    status: "normal" as const,
    sparkData: [181.2, 180.5, 180.1, 179.6, 179.2, 178.8, 178.4],
    sparkColor: Colors.gold,
    iconBg: "rgba(74, 144, 217, 0.12)",
  },
  dailySteps: {
    value: "8,742",
    unit: "steps",
    status: "normal" as const,
    sparkData: [6200, 9100, 7800, 10200, 8400, 11300, 8742],
    sparkColor: Colors.success,
    iconBg: "rgba(74, 157, 91, 0.12)",
  },
};

const PROTOCOL_DATA = [
  {
    id: "p1",
    title: "Vitamin D3 + K2",
    dosage: "5,000 IU + 200 mcg",
    time: "Morning",
    category: "supplement" as const,
    completed: true,
  },
  {
    id: "p2",
    title: "Omega-3 Fish Oil",
    dosage: "2,000 mg EPA/DHA",
    time: "Morning",
    category: "supplement" as const,
    completed: true,
  },
  {
    id: "p3",
    title: "Magnesium Glycinate",
    dosage: "400 mg",
    time: "Evening",
    category: "supplement" as const,
    completed: false,
  },
  {
    id: "p4",
    title: "Metformin ER",
    dosage: "500 mg",
    time: "With dinner",
    category: "medication" as const,
    completed: false,
  },
  {
    id: "p5",
    title: "Zone 2 Cardio",
    dosage: "45 min, HR 120-135",
    time: "Afternoon",
    category: "exercise" as const,
    completed: false,
  },
  {
    id: "p6",
    title: "BPC-157",
    dosage: "250 mcg subQ",
    time: "Morning",
    category: "peptide" as const,
    completed: true,
  },
];

const ALERTS_DATA = [
  {
    id: "a1",
    title: "Glucose spike detected",
    message: "Post-meal glucose reached 162 mg/dL at 1:23 PM yesterday. Consider adjusting carb intake.",
    timestamp: "2h ago",
    priority: "action" as const,
    type: "glucose" as const,
  },
  {
    id: "a2",
    title: "New lab results available",
    message: "Your comprehensive metabolic panel results are ready for review.",
    timestamp: "5h ago",
    priority: "info" as const,
    type: "labs" as const,
  },
  {
    id: "a3",
    title: "Sleep quality declining",
    message: "Average sleep score dropped 12% over the past week. Review your sleep hygiene routine.",
    timestamp: "1d ago",
    priority: "action" as const,
    type: "sleep" as const,
  },
  {
    id: "a4",
    title: "Coach message",
    message: "Great progress on your weight goal this month! Let's discuss next steps.",
    timestamp: "1d ago",
    priority: "info" as const,
    type: "coach" as const,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Alert icon helper
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function getAlertIcon(type: string): React.ReactNode {
  const size = 14;
  switch (type) {
    case "glucose":
      return <Droplets size={size} color="#F59E0B" />;
    case "heart_rate":
      return <Activity size={size} color={Colors.danger} />;
    case "sleep":
      return <Moon size={size} color="#60A5FA" />;
    case "hrv":
      return <Brain size={size} color="#A78BFA" />;
    case "coach":
      return <MessageSquare size={size} color={Colors.success} />;
    case "labs":
      return <Activity size={size} color="#22D3EE" />;
    default:
      return <Bell size={size} color={Colors.silver} />;
  }
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Dashboard Screen
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function HomeScreen() {
  const router = useRouter();
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate data refresh (will be replaced with real tRPC refetch later)
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  const completedProtocols = PROTOCOL_DATA.filter((p) => p.completed).length;
  const totalProtocols = PROTOCOL_DATA.length;
  const adherencePercent = Math.round((completedProtocols / totalProtocols) * 100);

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
        {/* ─── Header ─────────────────────────────────────── */}
        <View style={styles.headerRow}>
          <View>
            <View style={styles.headerTitleRow}>
              <SummitGlyph size={32} />
              <Text style={styles.headerTitle}>Dashboard</Text>
            </View>
            <Text style={styles.headerDate}>{today}</Text>
          </View>
        </View>

        {/* ─── 1. Health Score Hero ────────────────────────── */}
        <Card style={styles.heroCard}>
          <HealthScoreRing score={HEALTH_SCORE} size={160} strokeWidth={12} />
          <Text style={styles.heroLabel}>Overall Health Score</Text>
          <View style={styles.heroStatsRow}>
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{KPI_DATA.sleep.quality}</Text>
              <Text style={styles.heroStatLabel}>Sleep</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{BIOMETRICS_DATA.glucose.value}</Text>
              <Text style={styles.heroStatLabel}>Glucose</Text>
            </View>
            <View style={styles.heroDivider} />
            <View style={styles.heroStat}>
              <Text style={styles.heroStatValue}>{BIOMETRICS_DATA.hrv.value}</Text>
              <Text style={styles.heroStatLabel}>HRV</Text>
            </View>
          </View>
        </Card>

        {/* ─── 2. KPI Cards Row ───────────────────────────── */}
        <SectionHeader title="Key Metrics" />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.kpiScrollContent}
          style={styles.kpiScroll}
        >
          <KPICard
            icon={<Moon size={16} color="#60A5FA" />}
            label="Sleep"
            value={KPI_DATA.sleep.hours}
            unit="hrs"
            subtitle={`Quality: ${KPI_DATA.sleep.quality}/100`}
            trend="up"
            iconBgColor="rgba(96, 165, 250, 0.12)"
            sparkData={KPI_DATA.sleep.sparkData}
            sparkColor="#60A5FA"
            onPress={() => router.push("/health/sleep")}
          />
          <KPICard
            icon={<Heart size={16} color={Colors.danger} />}
            label="Heart Rate"
            value={KPI_DATA.heartRate.bpm}
            unit="bpm"
            subtitle={`Resting: ${KPI_DATA.heartRate.resting} bpm`}
            trend="down"
            iconBgColor="rgba(198, 93, 93, 0.12)"
            sparkData={KPI_DATA.heartRate.sparkData}
            sparkColor={Colors.danger}
            onPress={() => router.push("/health/body")}
          />
          <KPICard
            icon={<Footprints size={16} color={Colors.success} />}
            label="Steps"
            value={KPI_DATA.steps.count.toLocaleString()}
            unit=""
            subtitle={`Goal: ${KPI_DATA.steps.goal.toLocaleString()}`}
            trend="up"
            trendValue={`${Math.round((KPI_DATA.steps.count / KPI_DATA.steps.goal) * 100)}%`}
            iconBgColor="rgba(74, 157, 91, 0.12)"
            sparkData={KPI_DATA.steps.sparkData}
            sparkColor={Colors.success}
            onPress={() => router.push("/health/goals")}
          />
          <KPICard
            icon={<Scale size={16} color={Colors.gold} />}
            label="Weight"
            value={KPI_DATA.weight.lbs}
            unit="lbs"
            subtitle={KPI_DATA.weight.trendValue}
            trend={KPI_DATA.weight.trend}
            iconBgColor="rgba(74, 144, 217, 0.12)"
            sparkData={KPI_DATA.weight.sparkData}
            sparkColor={Colors.gold}
            onPress={() => router.push("/health/body")}
          />
        </ScrollView>

        {/* ─── 3. Today's Schedule ─────────────────────────── */}
        <SectionHeader title="Today's Schedule" actionLabel="View all" onAction={() => router.push("/appointments")} />
        {SCHEDULE_DATA.map((item) => (
          <ScheduleItem
            key={item.id}
            time={item.time}
            title={item.title}
            type={item.type}
            trainerName={item.trainerName}
            duration={item.duration}
          />
        ))}

        {/* ─── 4. Biometrics Overview ─────────────────────── */}
        <SectionHeader title="Biometrics" actionLabel="View all" onAction={() => router.push("/(tabs)/health")} />
        <View style={styles.biometricsGrid}>
          {/* Row 1 */}
          <View style={styles.biometricsRow}>
            <BiometricCard
              icon={<Heart size={14} color={Colors.danger} />}
              label="Blood Pressure"
              value={BIOMETRICS_DATA.bloodPressure.value}
              unit={BIOMETRICS_DATA.bloodPressure.unit}
              status={BIOMETRICS_DATA.bloodPressure.status}
              sparkData={BIOMETRICS_DATA.bloodPressure.sparkData}
              sparkColor={BIOMETRICS_DATA.bloodPressure.sparkColor}
              iconBgColor={BIOMETRICS_DATA.bloodPressure.iconBg}
              onPress={() => router.push("/health/blood-pressure")}
            />
            <BiometricCard
              icon={<Droplets size={14} color="#F59E0B" />}
              label="Glucose"
              value={BIOMETRICS_DATA.glucose.value}
              unit={BIOMETRICS_DATA.glucose.unit}
              status={BIOMETRICS_DATA.glucose.status}
              sparkData={BIOMETRICS_DATA.glucose.sparkData}
              sparkColor={BIOMETRICS_DATA.glucose.sparkColor}
              iconBgColor={BIOMETRICS_DATA.glucose.iconBg}
              onPress={() => router.push("/health/glucose")}
            />
          </View>
          {/* Row 2 */}
          <View style={styles.biometricsRow}>
            <BiometricCard
              icon={<Moon size={14} color="#60A5FA" />}
              label="Sleep Score"
              value={BIOMETRICS_DATA.sleepScore.value}
              unit={BIOMETRICS_DATA.sleepScore.unit}
              status={BIOMETRICS_DATA.sleepScore.status}
              sparkData={BIOMETRICS_DATA.sleepScore.sparkData}
              sparkColor={BIOMETRICS_DATA.sleepScore.sparkColor}
              iconBgColor={BIOMETRICS_DATA.sleepScore.iconBg}
              onPress={() => router.push("/health/sleep")}
            />
            <BiometricCard
              icon={<Brain size={14} color="#A78BFA" />}
              label="HRV"
              value={BIOMETRICS_DATA.hrv.value}
              unit={BIOMETRICS_DATA.hrv.unit}
              status={BIOMETRICS_DATA.hrv.status}
              sparkData={BIOMETRICS_DATA.hrv.sparkData}
              sparkColor={BIOMETRICS_DATA.hrv.sparkColor}
              iconBgColor={BIOMETRICS_DATA.hrv.iconBg}
              onPress={() => router.push("/health/body")}
            />
          </View>
          {/* Row 3 */}
          <View style={styles.biometricsRow}>
            <BiometricCard
              icon={<Scale size={14} color={Colors.gold} />}
              label="Body Weight"
              value={BIOMETRICS_DATA.bodyWeight.value}
              unit={BIOMETRICS_DATA.bodyWeight.unit}
              status={BIOMETRICS_DATA.bodyWeight.status}
              sparkData={BIOMETRICS_DATA.bodyWeight.sparkData}
              sparkColor={BIOMETRICS_DATA.bodyWeight.sparkColor}
              iconBgColor={BIOMETRICS_DATA.bodyWeight.iconBg}
              onPress={() => router.push("/health/body")}
            />
            <BiometricCard
              icon={<Footprints size={14} color={Colors.success} />}
              label="Steps"
              value={BIOMETRICS_DATA.dailySteps.value}
              unit={BIOMETRICS_DATA.dailySteps.unit}
              status={BIOMETRICS_DATA.dailySteps.status}
              sparkData={BIOMETRICS_DATA.dailySteps.sparkData}
              sparkColor={BIOMETRICS_DATA.dailySteps.sparkColor}
              iconBgColor={BIOMETRICS_DATA.dailySteps.iconBg}
              onPress={() => router.push("/health/goals")}
            />
          </View>
        </View>

        {/* ─── 5. Active Protocols ─────────────────────────── */}
        <SectionHeader title="Active Protocols" actionLabel="View all" onAction={() => router.push("/(tabs)/protocols")} />
        <View style={styles.protocolProgress}>
          <View style={styles.progressTrack}>
            <View
              style={[
                styles.progressFill,
                { width: `${adherencePercent}%` },
              ]}
            />
          </View>
          <Text style={styles.progressText}>
            {completedProtocols}/{totalProtocols} completed today
          </Text>
        </View>
        {PROTOCOL_DATA.map((item) => (
          <ProtocolItem
            key={item.id}
            title={item.title}
            dosage={item.dosage}
            time={item.time}
            category={item.category}
            completed={item.completed}
          />
        ))}

        {/* ─── 6. Recent Alerts ────────────────────────────── */}
        <SectionHeader title="Alerts" actionLabel="View all" onAction={() => router.push("/insights")} />
        <View style={styles.alertsBadgeRow}>
          <View style={styles.alertsBadge}>
            <Bell size={12} color={Colors.gold} />
            <Text style={styles.alertsBadgeText}>
              {ALERTS_DATA.length} active
            </Text>
          </View>
        </View>
        {ALERTS_DATA.map((alert) => (
          <AlertItem
            key={alert.id}
            icon={getAlertIcon(alert.type)}
            title={alert.title}
            message={alert.message}
            timestamp={alert.timestamp}
            priority={alert.priority}
          />
        ))}

        {/* Bottom spacer for tab bar */}
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

  // Header
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: Spacing.md,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
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

  // Hero card
  heroCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  heroLabel: {
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

  // KPI scroll
  kpiScroll: {
    marginHorizontal: -Spacing.md,
    marginBottom: Spacing.sm,
  },
  kpiScrollContent: {
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.xs,
  },

  // Biometrics grid
  biometricsGrid: {
    gap: Spacing.sm,
  },
  biometricsRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },

  // Protocol progress bar
  protocolProgress: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: Radii.full,
  },
  progressText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: "600",
  },

  // Alerts badge
  alertsBadgeRow: {
    marginBottom: Spacing.sm,
  },
  alertsBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    backgroundColor: "rgba(74, 144, 217, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: Radii.full,
  },
  alertsBadgeText: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: "600",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
