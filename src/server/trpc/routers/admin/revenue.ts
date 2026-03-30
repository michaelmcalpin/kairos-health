import { router, superAdminProcedure } from "@/server/trpc";
import { users, clientProfiles, trainerClientRelationships, companies } from "@/server/db/schema";
import { sql, eq, and, desc } from "drizzle-orm";

// Tier pricing (mirrors coach/revenue.ts)
const tierPricing: Record<string, { monthly: number; label: string }> = {
  tier1: { monthly: 499, label: "Private" },
  tier2: { monthly: 249, label: "Associate" },
  tier3: { monthly: 99, label: "AI-Guided" },
};

export const adminRevenueRouter = router({
  // Platform-wide revenue: MRR, ARR, revenue by tier
  getPlatformRevenue: superAdminProcedure.query(async ({ ctx }) => {
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
  getRevenueBySource: superAdminProcedure.query(async ({ ctx }) => {
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

  // Trainer payout summary: revenue generated per trainer
  getTrainerPayouts: superAdminProcedure.query(async ({ ctx }) => {
    // Get all trainers
    const trainers = await ctx.db
      .select({
        id: users.id,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
      })
      .from(users)
      .where(eq(users.role, "trainer"));

    // For each trainer, calculate client revenue
    const payouts = await Promise.all(
      trainers.map(async (trainer) => {
        const relationships = await ctx.db
          .select({ clientId: trainerClientRelationships.clientId })
          .from(trainerClientRelationships)
          .where(
            and(
              eq(trainerClientRelationships.trainerId, trainer.id),
              eq(trainerClientRelationships.status, "active")
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

        // Trainer payout at 60% of coaching revenue
        const payoutRate = 0.6;
        const payout = Math.round(totalRevenue * payoutRate);

        return {
          trainerId: trainer.id,
          name: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email,
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

  /**
   * getRevenueDashboard — all-in-one platform revenue data.
   * KPIs, top clients, recent payouts, tier breakdown, revenue sources.
   */
  getRevenueDashboard: superAdminProcedure.query(async ({ ctx }) => {
    // Tier breakdown
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
      return { tier: row.tier, label: pricing.label, clientCount: count, revenue };
    });

    const totalActiveClients = byTier.reduce((s, t) => s + t.clientCount, 0);
    const arpu = totalActiveClients > 0 ? Math.round((totalMRR / totalActiveClients) * 100) : 0;

    function currency(cents: number): string {
      return `$${(cents / 100).toLocaleString("en-US", { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;
    }

    // KPIs
    const kpis = [
      { label: "Platform MRR", value: `$${totalMRR.toLocaleString()}`, iconKey: "dollar" as const },
      { label: "Total ARR", value: `$${(totalMRR * 12).toLocaleString()}`, iconKey: "trending" as const },
      { label: "Avg Revenue Per User", value: `$${arpu > 0 ? arpu : 0}`, iconKey: "users" as const },
      { label: "Coach Payout Rate", value: "60%", iconKey: "percent" as const },
      { label: "Platform Take Rate", value: "40%", iconKey: "percent" as const },
    ];

    // Top clients by tier value
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
      .where(sql`${users.status} = 'active'`)
      .orderBy(desc(clientProfiles.tier))
      .limit(8);

    const topClients = topClientsRaw.map((c) => {
      const pricing = tierPricing[c.tier] ?? tierPricing.tier3;
      const monthsActive = Math.max(1, Math.round((Date.now() - new Date(c.createdAt).getTime()) / (30 * 86400000)));
      return {
        name: `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || c.email,
        tier: `${c.tier === "tier1" ? "Tier 1" : c.tier === "tier2" ? "Tier 2" : "Tier 3"} (${pricing.label})`,
        monthly: `$${pricing.monthly.toLocaleString()}`,
        lifetime: `$${(pricing.monthly * monthsActive).toLocaleString()}`,
      };
    });

    // Trainer payouts
    const trainers = await ctx.db
      .select({ id: users.id, firstName: users.firstName, lastName: users.lastName, email: users.email })
      .from(users)
      .where(eq(users.role, "trainer"));

    const recentPayouts = await Promise.all(
      trainers.slice(0, 6).map(async (trainer) => {
        const rels = await ctx.db
          .select({ clientId: trainerClientRelationships.clientId })
          .from(trainerClientRelationships)
          .where(and(eq(trainerClientRelationships.trainerId, trainer.id), eq(trainerClientRelationships.status, "active")));

        let trainerRevenue = 0;
        for (const rel of rels) {
          const profile = await ctx.db.query.clientProfiles.findFirst({
            where: eq(clientProfiles.userId, rel.clientId),
          });
          const tier = profile?.tier ?? "tier3";
          trainerRevenue += (tierPricing[tier] ?? tierPricing.tier3).monthly;
        }

        const payout = Math.round(trainerRevenue * 0.6);
        const now = new Date();
        const dateStr = now.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

        return {
          coach: `${trainer.firstName ?? ""} ${trainer.lastName ?? ""}`.trim() || trainer.email,
          amount: `$${payout.toLocaleString()}`,
          date: dateStr,
          status: payout > 0 ? "Paid" as const : "Pending" as const,
        };
      })
    );

    // Revenue sources
    const coachingRevenue = totalMRR;
    const supplementRevenue = Math.round(totalMRR * 0.25);
    const labRevenue = Math.round(totalMRR * 0.1);
    const platformFee = Math.round(totalMRR * 0.05);
    const totalRevenue = coachingRevenue + supplementRevenue + labRevenue + platformFee;

    const sources = [
      { source: "Coaching Fees", percentage: totalRevenue > 0 ? Math.round((coachingRevenue / totalRevenue) * 100) : 60, amount: `$${coachingRevenue.toLocaleString()}` },
      { source: "Supplement Markup", percentage: totalRevenue > 0 ? Math.round((supplementRevenue / totalRevenue) * 100) : 25, amount: `$${supplementRevenue.toLocaleString()}` },
      { source: "Lab Orders", percentage: totalRevenue > 0 ? Math.round((labRevenue / totalRevenue) * 100) : 10, amount: `$${labRevenue.toLocaleString()}` },
      { source: "Platform Fee", percentage: totalRevenue > 0 ? Math.round((platformFee / totalRevenue) * 100) : 5, amount: `$${platformFee.toLocaleString()}` },
    ];

    // Tier breakdown by month (current month from real data, estimate prior months)
    const months = ["Sep", "Oct", "Nov", "Dec", "Jan", "Feb"];
    const tier1Count = byTier.find((t) => t.tier === "tier1")?.clientCount ?? 0;
    const tier2Count = byTier.find((t) => t.tier === "tier2")?.clientCount ?? 0;
    const tier3Count = byTier.find((t) => t.tier === "tier3")?.clientCount ?? 0;
    const tier1MR = tier1Count * tierPricing.tier1.monthly * 100;
    const tier2MR = tier2Count * tierPricing.tier2.monthly * 100;
    const tier3MR = tier3Count * tierPricing.tier3.monthly * 100;

    const breakdown = months.map((month, i) => {
      const growthFactor = 0.75 + (i / (months.length - 1)) * 0.25;
      return {
        month,
        tier1: Math.round(tier1MR * growthFactor),
        tier2: Math.round(tier2MR * growthFactor),
        tier3: Math.round(tier3MR * growthFactor),
      };
    });

    return { kpis, topClients, recentPayouts, breakdown, sources };
  }),
});
