"use client";

import { useMemo } from "react";
import { TrendingUp, Users, Percent, DollarSign } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { getAdminRevenueData } from "@/lib/admin-revenue/engine";
import type { RevenueKPI } from "@/lib/admin-revenue/types";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
import { getCompanyTrainers, getCompanyClients } from "@/lib/company-ops/engine";

const ICON_MAP: Record<RevenueKPI["iconKey"], typeof DollarSign> = {
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

  const platformData = useMemo(() => getAdminRevenueData(), []);

  // Company-specific revenue data
  const companyRevenueData = useMemo(() => {
    if (!company) return null;
    const trainers = getCompanyTrainers(company.id);
    const clients = getCompanyClients(company.id);

    const mrr = company.clientCount * 200;
    const arr = mrr * 12;
    const arpu = company.clientCount > 0 ? Math.round((mrr / company.clientCount) * 100) : 0;

    // Revenue by tier
    const tierCounts = { tier1: 0, tier2: 0, tier3: 0 };
    clients.forEach((c) => { tierCounts[c.tier]++; });
    const tier1Rev = tierCounts.tier1 * 100 * 100; // $100/mo in cents
    const tier2Rev = tierCounts.tier2 * 200 * 100; // $200/mo
    const tier3Rev = tierCounts.tier3 * 400 * 100; // $400/mo
    const totalCents = tier1Rev + tier2Rev + tier3Rev;

    // Revenue by trainer
    const trainerRevenue = trainers.map((t) => ({
      name: `${t.firstName} ${t.lastName}`,
      clients: t.clientCount,
      revenue: t.clientCount * 200,
      percentage: company.clientCount > 0 ? Math.round((t.clientCount / company.clientCount) * 100) : 0,
    })).sort((a, b) => b.revenue - a.revenue);

    return {
      mrr,
      arr,
      arpu,
      tierBreakdown: [
        { tier: "Tier 1 (Essential)", count: tierCounts.tier1, revenue: tier1Rev, percentage: totalCents > 0 ? Math.round((tier1Rev / totalCents) * 100) : 0 },
        { tier: "Tier 2 (Premium)", count: tierCounts.tier2, revenue: tier2Rev, percentage: totalCents > 0 ? Math.round((tier2Rev / totalCents) * 100) : 0 },
        { tier: "Tier 3 (Elite)", count: tierCounts.tier3, revenue: tier3Rev, percentage: totalCents > 0 ? Math.round((tier3Rev / totalCents) * 100) : 0 },
      ],
      trainerRevenue,
    };
  }, [company]);

  const { kpis, topClients, recentPayouts, breakdown, sources } = platformData;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-1">Revenue Dashboard</h1>
          <p className="font-body text-kairos-silver-dark">
            {company ? `${company.name} — Financial overview` : "Platform performance and financial metrics"}
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
              <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">ARPU</span>
              <Users className="w-4 h-4 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-xl text-white">{currency(companyRevenueData.arpu)}</p>
          </div>
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-4 hover:bg-kairos-card-hover transition-colors">
            <div className="flex items-start justify-between mb-3">
              <span className="font-body text-xs text-kairos-silver-dark uppercase tracking-wide">Clients</span>
              <Users className="w-4 h-4 text-kairos-gold" />
            </div>
            <p className="font-heading font-bold text-xl text-white">{company.clientCount}</p>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          {kpis.map((kpi) => {
            const Icon = ICON_MAP[kpi.iconKey];
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
            <h2 className="font-heading font-bold text-lg text-white mb-6">Revenue by Tier</h2>
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
            <h2 className="font-heading font-bold text-lg text-white mb-6">Revenue by Trainer</h2>
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
              <h2 className="font-heading font-bold text-lg text-white mb-6">Revenue by Tier (6 Months)</h2>
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

            {/* Revenue by Source */}
            <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6">
              <h2 className="font-heading font-bold text-lg text-white mb-6">Revenue by Source</h2>
              <div className="space-y-4">
                {sources.map((item) => (
                  <div key={item.source}>
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-body text-sm text-kairos-silver-dark">{item.source}</span>
                      <span className="font-body text-xs font-semibold text-kairos-gold">{item.percentage}%</span>
                    </div>
                    <div className="w-full h-2 rounded-kairos-sm bg-gray-900 overflow-hidden">
                      <div className="h-full bg-kairos-gold" style={{ width: `${item.percentage}%` }} />
                    </div>
                    <p className="font-body text-xs text-white mt-1">{item.amount}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Company Revenue Comparison Table */}
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6 overflow-x-auto">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Revenue by Company</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Company</th>
                  <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Trainers</th>
                  <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Clients</th>
                  <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Est. MRR</th>
                  <th className="text-right font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Est. ARR</th>
                  <th className="text-center font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Share</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const activeCompanies = companies.filter((c) => c.status === "active");
                  const totalMRR = activeCompanies.reduce((s, c) => s + c.clientCount * 200, 0);
                  return activeCompanies
                    .sort((a, b) => b.clientCount - a.clientCount)
                    .map((c) => {
                      const mrr = c.clientCount * 200;
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
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Monthly Spend</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Lifetime Value</th>
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

          {/* Recent Payouts to Trainers */}
          <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6 overflow-x-auto">
            <h2 className="font-heading font-bold text-lg text-white mb-6">Recent Payouts to Trainers</h2>
            <table className="w-full">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Trainer Name</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Amount</th>
                  <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Date</th>
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
                        className={`font-body text-xs font-semibold px-2 py-1 rounded-kairos-sm ${
                          payout.status === "Paid"
                            ? "bg-green-900 text-green-200"
                            : "bg-yellow-900 text-yellow-200"
                        }`}
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
