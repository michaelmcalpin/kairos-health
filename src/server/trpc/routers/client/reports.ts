import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { savedReports } from "@/server/db/schema";
import { eq, and, desc, gt } from "drizzle-orm";

const REPORT_TTL_DAYS = 60;

export const clientReportsRouter = router({
  /** Get the latest non-expired report for a given type */
  getByType: clientProcedure
    .input(z.object({ reportType: z.string() }))
    .query(async ({ ctx, input }) => {
      const report = await ctx.db.query.savedReports.findFirst({
        where: and(
          eq(savedReports.clientId, ctx.dbUserId),
          eq(savedReports.reportType, input.reportType),
          gt(savedReports.expiresAt, new Date()),
        ),
        orderBy: desc(savedReports.createdAt),
      });
      return report ?? null;
    }),

  /** List all non-expired saved reports */
  listAll: clientProcedure.query(async ({ ctx }) => {
    return ctx.db.query.savedReports.findMany({
      where: and(
        eq(savedReports.clientId, ctx.dbUserId),
        gt(savedReports.expiresAt, new Date()),
      ),
      orderBy: desc(savedReports.createdAt),
    });
  }),

  /** Save or replace a report */
  save: clientProcedure
    .input(
      z.object({
        reportType: z.string(),
        title: z.string(),
        reportData: z.record(z.string(), z.unknown()),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + REPORT_TTL_DAYS);

      // Delete existing reports of this type for this client
      await ctx.db.delete(savedReports).where(
        and(
          eq(savedReports.clientId, ctx.dbUserId),
          eq(savedReports.reportType, input.reportType),
        )
      );

      // Insert the new one
      const [report] = await ctx.db.insert(savedReports).values({
        clientId: ctx.dbUserId,
        reportType: input.reportType,
        title: input.title,
        reportData: input.reportData,
        expiresAt,
      }).returning();

      return report;
    }),
});
