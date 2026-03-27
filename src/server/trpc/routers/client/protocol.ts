import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { supplementProtocols, protocolItems, adherenceLogs } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const clientProtocolRouter = router({
  // Get the active supplement protocol with items
  getActive: clientProcedure.query(async ({ ctx }) => {
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
      trainerId: protocol.trainerId,
      version: protocol.version,
      status: protocol.status,
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

  // Get adherence logs for a specific date
  getAdherence: clientProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.adherenceLogs.findMany({
        where: and(
          eq(adherenceLogs.clientId, ctx.dbUserId),
          eq(adherenceLogs.date, input.date)
        ),
      });
    }),

  // Log adherence (taken or skipped)
  logAdherence: clientProcedure
    .input(
      z.object({
        protocolItemId: z.string(),
        date: z.string(),
        taken: z.boolean(),
        skipped: z.boolean().optional().default(false),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if log already exists for this item+date
      const existing = await ctx.db.query.adherenceLogs.findFirst({
        where: and(
          eq(adherenceLogs.clientId, ctx.dbUserId),
          eq(adherenceLogs.protocolItemId, input.protocolItemId),
          eq(adherenceLogs.date, input.date)
        ),
      });

      if (existing) {
        // Update
        await ctx.db.update(adherenceLogs)
          .set({
            takenAt: input.taken ? new Date() : null,
            skipped: input.skipped,
            notes: input.notes,
          })
          .where(eq(adherenceLogs.id, existing.id));
      } else {
        // Insert
        await ctx.db.insert(adherenceLogs).values({
          clientId: ctx.dbUserId,
          protocolItemId: input.protocolItemId,
          date: input.date,
          takenAt: input.taken ? new Date() : null,
          skipped: input.skipped,
          notes: input.notes,
        });
      }
    }),
});
