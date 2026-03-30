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
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
import { trpc } from "@/lib/trpc";

const KPI_ICONS: Record<string, React.ReactNode> = {
  users: <Users size={24} />,
  heart: <Heart size={24} />,
  star: <Star size={24} />,
  dollar: <DollarSign size={24} />,
  trending: <TrendingUp size={24} />,
};

export default function AnalyticsPage() {
  const { selectedCompany, setSelectedCompany, company, companies } = useCompanyFilter();

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

  // Company-specific tRPC queries
  const { data: trainersData } = trpc.admin.companies.getTrainers.useQuery(
    { companyId: company?.id ?? "" },
    { enabled: !!company, staleTime: 30_000 }
  );
  const { data: clientsData } = trpc.admin.companies.getClients.useQuery(
    { companyId: company?.id ?? "" },
    { enabled: !!company, staleTime: 30_000 }
  );

  // Company-specific analytics
  const companyAnalytics = useMemo(() => {
    if (!company || !trainersData || !clientsData) return null;
    const active = trainersData.filter((t) => t.status === "active");
    const avgRating = active.length > 0
      ? (active.reduce((s, t) => s + t.rating, 0) / active.length).toFixed(1)
      : "0";
    const totalCapacity = active.reduce((s, t) => s + t.capacity, 0);
    const totalAssigned = active.reduce((s, t) => s + t.clientCount, 0);
    const utilization = totalCapacity > 0 ? Math.round((totalAssigned / totalCapacity) * 100) : 0;
    const mrr = company.clientCount * 200;

    // Tier distribution
    const tierCounts = { tier1: 0, tier2: 0, tier3: 0 };
    clientsData.forEach((c) => { tierCounts[c.tier]++; });

    return {
      trainers: active.length,
      clients: company.clientCount,
      avgRating: parseFloat(avgRating),
      utilization,
      mrr,
      tierCounts,
      trainerPerformance: active.map((t) => ({
        name: `${t.firstName} ${t.lastName}`,
        clients: t.clientCount,
        capacity: t.capacity,
        rating: t.rating,
        utilization: t.capacity > 0 ? Math.round((t.clientCount / t.capacity) * 100) : 0,
      })).sort((a, b) => b.rating - a.rating),
    };
  }, [company, trainersData, clientsData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">
            {company ? `${company.name} Analytics` : "Platform Analytics"}
          </h1>
          <p className="text-gray-400">
            {company
              ? "Company-level insights and trainer performance"
              : "Real-time insights into platform performance and user engagement"}
          </p>
        </div>
        <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
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

      {/* Company Badge */}
      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: company.brandColor }}
          >
            {company.name.charAt(0)}
          </div>
          <span className="font-heading font-semibold text-white text-sm">{company.name}</span>
          <span className="text-xs text-kairos-silver-dark ml-auto">
            {company.trainerCount} trainers · {company.clientCount} clients
          </span>
        </div>
      )}

      {company && companyAnalytics ? (
        <>
          {/* Company KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {[
              { label: "Active Trainers", value: String(companyAnalytics.trainers), icon: "star", trend: 0 },
              { label: "Total Clients", value: String(companyAnalytics.clients), icon: "users", trend: 5.2 },
              { label: "Avg Rating", value: companyAnalytics.avgRating.toFixed(1), icon: "heart", trend: 2.1 },
              { label: "Utilization", value: `${companyAnalytics.utilization}%`, icon: "trending", trend: 3.4 },
              { label: "Est. MRR", value: `$${companyAnalytics.mrr.toLocaleString()}`, icon: "dollar", trend: 8.0 },
              { label: "Capacity Left", value: String(company.maxClients - companyAnalytics.clients), icon: "users", trend: 0 },
            ].map((kpi) => (
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
                {kpi.trend !== 0 && (
                  <div className={`text-xs ${kpi.trend >= 0 ? "text-green-400" : "text-red-400"}`}>
                    {kpi.trend >= 0 ? "+" : ""}{kpi.trend}% this period
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Tier Distribution */}
          <div className="kairos-card p-6">
            <h3 className="font-heading font-semibold text-white mb-4">Client Tier Distribution</h3>
            <div className="grid grid-cols-3 gap-4">
              {[
                { label: "Tier 1 (Essential)", count: companyAnalytics.tierCounts.tier1, color: "#D4AF37" },
                { label: "Tier 2 (Premium)", count: companyAnalytics.tierCounts.tier2, color: "#60A5FA" },
                { label: "Tier 3 (Elite)", count: companyAnalytics.tierCounts.tier3, color: "#A78BFA" },
              ].map((tier) => {
                const pct = companyAnalytics.clients > 0 ? Math.round((tier.count / companyAnalytics.clients) * 100) : 0;
                return (
                  <div key={tier.label} className="text-center">
                    <div className="relative w-20 h-20 mx-auto mb-2">
                      <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="#1F2937" strokeWidth="3" />
                        <path d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke={tier.color} strokeWidth="3" strokeDasharray={`${pct}, 100`} />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="font-heading font-bold text-white text-sm">{pct}%</span>
                      </div>
                    </div>
                    <p className="text-xs text-kairos-silver-dark">{tier.label}</p>
                    <p className="text-sm font-heading font-semibold text-white">{tier.count} clients</p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Trainer Performance Table */}
          <div className="kairos-card p-6 overflow-x-auto">
            <h3 className="font-heading font-semibold text-white mb-4">Trainer Performance</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left py-2 text-xs font-heading text-kairos-silver-dark">Trainer</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Clients</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Capacity</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Utilization</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Rating</th>
                </tr>
              </thead>
              <tbody>
                {companyAnalytics.trainerPerformance.map((t) => (
                  <tr key={t.name} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                    <td className="py-3 font-body text-white">{t.name}</td>
                    <td className="py-3 text-center font-body text-kairos-silver">{t.clients}</td>
                    <td className="py-3 text-center font-body text-kairos-silver-dark">{t.capacity}</td>
                    <td className="py-3 text-center">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full"
                            style={{
                              width: `${t.utilization}%`,
                              backgroundColor: t.utilization > 85 ? "#EF4444" : t.utilization > 60 ? "#F59E0B" : "#22C55E",
                            }}
                          />
                        </div>
                        <span className="text-xs text-kairos-silver-dark">{t.utilization}%</span>
                      </div>
                    </td>
                    <td className="py-3 text-center font-heading font-semibold text-kairos-gold">{t.rating}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          {/* Platform KPI Row */}
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

          {/* Company Comparison Table */}
          <div className="kairos-card p-6 overflow-x-auto">
            <h3 className="font-heading font-semibold text-white mb-4">Company Performance Comparison</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left py-2 text-xs font-heading text-kairos-silver-dark">Company</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Trainers</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Clients</th>
                  <th className="text-center py-2 text-xs font-heading text-kairos-silver-dark">Utilization</th>
                  <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Est. MRR</th>
                </tr>
              </thead>
              <tbody>
                {companies
                  .filter((c) => c.status === "active")
                  .sort((a, b) => b.clientCount - a.clientCount)
                  .map((c) => {
                    const util = c.maxClients > 0 ? Math.round((c.clientCount / c.maxClients) * 100) : 0;
                    return (
                      <tr key={c.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors cursor-pointer" onClick={() => setSelectedCompany(c.id)}>
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold text-white" style={{ backgroundColor: c.brandColor }}>
                              {c.name.charAt(0)}
                            </div>
                            <span className="font-body text-white">{c.name}</span>
                          </div>
                        </td>
                        <td className="py-3 text-center font-body text-kairos-silver">{c.trainerCount}</td>
                        <td className="py-3 text-center font-body text-kairos-silver">{c.clientCount}</td>
                        <td className="py-3 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${util}%`, backgroundColor: c.brandColor }} />
                            </div>
                            <span className="text-xs text-kairos-silver-dark">{util}%</span>
                          </div>
                        </td>
                        <td className="py-3 text-right font-heading font-semibold text-kairos-gold">
                          ${(c.clientCount * 200).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
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
        </>
      )}
    </div>
  );
}
