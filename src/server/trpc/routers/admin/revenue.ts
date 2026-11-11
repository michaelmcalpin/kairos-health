import { router, superAdminProcedure } from "@/server/trpc";
import { users, clientProfiles } from "@/server/db/schema";
import { eq, and, asc } from "drizzle-orm";
import { TIER_LABELS, tierPrice, estimatedArpu, isRevenueTier } from "@/lib/revenue/estimate";
import { getPlatformRevenueEstimate, getCoachRevenueEstimates } from "@/server/services/revenue";

// All figures here are ESTIMATES (active clients × tier list price) — see
// src/lib/revenue/estimate.ts. Stripe is not live, so there is no real
// payment data, and no supplement / lab / platform-fee extras are added.

// Coach payout share of estimated coaching revenue.
const PAYOUT_RATE = 0.6;

export const adminRevenueRouter = router({
  // Platform-wide revenue: MRR, ARR, revenue by tier
  getPlatformRevenue: superAdminProcedure.query(async ({ ctx }) => {
    const est = await getPlatformRevenueEstimate(ctx.db);
    return {
      mrr: est.mrr,
      arr: est.arr,
      byTier: est.byTier.map((t) => ({
        tier: t.tier,
        label: t.label,
        clientCount: t.clientCount,
        monthlyRevenue: t.mrr,
        pricePerClient: t.price,
      })),
      totalActiveClients: est.clientCount,
      estimated: true as const,
    };
  }),

  // Revenue by source. Only coaching (tier subscription) fees are estimated;
  // there is no supplement or lab revenue data, so none is shown.
  getRevenueBySource: superAdminProcedure.query(async ({ ctx }) => {
    const est = await getPlatformRevenueEstimate(ctx.db);
    return {
      total: est.mrr,
      sources: [
        {
          source: "coaching",
          label: "Coaching Fees",
          amount: est.mrr,
          percentage: est.mrr > 0 ? 100 : 0,
        },
      ],
      estimated: true as const,
    };
  }),

  // Trainer payout summary: estimated revenue generated per trainer
  getTrainerPayouts: superAdminProcedure.query(async ({ ctx }) => {
    const trainers = await ctx.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "trainer"));

    const estimates = await getCoachRevenueEstimates(ctx.db, trainers.map((t) => t.id));

    const payouts = trainers.map((trainer) => {
      const est = estimates.get(trainer.id);
      const grossRevenue = est?.mrr ?? 0;
      const payout = Math.round(grossRevenue * PAYOUT_RATE);
      return {
        trainerId: trainer.id,
        name: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email,
        clientCount: est?.clientCount ?? 0,
        grossRevenue,
        payoutRate: PAYOUT_RATE,
        payout,
        platformFee: grossRevenue - payout,
        estimated: true as const,
      };
    });

    return payouts.sort((a, b) => b.grossRevenue - a.grossRevenue);
  }),

  /**
   * getRevenueDashboard — all-in-one platform revenue data (estimated).
   * KPIs, top clients, estimated coach payouts, current tier breakdown.
   */
  getRevenueDashboard: superAdminProcedure.query(async ({ ctx }) => {
    const est = await getPlatformRevenueEstimate(ctx.db);

    // KPIs
    const kpis = [
      { label: "Est. MRR", value: `$${est.mrr.toLocaleString()}`, iconKey: "dollar" as const },
      { label: "Est. ARR", value: `$${est.arr.toLocaleString()}`, iconKey: "trending" as const },
      { label: "Est. Revenue Per Client", value: `$${estimatedArpu(est).toLocaleString()}`, iconKey: "users" as const },
      { label: "Coach Payout Rate", value: `${Math.round(PAYOUT_RATE * 100)}%`, iconKey: "percent" as const },
      { label: "Platform Take Rate", value: `${Math.round((1 - PAYOUT_RATE) * 100)}%`, iconKey: "percent" as const },
    ];

    // Top clients by tier value (tier1 is the highest-priced tier)
    const topClientsRaw = await ctx.db
      .select({
        userId: clientProfiles.userId,
        tier: clientProfiles.tier,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        createdAt: users.createdAt,
      })
      .from(clientProfiles)
      .innerJoin(users, eq(users.id, clientProfiles.userId))
      .where(and(eq(users.role, "client"), eq(users.status, "active")))
      .orderBy(asc(clientProfiles.tier))
      .limit(8);

    const topClients = topClientsRaw.map((c) => {
      const monthly = tierPrice(c.tier);
      const label = isRevenueTier(c.tier) ? TIER_LABELS[c.tier] : "No tier";
      const monthsActive = Math.max(1, Math.round((Date.now() - new Date(c.createdAt).getTime()) / (30 * 86400000)));
      return {
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
        tier: `${c.tier === "tier1" ? "Tier 1" : c.tier === "tier2" ? "Tier 2" : "Tier 3"} (${label})`,
        monthly: `$${monthly.toLocaleString()}`,
        lifetime: `$${(monthly * monthsActive).toLocaleString()}`,
      };
    });

    // Estimated coach payouts (no payouts have actually been made)
    const trainers = await ctx.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.role, "trainer"));
    const coachEstimates = await getCoachRevenueEstimates(ctx.db, trainers.map((t) => t.id));

    const recentPayouts = trainers
      .map((trainer) => {
        const payout = Math.round((coachEstimates.get(trainer.id)?.mrr ?? 0) * PAYOUT_RATE);
        return {
          coach: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email,
          payout,
          amount: `$${payout.toLocaleString()}/mo`,
          date: "Monthly estimate",
          status: "Estimated" as const,
        };
      })
      .sort((a, b) => b.payout - a.payout)
      .slice(0, 6);

    // Current tier mix (in cents, for the stacked bar). No history exists yet,
    // so a single current-snapshot row is returned instead of invented months.
    const cents = (tier: "tier1" | "tier2" | "tier3") =>
      (est.byTier.find((t) => t.tier === tier)?.mrr ?? 0) * 100;
    const breakdown = [
      { month: "Current", tier1: cents("tier1"), tier2: cents("tier2"), tier3: cents("tier3") },
    ];

    return {
      kpis,
      topClients,
      recentPayouts,
      breakdown,
      byTier: est.byTier,
      untieredCount: est.untieredCount,
      activeClients: est.clientCount,
      estimated: true as const,
    };
  }),
});
