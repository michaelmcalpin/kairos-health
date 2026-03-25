"use client";

import { useMemo } from "react";
import { KPICard } from "@/components/ui/KPICard";
import { Users, UserCircle, DollarSign, TrendingUp, Shield, Activity, Building2 } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
import { trpc } from "@/lib/trpc";

const ICON_MAP: Record<string, React.ReactNode> = {
  users: <Users size={16} />,
  "user-circle": <UserCircle size={16} />,
  dollar: <DollarSign size={16} />,
  trending: <TrendingUp size={16} />,
  shield: <Shield size={16} />,
  activity: <Activity size={16} />,
  building: <Building2 size={16} />,
};

export default function AdminDashboard() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();

  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const range = useMemo(() => ({
    startDate: dateRange.startDate.toISOString().split("T")[0],
    endDate: dateRange.endDate.toISOString().split("T")[0],
  }), [dateRange]);

  // ── tRPC query — real DB data ──────────────────────────────
  const { data, isLoading, error } = trpc.admin.dashboard.getDashboard.useQuery(
    { ...range, companyId: company?.id },
    { staleTime: 30_000, refetchOnWindowFocus: false }
  );

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
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
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kairos-card h-24 animate-pulse bg-gray-800/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 kairos-card h-64 animate-pulse bg-gray-800/50" />
          <div className="kairos-card h-64 animate-pulse bg-gray-800/50" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
        </div>
        <div className="kairos-card p-12 text-center">
          <Shield size={48} className="mx-auto mb-4 text-gray-600" />
          <h3 className="font-heading font-semibold text-white mb-2">
            {error ? "Unable to load dashboard" : "No data yet"}
          </h3>
          <p className="text-sm text-gray-400">
            {error ? "There was an error loading the dashboard. Please try refreshing." : "Dashboard will populate once users are registered."}
          </p>
        </div>
      </div>
    );
  }

  // Build KPIs — company-specific when filtered
  const kpis = company
    ? [
        { label: "Trainers", value: String(company.trainerCount), icon: "user-circle" },
        { label: "Clients", value: String(company.clientCount), icon: "users", trend: "up" as const, trendValue: "+3 this month" },
        { label: "Est. MRR", value: `$${((company.clientCount * 200) / 1000).toFixed(1)}K`, icon: "dollar", highlight: true },
        { label: "Max Trainers", value: String(company.maxTrainers), icon: "shield" },
        { label: "Max Clients", value: String(company.maxClients), icon: "activity" },
        { label: "Status", value: company.status, icon: "trending" },
      ]
    : data.kpis;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header with Company Selector */}
      <div className="flex items-center justify-between">
        <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
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
      </div>

      {/* Company Badge when filtered */}
      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div
            className="w-8 h-8 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold text-sm"
            style={{ backgroundColor: company.brandColor }}
          >
            {company.name.charAt(0)}
          </div>
          <div>
            <p className="font-heading font-semibold text-white text-sm">{company.name}</p>
            <p className="text-[10px] text-kairos-silver-dark">{company.website || company.slug}</p>
          </div>
          <div className="ml-auto text-xs text-kairos-silver-dark">
            {company.trainerCount} trainers · {company.clientCount} clients
          </div>
        </div>
      )}

      {/* Platform-level company summary when "All" */}
      {!company && data.companyStats && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="kairos-card p-3 text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold">{data.companyStats.totalCompanies}</p>
            <p className="text-[10px] text-gray-500 uppercase">Companies</p>
          </div>
          <div className="kairos-card p-3 text-center">
            <p className="text-2xl font-heading font-bold text-green-400">{data.companyStats.activeCompanies}</p>
            <p className="text-[10px] text-gray-500 uppercase">Active</p>
          </div>
          <div className="kairos-card p-3 text-center">
            <p className="text-2xl font-heading font-bold text-white">{data.companyStats.totalTrainers}</p>
            <p className="text-[10px] text-gray-500 uppercase">Trainers</p>
          </div>
          <div className="kairos-card p-3 text-center">
            <p className="text-2xl font-heading font-bold text-white">{data.companyStats.totalClients}</p>
            <p className="text-[10px] text-gray-500 uppercase">Clients</p>
          </div>
          <div className="kairos-card p-3 text-center">
            <p className="text-2xl font-heading font-bold text-kairos-gold">
              ${(data.companyStats.mrr / 1000).toFixed(0)}K
            </p>
            <p className="text-[10px] text-gray-500 uppercase">Est. MRR</p>
          </div>
        </div>
      )}

      {/* KPI Row */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        {kpis.map((kpi) => (
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
        {/* Trainer Performance */}
        <div className="lg:col-span-2 kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">
            {company ? `${company.name} — Trainer Performance` : "Trainer Performance"}
          </h3>
          {data.coachPerformance.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No trainers registered yet.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-kairos-border">
                    <th className="text-left py-2 text-xs font-heading text-kairos-silver-dark">Trainer</th>
                    <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Clients</th>
                    <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Revenue</th>
                    <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Avg Score</th>
                    <th className="text-right py-2 text-xs font-heading text-kairos-silver-dark">Response</th>
                  </tr>
                </thead>
                <tbody>
                  {data.coachPerformance.map((trainer) => (
                    <tr key={trainer.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                      <td className="py-3 font-body text-white">{trainer.name}</td>
                      <td className="py-3 text-right font-body text-kairos-silver">{trainer.clientsAssigned}</td>
                      <td className="py-3 text-right font-heading font-semibold text-kairos-gold">
                        ${(trainer.revenueGenerated / 1000).toFixed(1)}K
                      </td>
                      <td className="py-3 text-right font-body text-kairos-silver">{trainer.avgHealthScore}</td>
                      <td className="py-3 text-right font-body text-kairos-silver-dark">{trainer.responseTimeMin} min</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Platform Activity */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Platform Activity</h3>
          {data.recentActivity.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No recent activity.</p>
          ) : (
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
          )}
        </div>
      </div>
    </div>
  );
}
