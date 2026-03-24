"use client";

import { useRouter } from "next/navigation";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useDashboard } from "@/hooks/client/useDashboard";
import { Droplets, Heart, Brain, Moon, Bell, CheckCircle } from "lucide-react";
import { getDashboardProtocol } from "@/lib/client-ops/engine";
import { useCompanyBrand } from "@/lib/company-ops";

export default function ClientDashboard() {
  const router = useRouter();
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  // Data from hooks (mock fallback until DB is connected)
  const { glucoseSummaries, sleepRecords, supplementRecords, kpis } = useDashboard(dateRange);

  // Protocol items from client-ops engine
  const protocolItems = getDashboardProtocol();
  const doneCount = protocolItems.filter((e) => e.done).length;

  // White-label branding
  const { brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

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

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KPICard
          label="Glucose"
          value={kpis.avgGlucose}
          unit="mg/dL"
          trend={kpis.avgGlucose <= 100 ? "flat" : "up"}
          trendValue={kpis.avgGlucose <= 100 ? "Stable" : "Elevated"}
          icon={<Droplets size={16} />}
        />
        <KPICard label="Heart Rate" value="68" unit="bpm" trend="down" trendValue="-3 from avg" icon={<Heart size={16} />} />
        <KPICard label="HRV" value="54" unit="ms" trend="up" trendValue="+8%" icon={<Brain size={16} />} highlight accentColor={accentColor} />
        <KPICard
          label="Sleep"
          value={kpis.avgSleepHrs}
          unit="hrs"
          trend={kpis.avgSleepHrs >= 7 ? "up" : "down"}
          trendValue={`Score: ${kpis.avgSleepScore}`}
          icon={<Moon size={16} />}
        />
        <KPICard
          label="Health Score"
          value={kpis.healthScore}
          unit="/100"
          trend="up"
          trendValue="+2 pts"
          highlight
          accentColor={accentColor}
        />
        <KPICard label="Alerts" value="3" unit="active" icon={<Bell size={16} />} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Protocol / Adherence view */}
        <div className="lg:col-span-2 kairos-card">
          {period === "day" ? (
            <>
              <h3 className="font-heading font-semibold text-white mb-4">Today&apos;s Protocol</h3>
              <div className="space-y-3">
                {protocolItems.map((entry, i) => (
                  <div key={i} className="flex items-center gap-3 py-2 px-3 rounded-kairos-sm hover:bg-kairos-card-hover transition-colors">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      entry.done ? "border-green-500 bg-green-500/20" : "border-kairos-border"
                    }`}>
                      {entry.done && <CheckCircle size={12} className="text-green-400" />}
                    </div>
                    <span className="text-xs font-body text-kairos-silver-dark w-16">{entry.time}</span>
                    <span className={`text-sm font-body ${entry.done ? "text-kairos-silver-dark line-through" : "text-white"}`}>{entry.item}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-kairos-border">
                <p className="text-xs font-body text-kairos-silver-dark">
                  {doneCount} of {protocolItems.length} completed — <span className="text-kairos-gold">{Math.round((doneCount / protocolItems.length) * 100)}% adherence today</span>
                </p>
              </div>
            </>
          ) : (
            <>
              <h3 className="font-heading font-semibold text-white mb-4">Daily Summary — {formattedRange}</h3>
              <div className="space-y-2">
                {glucoseSummaries.slice(0, period === "week" ? 7 : 14).map((day, i) => (
                  <div key={i} className="flex items-center gap-4 py-2 px-3 rounded-kairos-sm hover:bg-kairos-card-hover transition-colors">
                    <span className="text-xs font-heading text-kairos-silver-dark w-10">{day.dateLabel}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1">
                          <Droplets size={12} className="text-kairos-gold" />
                          <span className="text-xs font-body text-white">{day.avg} mg/dL</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Moon size={12} className="text-blue-400" />
                          <span className="text-xs font-body text-white">{sleepRecords[i] ? `${sleepRecords[i].total}h` : "—"}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <CheckCircle size={12} className="text-green-400" />
                          <span className="text-xs font-body text-white">{supplementRecords[i] ? `${supplementRecords[i].adherence}%` : "—"}</span>
                        </div>
                      </div>
                    </div>
                    <span className={`text-xs font-heading font-semibold px-2 py-0.5 rounded-full ${
                      day.timeInRange >= 85 ? "bg-green-500/15 text-green-400" :
                      day.timeInRange >= 70 ? "bg-kairos-gold/15 text-kairos-gold" :
                      "bg-red-500/15 text-red-400"
                    }`}>{day.timeInRange}% IR</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-kairos-border">
                <p className="text-xs font-body text-kairos-silver-dark">
                  Avg adherence: <span className="text-kairos-gold font-heading font-semibold">{kpis.avgAdherence}%</span> — Avg glucose: <span className="text-white font-heading font-semibold">{kpis.avgGlucose} mg/dL</span>
                </p>
              </div>
            </>
          )}
        </div>

        {/* Recent Alerts */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Recent Alerts</h3>
          <div className="space-y-3">
            {[
              { priority: "high", title: "Glucose spike detected", time: "2h ago" },
              { priority: "medium", title: "Sleep quality declining", time: "6h ago" },
              { priority: "low", title: "Weekly check-in due", time: "1d ago" },
            ].map((alert, i) => (
              <div key={i} className="flex items-start gap-3 py-2">
                <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${
                  alert.priority === "high" ? "bg-red-400" :
                  alert.priority === "medium" ? "bg-yellow-400" : "bg-blue-400"
                }`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-body text-white truncate">{alert.title}</p>
                  <p className="text-xs font-body text-kairos-silver-dark">{alert.time}</p>
                </div>
              </div>
            ))}
          </div>
          <button onClick={() => router.push("/alerts")} className="mt-4 text-xs font-heading font-semibold text-kairos-gold hover:text-kairos-gold-light transition-colors">
            View All Alerts →
          </button>
        </div>
      </div>
    </div>
  );
}
