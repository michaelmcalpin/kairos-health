import { router, trainerProcedure } from "@/server/trpc";
import { trainerClientRelationships, users, clientProfiles } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";
import { TIER_LABELS, tierPrice, isRevenueTier } from "@/lib/revenue/estimate";
import { getCoachRevenueEstimate } from "@/server/services/revenue";

// Revenue *estimates* only — no real billing system yet (Stripe not live).
// Shared formula: active clients × tier list price (lib/revenue/estimate.ts).
// A client counts when the relationship is active AND their account status is
// "active"; a client with no tier contributes $0.

export const coachRevenueRouter = router({
  // Get revenue summary for the trainer
  getSummary: trainerProcedure.query(async ({ ctx }) => {
    const est = await getCoachRevenueEstimate(ctx.db, ctx.dbUserId);
    return {
      totalMonthlyRevenue: est.mrr,
      coachingFees: est.mrr,
      clientCount: est.clientCount,
      byTier: est.byTier
        .filter((t) => t.clientCount > 0)
        .map((t) => ({
          tier: t.tier,
          label: t.label,
          clientCount: t.clientCount,
          monthlyRevenue: t.mrr,
        })),
      estimated: true as const,
    };
  }),

  // Get client-level revenue breakdown
  getClientRevenue: trainerProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: and(
        eq(trainerClientRelationships.trainerId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return [];

    // Batched lookups to avoid per-client N+1 round-trips
    const [userRows, profileRows] = await Promise.all([
      ctx.db.query.users.findMany({
        where: inArray(users.id, clientIds),
      }),
      ctx.db.query.clientProfiles.findMany({
        where: inArray(clientProfiles.userId, clientIds),
      }),
    ]);
    const userMap = new Map(userRows.map((u) => [u.id, u]));
    const profileMap = new Map(profileRows.map((p) => [p.userId, p]));

    const clients = clientIds.map((clientId) => {
      const user = userMap.get(clientId);
      const profile = profileMap.get(clientId);

      const tier = profile?.tier ?? null;
      // Same rule as the summary: only active client accounts count; no tier → $0
      const counts = user?.role === "client" && user.status === "active";
      const fee = counts ? tierPrice(tier) : 0;

      return {
        id: clientId,
        name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        tier: tier ?? "none",
        tierLabel: isRevenueTier(tier) ? TIER_LABELS[tier] : "No tier",
        coachingFee: fee,
        totalMonthly: fee,
      };
    });

    return clients.sort((a, b) => b.totalMonthly - a.totalMonthly);
  }),
});
