import { router, coachProcedure } from "@/server/trpc";
import { coachClientRelationships, users, clientProfiles } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

// Tier pricing for revenue calculations
const tierPricing: Record<string, { coaching: number; label: string }> = {
  tier1: { coaching: 499, label: "Private" },
  tier2: { coaching: 249, label: "Associate" },
  tier3: { coaching: 99, label: "AI-Guided" },
};

export const coachRevenueRouter = router({
  // Get revenue summary for the coach
  getSummary: coachProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.coachClientRelationships.findMany({
      where: and(
        eq(coachClientRelationships.coachId, ctx.dbUserId),
        eq(coachClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) {
      return {
        totalMonthlyRevenue: 0,
        coachingFees: 0,
        supplementMarkup: 0,
        clientCount: 0,
        byTier: [],
      };
    }

    // Get each client's tier
    const clients = await Promise.all(
      clientIds.map(async (clientId) => {
        const profile = await ctx.db.query.clientProfiles.findFirst({
          where: eq(clientProfiles.userId, clientId),
        });
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, clientId),
        });
        return {
          id: clientId,
          name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
          tier: profile?.tier ?? "tier3",
        };
      })
    );

    // Calculate revenue by tier
    const tierCounts: Record<string, { count: number; revenue: number }> = {};
    let totalCoaching = 0;

    for (const client of clients) {
      const pricing = tierPricing[client.tier] ?? tierPricing.tier3;
      totalCoaching += pricing.coaching;

      if (!tierCounts[client.tier]) {
        tierCounts[client.tier] = { count: 0, revenue: 0 };
      }
      tierCounts[client.tier].count++;
      tierCounts[client.tier].revenue += pricing.coaching;
    }

    // Estimate supplement markup at ~25% of coaching fees
    const supplementMarkup = Math.round(totalCoaching * 0.25);

    return {
      totalMonthlyRevenue: totalCoaching + supplementMarkup,
      coachingFees: totalCoaching,
      supplementMarkup,
      clientCount: clients.length,
      byTier: Object.entries(tierCounts).map(([tier, data]) => ({
        tier,
        label: tierPricing[tier]?.label ?? tier,
        clientCount: data.count,
        monthlyRevenue: data.revenue,
      })),
    };
  }),

  // Get client-level revenue breakdown
  getClientRevenue: coachProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.coachClientRelationships.findMany({
      where: and(
        eq(coachClientRelationships.coachId, ctx.dbUserId),
        eq(coachClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) return [];

    const clients = await Promise.all(
      clientIds.map(async (clientId) => {
        const user = await ctx.db.query.users.findFirst({
          where: eq(users.id, clientId),
        });
        const profile = await ctx.db.query.clientProfiles.findFirst({
          where: eq(clientProfiles.userId, clientId),
        });

        const tier = profile?.tier ?? "tier3";
        const pricing = tierPricing[tier] ?? tierPricing.tier3;

        return {
          id: clientId,
          name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
          tier,
          tierLabel: pricing.label,
          coachingFee: pricing.coaching,
          supplementMarkup: Math.round(pricing.coaching * 0.25),
          totalMonthly: pricing.coaching + Math.round(pricing.coaching * 0.25),
        };
      })
    );

    return clients.sort((a, b) => b.totalMonthly - a.totalMonthly);
  }),
});
