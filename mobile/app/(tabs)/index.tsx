/**
 * Home / Dashboard tab.
 *
 * Full-featured health dashboard matching the Everist.ai web design.
 * Displays health score ring, KPI cards, today's schedule, biometrics
 * overview, active protocols, and recent alerts.
 *
 * Uses tRPC hooks from @/hooks/useHealthData for live data with
 * automatic fallback to sample data when the API is unreachable.
 * Schedule shows an empty state (no tRPC endpoint yet).
 * Protocol data still uses static sample data until
 * that endpoint is available.
 */

import React, { useState, useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, Platform, RefreshControl, ActivityIndicator, Pressable } from "react-native";
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
// SAMPLE_DATA no longer needed here — protocol data comes from useDashboardProtocol hook
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
import {
  useHealthScore,
  useDashboardOverview,
  useAlerts,
} from "@/hooks/useHealthData";
import { useDashboardProtocol } from "@/hooks/useProtocols";

// Protocol data is now fetched via the useDashboardProtocol hook below.

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

  // ── tRPC data hooks ──────────────────────────────────────────
  const healthScore = useHealthScore();
  const overview = useDashboardOverview();
  const alertsHook = useAlerts("active");
  const protocolHook = useDashboardProtocol();

  // Derived data from hooks
  const HEALTH_SCORE = healthScore.healthScore;
  const healthScoreDetail = healthScore.healthScoreDetail;
  const KPI_DATA = overview.kpiData;
  const BIOMETRICS_DATA = overview.biometricsData;
  const ALERTS_DATA = alertsHook.alerts;
  const PROTOCOL_DATA = protocolHook.protocols;

  const isLoading = healthScore.isLoading || overview.isLoading || alertsHook.isLoading || protocolHook.isLoading;

  // ── Pull-to-refresh ──────────────────────────────────────────
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([
      healthScore.refetch(),
      overview.refetch(),
      alertsHook.refetch(),
      protocolHook.refetch(),
    ]);
    setRefreshing(false);
  }, [healthScore.refetch, overview.refetch, alertsHook.refetch, protocolHook.refetch]);

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
      {/* Subtle top loading bar */}
      {isLoading && !refreshing && (
        <View style={styles.loadingBar}>
          <ActivityIndicator size="small" color={Colors.gold} />
        </View>
      )}

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
        <Pressable onPress={() => router.push("/insights")}>
          <Card style={styles.heroCard}>
            <HealthScoreRing score={HEALTH_SCORE} size={160} strokeWidth={12} />
            <Text style={styles.heroLabel}>Overall Health Score</Text>
            <View style={styles.heroStatsRow}>
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{healthScoreDetail.subScores[0]?.value ?? KPI_DATA.sleep.quality}</Text>
                <Text style={styles.heroStatLabel}>Sleep</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{healthScoreDetail.subScores[1]?.value ?? BIOMETRICS_DATA.glucose.value}</Text>
                <Text style={styles.heroStatLabel}>Glucose</Text>
              </View>
              <View style={styles.heroDivider} />
              <View style={styles.heroStat}>
                <Text style={styles.heroStatValue}>{healthScoreDetail.subScores[2]?.value ?? BIOMETRICS_DATA.hrv.value}</Text>
                <Text style={styles.heroStatLabel}>HRV</Text>
              </View>
            </View>
          </Card>
        </Pressable>

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
            onPress={() => router.push("/protocols/workouts")}
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
        <Card style={styles.emptyScheduleCard}>
          <Text style={styles.emptyScheduleText}>No appointments scheduled today</Text>
          <Text
            style={styles.emptyScheduleLink}
            onPress={() => router.push("/appointments")}
          >
            Book an appointment
          </Text>
        </Card>

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
              onPress={() => router.push("/protocols/workouts")}
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
              {alertsHook.total} active
            </Text>
          </View>
        </View>
        {ALERTS_DATA.map((alert: any) => (
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

  // Loading indicator
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

  // Empty schedule state
  emptyScheduleCard: {
    alignItems: "center",
    paddingVertical: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  emptyScheduleText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    marginBottom: Spacing.sm,
  },
  emptyScheduleLink: {
    color: Colors.gold,
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },

  // Bottom spacer
  bottomSpacer: {
    height: Spacing.xxl,
  },
});
