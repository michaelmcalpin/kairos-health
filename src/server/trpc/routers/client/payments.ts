import { router, clientProcedure } from "@/server/trpc";
import { subscriptions, clientProfiles } from "@/server/db/schema";
import { eq, desc } from "drizzle-orm";

export const clientPaymentsRouter = router({
  // Get current subscription and tier info
  getSubscription: clientProcedure.query(async ({ ctx }) => {
    const sub = await ctx.db.query.subscriptions.findFirst({
      where: eq(subscriptions.userId, ctx.dbUserId),
      orderBy: desc(subscriptions.createdAt),
    });

    const profile = await ctx.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, ctx.dbUserId),
    });

    return {
      subscription: sub
        ? {
            id: sub.id,
            tier: sub.tier,
            status: sub.status,
            stripeSubscriptionId: sub.stripeSubscriptionId,
            currentPeriodEnd: sub.currentPeriodEnd,
            createdAt: sub.createdAt,
          }
        : null,
      tier: profile?.tier ?? null,
    };
  }),

  // Get billing history (subscription records)
  billingHistory: clientProcedure.query(async ({ ctx }) => {
    const results = await ctx.db.query.subscriptions.findMany({
      where: eq(subscriptions.userId, ctx.dbUserId),
      orderBy: desc(subscriptions.createdAt),
    });

    return results.map((s) => ({
      id: s.id,
      tier: s.tier,
      status: s.status,
      currentPeriodEnd: s.currentPeriodEnd,
      createdAt: s.createdAt,
    }));
  }),
});
