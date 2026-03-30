"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

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
 *   trpc.admin.revenue.getTrainerPayouts     → payouts
 */
export function useAdminRevenue(): {
  mrr: number;
  arr: number;
  byTier: TierRevenue[];
  sources: RevenueSource[];
  payouts: CoachPayout[];
  isLoading: boolean;
} {
  const platformQuery = trpc.admin.revenue.getPlatformRevenue.useQuery();
  const sourcesQuery = trpc.admin.revenue.getRevenueBySource.useQuery();
  const payoutsQuery = trpc.admin.revenue.getTrainerPayouts.useQuery();

  const isLoading = platformQuery.isLoading || sourcesQuery.isLoading || payoutsQuery.isLoading;

  const mrr = useMemo(() => {
    return platformQuery.data?.mrr ?? 0;
  }, [platformQuery.data]);

  const arr = useMemo(() => {
    return platformQuery.data?.arr ?? 0;
  }, [platformQuery.data]);

  const byTier = useMemo<TierRevenue[]>(() => {
    if (!platformQuery.data?.byTier) return [];
    return platformQuery.data.byTier.map((tier: any) => ({
      tier: tier.tier,
      label: tier.label,
      clientCount: tier.clientCount,
      monthlyRevenue: tier.monthlyRevenue,
      pricePerClient: tier.pricePerClient,
    }));
  }, [platformQuery.data]);

  const sources = useMemo<RevenueSource[]>(() => {
    if (!sourcesQuery.data?.sources) return [];
    return sourcesQuery.data.sources.map((src: any) => ({
      source: src.source,
      label: src.label,
      amount: src.amount,
      percentage: src.percentage,
    }));
  }, [sourcesQuery.data]);

  const payouts = useMemo<CoachPayout[]>(() => {
    if (!payoutsQuery.data) return [];
    return payoutsQuery.data.map((payout: any) => ({
      coachName: payout.name,
      clientCount: payout.clientCount,
      grossRevenue: payout.grossRevenue,
      payoutRate: payout.payoutRate,
      payout: payout.payout,
      platformFee: payout.platformFee,
    }));
  }, [payoutsQuery.data]);

  return { mrr, arr, byTier, sources, payouts, isLoading };
}
