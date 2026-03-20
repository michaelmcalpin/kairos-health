"use client";

import { TrendingUp, Users, Percent, DollarSign } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { getAdminRevenueData } from "@/lib/admin-revenue/engine";
import type { RevenueKPI } from "@/lib/admin-revenue/types";

const ICON_MAP: Record<RevenueKPI["iconKey"], typeof DollarSign> = {
  dollar: DollarSign,
  trending: TrendingUp,
  users: Users,
  percent: Percent,
};

export default function Page() {
  const { period, setPeriod, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  const { kpis, topClients, recentPayouts, breakdown, sources } = getAdminRevenueData();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Page Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-1">Revenue Dashboard</h1>
        <p className="font-body text-kairos-silver-dark">
          Platform performance and financial metrics
        </p>
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

      {/* KPI Grid */}
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
                    <div
                      className="bg-kairos-gold"
                      style={{ width: `${(item.tier1 / total) * 100}%` }}
                      title={`Tier 1: $${(item.tier1 / 100).toLocaleString()}`}
                    />
                    <div
                      className="bg-blue-400"
                      style={{ width: `${(item.tier2 / total) * 100}%` }}
                      title={`Tier 2: $${(item.tier2 / 100).toLocaleString()}`}
                    />
                    <div
                      className="bg-purple-400"
                      style={{ width: `${(item.tier3 / total) * 100}%` }}
                      title={`Tier 3: $${(item.tier3 / 100).toLocaleString()}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
          <div className="flex gap-6 mt-8 pt-6 border-t border-kairos-border">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-kairos-sm bg-kairos-gold" />
              <span className="font-body text-xs text-kairos-silver-dark">Tier 1</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-kairos-sm bg-blue-400" />
              <span className="font-body text-xs text-kairos-silver-dark">Tier 2</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-kairos-sm bg-purple-400" />
              <span className="font-body text-xs text-kairos-silver-dark">Tier 3</span>
            </div>
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
                  <span className="font-body text-xs font-semibold text-kairos-gold">
                    {item.percentage}%
                  </span>
                </div>
                <div className="w-full h-2 rounded-kairos-sm bg-gray-900 overflow-hidden">
                  <div
                    className="h-full bg-kairos-gold"
                    style={{ width: `${item.percentage}%` }}
                  />
                </div>
                <p className="font-body text-xs text-white mt-1">{item.amount}</p>
              </div>
            ))}
          </div>
        </div>
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

      {/* Recent Payouts to Coaches */}
      <div className="bg-kairos-card border border-kairos-border rounded-kairos-sm p-6 overflow-x-auto">
        <h2 className="font-heading font-bold text-lg text-white mb-6">Recent Payouts to Coaches</h2>
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left font-heading font-semibold text-sm text-kairos-silver-dark py-3 px-4">Coach Name</th>
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
    </div>
  );
}
