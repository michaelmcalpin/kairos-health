import { z } from "zod";
import { router, superAdminProcedure } from "@/server/trpc";
import { referenceItems } from "@/server/db/schema";
import { eq, and, desc, asc, count, sql, ilike, or } from "drizzle-orm";

export const adminReferencesRouter = router({
  /**
   * list — Get all reference items with optional filters and search.
   *
   * Optional filters:
   * - category: filter by reference category
   * - search: search in title, source, summary, and tags
   * - sortBy: "date" for newest first, "relevance" for most cited first
   * - companyId: (super-admin only) filter by company
   */
  list: superAdminProcedure
    .input(
      z.object({
        category: z.enum([
          "clinical_studies",
          "supplement_database",
          "lab_ranges",
          "protocol_templates",
          "dosage_guidelines",
        ]).optional(),
        search: z.string().optional(),
        sortBy: z.enum(["date", "relevance"]).default("date"),
        companyId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = [];

      if (input.category) {
        filters.push(eq(referenceItems.category, input.category));
      }

      if (input.companyId) {
        filters.push(eq(referenceItems.companyId, input.companyId));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      let query = ctx.db.query.referenceItems.findMany({
        where: whereClause,
      });

      // Get all items first to handle search and sorting
      let items = await query;

      // Apply search filter (case-insensitive) if provided
      if (input.search) {
        const searchLower = input.search.toLowerCase();
        items = items.filter(
          (item) =>
            item.title.toLowerCase().includes(searchLower) ||
            item.source.toLowerCase().includes(searchLower) ||
            (item.summary?.toLowerCase().includes(searchLower) ?? false) ||
            (Array.isArray(item.relevanceTags) &&
              item.relevanceTags.some((tag) =>
                typeof tag === "string" && tag.toLowerCase().includes(searchLower)
              ))
        );
      }

      // Apply sorting
      if (input.sortBy === "relevance") {
        items = items.sort((a, b) => (b.citationCount || 0) - (a.citationCount || 0));
      } else {
        // date (newest first)
        items = items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      }

      return items;
    }),

  /**
   * getStats — Get statistics about reference items.
   *
   * Returns:
   * - total: total number of references
   * - recentlyAdded: references added in the last 30 days
   * - mostCitedCategory: the category with the highest total citations
   *
   * Optional companyId filter for super-admins.
   */
  getStats: superAdminProcedure
    .input(
      z.object({
        companyId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.companyId ? eq(referenceItems.companyId, input.companyId) : undefined;

      // Get total count
      const totalResult = await ctx.db
        .select({ count: count() })
        .from(referenceItems)
        .where(whereClause);
      const total = Number(totalResult[0]?.count ?? 0);

      // Get recently added (last 30 days)
      const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
      let recentlyAddedQuery = ctx.db
        .select({ count: count() })
        .from(referenceItems)
        .where(whereClause);

      const allRecentItems = await ctx.db.query.referenceItems.findMany({
        where: whereClause,
      });

      const recentlyAdded = allRecentItems.filter(
        (item) => new Date(item.createdAt) > thirtyDaysAgo
      ).length;

      // Get category with most citations
      const allItems = await ctx.db.query.referenceItems.findMany({
        where: whereClause,
      });

      const categoryStats: Record<string, number> = {};
      allItems.forEach((item) => {
        const category = item.category;
        categoryStats[category] = (categoryStats[category] ?? 0) + (item.citationCount ?? 0);
      });

      const mostCitedCategory =
        Object.entries(categoryStats).length > 0
          ? Object.entries(categoryStats).sort((a, b) => b[1] - a[1])[0][0]
          : null;

      return {
        total,
        recentlyAdded,
        mostCitedCategory,
      };
    }),

  /**
   * create — Create a new reference item.
   *
   * Input:
   * - title: the reference title
   * - source: the source/publication name
   * - year: the publication year
   * - category: reference category
   * - relevanceTags: optional array of relevance tags
   * - summary: optional summary text
   * - citationCount: optional initial citation count (default 0)
   * - url: optional URL to the reference
   * - companyId: optional company association (super-admin only)
   */
  create: superAdminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        source: z.string().min(1).max(300),
        year: z.number().int().min(1900).max(2100),
        category: z.enum([
          "clinical_studies",
          "supplement_database",
          "lab_ranges",
          "protocol_templates",
          "dosage_guidelines",
        ]),
        relevanceTags: z.array(z.string()).default([]),
        summary: z.string().optional(),
        citationCount: z.number().int().nonnegative().default(0),
        url: z.string().max(1000).url().optional(),
        companyId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(referenceItems)
        .values({
          title: input.title,
          source: input.source,
          year: input.year,
          category: input.category,
          relevanceTags: input.relevanceTags,
          summary: input.summary ?? null,
          citationCount: input.citationCount,
          url: input.url ?? null,
          companyId: input.companyId ?? null,
        })
        .returning();

      return result[0];
    }),

  /**
   * update — Update a reference item by id.
   *
   * Input:
   * - id: the reference item ID
   * - title: optional title update
   * - source: optional source update
   * - year: optional year update
   * - category: optional category update
   * - relevanceTags: optional tags update
   * - summary: optional summary update
   * - citationCount: optional citation count update
   * - url: optional URL update
   */
  update: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        source: z.string().min(1).max(300).optional(),
        year: z.number().int().min(1900).max(2100).optional(),
        category: z.enum([
          "clinical_studies",
          "supplement_database",
          "lab_ranges",
          "protocol_templates",
          "dosage_guidelines",
        ]).optional(),
        relevanceTags: z.array(z.string()).optional(),
        summary: z.string().optional(),
        citationCount: z.number().int().nonnegative().optional(),
        url: z.string().max(1000).url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Build the update payload
      const updatePayload: Record<string, unknown> = {};
      if (updateData.title !== undefined) updatePayload.title = updateData.title;
      if (updateData.source !== undefined) updatePayload.source = updateData.source;
      if (updateData.year !== undefined) updatePayload.year = updateData.year;
      if (updateData.category !== undefined) updatePayload.category = updateData.category;
      if (updateData.relevanceTags !== undefined) updatePayload.relevanceTags = updateData.relevanceTags;
      if (updateData.summary !== undefined) updatePayload.summary = updateData.summary;
      if (updateData.citationCount !== undefined) updatePayload.citationCount = updateData.citationCount;
      if (updateData.url !== undefined) updatePayload.url = updateData.url;

      // Always update the updatedAt timestamp
      updatePayload.updatedAt = new Date();

      const result = await ctx.db
        .update(referenceItems)
        .set(updatePayload)
        .where(eq(referenceItems.id, id))
        .returning();

      return result[0];
    }),

  /**
   * delete — Delete a reference item by id.
   *
   * Input:
   * - id: the reference item ID
   */
  delete: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .delete(referenceItems)
        .where(eq(referenceItems.id, input.id))
        .returning();

      return result[0] ?? null;
    }),
});
