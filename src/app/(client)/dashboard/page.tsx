"use client";

import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";
import {
  Scale,
  Moon,
  Brain,
  Footprints,
  Droplets,
  Loader2,
  Bell,
  Utensils,
  Dumbbell,
  Pill,
  Syringe,
  Camera,
  Clock,
  CheckCircle,
  AlertTriangle,
  ChevronRight,
  MessageSquare,
  Activity,
  Info,
  Heart,
  Sparkles,
  TrendingUp,
  TrendingDown,
  Minus,
} from "lucide-react";
import { cn } from "@/utils/cn";

// ─────────────────────────────────────────────────────────────
// SVG Sparkline — tiny inline trend chart
// ─────────────────────────────────────────────────────────────

function Sparkline({
  data,
  width = 80,
  height = 28,
  color = "#D4AF37",
  fill = true,
}: {
  data: number[];
  width?: number;
  height?: number;
  color?: string;
  fill?: boolean;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const pad = 2;
  const plotW = width - pad * 2;
  const plotH = height - pad * 2;

  const points = data.map((v, i) => {
    const x = pad + (i / (data.length - 1)) * plotW;
    const y = pad + plotH - ((v - min) / range) * plotH;
    return `${x},${y}`;
  });

  const linePath = `M${points.join(" L")}`;
  const fillPath = `${linePath} L${pad + plotW},${pad + plotH} L${pad},${pad + plotH} Z`;

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      {fill && (
        <path d={fillPath} fill={color} opacity={0.12} />
      )}
      <path d={linePath} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      {/* End dot */}
      <circle
        cx={pad + plotW}
        cy={pad + plotH - ((data[data.length - 1] - min) / range) * plotH}
        r={2}
        fill={color}
      />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────
// Health Score Ring — animated circular gauge
// ─────────────────────────────────────────────────────────────

function HealthScoreRing({ score, size = 140 }: { score: number; size?: number }) {
  const strokeWidth = 10;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = (score / 100) * circumference;

  const getColor = (s: number) => {
    if (s >= 85) return "#22c55e"; // green
    if (s >= 70) return "#D4AF37"; // gold
    if (s >= 55) return "#f59e0b"; // amber
    return "#ef4444"; // red
  };

  const getLabel = (s: number) => {
    if (s >= 85) return "Excellent";
    if (s >= 70) return "Good";
    if (s >= 55) return "Fair";
    return "Needs Focus";
  };

  const color = getColor(score);

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-kairos-border"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-out"
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-heading font-bold text-white">{score}</span>
        <span className="text-[10px] font-body uppercase tracking-wider" style={{ color }}>
          {getLabel(score)}
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// KPI Card — top-level metric card
// ─────────────────────────────────────────────────────────────

function KPICard({
  icon,
  label,
  value,
  unit,
  subtitle,
  color = "text-kairos-gold",
  sparkData,
  sparkColor,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  color?: string;
  sparkData?: number[];
  sparkColor?: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "kairos-card flex flex-col gap-2 p-4 text-left transition-all hover:border-kairos-gold/30 hover:shadow-lg hover:shadow-kairos-gold/5",
        onClick && "cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn("w-7 h-7 rounded-lg flex items-center justify-center bg-current/10", color)}>
            {icon}
          </div>
          <span className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">{label}</span>
        </div>
        {sparkData && sparkData.length >= 2 && (
          <Sparkline data={sparkData} color={sparkColor || "#D4AF37"} width={64} height={24} />
        )}
      </div>
      <div className="flex items-baseline gap-1.5">
        <span className="text-2xl font-heading font-bold text-white">{value}</span>
        {unit && <span className="text-xs font-body text-kairos-silver-dark">{unit}</span>}
      </div>
      {subtitle && (
        <p className="text-[10px] font-body text-kairos-silver-dark -mt-1">{subtitle}</p>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// Protocol Card
// ─────────────────────────────────────────────────────────────

function ProtocolCard({
  icon,
  title,
  children,
  color = "text-kairos-gold",
  onNavigate,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  color?: string;
  onNavigate?: () => void;
}) {
  return (
    <div className="kairos-card p-4 hover:border-kairos-gold/20 transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className={color}>{icon}</span>
          <h4 className="text-sm font-heading font-semibold text-white">{title}</h4>
        </div>
        {onNavigate && (
          <button
            onClick={onNavigate}
            className="text-kairos-gold hover:text-kairos-gold-light transition-colors"
          >
            <ChevronRight size={16} />
          </button>
        )}
      </div>
      <div className="text-sm font-body text-kairos-silver-dark space-y-1">{children}</div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Metric Row
// ─────────────────────────────────────────────────────────────

function MetricRow({
  label,
  value,
  unit,
  sub,
}: {
  label: string;
  value: string | number;
  unit?: string;
  sub?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-sm font-body text-kairos-silver-dark">{label}</span>
      <div className="text-right">
        <span className="text-sm font-heading font-semibold text-white">
          {value}
          {unit && <span className="text-xs text-kairos-silver-dark ml-1">{unit}</span>}
        </span>
        {sub && <p className="text-[10px] text-kairos-silver-dark">{sub}</p>}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Main Dashboard
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export default function ClientDashboard() {
  const router = useRouter();

  // ── Data queries ──────────────────────────────────────────
  const {
    data: overview,
    isLoading: overviewLoading,
    isError: overviewError,
    refetch: refetchOverview,
  } = trpc.clientPortal.dashboard.getOverview.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 2,
  });

  const { data: healthScore } = trpc.clientPortal.dashboard.getHealthScore.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: sparklines } = trpc.clientPortal.dashboard.getSparklines.useQuery(undefined, {
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: protocol } = trpc.clientPortal.dashboard.getActiveProtocol.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: todayData } = trpc.clientPortal.dashboard.getTodayProtocols.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
    retry: 1,
  });

  const { data: alertsData } = trpc.clientPortal.alerts.list.useQuery(
    { status: "active", limit: 5, offset: 0 },
    { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 }
  );

  // ── Derived values ────────────────────────────────────────
  const kpis = overview?.kpis;
  const tp = todayData;

  // Sparkline data arrays
  const sleepSparkData = sparklines?.sleep?.map((s) => s.hours ?? 0) ?? [];
  const glucoseSparkData = sparklines?.glucose?.map((g) => g.avg) ?? [];
  const bpSysSparkData = sparklines?.bp?.map((b) => b.sys) ?? [];

  // ── Loading ───────────────────────────────────────────────
  if (overviewLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-kairos-gold mx-auto" />
          <p className="text-sm font-body text-kairos-silver-dark">Loading your dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Error ─────────────────────────────────────────────────
  if (overviewError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="font-heading font-semibold text-white">Unable to load dashboard</h3>
          <p className="text-sm font-body text-kairos-silver-dark">
            We couldn&apos;t fetch your health data. Please try again.
          </p>
          <button
            onClick={() => refetchOverview()}
            className="kairos-btn-gold text-sm px-6 py-2"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ── Supplement items grouped by time of day ────────────────
  const supplementItems = protocol?.items?.filter((i) => i.category === "supplement") ?? [];
  const peptideItems = protocol?.items?.filter(
    (i) => i.category === "peptide" || i.category === "injection"
  ) ?? [];

  const supplementsByTime = {
    morning: supplementItems.filter((i) => i.timeOfDay?.toLowerCase().includes("morning") || i.timeOfDay?.toLowerCase().includes("am")),
    midday: supplementItems.filter((i) => i.timeOfDay?.toLowerCase().includes("midday") || i.timeOfDay?.toLowerCase().includes("noon") || i.timeOfDay?.toLowerCase().includes("afternoon")),
    evening: supplementItems.filter((i) => i.timeOfDay?.toLowerCase().includes("evening") || i.timeOfDay?.toLowerCase().includes("pm") || i.timeOfDay?.toLowerCase().includes("night")),
  };
  const assignedIds = new Set([...supplementsByTime.morning, ...supplementsByTime.midday, ...supplementsByTime.evening].map((i) => i.id));
  const unassigned = supplementItems.filter((i) => !assignedIds.has(i.id));
  supplementsByTime.morning = [...supplementsByTime.morning, ...unassigned];

  // BP category helper
  const getBPLabel = (sys: number, dia: number) => {
    if (sys > 180 || dia > 120) return { label: "Crisis", color: "text-red-400" };
    if (sys >= 140 || dia >= 90) return { label: "High", color: "text-red-400" };
    if (sys >= 130 || dia >= 80) return { label: "Elevated", color: "text-amber-400" };
    if (sys >= 120) return { label: "Elevated", color: "text-yellow-400" };
    return { label: "Normal", color: "text-green-400" };
  };

  return (
    <div className="animate-fade-in space-y-6">
      {/* ━━━ Header + Health Score ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Dashboard</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        {healthScore && (
          <div className="flex items-center gap-4 kairos-card p-4">
            <HealthScoreRing score={healthScore.score} size={100} />
            <div className="space-y-1">
              <p className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">Health Score</p>
              <div className="text-xs font-body text-kairos-silver-dark space-y-0.5">
                <p>Sleep avg: <span className="text-white">{healthScore.avgSleep}/100</span></p>
                <p>Glucose avg: <span className="text-white">{healthScore.avgGlucose} mg/dL</span></p>
                <p>HRV: <span className="text-white">{healthScore.hrv} ms</span></p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ Two-column: Biometrics + Protocols ━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Biometrics ──────────────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-white">Biometrics</h2>
            <button
              onClick={() => router.push("/measurements")}
              className="text-xs text-kairos-gold font-semibold hover:text-kairos-gold-light transition-colors"
            >
              View all →
            </button>
          </div>

          {/* Body Composition */}
          <button
            onClick={() => router.push("/measurements")}
            className="w-full kairos-card p-4 text-left hover:border-kairos-gold/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-kairos-gold/10 flex items-center justify-center text-kairos-gold">
                  <Scale size={14} />
                </div>
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">Body Composition</span>
              </div>
              <ChevronRight size={14} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-heading font-bold text-white">{kpis?.weight?.value ?? "—"}<span className="text-xs text-kairos-silver-dark ml-1">lbs</span></p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Weight</p>
              </div>
              <div>
                <p className="text-xl font-heading font-bold text-white">{kpis?.bodyFat?.value ?? "—"}<span className="text-xs text-kairos-silver-dark ml-1">%</span></p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Body Fat</p>
              </div>
            </div>
          </button>

          {/* Sleep */}
          <button
            onClick={() => router.push("/sleep")}
            className="w-full kairos-card p-4 text-left hover:border-kairos-gold/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-blue-400/10 flex items-center justify-center text-blue-400">
                  <Moon size={14} />
                </div>
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">Sleep</span>
              </div>
              <div className="flex items-center gap-2">
                {sleepSparkData.length >= 2 && <Sparkline data={sleepSparkData} color="#60a5fa" width={64} height={24} />}
                <ChevronRight size={14} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-heading font-bold text-white">{kpis?.sleep?.duration ? (Number(kpis.sleep.duration) / 60).toFixed(1) : "—"}<span className="text-xs text-kairos-silver-dark ml-1">hrs</span></p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Duration</p>
              </div>
              <div>
                <p className="text-xl font-heading font-bold text-white">{kpis?.sleep?.quality ?? "—"}<span className="text-xs text-kairos-silver-dark ml-1">/100</span></p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Quality</p>
              </div>
            </div>
          </button>

          {/* Glucose */}
          <button
            onClick={() => router.push("/glucose")}
            className="w-full kairos-card p-4 text-left hover:border-kairos-gold/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-amber-400/10 flex items-center justify-center text-amber-400">
                  <Droplets size={14} />
                </div>
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">Glucose</span>
              </div>
              <div className="flex items-center gap-2">
                {glucoseSparkData.length >= 2 && <Sparkline data={glucoseSparkData} color="#f59e0b" width={64} height={24} />}
                <ChevronRight size={14} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-heading font-bold text-white">{kpis?.glucose?.value ?? "—"}<span className="text-xs text-kairos-silver-dark ml-1">mg/dL</span></p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Latest</p>
              </div>
              <div>
                <p className="text-xl font-heading font-bold text-white">{kpis?.glucoseTimeInRange ?? "—"}<span className="text-xs text-kairos-silver-dark ml-1">%</span></p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Time in Range</p>
              </div>
            </div>
          </button>

          {/* Blood Pressure */}
          <button
            onClick={() => router.push("/blood-pressure")}
            className="w-full kairos-card p-4 text-left hover:border-kairos-gold/30 transition-colors group"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-red-400/10 flex items-center justify-center text-red-400">
                  <Heart size={14} />
                </div>
                <span className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">Blood Pressure</span>
              </div>
              <div className="flex items-center gap-2">
                {bpSysSparkData.length >= 2 && <Sparkline data={bpSysSparkData} color="#f87171" width={64} height={24} />}
                <ChevronRight size={14} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <p className="text-xl font-heading font-bold text-white">
                  {kpis?.bloodPressure ? `${kpis.bloodPressure.systolic}/${kpis.bloodPressure.diastolic}` : "—"}
                  <span className="text-xs text-kairos-silver-dark ml-1">mmHg</span>
                </p>
                <p className="text-[10px] font-body text-kairos-silver-dark">Latest</p>
              </div>
              <div>
                {kpis?.bloodPressure && (
                  <p className={cn("text-sm font-heading font-semibold", getBPLabel(kpis.bloodPressure.systolic, kpis.bloodPressure.diastolic).color)}>
                    {getBPLabel(kpis.bloodPressure.systolic, kpis.bloodPressure.diastolic).label}
                  </p>
                )}
                <p className="text-[10px] font-body text-kairos-silver-dark">Status</p>
              </div>
            </div>
          </button>

          {/* Secondary Metrics Row */}
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => router.push("/workouts")}
              className="kairos-card p-3 text-left hover:border-kairos-gold/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <Footprints size={14} className="text-green-400" />
                <ChevronRight size={12} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
              <p className="text-lg font-heading font-bold text-white">
                {kpis?.steps?.value ? Number(kpis.steps.value).toLocaleString() : "—"}
              </p>
              <p className="text-[10px] font-body text-kairos-silver-dark">Steps Today</p>
            </button>
            <button
              onClick={() => router.push("/sleep")}
              className="kairos-card p-3 text-left hover:border-kairos-gold/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <Brain size={14} className="text-purple-400" />
                <ChevronRight size={12} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
              <p className="text-lg font-heading font-bold text-white">
                {kpis?.hrv?.value ? Math.round(Number(kpis.hrv.value)) : "—"}<span className="text-xs text-kairos-silver-dark ml-1">ms</span>
              </p>
              <p className="text-[10px] font-body text-kairos-silver-dark">HRV</p>
            </button>
            <button
              onClick={() => router.push("/sleep")}
              className="kairos-card p-3 text-left hover:border-kairos-gold/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <Activity size={14} className="text-red-400" />
                <ChevronRight size={12} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
              <p className="text-lg font-heading font-bold text-white">
                {kpis?.heartRate?.value ?? "—"}<span className="text-xs text-kairos-silver-dark ml-1">bpm</span>
              </p>
              <p className="text-[10px] font-body text-kairos-silver-dark">Heart Rate</p>
            </button>
            <button
              onClick={() => router.push("/glucose")}
              className="kairos-card p-3 text-left hover:border-kairos-gold/30 transition-colors group"
            >
              <div className="flex items-center justify-between mb-1">
                <Droplets size={14} className="text-amber-400" />
                <ChevronRight size={12} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
              </div>
              <p className="text-lg font-heading font-bold text-white">
                {kpis?.glucoseSpikes ?? 0}
              </p>
              <p className="text-[10px] font-body text-kairos-silver-dark">Glucose Spikes</p>
            </button>
          </div>
        </div>

        {/* ── RIGHT: Today's Protocols ───────────────────── */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-lg text-white">Today&apos;s Protocols</h2>
            <button
              onClick={() => router.push("/supplements")}
              className="text-xs text-kairos-gold font-semibold hover:text-kairos-gold-light transition-colors"
            >
              View all →
            </button>
          </div>

          {/* Nutrition / Fasting */}
          <ProtocolCard
            icon={<Utensils size={16} />}
            title="Nutrition / Fasting"
            color="text-orange-400"
            onNavigate={() => router.push("/meals")}
          >
            {tp?.fasting ? (
              <>
                <p className="text-white font-semibold text-xs mb-1">
                  {tp.fasting.type.replace("_", ":")} Fast
                </p>
                <p>
                  Eating window:{" "}
                  <span className="text-white">
                    {tp.fasting.feedingStart}:00 – {tp.fasting.feedingEnd}:00
                  </span>
                </p>
                {tp.fasting.isActive && (
                  <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                    <Clock size={10} /> Currently in eating window
                  </p>
                )}
              </>
            ) : (
              <p>No fasting protocol scheduled today.</p>
            )}
          </ProtocolCard>

          {/* Exercise */}
          <ProtocolCard
            icon={<Dumbbell size={16} />}
            title="Exercise"
            color="text-green-400"
            onNavigate={() => router.push("/workouts")}
          >
            <MetricRow
              label="Step Goal"
              value={tp?.exercise?.stepGoal ? Number(tp.exercise.stepGoal).toLocaleString() : "10,000"}
              sub={
                kpis?.steps?.value
                  ? `${Number(kpis.steps.value).toLocaleString()} done`
                  : undefined
              }
            />
            {tp?.exercise?.workout ? (
              <div className="mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                <p className="text-white text-xs font-semibold">{tp.exercise.workout.name}</p>
                {tp.exercise.workout.description && (
                  <p className="text-xs mt-0.5">{tp.exercise.workout.description}</p>
                )}
              </div>
            ) : (
              <p className="mt-1">No workout assigned today.</p>
            )}
          </ProtocolCard>

          {/* Supplements */}
          <ProtocolCard
            icon={<Pill size={16} />}
            title="Supplements"
            color="text-cyan-400"
            onNavigate={() => router.push("/supplements")}
          >
            {supplementItems.length === 0 ? (
              <p>No supplement protocol active.</p>
            ) : (
              <div className="space-y-2">
                {(["morning", "midday", "evening"] as const).map((time) => {
                  const items = supplementsByTime[time];
                  if (items.length === 0) return null;
                  return (
                    <div key={time}>
                      <p className="text-[10px] font-heading font-bold uppercase tracking-wider text-kairos-silver-dark mb-1">
                        {time === "morning" ? "☀️ Morning" : time === "midday" ? "🌤 Midday" : "🌙 Evening"}
                      </p>
                      {items.map((item) => (
                        <p key={item.id} className="text-xs text-white pl-4">
                          {item.name} — {item.dosage}{item.unit}
                        </p>
                      ))}
                    </div>
                  );
                })}
                {protocol?.todayAdherence && (
                  <div className="flex items-center gap-2 mt-2">
                    <div className="flex-1 h-1.5 bg-kairos-royal-surface rounded-full overflow-hidden">
                      <div
                        className="h-full bg-cyan-400 rounded-full transition-all"
                        style={{
                          width: `${protocol.todayAdherence.total > 0 ? Math.round((protocol.todayAdherence.completed / protocol.todayAdherence.total) * 100) : 0}%`,
                        }}
                      />
                    </div>
                    <span className="text-[10px] text-kairos-gold font-heading font-semibold">
                      {protocol.todayAdherence.completed}/{protocol.todayAdherence.total}
                    </span>
                  </div>
                )}
              </div>
            )}
          </ProtocolCard>

          {/* Peptides */}
          <ProtocolCard
            icon={<Syringe size={16} />}
            title="Peptides"
            color="text-violet-400"
            onNavigate={() => router.push("/supplements")}
          >
            {peptideItems.length === 0 ? (
              <p>No peptides prescribed.</p>
            ) : (
              <div className="space-y-1">
                {peptideItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-center">
                    <span className="text-xs text-white">{item.name}</span>
                    <span className="text-xs text-kairos-silver-dark">
                      {item.dosage}{item.unit} · {item.frequency ?? "as directed"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </ProtocolCard>

          {/* Photos & Check-in */}
          <ProtocolCard
            icon={<Camera size={16} />}
            title="Photos & Check-in"
            color="text-pink-400"
            onNavigate={() => router.push("/checkin")}
          >
            <div className="flex items-center justify-between">
              <span>Daily check-in</span>
              {kpis?.checkedInToday ? (
                <span className="text-green-400 text-xs flex items-center gap-1">
                  <CheckCircle size={12} /> Complete
                </span>
              ) : (
                <button
                  onClick={() => router.push("/checkin")}
                  className="text-xs text-kairos-gold font-semibold hover:text-kairos-gold-light"
                >
                  Check in now →
                </button>
              )}
            </div>
            <div className="flex items-center justify-between mt-1">
              <span>Progress photo</span>
              <button
                onClick={() => router.push("/progress-photos")}
                className="text-xs text-kairos-gold font-semibold hover:text-kairos-gold-light"
              >
                Upload →
              </button>
            </div>
          </ProtocolCard>
        </div>
      </div>

      {/* ━━━ Alerts Panel ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {alertsData && alertsData.alerts.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <Bell size={18} className="text-kairos-gold" />
              <h2 className="font-heading font-bold text-lg text-white">
                Alerts
                <span className="ml-2 text-xs font-heading font-bold text-kairos-gold bg-kairos-gold/10 rounded-full px-2 py-0.5">
                  {alertsData.total}
                </span>
              </h2>
            </div>
            <button
              onClick={() => router.push("/alerts")}
              className="text-xs text-kairos-gold font-semibold hover:text-kairos-gold-light transition-colors"
            >
              View all →
            </button>
          </div>

          <div className="space-y-2">
            {alertsData.alerts.map((alert) => {
              const priorityStyles: Record<string, string> = {
                urgent: "border-l-red-500 bg-red-500/5",
                action: "border-l-amber-500 bg-amber-500/5",
                info: "border-l-blue-400 bg-blue-400/5",
              };
              const typeIcons: Record<string, React.ReactNode> = {
                glucose: <Droplets size={14} className="text-amber-400" />,
                heart_rate: <Activity size={14} className="text-red-400" />,
                hrv: <Activity size={14} className="text-purple-400" />,
                sleep: <Moon size={14} className="text-blue-400" />,
                coach: <MessageSquare size={14} className="text-green-400" />,
                ai: <Brain size={14} className="text-violet-400" />,
                labs: <CheckCircle size={14} className="text-cyan-400" />,
                system: <Bell size={14} className="text-kairos-silver-dark" />,
              };

              return (
                <button
                  key={alert.id}
                  onClick={() => router.push(`/alerts?id=${alert.id}`)}
                  className={cn(
                    "w-full text-left rounded-xl border border-kairos-border border-l-[3px] p-4 transition-colors hover:bg-kairos-card-hover/50",
                    priorityStyles[alert.priority] ?? "border-l-kairos-border bg-kairos-card-hover/20"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {typeIcons[alert.type] ?? <Bell size={14} className="text-kairos-silver-dark" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-heading font-semibold text-white truncate">{alert.title}</p>
                      {alert.message && (
                        <p className="text-xs font-body text-kairos-silver-dark mt-0.5 line-clamp-2">{alert.message}</p>
                      )}
                      <p className="text-[10px] text-kairos-silver-dark mt-1">
                        {new Date(alert.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </p>
                    </div>
                    <ChevronRight size={14} className="text-kairos-silver-dark mt-1 flex-shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ━━━ Quick Actions Footer ━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="kairos-card p-4">
        <p className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark mb-3">Quick Actions</p>
        <div className="flex flex-wrap gap-2">
          {[
            { label: "Log Check-in", icon: <CheckCircle size={12} />, href: "/checkin" },
            { label: "AI Health Chat", icon: <Sparkles size={12} />, href: "/chat" },
            { label: "View Labs", icon: <Activity size={12} />, href: "/labs" },
            { label: "Upload Photo", icon: <Camera size={12} />, href: "/progress-photos" },
            { label: "Messages", icon: <MessageSquare size={12} />, href: "/messages" },
          ].map((action) => (
            <button
              key={action.label}
              onClick={() => router.push(action.href)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-kairos-royal-surface border border-kairos-border text-xs font-body text-kairos-silver hover:text-white hover:border-kairos-gold/30 transition-colors"
            >
              {action.icon}
              {action.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
