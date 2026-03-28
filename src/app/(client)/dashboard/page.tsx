"use client";

import { useRouter } from "next/navigation";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { Droplets, Heart, Brain, Moon, Bell, CheckCircle, Loader2, Scale, Flame, Footprints } from "lucide-react";
import { useCompanyBrand } from "@/lib/company-ops";

export default function ClientDashboard() {
  const router = useRouter();
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  // Real tRPC queries
  const { data: overview, isLoading: overviewLoading } = trpc.clientPortal.dashboard.getOverview.useQuery(
    undefined,
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const { data: healthScore } = trpc.clientPortal.dashboard.getHealthScore.useQuery(
    undefined,
    { staleTime: 60_000, refetchOnWindowFocus: false }
  );

  const { data: recentAlerts = [] } = trpc.clientPortal.dashboard.getRecentActivity.useQuery(
    { limit: 5 },
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const { data: protocol } = trpc.clientPortal.dashboard.getActiveProtocol.useQuery(
    undefined,
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  const startStr = dateRange.startDate.toISOString().split("T")[0];
  const endStr = dateRange.endDate.toISOString().split("T")[0];
  const { data: dailySummaries = [] } = trpc.clientPortal.dashboard.getDailySummaries.useQuery(
    { startDate: startStr, endDate: endStr },
    { staleTime: 30_000, refetchOnWindowFocus: false, enabled: period !== "day" }
  );

  // Derived values
  const kpis = overview?.kpis;
  const protocolItems = protocol?.items ?? [];
  const todayAdherence = protocol?.todayAdherence;
  const doneCount = todayAdherence?.completed ?? 0;
  const totalCount = (todayAdherence?.total ?? protocolItems.length) || 1;

  // White-label branding
  const { brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // Format relative time for alerts
  function formatRelativeTime(date: Date | string | null): string {
    if (!date) return "";
    const ms = Date.now() - new Date(date).getTime();
    const mins = Math.floor(ms / 60000);
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    return `${days}d ago`;
  }

  // Loading skeleton
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

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Welcome Banner */}
      <div
        className="kairos-card"
        style={accentColor ? { borderColor: accentColor + "30" } : { borderColor: "rgba(var(--k-accent), 0.2)" }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-heading font-bold text-xl text-white mb-1">Welcome back</h2>
            <p className="text-sm font-body text-kairos-silver-dark">
              {isWhiteLabel
                ? <>{brand.name} &mdash; your health overview for {formattedRange}</>
                : <>Here&apos;s your health overview for {formattedRange}</>}
            </p>
          </div>
          <div
            className="text-xs font-heading font-semibold px-3 py-1 rounded-full flex items-center gap-1"
            style={accentColor
              ? { backgroundColor: accentColor + "20", color: accentColor }
              : { backgroundColor: "rgba(var(--k-accent), 0.2)", color: "rgb(var(--k-accent))" }}
          >
            <CheckCircle size={12} />
            All Systems Active
          </div>
        </div>
      </div>

      <DateRangeNavigator
        availablePeriods={["day", "week", "month"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Primary KPIs — most controllable items first */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Weight"
          value={kpis?.weight?.value ?? "—"}
          unit="lbs"
          trend="flat"
          trendValue="Latest"
          icon={<Scale size={16} />}
          highlight
          accentColor={accentColor}
        />
        <KPICard
          label="Sleep"
          value={kpis?.sleep?.duration ? (kpis.sleep.duration / 60).toFixed(1) : "—"}
          unit="hrs"
          trend={kpis?.sleep?.duration && kpis.sleep.duration >= 420 ? "up" : "down"}
          trendValue={kpis?.sleep ? `Score: ${kpis.sleep.quality ?? "—"}` : "No data"}
          icon={<Moon size={16} />}
        />
        <KPICard
          label="Health Score"
          value={healthScore?.score ?? "—"}
          unit="/100"
          trend={healthScore && healthScore.score >= 80 ? "up" : "flat"}
          trendValue={healthScore ? `7-day avg` : ""}
          highlight
          accentColor={accentColor}
        />
        <KPICard
          label="Calories"
          value={kpis?.calories?.value ? Math.round(kpis.calories.value) : "—"}
          unit="kcal"
          trend="flat"
          trendValue="Today"
          icon={<Flame size={16} />}
        />
        <KPICard
          label="Heart Rate"
          value={kpis?.heartRate?.value ?? "—"}
          unit="bpm"
          trend="flat"
          trendValue="Latest"
          icon={<Heart size={16} />}
        />
        <KPICard
          label="Glucose"
          value={kpis?.glucose?.value ?? "—"}
          unit="mg/dL"
          trend={kpis?.glucose && kpis.glucose.value <= 100 ? "flat" : "up"}
          trendValue={kpis?.glucose && kpis.glucose.value <= 100 ? "Stable" : "Elevated"}
          icon={<Droplets size={16} />}
        />
      </div>

      {/* Secondary KPIs — monitoring & awareness */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard
          label="Steps"
          value={kpis?.steps?.value ?? "—"}
          unit="steps"
          trend="flat"
          trendValue="Today"
          icon={<Footprints size={16} />}
        />
        <KPICard
          label="HRV"
          value={kpis?.hrv?.value ? Math.round(kpis.hrv.value) : "—"}
          unit="ms"
          trend={kpis?.hrv && kpis.hrv.value > 50 ? "up" : "flat"}
          trendValue={kpis?.hrv && kpis.hrv.value > 50 ? "Good" : "Average"}
          icon={<Brain size={16} />}
        />
        <KPICard
          label="Checked In"
          value={kpis?.checkedInToday ? "Yes" : "No"}
          trend={kpis?.checkedInToday ? "up" : "down"}
          trendValue={kpis?.checkedInToday ? "Complete" : "Pending"}
          icon={<CheckCircle size={16} />}
        />
        <KPICard
          label="Alerts"
          value={kpis?.unreadAlerts ?? 0}
          unit="active"
          icon={<Bell size={16} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol / Adherence view */}
        <div className="lg:col-span-2 kairos-card">
          {period === "day" ? (
            <>
              <h3 className="font-heading font-semibold text-white mb-4">Today&apos;s Protocol</h3>
              {protocolItems.length === 0 ? (
                <p className="text-sm font-body text-kairos-silver-dark">No active protocol found.</p>
              ) : (
                <>
                  <div className="space-y-3">
                    {protocolItems.map((item) => {
                      const taken = protocol?.todayAdherence
                        ? doneCount > protocolItems.indexOf(item)
                        : false;
                      return (
                        <div key={item.id} className="flex items-center gap-3 py-2 px-3 rounded-kairos-sm hover:bg-kairos-card-hover transition-colors">
                          <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                            taken ? "border-green-500 bg-green-500/20" : "border-kairos-border"
                          }`}>
                            {taken && <CheckCircle size={12} className="text-green-400" />}
                          </div>
                          <span className="text-xs font-body text-kairos-silver-dark w-16">{item.timeOfDay ?? "—"}</span>
                          <span className={`text-sm font-body ${taken ? "text-kairos-silver-dark line-through" : "text-white"}`}>
                            {item.name} — {item.dosage}{item.unit}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 pt-3 border-t border-kairos-border">
                    <p className="text-xs font-body text-kairos-silver-dark">
                      {doneCount} of {totalCount} completed — <span className="text-kairos-gold">{Math.round((doneCount / totalCount) * 100)}% adherence today</span>
                    </p>
                  </div>
                </>
              )}
            </>
          ) : (
            <>
              <h3 className="font-heading font-semibold text-white mb-4">Daily Summary — {formattedRange}</h3>
              {dailySummaries.length === 0 ? (
                <p className="text-sm font-body text-kairos-silver-dark">No data for this period.</p>
              ) : (
                <div className="space-y-2">
                  {dailySummaries.slice(0, period === "week" ? 7 : 14).map((day, i) => (
                    <div key={i} className="flex items-center gap-4 py-2 px-3 rounded-kairos-sm hover:bg-kairos-card-hover transition-colors">
                      <span className="text-xs font-heading text-kairos-silver-dark w-10">{day.dateLabel}</span>
                      <div className="flex-1">
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-1">
                            <Droplets size={12} className="text-kairos-gold" />
                            <span className="text-xs font-body text-white">{day.glucose.avg} mg/dL</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Moon size={12} className="text-blue-400" />
                            <span className="text-xs font-body text-white">{day.sleep ? `${day.sleep.totalHrs}h` : "—"}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <CheckCircle size={12} className="text-green-400" />
                            <span className="text-xs font-body text-white">{day.adherence !== null ? `${day.adherence}%` : "—"}</span>
                          </div>
                        </div>
                      </div>
                      <span className={`text-xs font-heading font-semibold px-2 py-0.5 rounded-full ${
                        day.glucose.timeInRange >= 85 ? "bg-green-500/15 text-green-400" :
                        day.glucose.timeInRange >= 70 ? "bg-kairos-gold/15 text-kairos-gold" :
                        "bg-red-500/15 text-red-400"
                      }`}>{day.glucose.timeInRange}% IR</span>
                    </div>
                  ))}
                </div>
              )}
              {dailySummaries.length > 0 && (
                <div className="mt-4 pt-3 border-t border-kairos-border">
                  <p className="text-xs font-body text-kairos-silver-dark">
                    Avg glucose: <span className="text-white font-heading font-semibold">
                      {Math.round(dailySummaries.reduce((s, d) => s + d.glucose.avg, 0) / dailySummaries.length)} mg/dL
                    </span>
                  </p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {recentAlerts.length === 0 ? (
              <p className="text-sm font-body text-kairos-silver-dark">No recent alerts.</p>
            ) : (
              recentAlerts.slice(0, 5).map((alert) => (
                <div key={alert.id} className="flex items-start gap-3 py-2">
                  <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                    alert.priority === "urgent" ? "bg-red-400" :
                    alert.priority === "action" ? "bg-yellow-400" : "bg-blue-400"
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-white truncate">{alert.title}</p>
                    <p className="text-xs font-body text-kairos-silver-dark">{formatRelativeTime(alert.createdAt)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
          <button onClick={() => router.push("/alerts")} className="mt-4 text-xs font-heading font-semibold text-kairos-gold hover:text-kairos-gold-light transition-colors">
            View All Alerts →
          </button>
        </div>
      </div>
    </div>
  );
}
