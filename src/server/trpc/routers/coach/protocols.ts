/**
 * Coach Protocol Management Router
 *
 * Allows coaches to create, edit, and manage supplement protocols,
 * peptide schedules, and medication plans for their clients.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  supplementProtocols,
  protocolItems,
  trainerClientRelationships,
  adherenceLogs,
} from "@/server/db/schema";
import { eq, and, desc, inArray } from "drizzle-orm";

// ─── Relationship guard ─────────────────────────────────────
async function verifyCoachClientRelationship(
  db: typeof import("@/server/db").db,
  coachId: string,
  clientId: string,
  userRole?: string,
) {
  if (userRole === "super_admin") return;
  const rel = await db.query.trainerClientRelationships.findFirst({
    where: and(
      eq(trainerClientRelationships.trainerId, coachId),
      eq(trainerClientRelationships.clientId, clientId),
      eq(trainerClientRelationships.status, "active"),
    ),
  });
  if (!rel) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No active relationship with this client" });
  }
}

// ─── Protocol item schema ───────────────────────────────────
const protocolItemInput = z.object({
  name: z.string().min(1).max(255),
  category: z.enum(["supplement", "medication", "peptide", "injection"]),
  dosage: z.string().max(100).optional().nullable(),
  unit: z.string().max(50).optional().nullable(),
  form: z.string().max(50).optional().nullable(),
  route: z.string().max(50).optional().nullable(),
  frequency: z.string().max(50).optional().nullable(),
  timeOfDay: z.string().max(50).optional().nullable(),
  injectionSites: z.array(z.string()).optional().nullable(),
  rationale: z.string().optional().nullable(),
  coachNotes: z.string().optional().nullable(),
});

// ─── Router ─────────────────────────────────────────────────
export const coachProtocolsRouter = router({
  /**
   * Get the active protocol for a client (with all items).
   */
  getActive: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: and(
          eq(supplementProtocols.clientId, input.clientId),
          eq(supplementProtocols.status, "active"),
        ),
      });

      if (!protocol) return null;

      const items = await ctx.db.query.protocolItems.findMany({
        where: eq(protocolItems.protocolId, protocol.id),
      });

      return {
        id: protocol.id,
        clientId: protocol.clientId,
        trainerId: protocol.trainerId,
        version: protocol.version,
        status: protocol.status,
        isAiGenerated: protocol.isAiGenerated,
        createdAt: protocol.createdAt.toISOString(),
        items: items.map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          dosage: item.dosage,
          unit: item.unit,
          form: item.form,
          route: item.route,
          frequency: item.frequency,
          timeOfDay: item.timeOfDay,
          injectionSites: item.injectionSites,
          rationale: item.rationale,
          coachNotes: item.coachNotes,
        })),
      };
    }),

  /**
   * List all protocols for a client (active, proposed, archived).
   */
  listAll: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const protocols = await ctx.db.query.supplementProtocols.findMany({
        where: eq(supplementProtocols.clientId, input.clientId),
        orderBy: desc(supplementProtocols.createdAt),
      });

      // Fetch items for all protocols
      if (protocols.length === 0) return [];
      const protocolIds = protocols.map((p) => p.id);
      const allItems = await ctx.db.query.protocolItems.findMany({
        where: inArray(protocolItems.protocolId, protocolIds),
      });

      const itemsByProtocol = new Map<string, typeof allItems>();
      for (const item of allItems) {
        const arr = itemsByProtocol.get(item.protocolId) ?? [];
        arr.push(item);
        itemsByProtocol.set(item.protocolId, arr);
      }

      return protocols.map((p) => ({
        id: p.id,
        clientId: p.clientId,
        trainerId: p.trainerId,
        version: p.version,
        status: p.status,
        isAiGenerated: p.isAiGenerated,
        createdAt: p.createdAt.toISOString(),
        itemCount: (itemsByProtocol.get(p.id) ?? []).length,
        items: (itemsByProtocol.get(p.id) ?? []).map((item) => ({
          id: item.id,
          name: item.name,
          category: item.category,
          dosage: item.dosage,
          frequency: item.frequency,
          timeOfDay: item.timeOfDay,
        })),
      }));
    }),

  /**
   * Create a new protocol for a client with items.
   * Archives any existing active protocol.
   */
  create: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      items: z.array(protocolItemInput).min(1),
      activateImmediately: z.boolean().optional().default(true),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      // If activating immediately, archive any existing active protocol
      if (input.activateImmediately) {
        const existing = await ctx.db.query.supplementProtocols.findFirst({
          where: and(
            eq(supplementProtocols.clientId, input.clientId),
            eq(supplementProtocols.status, "active"),
          ),
        });

        if (existing) {
          await ctx.db.update(supplementProtocols)
            .set({ status: "archived" })
            .where(eq(supplementProtocols.id, existing.id));
        }
      }

      // Determine version number
      const latestProtocol = await ctx.db.query.supplementProtocols.findFirst({
        where: eq(supplementProtocols.clientId, input.clientId),
        orderBy: desc(supplementProtocols.version),
      });
      const newVersion = (latestProtocol?.version ?? 0) + 1;

      // Create protocol
      const [protocol] = await ctx.db.insert(supplementProtocols).values({
        clientId: input.clientId,
        trainerId: ctx.dbUserId,
        version: newVersion,
        status: input.activateImmediately ? "active" : "proposed",
        isAiGenerated: false,
      }).returning();

      // Create protocol items
      const itemValues = input.items.map((item) => ({
        protocolId: protocol.id,
        name: item.name,
        category: item.category as "supplement" | "medication" | "peptide" | "injection",
        dosage: item.dosage ?? null,
        unit: item.unit ?? null,
        form: item.form ?? null,
        route: item.route ?? null,
        frequency: item.frequency ?? null,
        timeOfDay: item.timeOfDay ?? null,
        injectionSites: item.injectionSites ?? null,
        rationale: item.rationale ?? null,
        coachNotes: item.coachNotes ?? null,
      }));

      const createdItems = await ctx.db.insert(protocolItems)
        .values(itemValues)
        .returning();

      return {
        id: protocol.id,
        version: protocol.version,
        status: protocol.status,
        itemCount: createdItems.length,
      };
    }),

  /**
   * Add a single item to an existing protocol.
   */
  addItem: trainerProcedure
    .input(z.object({
      protocolId: z.string(),
      item: protocolItemInput,
    }))
    .mutation(async ({ ctx, input }) => {
      // Verify protocol belongs to a client the coach manages
      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: eq(supplementProtocols.id, input.protocolId),
      });
      if (!protocol) throw new TRPCError({ code: "NOT_FOUND", message: "Protocol not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, protocol.clientId, ctx.userRole);

      const [created] = await ctx.db.insert(protocolItems).values({
        protocolId: input.protocolId,
        name: input.item.name,
        category: input.item.category as "supplement" | "medication" | "peptide" | "injection",
        dosage: input.item.dosage ?? null,
        unit: input.item.unit ?? null,
        form: input.item.form ?? null,
        route: input.item.route ?? null,
        frequency: input.item.frequency ?? null,
        timeOfDay: input.item.timeOfDay ?? null,
        injectionSites: input.item.injectionSites ?? null,
        rationale: input.item.rationale ?? null,
        coachNotes: input.item.coachNotes ?? null,
      }).returning();

      return created;
    }),

  /**
   * Update an existing protocol item.
   */
  updateItem: trainerProcedure
    .input(z.object({
      itemId: z.string(),
      updates: protocolItemInput.partial(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Find the item and its protocol
      const item = await ctx.db.query.protocolItems.findFirst({
        where: eq(protocolItems.id, input.itemId),
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Protocol item not found" });

      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: eq(supplementProtocols.id, item.protocolId),
      });
      if (!protocol) throw new TRPCError({ code: "NOT_FOUND", message: "Protocol not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, protocol.clientId, ctx.userRole);

      const [updated] = await ctx.db.update(protocolItems)
        .set({
          ...(input.updates.name !== undefined && { name: input.updates.name }),
          ...(input.updates.category !== undefined && { category: input.updates.category as "supplement" }),
          ...(input.updates.dosage !== undefined && { dosage: input.updates.dosage }),
          ...(input.updates.unit !== undefined && { unit: input.updates.unit }),
          ...(input.updates.form !== undefined && { form: input.updates.form }),
          ...(input.updates.route !== undefined && { route: input.updates.route }),
          ...(input.updates.frequency !== undefined && { frequency: input.updates.frequency }),
          ...(input.updates.timeOfDay !== undefined && { timeOfDay: input.updates.timeOfDay }),
          ...(input.updates.injectionSites !== undefined && { injectionSites: input.updates.injectionSites }),
          ...(input.updates.rationale !== undefined && { rationale: input.updates.rationale }),
          ...(input.updates.coachNotes !== undefined && { coachNotes: input.updates.coachNotes }),
        })
        .where(eq(protocolItems.id, input.itemId))
        .returning();

      return updated;
    }),

  /**
   * Remove an item from a protocol.
   */
  removeItem: trainerProcedure
    .input(z.object({ itemId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const item = await ctx.db.query.protocolItems.findFirst({
        where: eq(protocolItems.id, input.itemId),
      });
      if (!item) throw new TRPCError({ code: "NOT_FOUND", message: "Protocol item not found" });

      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: eq(supplementProtocols.id, item.protocolId),
      });
      if (!protocol) throw new TRPCError({ code: "NOT_FOUND", message: "Protocol not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, protocol.clientId, ctx.userRole);

      // Delete associated adherence logs first
      await ctx.db.delete(adherenceLogs)
        .where(eq(adherenceLogs.protocolItemId, input.itemId));

      await ctx.db.delete(protocolItems)
        .where(eq(protocolItems.id, input.itemId));

      return { success: true };
    }),

  /**
   * Update protocol status (activate, archive, propose).
   */
  updateStatus: trainerProcedure
    .input(z.object({
      protocolId: z.string(),
      status: z.enum(["active", "proposed", "archived"]),
    }))
    .mutation(async ({ ctx, input }) => {
      const protocol = await ctx.db.query.supplementProtocols.findFirst({
        where: eq(supplementProtocols.id, input.protocolId),
      });
      if (!protocol) throw new TRPCError({ code: "NOT_FOUND", message: "Protocol not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, protocol.clientId, ctx.userRole);

      // If activating, archive existing active protocol
      if (input.status === "active") {
        const existing = await ctx.db.query.supplementProtocols.findFirst({
          where: and(
            eq(supplementProtocols.clientId, protocol.clientId),
            eq(supplementProtocols.status, "active"),
          ),
        });
        if (existing && existing.id !== input.protocolId) {
          await ctx.db.update(supplementProtocols)
            .set({ status: "archived" })
            .where(eq(supplementProtocols.id, existing.id));
        }
      }

      const [updated] = await ctx.db.update(supplementProtocols)
        .set({ status: input.status })
        .where(eq(supplementProtocols.id, input.protocolId))
        .returning();

      return updated;
    }),
});
