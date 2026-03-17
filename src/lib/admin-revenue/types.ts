// ─── Admin Revenue Types ──────────────────────────────────────────
// Platform revenue KPIs, breakdown, client LTV, and coach payouts.

export interface RevenueKPI {
  label: string;
  value: string;
  iconKey: "dollar" | "trending" | "users" | "percent";
}

export interface RevenueClient {
  name: string;
  tier: string;
  monthly: string;
  lifetime: string;
}

export interface CoachPayout {
  coach: string;
  amount: string;
  date: string;
  status: "Paid" | "Pending";
}

export interface TierBreakdownMonth {
  month: string;
  tier1: number;
  tier2: number;
  tier3: number;
}

export interface RevenueSourceItem {
  source: string;
  percentage: number;
  amount: string;
}

export interface AdminRevenueData {
  kpis: RevenueKPI[];
  topClients: RevenueClient[];
  recentPayouts: CoachPayout[];
  breakdown: TierBreakdownMonth[];
  sources: RevenueSourceItem[];
}
