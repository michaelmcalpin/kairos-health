/**
 * Super-admin feedback management router.
 *
 * List/filter feedback, stats, status updates, and an on-demand AI
 * consolidation of the last N days of feedback.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, superAdminProcedure } from "@/server/trpc";
import { feedback, users } from "@/server/db/schema";
import { and, desc, eq, gte, sql } from "drizzle-orm";
import { consolidateFeedback } from "@/lib/feedback/consolidate";

export const adminFeedbackRouter = router({
  // List feedback with filters + user info + total count
  list: superAdminProcedure
    .input(
      z.object({
        type: z.enum(["bug", "feature", "redesign"]).optional(),
        status: z.enum(["new", "reviewed", "resolved"]).optional(),
        platform: z.enum(["web", "mobile"]).optional(),
        limit: z.number().min(1).max(200).optional().default(50),
        offset: z.number().min(0).optional().default(0),
      }).optional(),
    )
    .query(async ({ ctx, input }) => {
      const { type, status, platform, limit = 50, offset = 0 } = input ?? {};

      const conditions = [];
      if (type) conditions.push(eq(feedback.type, type));
      if (status) conditions.push(eq(feedback.status, status));
      if (platform) conditions.push(eq(feedback.platform, platform));
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [countResult] = await ctx.db
        .select({ count: sql<number>`count(*)` })
        .from(feedback)
        .where(whereClause);
      const total = Number(countResult?.count ?? 0);

      const rows = await ctx.db
        .select({
          id: feedback.id,
          userId: feedback.userId,
          role: feedback.role,
          platform: feedback.platform,
          page: feedback.page,
          type: feedback.type,
          message: feedback.message,
          aiSummary: feedback.aiSummary,
          aiTags: feedback.aiTags,
          status: feedback.status,
          createdAt: feedback.createdAt,
          userFirstName: users.firstName,
          userLastName: users.lastName,
          userEmail: users.email,
        })
        .from(feedback)
        .leftJoin(users, eq(feedback.userId, users.id))
        .where(whereClause)
        .orderBy(desc(feedback.createdAt))
        .limit(limit)
        .offset(offset);

      return {
        items: rows.map((r) => ({
          ...r,
          aiTags: (r.aiTags as string[] | null) ?? [],
          createdAt: r.createdAt.toISOString(),
        })),
        total,
      };
    }),

  // Counts by type, by status, and last-7-days total
  stats: superAdminProcedure.query(async ({ ctx }) => {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const [totalRow] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(feedback);

    const byTypeRows = await ctx.db
      .select({ type: feedback.type, count: sql<number>`count(*)` })
      .from(feedback)
      .groupBy(feedback.type);

    const byStatusRows = await ctx.db
      .select({ status: feedback.status, count: sql<number>`count(*)` })
      .from(feedback)
      .groupBy(feedback.status);

    const [last7Row] = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(feedback)
      .where(gte(feedback.createdAt, sevenDaysAgo));

    const byType: Record<string, number> = { bug: 0, feature: 0, redesign: 0 };
    byTypeRows.forEach((r) => { byType[r.type] = Number(r.count ?? 0); });

    const byStatus: Record<string, number> = { new: 0, reviewed: 0, resolved: 0 };
    byStatusRows.forEach((r) => {
      if (r.status) byStatus[r.status] = Number(r.count ?? 0);
    });

    return {
      total: Number(totalRow?.count ?? 0),
      byType,
      byStatus,
      last7Days: Number(last7Row?.count ?? 0),
    };
  }),

  // Update the triage status of a feedback item
  updateStatus: superAdminProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.enum(["new", "reviewed", "resolved"]),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(feedback)
        .set({ status: input.status })
        .where(eq(feedback.id, input.id))
        .returning({ id: feedback.id, status: feedback.status });

      if (!updated) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Feedback item not found" });
      }
      return updated;
    }),

  // AI consolidation of the last N days of feedback
  consolidate: superAdminProcedure
    .input(z.object({ days: z.number().min(1).max(90).default(7) }).optional())
    .mutation(async ({ ctx, input }) => {
      const days = input?.days ?? 7;
      const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

      const rows = await ctx.db
        .select({
          type: feedback.type,
          page: feedback.page,
          platform: feedback.platform,
          role: feedback.role,
          message: feedback.message,
          createdAt: feedback.createdAt,
        })
        .from(feedback)
        .where(gte(feedback.createdAt, since))
        .orderBy(desc(feedback.createdAt));

      if (rows.length === 0) {
        return { analysis: `No feedback submitted in the last ${days} day(s).`, itemCount: 0 };
      }

      try {
        const analysis = await consolidateFeedback(rows, days);
        return { analysis, itemCount: rows.length };
      } catch (err) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: `AI consolidation failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        });
      }
    }),
});
