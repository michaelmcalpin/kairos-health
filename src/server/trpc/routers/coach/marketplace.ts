import { z } from "zod";
import { router, coachProcedure } from "@/server/trpc";
import { marketplaceItems } from "@/server/db/schema";
import { eq, and, desc, sql } from "drizzle-orm";

export const coachMarketplaceRouter = router({
  /**
   * List marketplace items available to the coach
   * Shows items from the coach's company and global items
   */
  list: coachProcedure
    .input(
      z.object({
        type: z.enum(["protocol", "program", "supplement_stack", "assessment"]).optional(),
        status: z.enum(["active", "draft", "archived"]).optional(),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const filters = [eq(marketplaceItems.status, input?.status ?? "active")];

      if (input?.type) {
        filters.push(eq(marketplaceItems.type, input.type));
      }

      const items = await ctx.db.query.marketplaceItems.findMany({
        where: and(...filters),
        orderBy: desc(marketplaceItems.createdAt),
      });

      return items.map((item) => ({
        id: item.id,
        title: item.title,
        description: item.description,
        type: item.type,
        status: item.status,
        priceInCents: item.priceInCents,
        currency: item.currency,
        imageUrl: item.imageUrl,
        purchaseCount: item.purchaseCount,
        rating: item.rating,
        metadata: item.metadata,
        createdAt: item.createdAt.toISOString(),
      }));
    }),

  /**
   * Get marketplace stats for the coach
   */
  getStats: coachProcedure.query(async ({ ctx }) => {
    const allItems = await ctx.db.query.marketplaceItems.findMany({
      where: eq(marketplaceItems.status, "active"),
    });

    const totalProducts = allItems.length;
    const totalRevenue = allItems.reduce((sum, i) => sum + (i.purchaseCount * i.priceInCents), 0);
    const avgPrice = totalProducts > 0
      ? Math.round(allItems.reduce((sum, i) => sum + i.priceInCents, 0) / totalProducts)
      : 0;

    return {
      totalProducts,
      totalRevenueCents: totalRevenue,
      avgPriceCents: avgPrice,
      recommendedCount: allItems.filter((i) => (i.metadata as Record<string, unknown>)?.recommended === true).length,
    };
  }),

  /**
   * Create a new marketplace item
   */
  create: coachProcedure
    .input(z.object({
      title: z.string().min(1).max(300),
      description: z.string().optional(),
      type: z.enum(["protocol", "program", "supplement_stack", "assessment"]),
      priceInCents: z.number().int().min(0),
      imageUrl: z.string().optional(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db.insert(marketplaceItems).values({
        title: input.title,
        description: input.description ?? null,
        type: input.type,
        priceInCents: input.priceInCents,
        imageUrl: input.imageUrl ?? null,
        metadata: input.metadata ?? {},
        createdBy: ctx.dbUserId,
        status: "active",
      }).returning();

      return result[0];
    }),
});
