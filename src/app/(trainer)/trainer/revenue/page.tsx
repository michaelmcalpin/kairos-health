"use client";

import { useMemo } from "react";
import { DollarSign, TrendingUp, CreditCard, Receipt, PieChart } from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";
import { TIER_LABELS } from "@/lib/coach-clients/types";
import { useThemeColors } from "@/lib/theme";

export default function RevenueCoachPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  // Fetch revenue summary from tRPC
  const { data: summaryData, isLoading: summaryLoading } =
    trpc.coach.revenue.getSummary.useQuery();

  // Fetch client revenue from tRPC
  const { data: clientRevenueData = [], isLoading: clientLoading } =
    trpc.coach.revenue.getClientRevenue.useQuery();

  const themeColors = useThemeColors();

  // Build the data structure from tRPC responses
  const data = useMemo(() => {
    if (!summaryData) {
      return {
        totalMonthlyRevenue: 0,
        totalCoachingFees: 0,
        totalSupplementMarkup: 0,
        pendingPayouts: 0,
        ytdTotal: 0,
        monthlyTrend: [],
        clientRevenue: [],
        tierSummaries: [],
        recentTransactions: [],
      };
    }

    // Calculate tier summaries from client revenue data
    const tierSummaries = summaryData.byTier || [];

    // Client revenue with calculated totals
    const clientRevenue = (clientRevenueData || []).map((c) => ({
      ...c,
      totalMonthly: (c.coachingFee || 0) + (c.supplementMarkup || 0),
    }));

    // Mock monthly trend and transactions (would come from additional queries if needed)
    const monthlyTrend = [
      { month: "Jan", coaching: 2500, supplement: 800 },
      { month: "Feb", coaching: 2800, supplement: 950 },
      { month: "Mar", coaching: 3200, supplement: 1100 },
    ];

    const recentTransactions = clientRevenue.slice(0, 5).map((c, i) => ({
      id: `tx-${i}`,
      date: new Date().toISOString(),
      client: c.name,
      type: "Coaching Fee",
      amount: c.coachingFee || 0,
      status: "paid" as const,
    }));

    return {
      totalMonthlyRevenue: summaryData.totalMonthlyRevenue || 0,
      totalCoachingFees: summaryData.coachingFees || 0,
      totalSupplementMarkup: summaryData.supplementMarkup || 0,
      pendingPayouts: 0, // Would need separate query
      ytdTotal: (summaryData.totalMonthlyRevenue || 0) * 12, // Rough estimate
      monthlyTrend,
      clientRevenue,
      tierSummaries,
      recentTransactions,
    };
  }, [summaryData, clientRevenueData]);

  const maxMonthlyRevenue = Math.max(...data.monthlyTrend.map((m) => m.coaching + m.supplement));

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

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
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
                <span className="text-kairos-silver-dark text-sm font-body">Total Revenue</span>
                <DollarSign className="w-5 h-5 text-kairos-gold" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">${data.totalMonthlyRevenue.toLocaleString()}</div>
              <p className="text-xs text-kairos-silver-dark font-body">This month</p>
            </div>

            <div className="kairos-card p-6 border border-kairos-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-kairos-silver-dark text-sm font-body">Coaching Fees</span>
                <CreditCard className="w-5 h-5 text-kairos-gold" />
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

            <div className="kairos-card p-6 border border-kairos-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-kairos-silver-dark text-sm font-body">Pending Payouts</span>
                <Receipt className="w-5 h-5 text-kairos-gold" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">${data.pendingPayouts.toLocaleString()}</div>
              <p className="text-xs text-kairos-silver-dark font-body">Awaiting settlement</p>
            </div>

            <div className="kairos-card p-6 border border-kairos-border">
              <div className="flex items-center justify-between mb-4">
                <span className="text-kairos-silver-dark text-sm font-body">YTD Total</span>
                <TrendingUp className="w-5 h-5 text-kairos-gold" />
              </div>
              <div className="text-3xl font-heading font-bold text-white mb-1">${data.ytdTotal.toLocaleString()}</div>
              <p className="text-xs text-kairos-silver-dark font-body">Year to date</p>
            </div>
          </>
        )}
      </div>

      {/* Monthly Revenue Trend Chart */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-6">Monthly Revenue Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {data.monthlyTrend.map((item) => {
            const coachingHeight = maxMonthlyRevenue > 0 ? (item.coaching / maxMonthlyRevenue) * 100 : 0;
            const supplementHeight = maxMonthlyRevenue > 0 ? (item.supplement / maxMonthlyRevenue) * 100 : 0;

            return (
              <div key={item.month} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse items-stretch justify-start h-48 gap-0 mb-2">
                  <div
                    className="w-full rounded-kairos-sm transition-all hover:opacity-80"
                    style={{ height: `${supplementHeight}%`, backgroundColor: themeColors.accent }}
                    title={`Supplements: $${item.supplement}`}
                  />
                  <div
                    className="w-full rounded-kairos-sm transition-all hover:opacity-80"
                    style={{ height: `${coachingHeight}%`, backgroundColor: themeColors.info }}
                    title={`Coaching: $${item.coaching}`}
                  />
                </div>
                <span className="text-xs font-body text-kairos-silver-dark">{item.month}</span>
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex gap-6 justify-center">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: themeColors.info }}></div>
            <span className="text-sm font-body text-kairos-silver-dark">Coaching Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded" style={{ backgroundColor: themeColors.accent }}></div>
            <span className="text-sm font-body text-kairos-silver-dark">Supplement Markup</span>
          </div>
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

      {/* Recent Transactions */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-6">Recent Transactions</h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-kairos-border">
                <th className="text-left py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Date</th>
                <th className="text-left py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Client</th>
                <th className="text-left py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Type</th>
                <th className="text-right py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Amount</th>
                <th className="text-left py-3 px-4 text-xs font-heading text-kairos-silver-dark font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((tx) => (
                <tr key={tx.id} className="border-b border-kairos-border hover:bg-kairos-royal-surface transition-colors">
                  <td className="py-4 px-4 font-body text-kairos-silver-dark text-sm">
                    {new Date(tx.date).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </td>
                  <td className="py-4 px-4 font-body text-white">{tx.client}</td>
                  <td className="py-4 px-4 font-body text-kairos-silver-dark text-sm">{tx.type}</td>
                  <td className="py-4 px-4 font-heading font-bold text-white text-right">${tx.amount.toLocaleString()}</td>
                  <td className="py-4 px-4">
                    <span
                      className="inline-block px-3 py-1 rounded-kairos-sm text-xs font-semibold"
                      style={{
                        backgroundColor: tx.status === "paid" ? `${themeColors.success}20` : `${themeColors.warning}20`,
                        color: tx.status === "paid" ? themeColors.success : themeColors.warning,
                      }}
                    >
                      {tx.status === "paid" ? "Paid" : "Pending"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
