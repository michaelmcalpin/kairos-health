"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";

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
export function useCoachRevenue(): { data: CoachRevenueData; isLoading: boolean; isMock: boolean } {
  const { data, isLoading, isMock } = useMockQuery(() => {
    const clientRevenue: ClientRevenue[] = [
      { clientName: "Sarah Chen", tier: "tier1", monthlyFee: 499, supplementRevenue: 125, total: 624 },
      { clientName: "James Miller", tier: "tier1", monthlyFee: 499, supplementRevenue: 89, total: 588 },
      { clientName: "Lisa Thompson", tier: "tier1", monthlyFee: 499, supplementRevenue: 156, total: 655 },
      { clientName: "Emily Rodriguez", tier: "tier2", monthlyFee: 249, supplementRevenue: 78, total: 327 },
      { clientName: "Michael Park", tier: "tier2", monthlyFee: 249, supplementRevenue: 112, total: 361 },
      { clientName: "Anna Wright", tier: "tier2", monthlyFee: 249, supplementRevenue: 95, total: 344 },
      { clientName: "David Kim", tier: "tier3", monthlyFee: 99, supplementRevenue: 45, total: 144 },
      { clientName: "Robert Lee", tier: "tier3", monthlyFee: 99, supplementRevenue: 38, total: 137 },
    ];
    const mrr = clientRevenue.reduce((s, c) => s + c.monthlyFee, 0);
    const supplementRevenue = clientRevenue.reduce((s, c) => s + c.supplementRevenue, 0);
    return { mrr, supplementRevenue, totalRevenue: mrr + supplementRevenue, clientRevenue };
  }, []);

  return { data, isLoading, isMock };
}
