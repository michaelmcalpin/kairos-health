"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { KPICard } from "@/components/ui/KPICard";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { getCoachDashboard } from "@/lib/coach-dashboard/engine";
import { useCompanyBrand } from "@/lib/company-ops";
import { Users, Bell, Calendar, TrendingUp, DollarSign, Clock, ArrowRight } from "lucide-react";

const COACH_ID = "demo-coach";

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={16} />,
  bell: <Bell size={16} />,
  calendar: <Calendar size={16} />,
  trending: <TrendingUp size={16} />,
  dollar: <DollarSign size={16} />,
  clock: <Clock size={16} />,
};

export default function TrainerDashboard() {
  const router = useRouter();
  const { brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "day" });

  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  const data = useMemo(() => getCoachDashboard(COACH_ID, range), [range]);

  return (
    <div className="space-y-6 animate-fade-in">
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
        {data.kpis.map((kpi) => (
          <KPICard
            key={kpi.label}
            label={kpi.label}
            value={kpi.value}
            unit={kpi.unit}
            trend={kpi.trend === "flat" ? undefined : kpi.trend}
            trendValue={kpi.trendValue}
            icon={ICON_MAP[kpi.icon] ?? <TrendingUp size={16} />}
            highlight={kpi.icon === "trending"}
            accentColor={accentColor}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Client Queue */}
        <div className="lg:col-span-2 kairos-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Priority Clients</h3>
            <button onClick={() => router.push("/trainer/clients")} className="flex items-center gap-1 text-xs font-heading font-semibold text-kairos-gold hover:text-kairos-gold-light transition-colors group">
              View All <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="space-y-3">
            {data.priorityClients.map((client) => (
              <Link key={client.id} href={`/trainer/clients/${client.id}`}>
                <div className="flex items-center gap-4 py-3 px-3 rounded-xl hover:bg-gray-800/50 transition-colors cursor-pointer">
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center"
                    style={{ backgroundColor: (accentColor || "rgb(var(--k-accent))") + "20" }}
                  >
                    <span className="text-xs font-heading font-bold" style={{ color: accentColor || "rgb(var(--k-accent))" }}>
                      {client.initials}
                    </span>
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-heading font-semibold text-white">{client.name}</p>
                    <p className="text-xs text-gray-500">{client.status}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-heading font-bold" style={{ color: accentColor || "rgb(var(--k-accent))" }}>
                      {client.healthScore}
                    </p>
                    <p className="text-[10px] text-gray-500">health score</p>
                  </div>
                  {client.alerts > 0 && (
                    <span className="bg-red-500/15 text-red-400 text-[10px] font-heading font-bold rounded-full px-2 py-0.5">
                      {client.alerts}
                    </span>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </div>

        {/* Schedule */}
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">
              {period === "day" ? "Today\u0027s Schedule" : `Schedule — ${formattedRange}`}
            </h3>
            <button onClick={() => router.push("/trainer/schedule")} className="flex items-center gap-1 text-xs font-heading font-semibold text-kairos-gold hover:text-kairos-gold-light transition-colors group">
              View All <ArrowRight size={14} className="transition-transform group-hover:translate-x-0.5" />
            </button>
          </div>
          <div className="space-y-3">
            {data.todaySchedule.map((session) => (
              <div key={session.id} className="flex items-center gap-3 py-2">
                <span className="text-xs w-16 shrink-0" style={{ color: accentColor || "rgb(var(--k-accent))" }}>
                  {session.time}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{session.client}</p>
                  <p className="text-[10px] text-gray-500">{session.type}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
