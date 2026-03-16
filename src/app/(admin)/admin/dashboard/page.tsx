"use client";

import { KPICard } from "@/components/ui/KPICard";
import { Users, UserCircle, DollarSign, TrendingUp, Shield, Activity } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useAdminDashboard } from "@/hooks/admin/useAdminDashboard";

export default function AdminDashboard() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { period, setPeriod, dateRange: _dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { kpis: _adminKpis, coaches: _adminCoaches, auditLog: _auditLog } = useAdminDashboard();

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
        <KPICard label="Total Clients" value="47" trend="up" trendValue="+8 this month" icon={<Users size={16} />} />
        <KPICard label="Active Coaches" value="6" icon={<UserCircle size={16} />} />
        <KPICard label="Monthly Revenue" value="$18.4K" trend="up" trendValue="+22%" icon={<DollarSign size={16} />} highlight />
        <KPICard label="Supplement Revenue" value="$6.2K" trend="up" trendValue="+15%" icon={<TrendingUp size={16} />} />
        <KPICard label="Platform Health" value="99.7" unit="%" icon={<Shield size={16} />} />
        <KPICard label="Avg Health Score" value="79" unit="/100" trend="up" trendValue="+3 pts" icon={<Activity size={16} />} />
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
                {[
                  { name: "Dr. Marcus Chen", clients: 12, revenue: "$4,800", score: 85, response: "8 min" },
                  { name: "Dr. Sarah Williams", clients: 10, revenue: "$3,900", score: 82, response: "12 min" },
                  { name: "Coach Alex Rivera", clients: 8, revenue: "$2,400", score: 78, response: "18 min" },
                  { name: "Dr. Emily Park", clients: 9, revenue: "$3,600", score: 81, response: "10 min" },
                  { name: "Coach James Moore", clients: 8, revenue: "$2,100", score: 76, response: "22 min" },
                ].map((coach, i) => (
                  <tr key={i} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                    <td className="py-3 font-body text-white">{coach.name}</td>
                    <td className="py-3 text-right font-body text-kairos-silver">{coach.clients}</td>
                    <td className="py-3 text-right font-heading font-semibold text-kairos-gold">{coach.revenue}</td>
                    <td className="py-3 text-right font-body text-kairos-silver">{coach.score}</td>
                    <td className="py-3 text-right font-body text-kairos-silver-dark">{coach.response}</td>
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
            {[
              { event: "New client onboarded", detail: "Sarah K. → Dr. Chen", time: "1h ago" },
              { event: "Protocol updated", detail: "Michael M. supplements", time: "3h ago" },
              { event: "Lab results imported", detail: "Lisa P. blood panel", time: "5h ago" },
              { event: "Coach added", detail: "Dr. Emily Park joined", time: "1d ago" },
              { event: "Revenue milestone", detail: "$15K monthly achieved", time: "2d ago" },
            ].map((item, i) => (
              <div key={i} className="py-2 border-b border-kairos-border/30 last:border-0">
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
