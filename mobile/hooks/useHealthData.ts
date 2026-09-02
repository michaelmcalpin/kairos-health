/**
 * useHealthData — Custom hooks for dashboard and health screen data.
 *
 * Fetches real data via tRPC from the Everist backend. These hooks return
 * honest values: real data when the backend has it, and null / empty
 * (never fabricated sample data) when it doesn't. Screens are responsible
 * for rendering empty states from these null/empty values.
 *
 * tRPC paths used (under `clientPortal`):
 *   - dashboard.getOverview       → KPIs, latest biometrics
 *   - dashboard.getHealthScore    → computed health score
 *   - dashboard.getSparklines     → 7-day sparkline arrays
 *   - alerts.list                 → alert list
 */

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { round } from "@/lib/format";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Date range support
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type HealthDateRange = "today" | "week" | "month" | "year";

export interface DateRangeDates {
  startDate: string;
  endDate: string;
}

/** Convert a UI range selection into ISO date strings (YYYY-MM-DD). */
export function rangeToDates(range: HealthDateRange): DateRangeDates {
  const end = new Date();
  const start = new Date();
  switch (range) {
    case "today":
      // Today only — start at midnight
      break;
    case "week":
      start.setDate(start.getDate() - 7);
      break;
    case "month":
      start.setDate(start.getDate() - 30);
      break;
    case "year":
      start.setDate(start.getDate() - 365);
      break;
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export interface HealthScoreDetail {
  overall: number;
  trend: "up" | "down" | "flat";
  trendDelta: number;
  trendLabel: string;
  /** Only sub-scores that have real backing data are included. */
  subScores: { label: string; value: number }[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useHealthScore
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useHealthScore(range?: DateRangeDates) {
  const query = trpc.clientPortal.dashboard.getHealthScore.useQuery(
    range ?? undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const data = query.data as any;
  const hasScore = data?.score != null;

  // Build a detail object only from real, present values. When the backend
  // reports no data (`{ score: null, hasData: false }`) we return null so
  // the screen can show an honest empty state.
  const healthScoreDetail: HealthScoreDetail | null = hasScore
    ? {
        overall: Number(data.score),
        trend: "flat",
        trendDelta: 0,
        trendLabel: "",
        subScores: [
          // Sleep sub-score is in hours → 1 dp. Glucose & HRV → 0 dp.
          data.avgSleep != null
            ? { label: "Sleep", value: round(Number(data.avgSleep), 1) as number }
            : null,
          data.avgGlucose != null
            ? { label: "Glucose", value: round(Number(data.avgGlucose), 0) as number }
            : null,
          data.hrv != null
            ? { label: "HRV", value: round(Number(data.hrv), 0) as number }
            : null,
        ].filter(Boolean) as { label: string; value: number }[],
      }
    : null;

  return {
    healthScore: hasScore ? (Number(data.score) as number) : null,
    healthScoreDetail,
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

  const kpis = (query.data as any)?.kpis ?? null;

  // KPI values are real or null. Sparklines are not part of this endpoint,
  // so they are empty here (the Health tab pulls real sparklines separately).
  const kpiData = {
    sleep: {
      hours:
        kpis?.sleep?.duration != null
          ? +(Number(kpis.sleep.duration) / 60).toFixed(1)
          : null,
      // Sleep quality is a 0-100 score → 0 dp.
      quality: kpis?.sleep?.quality != null ? round(Number(kpis.sleep.quality), 0) : null,
      sparkData: [] as number[],
    },
    heartRate: {
      // Heart rate → 0 dp.
      bpm: kpis?.heartRate?.value != null ? round(Number(kpis.heartRate.value), 0) : null,
      resting: null as number | null,
      sparkData: [] as number[],
    },
    steps: {
      // Steps are a count → 0 dp.
      count: kpis?.steps?.value != null ? round(Number(kpis.steps.value), 0) : null,
      goal: null as number | null,
      sparkData: [] as number[],
    },
    weight: {
      // Weight → 1 dp.
      lbs: kpis?.weight?.value != null ? round(Number(kpis.weight.value), 1) : null,
      trend: null as "up" | "down" | "flat" | null,
      trendValue: null as string | null,
      sparkData: [] as number[],
    },
  };

  const biometricsData = {
    bloodPressure: {
      // Blood pressure → 0 dp on each of systolic / diastolic.
      value: kpis?.bloodPressure
        ? `${round(Number(kpis.bloodPressure.systolic), 0)}/${round(Number(kpis.bloodPressure.diastolic), 0)}`
        : null,
      unit: "mmHg",
      status: undefined as undefined,
      sparkData: [] as number[],
      sparkColor: "#C65D5D",
      iconBg: "rgba(198, 93, 93, 0.12)",
    },
    glucose: {
      // Glucose → 0 dp.
      value: kpis?.glucose?.value != null ? round(Number(kpis.glucose.value), 0) : null,
      unit: "mg/dL",
      status: undefined as undefined,
      sparkData: [] as number[],
      sparkColor: "#F59E0B",
      iconBg: "rgba(245, 158, 11, 0.12)",
    },
    sleepScore: {
      // Sleep score → 0 dp.
      value: kpis?.sleep?.quality != null ? round(Number(kpis.sleep.quality), 0) : null,
      unit: "/100",
      status: undefined as undefined,
      sparkData: [] as number[],
      sparkColor: "#60A5FA",
      iconBg: "rgba(96, 165, 250, 0.12)",
    },
    hrv: {
      // HRV (ms) → 0 dp.
      value: kpis?.hrv?.value != null ? round(Number(kpis.hrv.value), 0) : null,
      unit: "ms",
      status: undefined as undefined,
      sparkData: [] as number[],
      sparkColor: "#A78BFA",
      iconBg: "rgba(167, 139, 250, 0.12)",
    },
    bodyWeight: {
      // Body weight → 1 dp.
      value: kpis?.weight?.value != null ? round(Number(kpis.weight.value), 1) : null,
      unit: "lbs",
      status: undefined as undefined,
      sparkData: [] as number[],
      sparkColor: "#4A90D9",
      iconBg: "rgba(74, 144, 217, 0.12)",
    },
    dailySteps: {
      // Steps are a count → 0 dp (then grouped with thousands separators).
      value:
        kpis?.steps?.value != null
          ? (round(Number(kpis.steps.value), 0) as number).toLocaleString()
          : null,
      unit: "steps",
      status: undefined as undefined,
      sparkData: [] as number[],
      sparkColor: "#4A9D5B",
      iconBg: "rgba(74, 157, 91, 0.12)",
    },
  };

  return {
    kpiData,
    biometricsData,
    /** Raw KPI payload (with timestamps) for consumers that need it. */
    kpis,
    unreadAlerts: kpis?.unreadAlerts ?? 0,
    checkedInToday: kpis?.checkedInToday ?? false,
    profile: (query.data as any)?.profile ?? null,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useSparklines
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useSparklines(range?: DateRangeDates) {
  const query = trpc.clientPortal.dashboard.getSparklines.useQuery(
    range ?? undefined,
    DEFAULT_QUERY_OPTIONS,
  );

  const data = query.data as any;

  // Real arrays when present, empty arrays otherwise — never sample data.
  const sparklines = {
    sleep: (data?.sleep ?? [])
      .map((s: any) => s.hours)
      .filter((n: any): n is number => n != null),
    sleepScores: (data?.sleep ?? [])
      .map((s: any) => s.score)
      .filter((n: any): n is number => n != null),
    glucose: (data?.glucose ?? [])
      .map((g: any) => g.avg)
      .filter((n: any): n is number => n != null),
    bpSystolic: (data?.bp ?? [])
      .map((b: any) => b.sys)
      .filter((n: any): n is number => n != null),
  };

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

  const alerts = ((query.data as any)?.alerts ?? []).map((a: any) => ({
    id: a.id,
    title: a.title,
    message: a.message,
    timestamp: a.createdAt ? formatRelativeTime(new Date(a.createdAt)) : "",
    priority:
      a.priority === "high" || a.priority === "critical" ? "action" : "info",
    type: a.type ?? "general",
  }));

  return {
    alerts,
    total: (query.data as any)?.total ?? 0,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useBiometricCategories  (Health tab grid)
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/** Presentational config for the biometric grid — no fabricated values. */
const CATEGORY_CONFIG = [
  { id: "sleep", label: "Sleep", unit: "hrs", sparkColor: "#60A5FA", iconBgColor: "rgba(96, 165, 250, 0.12)" },
  { id: "heartRate", label: "Heart Rate", unit: "bpm", sparkColor: "#C65D5D", iconBgColor: "rgba(198, 93, 93, 0.12)" },
  { id: "bloodPressure", label: "Blood Pressure", unit: "mmHg", sparkColor: "#C65D5D", iconBgColor: "rgba(198, 93, 93, 0.12)" },
  { id: "glucose", label: "Blood Glucose", unit: "mg/dL", sparkColor: "#F59E0B", iconBgColor: "rgba(245, 158, 11, 0.12)" },
  { id: "hrv", label: "HRV", unit: "ms", sparkColor: "#A78BFA", iconBgColor: "rgba(167, 139, 250, 0.12)" },
  { id: "weight", label: "Body Weight", unit: "lbs", sparkColor: "#4A90D9", iconBgColor: "rgba(74, 144, 217, 0.12)" },
  { id: "steps", label: "Steps", unit: "steps", sparkColor: "#4A9D5B", iconBgColor: "rgba(74, 157, 91, 0.12)" },
] as const;

/** Resolve the "last updated" timestamp for a category from raw KPI data. */
function timestampFor(id: string, kpis: any): string | number | Date | null {
  if (!kpis) return null;
  switch (id) {
    case "sleep":
      return kpis.sleep?.timestamp ?? null;
    case "heartRate":
      return kpis.heartRate?.timestamp ?? null;
    case "glucose":
      return kpis.glucose?.timestamp ?? null;
    case "hrv":
      return kpis.hrv?.timestamp ?? null;
    case "weight":
      return kpis.weight?.date ?? null;
    case "steps":
      return kpis.steps?.date ?? null;
    case "bloodPressure":
      return kpis.bloodPressure?.date ?? null;
    default:
      return null;
  }
}

export function useBiometricCategories(range?: DateRangeDates) {
  const overview = useDashboardOverview();
  const sparks = useSparklines(range);

  const bio = overview.biometricsData;
  const kpi = overview.kpiData;
  const rawKpis = overview.kpis;

  const categories = CATEGORY_CONFIG.map((cfg) => {
    // ── Real value (or null → "—") ──────────────────────────
    let value: string | number | null = null;
    switch (cfg.id) {
      case "sleep":
        value = kpi.sleep.hours;
        break;
      case "heartRate":
        value = kpi.heartRate.bpm;
        break;
      case "bloodPressure":
        value = bio.bloodPressure.value;
        break;
      case "glucose":
        value = bio.glucose.value;
        break;
      case "hrv":
        value = bio.hrv.value;
        break;
      case "weight":
        value = kpi.weight.lbs;
        break;
      case "steps":
        value = bio.dailySteps.value;
        break;
    }

    // ── Real sparkline data (or empty → no trend line) ──────
    let sparkData: number[] = [];
    if (cfg.id === "sleep" && sparks.sparklines.sleep.length) {
      sparkData = sparks.sparklines.sleep;
    } else if (cfg.id === "glucose" && sparks.sparklines.glucose.length) {
      sparkData = sparks.sparklines.glucose;
    } else if (cfg.id === "bloodPressure" && sparks.sparklines.bpSystolic.length) {
      sparkData = sparks.sparklines.bpSystolic;
    }

    const ts = timestampFor(cfg.id, rawKpis);
    const lastUpdated = ts ? formatRelativeTime(new Date(ts as any)) : "—";

    return {
      id: cfg.id,
      label: cfg.label,
      unit: cfg.unit,
      value: value ?? "—",
      status: undefined as undefined,
      lastUpdated,
      hasData: value != null,
      sparkData,
      sparkColor: cfg.sparkColor,
      iconBgColor: cfg.iconBgColor,
    };
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
