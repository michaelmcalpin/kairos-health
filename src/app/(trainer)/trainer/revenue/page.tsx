"use client";

import { useMemo } from "react";
import { DollarSign, TrendingUp, PieChart, Info } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { TIER_LABELS } from "@/lib/coach-clients/types";

export default function RevenueCoachPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  // TODO: Backend endpoints (coach.revenue.getSummary and coach.revenue.getClientRevenue)
  // need date filtering support (startDate/endDate params) so the DateRangeNavigator
  // can scope revenue data to the selected period. Currently the navigator is cosmetic.
  const { data: summaryData, isLoading: summaryLoading } =
    trpc.coach.revenue.getSummary.useQuery();

  // Fetch client revenue from tRPC
  const { data: clientRevenueData = [], isLoading: clientLoading } =
    trpc.coach.revenue.getClientRevenue.useQuery();

  // Build the data structure from tRPC responses
  const data = useMemo(() => {
    if (!summaryData) {
      return {
        totalMonthlyRevenue: 0,
        totalCoachingFees: 0,
        totalSupplementMarkup: 0,
        clientRevenue: [],
        tierSummaries: [],
      };
    }

    // Calculate tier summaries from client revenue data
    const tierSummaries = summaryData.byTier || [];

    // Client revenue with calculated totals
    const clientRevenue = (clientRevenueData || []).map((c) => ({
      ...c,
      totalMonthly: (c.coachingFee || 0) + (c.supplementMarkup || 0),
    }));

    return {
      totalMonthlyRevenue: summaryData.totalMonthlyRevenue || 0,
      totalCoachingFees: summaryData.coachingFees || 0,
      totalSupplementMarkup: summaryData.supplementMarkup || 0,
      clientRevenue,
      tierSummaries,
    };
  }, [summaryData, clientRevenueData]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Revenue Dashboard</h1>
        <p className="font-body text-kairos-silver-dark">Track your coaching and supplement revenue</p>
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

      {/* Revenue disclaimer */}
      <div className="flex items-start gap-3 kairos-card p-4 border border-amber-500/30 bg-amber-500/5">
        <Info className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
        <p className="text-sm font-body text-kairos-silver-dark">
          Revenue estimates based on subscription tiers. Actual billing integration coming soon.
        </p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryLoading ? (
          <div className="col-span-full">
            <div className="kairos-card p-6 border border-kairos-border text-center">
              <p className="text-sm font-body text-kairos-silver-dark">Loading revenue data...</p>
            </div>
          </div>
        ) : (
          <>
            <div className="kairos-card p-6 border border-kairos-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-kairos-silver-dark text-sm font-body">Est. Monthly Revenue</span>
                <DollarSign className="w-5 h-5 text-kairos-gold" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">${data.totalMonthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-kairos-silver-dark font-body">Based on {summaryData?.clientCount ?? 0} active clients</p>
            </div>

            <div className="kairos-card p-6 border border-kairos-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-kairos-silver-dark text-sm font-body">Coaching Fees</span>
                <DollarSign className="w-5 h-5 text-kairos-gold" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">${data.totalCoachingFees.toLocaleString()}</div>
              <p className="text-xs text-kairos-silver-dark font-body">
                {data.totalMonthlyRevenue > 0
                  ? ((data.totalCoachingFees / data.totalMonthlyRevenue) * 100).toFixed(0)
                  : 0}% of total
              </p>
            </div>

            <div className="kairos-card p-6 border border-kairos-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-kairos-silver-dark text-sm font-body">Supplement Markup</span>
                <PieChart className="w-5 h-5 text-kairos-gold" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">${data.totalSupplementMarkup.toLocaleString()}</div>
              <p className="text-xs text-kairos-silver-dark font-body">
                {data.totalMonthlyRevenue > 0
                  ? ((data.totalSupplementMarkup / data.totalMonthlyRevenue) * 100).toFixed(0)
                  : 0}% of total
              </p>
            </div>
          </>
        )}
      </div>

      {/* Monthly Revenue Trend -- placeholder until billing is integrated */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-4">Monthly Revenue Trend</h2>
        <div className="h-48 flex flex-col items-center justify-center text-center">
          <TrendingUp className="w-10 h-10 text-kairos-silver-dark mb-3 opacity-40" />
          <p className="text-sm font-body text-kairos-silver-dark">Revenue tracking coming soon</p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            Monthly trend data will appear here once billing is integrated.
          </p>
        </div>
      </div>

      {/* Revenue by Client Table */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-6">Revenue by Client</h2>
        <div className="overflow-x-auto">
          {clientLoading ? (
            <div className="text-center py-8">
              <p className="text-sm font-body text-kairos-silver-dark">Loading client revenue...</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="border-b border-kairos-border">
                  <th className="text-left py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Client</th>
                  <th className="text-left py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Tier</th>
                  <th className="text-right py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Coaching Fee</th>
                  <th className="text-right py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Supplement Markup</th>
                  <th className="text-right py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Total Monthly</th>
                </tr>
              </thead>
              <tbody>
                {data.clientRevenue.map((client) => (
                  <tr key={client.id} className="border-b border-kairos-border hover:bg-kairos-royal-surface transition-colors">
                    <td className="py-4 px-4 font-body text-white">{client.name}</td>
                    <td className="py-4 px-4">
                      <span className="inline-block px-2 py-1 rounded-kairos-sm text-xs font-semibold bg-kairos-gold/20 text-kairos-gold">
                        {TIER_LABELS[client.tier] || client.tierLabel}
                      </span>
                    </td>
                    <td className="py-4 px-4 font-body text-white text-right">${(client.coachingFee || 0).toLocaleString()}</td>
                    <td className="py-4 px-4 font-body text-kairos-gold text-right">${(client.supplementMarkup || 0).toLocaleString()}</td>
                    <td className="py-4 px-4 font-heading font-bold text-white text-right">${client.totalMonthly.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Revenue by Tier Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {summaryLoading ? (
          <div className="col-span-full">
            <div className="kairos-card p-6 border border-kairos-border text-center">
              <p className="text-sm font-body text-kairos-silver-dark">Loading tier summary...</p>
            </div>
          </div>
        ) : (
          data.tierSummaries.map((tier) => (
            <div key={tier.tier} className="kairos-card p-6 border border-kairos-border">
              <h3 className="font-heading font-bold text-lg text-white mb-4">{tier.label}</h3>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-body text-kairos-silver-dark">Clients:</span>
                  <span className="font-heading font-bold text-white">{tier.clientCount}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-body text-kairos-silver-dark">Avg Monthly:</span>
                  <span className="font-heading font-bold text-kairos-gold">${(tier.clientCount > 0 ? Math.round(tier.monthlyRevenue / tier.clientCount) : 0).toLocaleString()}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-kairos-border">
                  <span className="font-body text-kairos-silver-dark">Total Revenue:</span>
                  <span className="font-heading font-bold text-white">${(tier.monthlyRevenue || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Recent Transactions -- placeholder until billing is integrated */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-4">Recent Transactions</h2>
        <div className="h-32 flex flex-col items-center justify-center text-center">
          <DollarSign className="w-10 h-10 text-kairos-silver-dark mb-3 opacity-40" />
          <p className="text-sm font-body text-kairos-silver-dark">Transaction history coming soon</p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            Payment transactions will appear here once billing is integrated.
          </p>
        </div>
      </div>
    </div>
  );
}
