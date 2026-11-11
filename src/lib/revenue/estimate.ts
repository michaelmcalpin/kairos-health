/**
 * EVERIST revenue estimate — the ONE formula used on every screen.
 *
 * Stripe is not live, so there is no real payment data yet. Every revenue
 * figure in the app is an *estimate*:
 *
 *   Est. MRR = Σ (active clients in tier × tier list price per month)
 *   Est. ARR = Est. MRR × 12
 *
 * "Active client" = a user with role "client" and account status "active"
 * (the same filter the platform tier-breakdown queries already used). For a
 * coach, it is additionally limited to clients with an active
 * trainer↔client relationship. Inactive / suspended / onboarding accounts
 * contribute $0.
 *
 * A client with no tier (no client profile row) counts toward clientCount but
 * contributes $0 — we deliberately do NOT assume an "average" $249 price.
 *
 * No supplement, lab, or platform-fee extras are added: those were fabricated
 * percentages, not data.
 *
 * Pure + dependency-free so it can be imported by both server and client code.
 */

export type RevenueTier = "tier1" | "tier2" | "tier3";

export const REVENUE_TIERS: readonly RevenueTier[] = ["tier1", "tier2", "tier3"] as const;

/** Canonical monthly list price per tier, in whole USD. */
export const TIER_PRICES: Record<RevenueTier, number> = {
  tier1: 499,
  tier2: 249,
  tier3: 99,
};

export const TIER_LABELS: Record<RevenueTier, string> = {
  tier1: "Private",
  tier2: "Associate",
  tier3: "AI-Guided",
};

/** Short note to show next to any revenue figure. */
export const REVENUE_ESTIMATE_NOTE = "Estimated from client tiers";

export interface TierRevenue {
  tier: RevenueTier;
  label: string;
  price: number;
  clientCount: number;
  mrr: number;
}

export interface RevenueEstimate {
  /** Estimated monthly recurring revenue, whole USD. */
  mrr: number;
  /** mrr × 12, whole USD. */
  arr: number;
  /** All three tiers, always in tier1→tier3 order (zero rows included). */
  byTier: TierRevenue[];
  /** Active clients counted, including those without a tier. */
  clientCount: number;
  /** Active clients with no / unknown tier — counted at $0. */
  untieredCount: number;
  /** Always true until real billing data exists. */
  estimated: true;
}

export function isRevenueTier(tier: unknown): tier is RevenueTier {
  return tier === "tier1" || tier === "tier2" || tier === "tier3";
}

/** Monthly list price for a tier; unknown / missing tier → $0. */
export function tierPrice(tier: string | null | undefined): number {
  return isRevenueTier(tier) ? TIER_PRICES[tier] : 0;
}

/**
 * Estimate revenue from counts of active clients keyed by tier.
 * Keys that are not a known tier (e.g. "none", "null") are counted as
 * untiered clients at $0.
 */
export function estimateMrr(tierCounts: Partial<Record<string, number>>): RevenueEstimate {
  const counts: Record<RevenueTier, number> = { tier1: 0, tier2: 0, tier3: 0 };
  let untieredCount = 0;

  for (const [key, raw] of Object.entries(tierCounts)) {
    const n = Math.max(0, Math.floor(Number(raw) || 0));
    if (isRevenueTier(key)) counts[key] += n;
    else untieredCount += n;
  }

  const byTier: TierRevenue[] = REVENUE_TIERS.map((tier) => ({
    tier,
    label: TIER_LABELS[tier],
    price: TIER_PRICES[tier],
    clientCount: counts[tier],
    mrr: counts[tier] * TIER_PRICES[tier],
  }));

  const mrr = byTier.reduce((s, t) => s + t.mrr, 0);
  const tieredCount = byTier.reduce((s, t) => s + t.clientCount, 0);

  return {
    mrr,
    arr: mrr * 12,
    byTier,
    clientCount: tieredCount + untieredCount,
    untieredCount,
    estimated: true,
  };
}

/**
 * Estimate revenue from a list of ACTIVE clients (caller filters for
 * activity). `tier` may be null/undefined for clients with no profile.
 */
export function estimateFromClients(clients: ReadonlyArray<{ tier?: string | null }>): RevenueEstimate {
  const counts: Record<string, number> = {};
  for (const c of clients) {
    const key = isRevenueTier(c.tier) ? c.tier : "none";
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return estimateMrr(counts);
}

/** A zero estimate (no active clients). */
export function emptyRevenueEstimate(): RevenueEstimate {
  return estimateMrr({});
}

/** Average estimated revenue per active client, whole USD (0 when none). */
export function estimatedArpu(estimate: Pick<RevenueEstimate, "mrr" | "clientCount">): number {
  return estimate.clientCount > 0 ? Math.round(estimate.mrr / estimate.clientCount) : 0;
}
