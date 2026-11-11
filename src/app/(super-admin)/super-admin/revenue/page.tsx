"use client";

import { useMemo } from "react";
import { TrendingUp, Users, Percent, DollarSign } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
import { trpc } from "@/lib/trpc";
import { REVENUE_ESTIMATE_NOTE, estimatedArpu } from "@/lib/revenue/estimate";

type IconKey = "dollar" | "trending" | "users" | "percent";

const ICON_MAP: Record<IconKey, typeof DollarSign> = {
  dollar: DollarSign,
  trending: TrendingUp,
  users: Users,
  percent: Percent,
};

function currency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
}

export default function Page() {
  const { selectedCompany, setSelectedCompany, company, companies } = useCompanyFilter();

  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  // Platform-wide revenue via tRPC
  const { data: platformData } = trpc.admin.revenue.getRevenueDashboard.useQuery(
    undefined,
    { staleTime: 30_000 }
  );

  // Company-specific tRPC queries
  const { data: trainersData } = trpc.admin.companies.getTrainers.useQuery(
    { companyId: company?.id ?? "" },
    { enabled: !!company, staleTime: 30_000 }
  );
  const { data: companyEstimate } = trpc.admin.companies.getRevenueEstimate.useQuery(
    { companyId: company?.id ?? "" },
    { enabled: !!company, staleTime: 30_000 }
  );

  // Company-specific revenue data — shared estimate (active clients × tier price)
  const companyRevenueData = useMemo(() => {
    if (!company || !trainersData || !companyEstimate) return null;
    const totalCents = companyEstimate.mrr * 100;

    const trainerRevenue = trainersData.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      clients: t.clientCount,
      revenue: t.estMrr,
      percentage: companyEstimate.mrr > 0 ? Math.round((t.estMrr / companyEstimate.mrr) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      mrr: companyEstimate.mrr,
      arr: companyEstimate.arr,
      arpu: estimatedArpu(companyEstimate) * 100, // cents, for currency()
      activeClients: companyEstimate.clientCount,
      tierBreakdown: companyEstimate.byTier.map((t) => ({
        tier: `${t.label} ($${t.price}/mo)`,
        count: t.clientCount,
        revenue: t.mrr * 100, // cents
        percentage: totalCents > 0 ? Math.round(((t.mrr * 100) / totalCents) * 100) : 0,
      })),
      trainerRevenue,
    };
  }, [company, trainersData, companyEstimate]);

  const kpis = platformData?.kpis ?? [];
  const topClients = platformData?.topClients ?? [];
  const recentPayouts = platformData?.recentPayouts ?? [];
  const breakdown = platformData?.breakdown ?? [];
  const byTier = platformData?.byTier ?? [];
  const untieredCount = platformData?.untieredCount ?? 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-1">Revenue Dashboard</h1>
          <p className="font-body text-kairos-silver-dark">
            {company ? `${company.name} — Financial overview` : "Platform performance and financial metrics"}
          </p>
          <p className="font-body text-xs text-kairos-silver-dark mt-1">
            {REVENUE_ESTIMATE_NOTE} — active clients × tier monthly price. No payment data yet.
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
            {company.trainerCount} coaches · {company.clientCount} clients
          </span>
        </div>
      )}

      {/* KPI Grid */}
      {company && companyRevenueData ? (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
            <div className="flex items-start justify-between mb-3">
              <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">Est. MRR</span>
              <DollarSign className="w-4 h-4 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-xl text-white">${companyRevenueData.mrr.toLocaleString()}</p>
          </div>
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
            <div className="flex items-start justify-between mb-3">
              <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">Est. ARR</span>
              <TrendingUp className="w-4 h-4 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-xl text-white">${companyRevenueData.arr.toLocaleString()}</p>
          </div>
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
            <div className="flex items-start justify-between mb-3">
              <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">Est. Revenue / Client</span>
              <Users className="w-4 h-4 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-xl text-white">{currency(companyRevenueData.arpu)}</p>
          </div>
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
            <div className="flex items-start justify-between mb-3">
              <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">Active Clients</span>
              <Users className="w-4 h-4 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-xl text-white">{companyRevenueData.activeClients}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {kpis.map((kpi) => {
            const Icon = ICON_MAP[kpi.iconKey as IconKey];
            return (
              <div
                key={kpi.label}
                className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">
                    {kpi.label}
                  </span>
                  <Icon className="w-4 h-4 text-kairos-gold" />
                </div>
                <p className="font-heading font-bold text-xl text-white">{kpi.value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Company-specific breakdown OR platform breakdown */}
      {company && companyRevenueData ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue by Tier */}
          <div className="lg:col-span-2 bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Est. Revenue by Tier</h2>
            <div className="space-y-4">
              {companyRevenueData.tierBreakdown.map((tier) => (
                <div key={tier.tier}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-body text-sm text-kairos-silver-dark">{tier.tier}</span>
                    <span className="font-body text-xs text-kairos-gold font-semibold">{tier.percentage}%</span>
                  </div>
                  <div className="w-full h-6 rounded-kairos-sm bg-gray-900 overflow-hidden">
                    <div
                      className="h-full rounded-kairos-sm"
                      style={{ width: `${tier.percentage}%`, backgroundColor: company.brandColor }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-xs text-kairos-silver-dark">{tier.count} clients</span>
                    <span className="text-xs text-white">{currency(tier.revenue)}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Revenue by Trainer */}
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Est. Revenue by Coach</h2>
            <div className="space-y-3">
              {companyRevenueData.trainerRevenue.slice(0, 6).map((trainer) => (
                <div key={trainer.name}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-body text-sm text-white truncate">{trainer.name}</span>
                    <span className="font-body text-xs font-semibold text-kairos-gold">${trainer.revenue.toLocaleString()}/mo</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-gray-900 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${trainer.percentage}%`, backgroundColor: company.brandColor }}
                      />
                    </div>
                    <span className="text-[10px] text-kairos-silver-dark">{trainer.clients} clients</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue Breakdown Chart */}
            <div className="lg:col-span-2 bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
              <h2 className="font-heading font-bold text-lg text-white mb-6">Est. Revenue by Tier (current client mix)</h2>
              <div className="space-y-4">
                {breakdown.map((item) => {
                  const total = item.tier1 + item.tier2 + item.tier3;
                  return (
                    <div key={item.month}>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-body text-sm text-kairos-silver-dark">{item.month}</span>
                        <span className="font-body text-xs text-white">
                          ${(total / 100000).toFixed(1)}k
                        </span>
                      </div>
                      <div className="flex h-6 rounded-kairos-sm overflow-hidden bg-gray-900">
                        <div className="bg-kairos-gold" style={{ width: `${(item.tier1 / total) * 100}%` }} title={`Tier 1: $${(item.tier1 / 100).toLocaleString()}`} />
                        <div className="bg-blue-400" style={{ width: `${(item.tier2 / total) * 100}%` }} title={`Tier 2: $${(item.tier2 / 100).toLocaleString()}`} />
                        <div className="bg-purple-400" style={{ width: `${(item.tier3 / total) * 100}%` }} title={`Tier 3: $${(item.tier3 / 100).toLocaleString()}`} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="flex gap-6 mt-8 pt-6 border-t border-kairos-border">
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-kairos-sm bg-kairos-gold" /><span className="font-body text-xs text-kairos-silver-dark">Tier 1</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-kairos-sm bg-blue-400" /><span className="font-body text-xs text-kairos-silver-dark">Tier 2</span></div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-kairos-sm bg-purple-400" /><span className="font-body text-xs text-kairos-silver-dark">Tier 3</span></div>
              </div>
            </div>

            {/* Estimate basis: tier price × active clients */}
            <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
              <h2 className="font-heading font-bold text-lg text-white mb-1">How Est. MRR Is Calculated</h2>
              <p className="font-body text-xs text-kairos-silver-dark mb-6">{REVENUE_ESTIMATE_NOTE}</p>
              <div className="space-y-3">
                {byTier.map((t) => (
                  <div key={t.tier} className="flex items-center justify-between">
                    <span className="font-body text-sm text-kairos-silver-dark">
                      {t.label}: {t.clientCount} × ${t.price}
                    </span>
                    <span className="font-body text-sm font-semibold text-kairos-gold">${t.mrr.toLocaleString()}</span>
                  </div>
                ))}
                {untieredCount > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="font-body text-sm text-kairos-silver-dark">No tier: {untieredCount} × $0</span>
                    <span className="font-body text-sm text-kairos-silver-dark">$0</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Company Revenue Comparison Table */}
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6 overflow-x-auto">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Est. Revenue by Company</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Company</th>
                  <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Coaches</th>
                  <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Clients</th>
                  <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Est. MRR</th>
                  <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Est. ARR</th>
                  <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Share</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeCompanies = companies.filter((c) => c.status === "active");
                  const totalMRR = activeCompanies.reduce((s, c) => s + c.estMrr, 0);
                  return activeCompanies
                    .sort((a, b) => b.estMrr - a.estMrr)
                    .map((c) => {
                      const mrr = c.estMrr;
                      const share = totalMRR > 0 ? Math.round((mrr / totalMRR) * 100) : 0;
                      return (
                        <tr key={c.id} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-2">
                              <div
                                className="w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold text-white"
                                style={{ backgroundColor: c.brandColor }}
                              >
                                {c.name.charAt(0)}
                              </div>
                              <span className="font-body text-sm text-white">{c.name}</span>
                            </div>
                          </td>
                          <td className="font-body text-sm text-kairos-silver text-center py-4 px-4">{c.trainerCount}</td>
                          <td className="font-body text-sm text-kairos-silver text-center py-4 px-4">{c.clientCount}</td>
                          <td className="font-body text-sm font-semibold text-kairos-gold text-right py-4 px-4">${mrr.toLocaleString()}</td>
                          <td className="font-body text-sm text-white text-right py-4 px-4">${(mrr * 12).toLocaleString()}</td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-center gap-2">
                              <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                                <div className="h-full rounded-full" style={{ width: `${share}%`, backgroundColor: c.brandColor }} />
                              </div>
                              <span className="text-xs text-kairos-silver-dark">{share}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    });
                })()}
              </tbody>
            </table>
          </div>

          {/* Top Revenue Clients Table */}
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6 overflow-x-auto">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Top Revenue Clients</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Client Name</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Tier</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Est. Monthly</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Est. Lifetime</th>
                </tr>
              </thead>
              <tbody>
                {topClients.map((client, idx) => (
                  <tr key={idx} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                    <td className="font-body text-sm text-white py-4 px-4">{client.name}</td>
                    <td className="font-body text-sm text-kairos-silver-dark py-4 px-4">{client.tier}</td>
                    <td className="font-body text-sm font-semibold text-kairos-gold py-4 px-4">{client.monthly}</td>
                    <td className="font-body text-sm text-white py-4 px-4">{client.lifetime}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Estimated payouts to coaches */}
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6 overflow-x-auto">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Est. Coach Payouts</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Coach Name</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Amount</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Basis</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentPayouts.map((payout, idx) => (
                  <tr key={idx} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                    <td className="font-body text-sm text-white py-4 px-4">{payout.coach}</td>
                    <td className="font-body text-sm font-semibold text-kairos-gold py-4 px-4">{payout.amount}</td>
                    <td className="font-body text-sm text-kairos-silver-dark py-4 px-4">{payout.date}</td>
                    <td className="py-4 px-4">
                      <span
                        className="font-body text-xs font-semibold px-2 py-1 rounded-kairos-sm bg-gray-800 text-kairos-silver"
                      >
                        {payout.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
