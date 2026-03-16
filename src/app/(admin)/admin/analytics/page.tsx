"use client";

import { useMemo } from "react";
import { Users, Heart, Star, DollarSign, TrendingUp } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import {
  getKPIs,
  getGrowthAnalytics,
  getEngagementAnalytics,
  getRetentionAnalytics,
  getCoachPerformance,
  getPlatformHealth,
  getRevenueAnalytics,
} from "@/lib/analytics/engine";
import { GrowthChart } from "@/components/analytics/GrowthChart";
import { EngagementMetrics } from "@/components/analytics/EngagementMetrics";
import { CohortRetentionTable } from "@/components/analytics/CohortRetentionTable";
import { CoachLeaderboard } from "@/components/analytics/CoachLeaderboard";
import { PlatformHealthPanel } from "@/components/analytics/PlatformHealthPanel";
import { RevenueChart } from "@/components/analytics/RevenueChart";

const KPI_ICONS: Record<string, React.ReactNode> = {
  users: <Users size={24} />,
  heart: <Heart size={24} />,
  star: <Star size={24} />,
  dollar: <DollarSign size={24} />,
  trending: <TrendingUp size={24} />,
};

export default function AnalyticsPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  const kpis = useMemo(() => getKPIs(range), [range]);
  const growth = useMemo(() => getGrowthAnalytics(range), [range]);
  const engagement = useMemo(() => getEngagementAnalytics(range), [range]);
  const retention = useMemo(() => getRetentionAnalytics(range), [range]);
  const coachPerformance = useMemo(() => getCoachPerformance(range), [range]);
  const platformHealth = useMemo(() => getPlatformHealth(), []);
  const revenue = useMemo(() => getRevenueAnalytics(range), [range]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Platform Analytics</h1>
        <p className="text-gray-400">Real-time insights into platform performance and user engagement</p>
      </div>

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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
          <div key={kpi.label} className="kairos-card p-4">
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <p className="text-gray-400 text-xs mb-1">{kpi.label}</p>
                <p className="text-xl font-heading font-bold text-white">{kpi.value}</p>
              </div>
              <div className="text-[#D4AF37] opacity-60">
                {KPI_ICONS[kpi.icon] ?? <TrendingUp size={24} />}
              </div>
            </div>
            <div className={`text-xs ${kpi.trend >= 0 ? "text-green-400" : "text-red-400"}`}>
              {kpi.trend >= 0 ? "+" : ""}{kpi.trend}% {kpi.trendLabel}
            </div>
          </div>
        ))}
      </div>

      {/* Growth and Engagement */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <GrowthChart data={growth.dataPoints} />
        </div>
        <EngagementMetrics data={engagement} />
      </div>

      {/* Revenue */}
      <RevenueChart data={revenue} />

      {/* Retention */}
      <CohortRetentionTable data={retention} />

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoachLeaderboard data={coachPerformance} />
        <PlatformHealthPanel data={platformHealth} />
      </div>
    </div>
  );
}
