"use client";

import { useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { Users, UserCircle, DollarSign, TrendingUp, Shield, Activity } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { getAdminDashboard } from "@/lib/admin-coaches/engine";

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={16} />,
  "user-circle": <UserCircle size={16} />,
  dollar: <DollarSign size={16} />,
  trending: <TrendingUp size={16} />,
  shield: <Shield size={16} />,
  activity: <Activity size={16} />,
};

export default function AdminDashboard() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  const data = useMemo(() => getAdminDashboard(range), [range]);

  return (
    <div className="space-y-6 animate-fade-in">
      <DateRangeNavigator
        availablePeriods={["month", "quarter", "year"]}
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
            unit={kpi.label === "Platform Health" ? "%" : kpi.label === "Avg Health Score" ? "/100" : undefined}
            trend={kpi.trend}
            trendValue={kpi.trendValue}
            icon={ICON_MAP[kpi.icon] ?? <Activity size={16} />}
            highlight={kpi.highlight}
          />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coach Overview */}
        <div className="lg:col-span-2 kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Coach Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left py-2 text-xs font-heading text-kairos-silver-dark">Coach</th>
                  <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Clients</th>
                  <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Revenue</th>
                  <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Avg Score</th>
                  <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Response</th>
                </tr>
              </thead>
              <tbody>
                {data.coachPerformance.map((coach) => (
                  <tr key={coach.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                    <td className="py-3 font-body text-white">{coach.name}</td>
                    <td className="py-3 text-right font-body text-kairos-silver">{coach.clientsAssigned}</td>
                    <td className="py-3 text-right font-heading font-semibold text-kairos-gold">
                      ${(coach.revenueGenerated / 1000).toFixed(1)}K
                    </td>
                    <td className="py-3 text-right font-body text-kairos-silver">{coach.avgHealthScore}</td>
                    <td className="py-3 text-right font-body text-kairos-silver-dark">{coach.responseTimeMin} min</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Platform Activity</h3>
          <div className="space-y-3">
            {data.recentActivity.map((item) => (
              <div key={item.id} className="py-2 border-b border-kairos-border/30 last:border-0">
                <p className="text-sm font-body text-white">{item.event}</p>
                <div className="flex justify-between mt-0.5">
                  <p className="text-xs font-body text-kairos-silver-dark">{item.detail}</p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">{item.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
