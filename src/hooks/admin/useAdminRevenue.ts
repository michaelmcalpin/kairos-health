"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";

export interface TierRevenue {
  tier: string;
  label: string;
  clientCount: number;
  monthlyRevenue: number;
  pricePerClient: number;
}

export interface RevenueSource {
  source: string;
  label: string;
  amount: number;
  percentage: number;
}

export interface CoachPayout {
  coachName: string;
  clientCount: number;
  grossRevenue: number;
  payoutRate: number;
  payout: number;
  platformFee: number;
}

/**
 * Hook for admin revenue – tRPC procedures:
 *   trpc.admin.revenue.getPlatformRevenue  → mrr, arr, byTier
 *   trpc.admin.revenue.getRevenueBySource  → sources
 *   trpc.admin.revenue.getCoachPayouts     → payouts
 */
export function useAdminRevenue(): {
  mrr: number;
  arr: number;
  byTier: TierRevenue[];
  sources: RevenueSource[];
  payouts: CoachPayout[];
  isLoading: boolean;
  isMock: boolean;
} {
  const { data, isLoading, isMock } = useMockQuery(() => {
    const byTier: TierRevenue[] = [
      { tier: "tier1", label: "Private", clientCount: 28, monthlyRevenue: 13972, pricePerClient: 499 },
      { tier: "tier2", label: "Associate", clientCount: 54, monthlyRevenue: 13446, pricePerClient: 249 },
      { tier: "tier3", label: "AI-Guided", clientCount: 56, monthlyRevenue: 5544, pricePerClient: 99 },
    ];
    const mrr = byTier.reduce((s, t) => s + t.monthlyRevenue, 0);
    const sources: RevenueSource[] = [
      { source: "coaching", label: "Coaching Fees", amount: mrr, percentage: 74 },
      { source: "supplements", label: "Supplement Markup", amount: Math.round(mrr * 0.25), percentage: 19 },
      { source: "labs", label: "Lab Fees", amount: Math.round(mrr * 0.1), percentage: 7 },
    ];
    const payouts: CoachPayout[] = [
      { coachName: "Coach Alex Rivera", clientCount: 12, grossRevenue: 4120, payoutRate: 0.6, payout: 2472, platformFee: 1648 },
      { coachName: "Coach Mike Torres", clientCount: 10, grossRevenue: 3540, payoutRate: 0.6, payout: 2124, platformFee: 1416 },
      { coachName: "Dr. Sarah Williams", clientCount: 8, grossRevenue: 3180, payoutRate: 0.6, payout: 1908, platformFee: 1272 },
      { coachName: "Dr. Rachel Green", clientCount: 7, grossRevenue: 2990, payoutRate: 0.6, payout: 1794, platformFee: 1196 },
      { coachName: "Dr. Jennifer Chang", clientCount: 6, grossRevenue: 2694, payoutRate: 0.6, payout: 1616, platformFee: 1078 },
    ];
    return { mrr, arr: mrr * 12, byTier, sources, payouts };
  }, []);

  return { mrr: data.mrr, arr: data.arr, byTier: data.byTier, sources: data.sources, payouts: data.payouts, isLoading, isMock };
}
