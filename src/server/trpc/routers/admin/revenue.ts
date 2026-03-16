import { router, adminProcedure } from "@/server/trpc";
import { users, clientProfiles, coachClientRelationships } from "@/server/db/schema";
import { sql, eq, and } from "drizzle-orm";

// Tier pricing (mirrors coach/revenue.ts)
const tierPricing: Record<string, { monthly: number; label: string }> = {
  tier1: { monthly: 499, label: "Private" },
  tier2: { monthly: 249, label: "Associate" },
  tier3: { monthly: 99, label: "AI-Guided" },
};

export const adminRevenueRouter = router({
  // Platform-wide revenue: MRR, ARR, revenue by tier
  getPlatformRevenue: adminProcedure.query(async ({ ctx }) => {
    // Count active subscribers by tier
    const tierBreakdown = await ctx.db
      .select({
        tier: clientProfiles.tier,
        count: sql<number>`count(*)`,
      })
      .from(clientProfiles)
      .innerJoin(users, eq(users.id, clientProfiles.userId))
      .where(sql`${users.status} = 'active'`)
      .groupBy(clientProfiles.tier);

    let totalMRR = 0;
    const byTier = tierBreakdown.map((row) => {
      const pricing = tierPricing[row.tier] ?? tierPricing.tier3;
      const count = Number(row.count);
      const revenue = count * pricing.monthly;
      totalMRR += revenue;
      return {
        tier: row.tier,
        label: pricing.label,
        clientCount: count,
        monthlyRevenue: revenue,
        pricePerClient: pricing.monthly,
      };
    });

    return {
      mrr: totalMRR,
      arr: totalMRR * 12,
      byTier,
      totalActiveClients: byTier.reduce((sum, t) => sum + t.clientCount, 0),
    };
  }),

  // Revenue by source: coaching fees vs supplement markup vs lab fees
  getRevenueBySource: adminProcedure.query(async ({ ctx }) => {
    // Get active client count by tier
    const tierBreakdown = await ctx.db
      .select({
        tier: clientProfiles.tier,
        count: sql<number>`count(*)`,
      })
      .from(clientProfiles)
      .innerJoin(users, eq(users.id, clientProfiles.userId))
      .where(sql`${users.status} = 'active'`)
      .groupBy(clientProfiles.tier);

    let coachingRevenue = 0;
    for (const row of tierBreakdown) {
      const pricing = tierPricing[row.tier] ?? tierPricing.tier3;
      coachingRevenue += Number(row.count) * pricing.monthly;
    }

    // Estimate supplement markup at ~25% of coaching and lab fees at ~10%
    const supplementRevenue = Math.round(coachingRevenue * 0.25);
    const labRevenue = Math.round(coachingRevenue * 0.1);
    const totalRevenue = coachingRevenue + supplementRevenue + labRevenue;

    return {
      total: totalRevenue,
      sources: [
        {
          source: "coaching",
          label: "Coaching Fees",
          amount: coachingRevenue,
          percentage: totalRevenue > 0 ? Math.round((coachingRevenue / totalRevenue) * 100) : 0,
        },
        {
          source: "supplements",
          label: "Supplement Markup",
          amount: supplementRevenue,
          percentage: totalRevenue > 0 ? Math.round((supplementRevenue / totalRevenue) * 100) : 0,
        },
        {
          source: "labs",
          label: "Lab Fees",
          amount: labRevenue,
          percentage: totalRevenue > 0 ? Math.round((labRevenue / totalRevenue) * 100) : 0,
        },
      ],
    };
  }),

  // Coach payout summary: revenue generated per coach
  getCoachPayouts: adminProcedure.query(async ({ ctx }) => {
    // Get all coaches
    const coaches = await ctx.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "coach"));

    // For each coach, calculate client revenue
    const payouts = await Promise.all(
      coaches.map(async (coach) => {
        const relationships = await ctx.db
          .select({ clientId: coachClientRelationships.clientId })
          .from(coachClientRelationships)
          .where(
            and(
              eq(coachClientRelationships.coachId, coach.id),
              eq(coachClientRelationships.status, "active")
            )
          );

        let totalRevenue = 0;
        const clientCount = relationships.length;

        for (const rel of relationships) {
          const profile = await ctx.db.query.clientProfiles.findFirst({
            where: eq(clientProfiles.userId, rel.clientId),
          });
          const tier = profile?.tier ?? "tier3";
          const pricing = tierPricing[tier] ?? tierPricing.tier3;
          totalRevenue += pricing.monthly;
        }

        // Coach payout at 60% of coaching revenue
        const payoutRate = 0.6;
        const payout = Math.round(totalRevenue * payoutRate);

        return {
          coachId: coach.id,
          name: `${coach.firstName ?? ""} ${coach.lastName ?? ""}`.trim() || coach.email,
          clientCount,
          grossRevenue: totalRevenue,
          payoutRate,
          payout,
          platformFee: totalRevenue - payout,
        };
      })
    );

    return payouts.sort((a, b) => b.grossRevenue - a.grossRevenue);
  }),
});
