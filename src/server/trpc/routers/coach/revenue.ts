import { router, trainerProcedure } from "@/server/trpc";
import { trainerClientRelationships, users, clientProfiles } from "@/server/db/schema";
import { eq, and, inArray } from "drizzle-orm";

// Tier pricing for revenue *estimates* — no real billing system yet.
// These are the list prices per tier; actual revenue tracking will
// come once a payment provider (e.g. Stripe) is integrated.
const tierPricing: Record<string, { coaching: number; label: string }> = {
  tier1: { coaching: 499, label: "Private" },
  tier2: { coaching: 249, label: "Associate" },
  tier3: { coaching: 99, label: "AI-Guided" },
};

export const coachRevenueRouter = router({
  // Get revenue summary for the trainer
  getSummary: trainerProcedure.query(async ({ ctx }) => {
    const relationships = await ctx.db.query.trainerClientRelationships.findMany({
      where: and(
        eq(trainerClientRelationships.trainerId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active")
      ),
    });

    const clientIds = relationships.map((r) => r.clientId);
    if (clientIds.length === 0) {
      return {
        totalMonthlyRevenue: 0,
        coachingFees: 0,
        clientCount: 0,
        byTier: [],
      };
    }

    // Get each client's tier — batched to avoid per-client N+1 round-trips
    const [profileRows, userRows] = await Promise.all([
      ctx.db.query.clientProfiles.findMany({
        where: inArray(clientProfiles.userId, clientIds),
      }),
      ctx.db.query.users.findMany({
        where: inArray(users.id, clientIds),
      }),
    ]);
    const profileMap = new Map(profileRows.map((p) => [p.userId, p]));
    const userMap = new Map(userRows.map((u) => [u.id, u]));

    const clients = clientIds.map((clientId) => {
      const profile = profileMap.get(clientId);
      const user = userMap.get(clientId);
      return {
        id: clientId,
        name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        tier: profile?.tier ?? "tier3",
      };
    });

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

    return {
      totalMonthlyRevenue: totalCoaching,
      coachingFees: totalCoaching,
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

      const tier = profile?.tier ?? "tier3";
      const pricing = tierPricing[tier] ?? tierPricing.tier3;

      return {
        id: clientId,
        name: user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() : "Unknown",
        tier,
        tierLabel: pricing.label,
        coachingFee: pricing.coaching,
        totalMonthly: pricing.coaching,
      };
    });

    return clients.sort((a, b) => b.totalMonthly - a.totalMonthly);
  }),
});
