import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { supplementProtocols, protocolItems, adherenceLogs } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientSupplementsRouter = router({
  // Get active supplement protocol with items
  getActiveProtocol: clientProcedure.query(async ({ ctx }) => {
    const protocol = await ctx.db.query.supplementProtocols.findFirst({
      where: and(
        eq(supplementProtocols.clientId, ctx.dbUserId),
        eq(supplementProtocols.status, "active")
      ),
      orderBy: desc(supplementProtocols.createdAt),
    });

    if (!protocol) return null;

    const items = await ctx.db.query.protocolItems.findMany({
      where: eq(protocolItems.protocolId, protocol.id),
    });

    return {
      id: protocol.id,
      version: protocol.version,
      status: protocol.status,
      isAiGenerated: protocol.isAiGenerated,
      createdAt: protocol.createdAt,
      items: items.map((item) => ({
        id: item.id,
        name: item.name,
        category: item.category,
        dosage: item.dosage,
        unit: item.unit,
        form: item.form,
        frequency: item.frequency,
        timeOfDay: item.timeOfDay,
        rationale: item.rationale,
        coachNotes: item.coachNotes,
      })),
    };
  }),

  // Get adherence logs for a date range
  getAdherence: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.adherenceLogs.findMany({
        where: and(
          eq(adherenceLogs.clientId, ctx.dbUserId),
          gte(adherenceLogs.date, input.startDate),
          lte(adherenceLogs.date, input.endDate)
        ),
        orderBy: desc(adherenceLogs.date),
      });

      return results.map((a) => ({
        id: a.id,
        protocolItemId: a.protocolItemId,
        date: a.date,
        takenAt: a.takenAt,
        skipped: a.skipped,
        notes: a.notes,
      }));
    }),

  // Adherence stats: percentage taken vs total items per day
  adherenceStats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const result = await ctx.db
        .select({
          date: adherenceLogs.date,
          total: sql<number>`count(*)`,
          taken: sql<number>`count(*) filter (where ${adherenceLogs.skipped} = false)`,
        })
        .from(adherenceLogs)
        .where(
          and(
            eq(adherenceLogs.clientId, ctx.dbUserId),
            gte(adherenceLogs.date, input.startDate),
            lte(adherenceLogs.date, input.endDate)
          )
        )
        .groupBy(adherenceLogs.date)
        .orderBy(adherenceLogs.date);

      return result.map((r) => ({
        date: r.date,
        total: Number(r.total),
        taken: Number(r.taken),
        percentage: Number(r.total) > 0
          ? Math.round((Number(r.taken) / Number(r.total)) * 100)
          : 0,
      }));
    }),

  // Log adherence for a protocol item
  logAdherence: clientProcedure
    .input(
      z.object({
        protocolItemId: z.string().uuid(),
        date: z.string().optional(),
        skipped: z.boolean().default(false),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(adherenceLogs)
        .values({
          clientId: ctx.dbUserId,
          protocolItemId: input.protocolItemId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          takenAt: input.skipped ? null : new Date(),
          skipped: input.skipped,
          notes: input.notes ?? null,
        })
        .returning();

      return result[0];
    }),
});
