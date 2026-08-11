"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";

export interface ClientRevenue {
  clientName: string;
  tier: string;
  monthlyFee: number;
  supplementRevenue: number;
  total: number;
}

export interface CoachRevenueData {
  mrr: number;
  supplementRevenue: number;
  totalRevenue: number;
  clientRevenue: ClientRevenue[];
}

/**
 * Hook for coach revenue – tRPC procedures:
 *   trpc.coach.revenue.getSummary       → mrr, totals
 *   trpc.coach.revenue.getClientRevenue → per-client breakdown
 */
export function useCoachRevenue(): { data: CoachRevenueData; isLoading: boolean } {
  const summaryQuery = trpc.coach.revenue.getSummary.useQuery();
  const clientRevenueQuery = trpc.coach.revenue.getClientRevenue.useQuery();

  const data = useMemo<CoachRevenueData>(() => {
    const summary = summaryQuery.data ?? {
      totalMonthlyRevenue: 0,
      coachingFees: 0,
    };
    const rawClientRevenue = clientRevenueQuery.data ?? [];

    // Transform client revenue into expected shape.
    // Supplement markup was removed (it was a fabricated estimate, not real sales).
    const clientRevenue: ClientRevenue[] = rawClientRevenue.map((client: any) => ({
      clientName: client.name,
      tier: client.tier,
      monthlyFee: client.coachingFee ?? 0,
      supplementRevenue: 0,
      total: client.coachingFee ?? 0,
    }));

    return {
      mrr: summary.coachingFees ?? 0,
      supplementRevenue: 0,
      totalRevenue: summary.totalMonthlyRevenue ?? 0,
      clientRevenue,
    };
  }, [summaryQuery.data, clientRevenueQuery.data]);

  const isLoading = summaryQuery.isLoading || clientRevenueQuery.isLoading;

  return { data, isLoading };
}
