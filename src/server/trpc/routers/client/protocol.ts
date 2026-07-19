import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { supplementProtocols, protocolItems, adherenceLogs } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientProtocolRouter = router({
  // Get the active supplement protocol with items
  getActive: clientProcedure.query(async ({ ctx }) => {
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

  // Add an item (supplement, medication, peptide, or injection) to the
  // client's own active protocol. Creates a protocol if none exists yet.
  addItem: clientProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        category: z.enum(["supplement", "medication", "peptide", "injection"]),
        dosage: z.string().max(100).optional().nullable(),
        unit: z.string().max(50).optional().nullable(),
        form: z.string().max(50).optional().nullable(),
        route: z.string().max(50).optional().nullable(),
        frequency: z.string().max(50).optional().nullable(),
        timeOfDay: z.string().max(50).optional().nullable(),
        notes: z.string().optional().nullable(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      // Find (or create) the client's active protocol
      let protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.clientId, ctx.dbUserId),
          eq(supplementProtocols.status, "active"),
        ),
        orderBy: desc(supplementProtocols.createdAt),
      });

      if (!protocol) {
        const [created] = await ctx.db
          .insert(supplementProtocols)
          .values({
            clientId: ctx.dbUserId,
            version: 1,
            status: "active",
            isAiGenerated: false,
          })
          .returning();
        protocol = created;
      }

      const [item] = await ctx.db
        .insert(protocolItems)
        .values({
          protocolId: protocol.id,
          name: input.name,
          category: input.category,
          dosage: input.dosage ?? null,
          unit: input.unit ?? null,
          form: input.form ?? null,
          route: input.route ?? null,
          frequency: input.frequency ?? null,
          timeOfDay: input.timeOfDay ?? null,
          coachNotes: input.notes ? `Self-logged: ${input.notes}` : "Self-logged",
        })
        .returning();

      return item;
    }),

  // Remove a self-logged item from the client's protocol
  removeItem: clientProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      // Verify the item belongs to one of this client's protocols
      const item = await ctx.db.query.protocolItems.findFirst({
        where: eq(protocolItems.id, input.itemId),
      });
      if (!item) return { success: false };

      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.id, item.protocolId),
          eq(supplementProtocols.clientId, ctx.dbUserId),
        ),
      });
      if (!protocol) return { success: false };

      await ctx.db.delete(protocolItems).where(eq(protocolItems.id, input.itemId));
      return { success: true };
    }),

  // Get adherence logs for a specific date
  getAdherence: clientProcedure
    .input(z.object({ date: z.string() }))
    .query(async ({ ctx, input }) => {
      return safeQ(() => ctx.db.query.adherenceLogs.findMany({
        where: and(
          eq(adherenceLogs.clientId, ctx.dbUserId),
          eq(adherenceLogs.date, input.date)
        ),
      }), []);
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
