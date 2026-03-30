"use client";

import { useMemo } from "react";
import { Users, Heart, Star, DollarSign, TrendingUp } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { GrowthChart } from "@/components/analytics/GrowthChart";
import { EngagementMetrics } from "@/components/analytics/EngagementMetrics";
import { CohortRetentionTable } from "@/components/analytics/CohortRetentionTable";
import { CoachLeaderboard } from "@/components/analytics/CoachLeaderboard";
import { PlatformHealthPanel } from "@/components/analytics/PlatformHealthPanel";
import { RevenueChart } from "@/components/analytics/RevenueChart";
import { trpc } from "@/lib/trpc";

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

  // Platform-wide analytics via tRPC
  const { data: kpis = [] } = trpc.admin.analytics.getKPIs.useQuery(range, { staleTime: 30_000 });
  const { data: growth } = trpc.admin.analytics.getUserGrowth.useQuery(range, { staleTime: 30_000 });
  const { data: engagement } = trpc.admin.analytics.getEngagement.useQuery(range, { staleTime: 30_000 });
  const { data: retention } = trpc.admin.analytics.getCohortRetention.useQuery(range, { staleTime: 30_000 });
  const { data: coachPerformance } = trpc.admin.analytics.getCoachPerformance.useQuery(range, { staleTime: 30_000 });
  const { data: platformHealth } = trpc.admin.analytics.getPlatformHealth.useQuery(undefined, { staleTime: 60_000 });
  const { data: revenue } = trpc.admin.analytics.getRevenue.useQuery(range, { staleTime: 30_000 });

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
              <div className="text-kairos-gold opacity-60">
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
      {growth && engagement && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <GrowthChart data={growth.dataPoints} />
          </div>
          <EngagementMetrics data={engagement} />
        </div>
      )}

      {/* Revenue */}
      {revenue && <RevenueChart data={revenue} />}

      {/* Retention */}
      {retention && <CohortRetentionTable data={retention} />}

      {/* Bottom Row */}
      {(coachPerformance || platformHealth) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {coachPerformance && <CoachLeaderboard data={coachPerformance} />}
          {platformHealth && <PlatformHealthPanel data={platformHealth} />}
        </div>
      )}
    </div>
  );
}
