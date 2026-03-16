"use client";

/**
 * Coach performance and payout table for admin dashboard.
 */

interface CoachPayout {
  coachId: string;
  name: string;
  clientCount: number;
  grossRevenue: number;
  payoutRate: number;
  payout: number;
  platformFee: number;
}

interface CoachPerformanceTableProps {
  coaches: CoachPayout[];
}

function formatUSD(cents: number): string {
  return `$${(cents).toLocaleString("en-US")}`;
}

export function CoachPerformanceTable({ coaches }: CoachPerformanceTableProps) {
  const totalRevenue = coaches.reduce((sum, c) => sum + c.grossRevenue, 0);
  const totalPayouts = coaches.reduce((sum, c) => sum + c.payout, 0);
  const totalFees = coaches.reduce((sum, c) => sum + c.platformFee, 0);

  return (
    <div className="kairos-card p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-heading text-sm font-semibold text-kairos-silver">
          Coach Performance & Payouts
        </h3>
        <div className="flex items-center gap-4 text-xs">
          <span className="text-kairos-silver-dark">
            Total Payouts: <span className="font-medium text-kairos-gold">{formatUSD(totalPayouts)}</span>
          </span>
          <span className="text-kairos-silver-dark">
            Platform Fee: <span className="font-medium text-emerald-400">{formatUSD(totalFees)}</span>
          </span>
        </div>
      </div>

      {coaches.length === 0 ? (
        <p className="text-sm text-kairos-silver-dark text-center py-8">
          No coach data available.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-kairos-border">
                <th className="text-left py-2 px-3 text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
                  Coach
                </th>
                <th className="text-center py-2 px-3 text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
                  Clients
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
                  Gross Revenue
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
                  Payout (60%)
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
                  Platform Fee
                </th>
                <th className="text-right py-2 px-3 text-xs font-medium text-kairos-silver-dark uppercase tracking-wider">
                  % of Total
                </th>
              </tr>
            </thead>
            <tbody>
              {coaches.map((coach) => (
                <tr
                  key={coach.coachId}
                  className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors"
                >
                  <td className="py-2.5 px-3">
                    <span className="font-medium text-white">{coach.name}</span>
                  </td>
                  <td className="py-2.5 px-3 text-center text-kairos-silver">
                    {coach.clientCount}
                  </td>
                  <td className="py-2.5 px-3 text-right font-medium text-white">
                    {formatUSD(coach.grossRevenue)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-kairos-gold">
                    {formatUSD(coach.payout)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-emerald-400">
                    {formatUSD(coach.platformFee)}
                  </td>
                  <td className="py-2.5 px-3 text-right text-kairos-silver-dark">
                    {totalRevenue > 0 ? Math.round((coach.grossRevenue / totalRevenue) * 100) : 0}%
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-kairos-border">
                <td className="py-2.5 px-3 font-heading font-semibold text-kairos-silver">
                  Total
                </td>
                <td className="py-2.5 px-3 text-center font-medium text-kairos-silver">
                  {coaches.reduce((sum, c) => sum + c.clientCount, 0)}
                </td>
                <td className="py-2.5 px-3 text-right font-heading font-bold text-white">
                  {formatUSD(totalRevenue)}
                </td>
                <td className="py-2.5 px-3 text-right font-heading font-bold text-kairos-gold">
                  {formatUSD(totalPayouts)}
                </td>
                <td className="py-2.5 px-3 text-right font-heading font-bold text-emerald-400">
                  {formatUSD(totalFees)}
                </td>
                <td className="py-2.5 px-3 text-right text-kairos-silver-dark">
                  100%
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </div>
  );
}
