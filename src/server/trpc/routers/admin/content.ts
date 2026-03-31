import { z } from "zod";
import { router, superAdminProcedure, companyAdminProcedure } from "@/server/trpc";
import { contentItems } from "@/server/db/schema";
import { eq, and, desc, count, sql, ilike, or } from "drizzle-orm";

export const adminContentRouter = router({
  /**
   * list — Get all content items with optional filters.
   *
   * For super-admins: can filter by companyId to see content from specific companies.
   * For company-admins: only see content from their own company.
   *
   * Optional filters:
   * - category: filter by content category
   * - status: filter by publication status
   * - companyId: (super-admin only) filter by company
   */
  list: superAdminProcedure
    .input(
      z.object({
        category: z.enum(["protocols", "articles", "videos", "guides"]).optional(),
        status: z.enum(["published", "draft", "review", "archived"]).optional(),
        companyId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const filters = [];

      if (input.category) {
        filters.push(eq(contentItems.category, input.category));
      }

      if (input.status) {
        filters.push(eq(contentItems.status, input.status));
      }

      if (input.companyId) {
        filters.push(eq(contentItems.companyId, input.companyId));
      }

      const whereClause = filters.length > 0 ? and(...filters) : undefined;

      const items = await ctx.db.query.contentItems.findMany({
        where: whereClause,
        orderBy: desc(contentItems.publishDate),
      });

      return items;
    }),

  /**
   * getStats — Get statistics about content items.
   *
   * Returns counts of total, published, draft, and review items.
   * Optional companyId filter for super-admins.
   */
  getStats: superAdminProcedure
    .input(
      z.object({
        companyId: z.string().uuid().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const whereClause = input.companyId ? eq(contentItems.companyId, input.companyId) : undefined;

      // Get total count
      const totalResult = await ctx.db
        .select({ count: count() })
        .from(contentItems)
        .where(whereClause);
      const total = Number(totalResult[0]?.count ?? 0);

      // Get published count
      const publishedResult = await ctx.db
        .select({ count: count() })
        .from(contentItems)
        .where(
          whereClause
            ? and(whereClause, eq(contentItems.status, "published"))
            : eq(contentItems.status, "published")
        );
      const published = Number(publishedResult[0]?.count ?? 0);

      // Get draft count
      const draftResult = await ctx.db
        .select({ count: count() })
        .from(contentItems)
        .where(
          whereClause
            ? and(whereClause, eq(contentItems.status, "draft"))
            : eq(contentItems.status, "draft")
        );
      const draft = Number(draftResult[0]?.count ?? 0);

      // Get review count
      const reviewResult = await ctx.db
        .select({ count: count() })
        .from(contentItems)
        .where(
          whereClause
            ? and(whereClause, eq(contentItems.status, "review"))
            : eq(contentItems.status, "review")
        );
      const review = Number(reviewResult[0]?.count ?? 0);

      return {
        total,
        published,
        draft,
        review,
      };
    }),

  /**
   * create — Create a new content item.
   *
   * Input:
   * - title: the content title
   * - category: content category
   * - authorName: name of the author
   * - status: initial publication status
   * - thumbnail: optional thumbnail URL
   * - body: content body/text
   * - companyId: optional company association (super-admin only)
   */
  create: superAdminProcedure
    .input(
      z.object({
        title: z.string().min(1).max(500),
        category: z.enum(["protocols", "articles", "videos", "guides"]),
        authorName: z.string().min(1).max(200),
        status: z.enum(["published", "draft", "review", "archived"]).default("draft"),
        thumbnail: z.string().max(500).optional(),
        body: z.string().optional(),
        companyId: z.string().uuid().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(contentItems)
        .values({
          title: input.title,
          category: input.category,
          authorName: input.authorName,
          status: input.status,
          thumbnail: input.thumbnail ?? null,
          body: input.body ?? null,
          companyId: input.companyId ?? null,
          authorId: ctx.dbUserId,
          publishDate:
            input.status === "published" ? new Date() : null,
        })
        .returning();

      return result[0];
    }),

  /**
   * update — Update a content item by id.
   *
   * Input:
   * - id: the content item ID
   * - title: optional title update
   * - category: optional category update
   * - authorName: optional author name update
   * - status: optional status update
   * - thumbnail: optional thumbnail update
   * - body: optional body update
   */
  update: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().min(1).max(500).optional(),
        category: z.enum(["protocols", "articles", "videos", "guides"]).optional(),
        authorName: z.string().min(1).max(200).optional(),
        status: z.enum(["published", "draft", "review", "archived"]).optional(),
        thumbnail: z.string().max(500).optional(),
        body: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...updateData } = input;

      // Build the update payload
      const updatePayload: Record<string, unknown> = {};
      if (updateData.title !== undefined) updatePayload.title = updateData.title;
      if (updateData.category !== undefined) updatePayload.category = updateData.category;
      if (updateData.authorName !== undefined) updatePayload.authorName = updateData.authorName;
      if (updateData.status !== undefined) {
        updatePayload.status = updateData.status;
        // Set publishDate when status changes to published
        if (updateData.status === "published") {
          updatePayload.publishDate = new Date();
        }
      }
      if (updateData.thumbnail !== undefined) updatePayload.thumbnail = updateData.thumbnail;
      if (updateData.body !== undefined) updatePayload.body = updateData.body;

      // Always update the updatedAt timestamp
      updatePayload.updatedAt = new Date();

      const result = await ctx.db
        .update(contentItems)
        .set(updatePayload)
        .where(eq(contentItems.id, id))
        .returning();

      return result[0];
    }),

  /**
   * archive — Archive a content item by setting its status to "archived".
   *
   * Input:
   * - id: the content item ID
   */
  archive: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .update(contentItems)
        .set({
          status: "archived",
          updatedAt: new Date(),
        })
        .where(eq(contentItems.id, input.id))
        .returning();

      return result[0];
    }),
});
