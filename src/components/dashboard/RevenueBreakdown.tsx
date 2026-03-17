"use client";

import { DonutChart } from "@/components/charts";

/**
 * Revenue breakdown by source with donut visualization.
 */

interface RevenueSource {
  source: string;
  label: string;
  amount: number;
  percentage: number;
}

interface RevenueBreakdownProps {
  total: number;
  sources: RevenueSource[];
  mrr: number;
  arr: number;
}

const sourceColors: Record<string, string> = {
  coaching: "#D4AF37",  // mapped to tc.accent
  supplements: "#34d399",
  labs: "#60a5fa",
};

function formatCurrency(cents: number): string {
  return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0 })}`;
}

export function RevenueBreakdown({ total, sources, mrr, arr }: RevenueBreakdownProps) {
  const donutSegments = sources.map((s) => ({
    label: s.label,
    value: s.amount,
    color: sourceColors[s.source] ?? "#9E9E9E",
  }));

  return (
    <div className="kairos-card p-5">
      <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-4">
        Revenue Breakdown
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        {/* Donut */}
        <DonutChart
          segments={donutSegments}
          size={140}
          thickness={22}
          centerValue={formatCurrency(total)}
          centerLabel="Total MRR"
        />

        {/* Details */}
        <div className="flex-1 space-y-3">
          {/* MRR / ARR */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg bg-kairos-royal-dark/50 p-3">
              <p className="kairos-label">MRR</p>
              <p className="mt-1 font-heading text-lg font-bold text-kairos-gold">
                {formatCurrency(mrr)}
              </p>
            </div>
            <div className="rounded-lg bg-kairos-royal-dark/50 p-3">
              <p className="kairos-label">ARR</p>
              <p className="mt-1 font-heading text-lg font-bold text-kairos-gold">
                {formatCurrency(arr)}
              </p>
            </div>
          </div>

          {/* Source rows */}
          <div className="space-y-2">
            {sources.map((s) => (
              <div key={s.source} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span
                    className="inline-block h-3 w-3 rounded-full"
                    style={{ backgroundColor: sourceColors[s.source] ?? "#9E9E9E" }}
                  />
                  <span className="text-sm text-kairos-silver">{s.label}</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm font-medium text-white">
                    {formatCurrency(s.amount)}
                  </span>
                  <span className="text-xs text-kairos-silver-dark">
                    {s.percentage}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
