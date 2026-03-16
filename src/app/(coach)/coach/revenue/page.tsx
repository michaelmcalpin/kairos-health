'use client';

import { DollarSign, TrendingUp, CreditCard, Receipt, PieChart } from 'lucide-react';
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { useCoachRevenue } from "@/hooks/coach/useCoachRevenue";

export default function RevenueCoachPage() {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { period, setPeriod, dateRange: _dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "month" });

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { data: _revenueData } = useCoachRevenue();

  // Mock data for clients (matching 8-client roster)
  const clients = [
    { id: 1, name: 'Sarah Mitchell', tier: 'Tier 1 (Private)', coachingFee: 499, supplementMarkup: 120, totalMonthly: 619 },
    { id: 2, name: 'James Chen', tier: 'Tier 1 (Private)', coachingFee: 499, supplementMarkup: 145, totalMonthly: 644 },
    { id: 3, name: 'Maria Rodriguez', tier: 'Tier 2 (Associate)', coachingFee: 249, supplementMarkup: 65, totalMonthly: 314 },
    { id: 4, name: 'David Thompson', tier: 'Tier 2 (Associate)', coachingFee: 249, supplementMarkup: 58, totalMonthly: 307 },
    { id: 5, name: 'Emily Watson', tier: 'Tier 2 (Associate)', coachingFee: 249, supplementMarkup: 72, totalMonthly: 321 },
    { id: 6, name: 'Robert Kim', tier: 'Tier 3 (AI-Guided)', coachingFee: 99, supplementMarkup: 25, totalMonthly: 124 },
    { id: 7, name: 'Lisa Anderson', tier: 'Tier 3 (AI-Guided)', coachingFee: 99, supplementMarkup: 30, totalMonthly: 129 },
    { id: 8, name: 'Michael Johnson', tier: 'Tier 3 (AI-Guided)', coachingFee: 99, supplementMarkup: 28, totalMonthly: 127 },
  ];

  // Calculate KPIs
  const totalCoachingFees = clients.reduce((sum, c) => sum + c.coachingFee, 0);
  const totalSupplementMarkup = clients.reduce((sum, c) => sum + c.supplementMarkup, 0);
  const totalMonthlyRevenue = totalCoachingFees + totalSupplementMarkup;
  const pendingPayouts = 1245;
  const ytdTotal = totalMonthlyRevenue * 2 + 3456; // Simulating 2+ months of data

  // Monthly revenue trend data (last 6 months)
  const monthlyTrend = [
    { month: 'Oct', coaching: 1450, supplement: 385 },
    { month: 'Nov', coaching: 1520, supplement: 410 },
    { month: 'Dec', coaching: 1680, supplement: 465 },
    { month: 'Jan', coaching: 1748, supplement: 450 },
    { month: 'Feb', coaching: 1747, supplement: 518 },
    { month: 'Mar', coaching: 1747, supplement: 548 },
  ];

  const maxMonthlyRevenue = Math.max(...monthlyTrend.map(m => m.coaching + m.supplement));

  // Recent transactions
  const transactions = [
    { id: 1, date: '2026-03-07', client: 'Sarah Mitchell', type: 'Coaching Fee', amount: 499, status: 'Paid' },
    { id: 2, date: '2026-03-06', client: 'James Chen', type: 'Supplement Order', amount: 145, status: 'Paid' },
    { id: 3, date: '2026-03-05', client: 'Maria Rodriguez', type: 'Lab Order', amount: 285, status: 'Pending' },
    { id: 4, date: '2026-03-04', client: 'David Thompson', type: 'Coaching Fee', amount: 249, status: 'Paid' },
    { id: 5, date: '2026-03-03', client: 'Emily Watson', type: 'Supplement Order', amount: 72, status: 'Paid' },
    { id: 6, date: '2026-03-02', client: 'Robert Kim', type: 'Coaching Fee', amount: 99, status: 'Pending' },
    { id: 7, date: '2026-02-28', client: 'Lisa Anderson', type: 'Coaching Fee', amount: 99, status: 'Paid' },
    { id: 8, date: '2026-02-27', client: 'Michael Johnson', type: 'Supplement Order', amount: 28, status: 'Paid' },
  ];

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
        {/* Total Revenue This Month */}
        <div className="kairos-card p-6 border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-kairos-silver-dark text-sm font-body">Total Revenue</span>
            <DollarSign className="w-5 h-5 text-kairos-gold" />
          </div>
          <div className="text-3xl font-heading font-bold text-white mb-1">${totalMonthlyRevenue.toLocaleString()}</div>
          <p className="text-xs text-kairos-silver-dark font-body">This month</p>
        </div>

        {/* Coaching Fees */}
        <div className="kairos-card p-6 border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-kairos-silver-dark text-sm font-body">Coaching Fees</span>
            <CreditCard className="w-5 h-5 text-kairos-gold" />
          </div>
          <div className="text-3xl font-heading font-bold text-white mb-1">${totalCoachingFees.toLocaleString()}</div>
          <p className="text-xs text-kairos-silver-dark font-body">{((totalCoachingFees / totalMonthlyRevenue) * 100).toFixed(0)}% of total</p>
        </div>

        {/* Supplement Revenue */}
        <div className="kairos-card p-6 border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-kairos-silver-dark text-sm font-body">Supplement Markup</span>
            <PieChart className="w-5 h-5 text-kairos-gold" />
          </div>
          <div className="text-3xl font-heading font-bold text-white mb-1">${totalSupplementMarkup.toLocaleString()}</div>
          <p className="text-xs text-kairos-silver-dark font-body">{((totalSupplementMarkup / totalMonthlyRevenue) * 100).toFixed(0)}% of total</p>
        </div>

        {/* Pending Payouts */}
        <div className="kairos-card p-6 border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-kairos-silver-dark text-sm font-body">Pending Payouts</span>
            <Receipt className="w-5 h-5 text-kairos-gold" />
          </div>
          <div className="text-3xl font-heading font-bold text-white mb-1">${pendingPayouts.toLocaleString()}</div>
          <p className="text-xs text-kairos-silver-dark font-body">Awaiting settlement</p>
        </div>

        {/* YTD Total */}
        <div className="kairos-card p-6 border border-kairos-border">
          <div className="flex items-center justify-between mb-4">
            <span className="text-kairos-silver-dark text-sm font-body">YTD Total</span>
            <TrendingUp className="w-5 h-5 text-kairos-gold" />
          </div>
          <div className="text-3xl font-heading font-bold text-white mb-1">${ytdTotal.toLocaleString()}</div>
          <p className="text-xs text-kairos-silver-dark font-body">Year to date</p>
        </div>
      </div>

      {/* Monthly Revenue Trend Chart */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-6">Monthly Revenue Trend</h2>
        <div className="h-64 flex items-end justify-between gap-2 px-2">
          {monthlyTrend.map((item, idx) => {
            const coachingHeight = (item.coaching / maxMonthlyRevenue) * 100;
            const supplementHeight = (item.supplement / maxMonthlyRevenue) * 100;

            return (
              <div key={idx} className="flex-1 flex flex-col items-center">
                <div className="w-full flex flex-col-reverse items-stretch justify-start h-48 gap-0 mb-2">
                  {/* Supplement (gold) */}
                  <div
                    className="w-full bg-kairos-gold rounded-kairos-sm transition-all hover:opacity-80"
                    style={{ height: `${supplementHeight}%` }}
                    title={`Supplements: $${item.supplement}`}
                  />
                  {/* Coaching (royal blue) */}
                  <div
                    className="w-full bg-blue-600 rounded-kairos-sm transition-all hover:opacity-80"
                    style={{ height: `${coachingHeight}%` }}
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
            <div className="w-3 h-3 bg-blue-600 rounded"></div>
            <span className="text-sm font-body text-kairos-silver-dark">Coaching Revenue</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-kairos-gold rounded"></div>
            <span className="text-sm font-body text-kairos-silver-dark">Supplement Markup</span>
          </div>
        </div>
      </div>

      {/* Revenue by Client Table */}
      <div className="kairos-card p-6 border border-kairos-border">
        <h2 className="font-heading font-bold text-xl text-white mb-6">Revenue by Client</h2>
        <div className="overflow-x-auto">
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
              {clients.map((client) => (
                <tr key={client.id} className="border-b border-kairos-border hover:bg-kairos-royal-surface transition-colors">
                  <td className="py-4 px-4 font-body text-white">{client.name}</td>
                  <td className="py-4 px-4">
                    <span className="inline-block px-2 py-1 rounded-kairos-sm text-xs font-semibold bg-kairos-gold/20 text-kairos-gold">
                      {client.tier.split(' ')[1].replace('(', '').replace(')', '')}
                    </span>
                  </td>
                  <td className="py-4 px-4 font-body text-white text-right">${client.coachingFee.toLocaleString()}</td>
                  <td className="py-4 px-4 font-body text-kairos-gold text-right">${client.supplementMarkup.toLocaleString()}</td>
                  <td className="py-4 px-4 font-heading font-bold text-white text-right">${client.totalMonthly.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Revenue by Tier Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="kairos-card p-6 border border-kairos-border">
          <h3 className="font-heading font-bold text-lg text-white mb-4">Tier 1 (Private)</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-body text-kairos-silver-dark">Clients:</span>
              <span className="font-heading font-bold text-white">2</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body text-kairos-silver-dark">Avg Monthly:</span>
              <span className="font-heading font-bold text-kairos-gold">${((499 + 499 + 120 + 145) / 2).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-kairos-border">
              <span className="font-body text-kairos-silver-dark">Total Revenue:</span>
              <span className="font-heading font-bold text-white">{"$"}{(1263).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="kairos-card p-6 border border-kairos-border">
          <h3 className="font-heading font-bold text-lg text-white mb-4">Tier 2 (Associate)</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-body text-kairos-silver-dark">Clients:</span>
              <span className="font-heading font-bold text-white">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body text-kairos-silver-dark">Avg Monthly:</span>
              <span className="font-heading font-bold text-kairos-gold">${((249 + 249 + 249 + 65 + 58 + 72) / 3).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-kairos-border">
              <span className="font-body text-kairos-silver-dark">Total Revenue:</span>
              <span className="font-heading font-bold text-white">{"$"}{(942).toLocaleString()}</span>
            </div>
          </div>
        </div>

        <div className="kairos-card p-6 border border-kairos-border">
          <h3 className="font-heading font-bold text-lg text-white mb-4">Tier 3 (AI-Guided)</h3>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-body text-kairos-silver-dark">Clients:</span>
              <span className="font-heading font-bold text-white">3</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-body text-kairos-silver-dark">Avg Monthly:</span>
              <span className="font-heading font-bold text-kairos-gold">${((99 + 99 + 99 + 25 + 30 + 28) / 3).toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 border-t border-kairos-border">
              <span className="font-body text-kairos-silver-dark">Total Revenue:</span>
              <span className="font-heading font-bold text-white">{"$"}{(380).toLocaleString()}</span>
            </div>
          </div>
        </div>
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
              {transactions.map((tx) => (
                <tr key={tx.id} className="border-b border-kairos-border hover:bg-kairos-royal-surface transition-colors">
                  <td className="py-4 px-4 font-body text-kairos-silver-dark text-sm">
                    {new Date(tx.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-4 px-4 font-body text-white">{tx.client}</td>
                  <td className="py-4 px-4 font-body text-kairos-silver-dark text-sm">{tx.type}</td>
                  <td className="py-4 px-4 font-heading font-bold text-white text-right">${tx.amount.toLocaleString()}</td>
                  <td className="py-4 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-kairos-sm text-xs font-semibold ${
                        tx.status === 'Paid'
                          ? 'bg-green-900 text-green-200'
                          : 'bg-yellow-900 text-yellow-200'
                      }`}
                    >
                      {tx.status}
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
