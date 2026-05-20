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
} from "lucide-react";

/* ─── Small reusable metric row ─────────────────────────── */
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

/* ─── Section header inside a panel ─────────────────────── */
function SectionHeader({
  icon,
  title,
  color = "text-kairos-gold",
}: {
  icon: React.ReactNode;
  title: string;
  color?: string;
}) {
  return (
    <div className="flex items-center gap-2 mb-2 mt-4 first:mt-0">
      <span className={color}>{icon}</span>
      <h4 className="text-xs font-heading font-bold uppercase tracking-wider text-kairos-silver-dark">
        {title}
      </h4>
    </div>
  );
}

/* ─── Protocol to-do card ───────────────────────────────── */
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
    <div className="rounded-xl border border-kairos-border bg-kairos-card-hover/30 p-4">
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

/* ━━━ Main Dashboard ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function ClientDashboard() {
  const router = useRouter();

  // ── Data queries ─────────────────────────────────────────
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

  // ── Derived values ───────────────────────────────────────
  const kpis = overview?.kpis;
  const tp = todayData;

  // ── Loading ──────────────────────────────────────────────
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

  // ── Error ────────────────────────────────────────────────
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

  // ── Supplement items grouped by time of day ─────────────
  const supplementItems = protocol?.items?.filter((i) => i.category === "supplement") ?? [];
  const peptideItems = protocol?.items?.filter(
    (i) => i.category === "peptide" || i.category === "injection"
  ) ?? [];

  const supplementsByTime = {
    morning: supplementItems.filter((i) => i.timeOfDay?.toLowerCase().includes("morning") || i.timeOfDay?.toLowerCase().includes("am")),
    midday: supplementItems.filter((i) => i.timeOfDay?.toLowerCase().includes("midday") || i.timeOfDay?.toLowerCase().includes("noon") || i.timeOfDay?.toLowerCase().includes("afternoon")),
    evening: supplementItems.filter((i) => i.timeOfDay?.toLowerCase().includes("evening") || i.timeOfDay?.toLowerCase().includes("pm") || i.timeOfDay?.toLowerCase().includes("night")),
  };
  // Anything not matched goes to morning
  const assignedIds = new Set([...supplementsByTime.morning, ...supplementsByTime.midday, ...supplementsByTime.evening].map((i) => i.id));
  const unassigned = supplementItems.filter((i) => !assignedIds.has(i.id));
  supplementsByTime.morning = [...supplementsByTime.morning, ...unassigned];

  return (
    <div className="animate-fade-in">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-white">Dashboard</h1>
        <p className="text-sm font-body text-kairos-silver-dark mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
      </div>

      {/* ━━━ Two-column layout ━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* ── LEFT: Biometrics ──────────────────────────────── */}
        <div className="kairos-card space-y-1">
          <h2 className="font-heading font-bold text-lg text-white mb-2">Biometrics</h2>

          {/* Body Composition */}
          <SectionHeader icon={<Scale size={14} />} title="Body Composition" />
          <MetricRow
            label="Weight"
            value={kpis?.weight?.value ?? "—"}
            unit="lbs"
          />
          <MetricRow
            label="Body Fat"
            value={kpis?.bodyFat?.value ?? "—"}
            unit="%"
          />

          <div className="border-t border-kairos-border my-3" />

          {/* Sleep & Recovery */}
          <SectionHeader icon={<Moon size={14} />} title="Sleep & Recovery" color="text-blue-400" />
          <MetricRow
            label="Sleep Score"
            value={kpis?.sleep?.quality ?? "—"}
            unit="/100"
          />
          <MetricRow
            label="HRV"
            value={kpis?.hrv?.value ? Math.round(Number(kpis.hrv.value)) : "—"}
            unit="ms"
          />
          <MetricRow
            label="Hours"
            value={kpis?.sleep?.duration ? (Number(kpis.sleep.duration) / 60).toFixed(1) : "—"}
            unit="hrs"
          />

          <div className="border-t border-kairos-border my-3" />

          {/* Movement */}
          <SectionHeader icon={<Footprints size={14} />} title="Movement" color="text-green-400" />
          <MetricRow
            label="Steps"
            value={kpis?.steps?.value ? Number(kpis.steps.value).toLocaleString() : "—"}
          />

          <div className="border-t border-kairos-border my-3" />

          {/* Glucose */}
          <SectionHeader icon={<Droplets size={14} />} title="Glucose" color="text-amber-400" />
          <MetricRow
            label="Average"
            value={kpis?.glucose?.value ?? "—"}
            unit="mg/dL"
          />
          <MetricRow
            label="Spikes"
            value={kpis?.glucoseSpikes ?? "—"}
          />
          <MetricRow
            label="Time in Range"
            value={kpis?.glucoseTimeInRange != null ? `${kpis.glucoseTimeInRange}%` : "—"}
          />

          <div className="border-t border-kairos-border my-3" />

          {/* Toilet */}
          <SectionHeader icon={<CheckCircle size={14} />} title="Toilet" color="text-purple-400" />
          <MetricRow
            label="Bowel Movements"
            value={kpis?.bmCount ?? "—"}
          />
        </div>

        {/* ── RIGHT: Today's Protocols ──────────────────────── */}
        <div className="space-y-4">
          <h2 className="font-heading font-bold text-lg text-white">Today&apos;s Protocols</h2>

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
                  <p className="text-[10px] text-kairos-gold mt-1">
                    {protocol.todayAdherence.completed}/{protocol.todayAdherence.total} taken today
                  </p>
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
    </div>
  );
}
