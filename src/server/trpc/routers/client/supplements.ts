import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { supplementProtocols, protocolItems, adherenceLogs } from "@/server/db/schema";
import { eq, desc, and, gte, lte, sql } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientSupplementsRouter = router({
  // Get active supplement protocol with items
  getActiveProtocol: clientProcedure.query(async ({ ctx }) => {
    const protocol = await safeQ(() => ctx.db.query.supplementProtocols.findFirst({
      where: and(
        eq(supplementProtocols.clientId, ctx.dbUserId),
        eq(supplementProtocols.status, "active")
      ),
      orderBy: desc(supplementProtocols.createdAt),
    }), undefined);

    if (!protocol) return null;

    const items = await safeQ(() => ctx.db.query.protocolItems.findMany({
      where: eq(protocolItems.protocolId, protocol.id),
    }), []);

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
      const results = await safeQ(() => ctx.db.query.adherenceLogs.findMany({
        where: and(
          eq(adherenceLogs.clientId, ctx.dbUserId),
          gte(adherenceLogs.date, input.startDate),
          lte(adherenceLogs.date, input.endDate)
        ),
        orderBy: desc(adherenceLogs.date),
      }), []);

      return results.map((a) => ({
        id: a.id,
        protocolItemId: a.protocolItemId,
        date: a.date,
        takenAt: a.takenAt,
        skipped: a.skipped,
        notes: a.notes,
      }));
    }),

  // Adherence stats: percentage of EXPECTED doses taken per day.
  //
  // The UI only ever writes "taken" rows (there are no skipped/missed rows), so
  // dividing taken by the number of logged rows would always be ~100% and be
  // misleading. Instead the denominator is the number of expected doses = the
  // count of active protocol items (each item is a once-daily dose). Taking 1 of
  // 10 items therefore honestly reads 10%, not 100%.
  adherenceStats: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      // Count of items in the active protocol = expected daily doses.
      const activeProtocol = await safeQ(() => ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.clientId, ctx.dbUserId),
          eq(supplementProtocols.status, "active")
        ),
        orderBy: desc(supplementProtocols.createdAt),
      }), undefined);

      const expectedPerDay = activeProtocol
        ? await safeQ(async () => {
            const items = await ctx.db.query.protocolItems.findMany({
              where: eq(protocolItems.protocolId, activeProtocol.id),
            });
            return items.length;
          }, 0)
        : 0;

      const result = await safeQ(() => ctx.db
        .select({
          date: adherenceLogs.date,
          logged: sql<number>`count(*)`,
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
        .orderBy(adherenceLogs.date), []);

      return result.map((r) => {
        const taken = Number(r.taken);
        // Fall back to the logged-row count only when there is no active protocol
        // to derive an expected count from (keeps the value non-null/sane).
        const expected = expectedPerDay > 0 ? expectedPerDay : Number(r.logged);
        const percentage = expected > 0
          ? Math.min(100, Math.max(0, Math.round((taken / expected) * 100)))
          : 0;
        return {
          date: r.date,
          total: expected,
          taken,
          percentage,
        };
      });
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
