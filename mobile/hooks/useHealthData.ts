/**
 * useHealthData — Custom hook for dashboard and health screen data.
 *
 * Tries to fetch real data via tRPC from the Everist backend.
 * Falls back to sample data when the API is unreachable (demo mode).
 *
 * tRPC paths used (under `clientPortal`):
 *   - dashboard.getOverview       → KPIs, latest biometrics
 *   - dashboard.getHealthScore    → computed health score
 *   - dashboard.getSparklines     → 7-day sparkline arrays
 *   - dashboard.getRecentActivity → alerts / activity feed
 *   - alerts.list                 → full alert list
 */

import { trpc, SAMPLE_DATA, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useHealthScore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useHealthScore() {
  const query = trpc.clientPortal.dashboard.getHealthScore.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // Map backend shape → sample shape for seamless fallback
  const data = query.data
    ? {
        overall: query.data.score,
        trend: "up" as const,
        trendDelta: 0,
        trendLabel: "",
        subScores: [
          { label: "Sleep", value: query.data.avgSleep ?? 0 },
          { label: "Glucose", value: query.data.avgGlucose ?? 0 },
          { label: "HRV", value: query.data.hrv ?? 0 },
        ],
      }
    : SAMPLE_DATA.healthScoreDetail;

  return {
    healthScore: query.data?.score ?? SAMPLE_DATA.healthScore,
    healthScoreDetail: data,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useDashboardOverview
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDashboardOverview() {
  const query = trpc.clientPortal.dashboard.getOverview.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  // Translate API KPIs into the shape the dashboard screen currently expects
  const kpis = query.data?.kpis;

  const kpiData = kpis
    ? {
        sleep: {
          hours: kpis.sleep?.duration
            ? +(kpis.sleep.duration / 60).toFixed(1)
            : SAMPLE_DATA.kpiData.sleep.hours,
          quality: kpis.sleep?.quality ?? SAMPLE_DATA.kpiData.sleep.quality,
          sparkData: SAMPLE_DATA.kpiData.sleep.sparkData, // sparklines come from a separate query
        },
        heartRate: {
          bpm: kpis.heartRate?.value ?? SAMPLE_DATA.kpiData.heartRate.bpm,
          resting: SAMPLE_DATA.kpiData.heartRate.resting,
          sparkData: SAMPLE_DATA.kpiData.heartRate.sparkData,
        },
        steps: {
          count: kpis.steps?.value ?? SAMPLE_DATA.kpiData.steps.count,
          goal: SAMPLE_DATA.kpiData.steps.goal,
          sparkData: SAMPLE_DATA.kpiData.steps.sparkData,
        },
        weight: {
          lbs: kpis.weight?.value ?? SAMPLE_DATA.kpiData.weight.lbs,
          trend: SAMPLE_DATA.kpiData.weight.trend,
          trendValue: SAMPLE_DATA.kpiData.weight.trendValue,
          sparkData: SAMPLE_DATA.kpiData.weight.sparkData,
        },
      }
    : SAMPLE_DATA.kpiData;

  const biometricsData = kpis
    ? {
        bloodPressure: {
          value: kpis.bloodPressure
            ? `${kpis.bloodPressure.systolic}/${kpis.bloodPressure.diastolic}`
            : SAMPLE_DATA.biometricsData.bloodPressure.value,
          unit: SAMPLE_DATA.biometricsData.bloodPressure.unit,
          status: SAMPLE_DATA.biometricsData.bloodPressure.status,
          sparkData: SAMPLE_DATA.biometricsData.bloodPressure.sparkData,
          sparkColor: SAMPLE_DATA.biometricsData.bloodPressure.sparkColor,
          iconBg: SAMPLE_DATA.biometricsData.bloodPressure.iconBg,
        },
        glucose: {
          value: kpis.glucose?.value ?? SAMPLE_DATA.biometricsData.glucose.value,
          unit: SAMPLE_DATA.biometricsData.glucose.unit,
          status: SAMPLE_DATA.biometricsData.glucose.status,
          sparkData: SAMPLE_DATA.biometricsData.glucose.sparkData,
          sparkColor: SAMPLE_DATA.biometricsData.glucose.sparkColor,
          iconBg: SAMPLE_DATA.biometricsData.glucose.iconBg,
        },
        sleepScore: {
          value: kpis.sleep?.quality ?? SAMPLE_DATA.biometricsData.sleepScore.value,
          unit: SAMPLE_DATA.biometricsData.sleepScore.unit,
          status: SAMPLE_DATA.biometricsData.sleepScore.status,
          sparkData: SAMPLE_DATA.biometricsData.sleepScore.sparkData,
          sparkColor: SAMPLE_DATA.biometricsData.sleepScore.sparkColor,
          iconBg: SAMPLE_DATA.biometricsData.sleepScore.iconBg,
        },
        hrv: {
          value: kpis.hrv?.value ?? SAMPLE_DATA.biometricsData.hrv.value,
          unit: SAMPLE_DATA.biometricsData.hrv.unit,
          status: SAMPLE_DATA.biometricsData.hrv.status,
          sparkData: SAMPLE_DATA.biometricsData.hrv.sparkData,
          sparkColor: SAMPLE_DATA.biometricsData.hrv.sparkColor,
          iconBg: SAMPLE_DATA.biometricsData.hrv.iconBg,
        },
        bodyWeight: {
          value: kpis.weight?.value ?? SAMPLE_DATA.biometricsData.bodyWeight.value,
          unit: SAMPLE_DATA.biometricsData.bodyWeight.unit,
          status: SAMPLE_DATA.biometricsData.bodyWeight.status,
          sparkData: SAMPLE_DATA.biometricsData.bodyWeight.sparkData,
          sparkColor: SAMPLE_DATA.biometricsData.bodyWeight.sparkColor,
          iconBg: SAMPLE_DATA.biometricsData.bodyWeight.iconBg,
        },
        dailySteps: {
          value: kpis.steps?.value
            ? kpis.steps.value.toLocaleString()
            : SAMPLE_DATA.biometricsData.dailySteps.value,
          unit: SAMPLE_DATA.biometricsData.dailySteps.unit,
          status: SAMPLE_DATA.biometricsData.dailySteps.status,
          sparkData: SAMPLE_DATA.biometricsData.dailySteps.sparkData,
          sparkColor: SAMPLE_DATA.biometricsData.dailySteps.sparkColor,
          iconBg: SAMPLE_DATA.biometricsData.dailySteps.iconBg,
        },
      }
    : SAMPLE_DATA.biometricsData;

  return {
    kpiData,
    biometricsData,
    unreadAlerts: kpis?.unreadAlerts ?? SAMPLE_DATA.alerts.length,
    checkedInToday: kpis?.checkedInToday ?? false,
    profile: query.data?.profile ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSparklines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useSparklines() {
  const query = trpc.clientPortal.dashboard.getSparklines.useQuery(
    undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const sparklines = query.data
    ? {
        sleep: query.data.sleep.map((s: any) => s.hours ?? 0),
        sleepScores: query.data.sleep.map((s: any) => s.score ?? 0),
        glucose: query.data.glucose.map((g: any) => g.avg),
        bpSystolic: query.data.bp.map((b: any) => b.sys),
      }
    : null;

  return {
    sparklines,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAlerts
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAlerts(status: "active" | "all" = "all") {
  const query = trpc.clientPortal.alerts.list.useQuery(
    { status, limit: 20, offset: 0 },
    DEFAULT_QUERY_OPTIONS,
  );

  const alerts = query.data?.alerts
    ? query.data.alerts.map((a: any) => ({
        id: a.id,
        title: a.title,
        message: a.message,
        timestamp: a.createdAt
          ? formatRelativeTime(new Date(a.createdAt))
          : "",
        priority: a.priority === "high" || a.priority === "critical" ? "action" : "info",
        type: a.type ?? "general",
      }))
    : SAMPLE_DATA.alerts;

  return {
    alerts,
    total: query.data?.total ?? SAMPLE_DATA.alerts.length,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useBiometricCategories  (Health tab grid)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useBiometricCategories() {
  // We rely on the dashboard overview for latest values and
  // sparklines for trend data — both already fetched above.
  // This hook assembles the Health-screen grid shape.
  const overview = useDashboardOverview();
  const sparks = useSparklines();

  // When API data is available, overlay sparklines onto biometric categories
  const categories = SAMPLE_DATA.biometricCategories.map((cat) => {
    if (!sparks.sparklines) return cat;

    switch (cat.id) {
      case "sleep":
        return sparks.sparklines.sleep.length
          ? { ...cat, sparkData: sparks.sparklines.sleep }
          : cat;
      case "glucose":
        return sparks.sparklines.glucose.length
          ? { ...cat, sparkData: sparks.sparklines.glucose }
          : cat;
      case "bloodPressure":
        return sparks.sparklines.bpSystolic.length
          ? { ...cat, sparkData: sparks.sparklines.bpSystolic }
          : cat;
      default:
        return cat;
    }
  });

  return {
    categories,
    isLoading: overview.isLoading || sparks.isLoading,
    error: overview.error ?? sparks.error,
    refetch: () => {
      overview.refetch();
      sparks.refetch();
    },
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  return `${diffDays}d ago`;
}
