"use client";

import { DonutChart } from "@/components/charts";

/**
 * Client distribution by subscription tier.
 */

interface TierData {
  tier: string;
  label: string;
  clientCount: number;
  monthlyRevenue: number;
  pricePerClient: number;
}

interface TierDistributionProps {
  tiers: TierData[];
  totalClients: number;
}

const tierColors: Record<string, string> = {
  tier1: "#D4AF37",  // Gold — Private
  tier2: "#60a5fa",  // Blue — Associate
  tier3: "#9E9E9E",  // Silver — AI-Guided
};

export function TierDistribution({ tiers, totalClients }: TierDistributionProps) {
  const donutSegments = tiers.map((t) => ({
    label: t.label,
    value: t.clientCount,
    color: tierColors[t.tier] ?? "#9E9E9E",
  }));

  return (
    <div className="kairos-card p-5">
      <h3 className="font-heading text-sm font-semibold text-kairos-silver mb-4">
        Client Distribution by Tier
      </h3>

      <div className="flex flex-col md:flex-row items-center gap-6">
        <DonutChart
          segments={donutSegments}
          size={130}
          thickness={20}
          centerValue={String(totalClients)}
          centerLabel="Total Clients"
        />

        <div className="flex-1 space-y-3">
          {tiers.map((t) => (
            <div
              key={t.tier}
              className="flex items-center justify-between rounded-lg bg-kairos-royal-dark/30 px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="inline-block h-3 w-3 rounded-full"
                  style={{ backgroundColor: tierColors[t.tier] ?? "#9E9E9E" }}
                />
                <div>
                  <span className="text-sm font-medium text-white">{t.label}</span>
                  <span className="ml-2 text-xs text-kairos-silver-dark">
                    ${t.pricePerClient}/mo
                  </span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-sm font-heading font-semibold text-white">
                  {t.clientCount}
                </span>
                <span className="ml-2 text-xs text-kairos-silver-dark">
                  {totalClients > 0 ? Math.round((t.clientCount / totalClients) * 100) : 0}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
