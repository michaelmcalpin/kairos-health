/**
 * Coach Data Management Router
 *
 * Allows coaches to upload/manage clinical documents (DEXA, GI Map,
 * medical records), lab results, and other client health data.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  clinicalDocuments,
  trainerClientRelationships,
  labResults,
  biomarkerValues,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

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

// ─── Router ─────────────────────────────────────────────────
export const coachDataRouter = router({
  /**
   * List clinical documents for a client.
   */
  listClinicalDocs: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      docType: z.enum(["dexa_scan", "gut_biome", "medical_record"]).optional(),
    }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const conditions = [eq(clinicalDocuments.clientId, input.clientId)];
      if (input.docType) {
        conditions.push(eq(clinicalDocuments.docType, input.docType));
      }

      return ctx.db.query.clinicalDocuments.findMany({
        where: and(...conditions),
        orderBy: desc(clinicalDocuments.createdAt),
      });
    }),

  /**
   * Get a specific clinical document.
   */
  getClinicalDoc: trainerProcedure
    .input(z.object({ docId: z.string() }))
    .query(async ({ ctx, input }) => {
      const doc = await ctx.db.query.clinicalDocuments.findFirst({
        where: eq(clinicalDocuments.id, input.docId),
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, doc.clientId, ctx.userRole);
      return doc;
    }),

  /**
   * Create a clinical document record (after file upload via /api/upload).
   */
  createClinicalDoc: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      docType: z.enum(["dexa_scan", "gut_biome", "medical_record"]),
      title: z.string().min(1).max(255),
      sourceFileName: z.string().max(255).optional().nullable(),
      notes: z.string().optional().nullable(),
      reportDate: z.string().optional().nullable(), // ISO date string
      providerName: z.string().max(255).optional().nullable(),
      parsedData: z.record(z.string(), z.unknown()).optional().nullable(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const [doc] = await ctx.db.insert(clinicalDocuments).values({
        clientId: input.clientId,
        docType: input.docType,
        title: input.title,
        sourceFileName: input.sourceFileName ?? null,
        notes: input.notes ?? null,
        reportDate: input.reportDate ? new Date(input.reportDate) : null,
        providerName: input.providerName ?? null,
        parsedData: input.parsedData ?? null,
        status: "pending",
      }).returning();

      return doc;
    }),

  /**
   * Update a clinical document (edit metadata, add parsed data).
   */
  updateClinicalDoc: trainerProcedure
    .input(z.object({
      docId: z.string(),
      updates: z.object({
        title: z.string().min(1).max(255).optional(),
        notes: z.string().optional().nullable(),
        reportDate: z.string().optional().nullable(),
        providerName: z.string().max(255).optional().nullable(),
        parsedData: z.record(z.string(), z.unknown()).optional().nullable(),
        status: z.string().max(50).optional(),
      }),
    }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.query.clinicalDocuments.findFirst({
        where: eq(clinicalDocuments.id, input.docId),
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, doc.clientId, ctx.userRole);

      const [updated] = await ctx.db.update(clinicalDocuments)
        .set({
          ...(input.updates.title !== undefined && { title: input.updates.title }),
          ...(input.updates.notes !== undefined && { notes: input.updates.notes }),
          ...(input.updates.reportDate !== undefined && { reportDate: input.updates.reportDate ? new Date(input.updates.reportDate) : null }),
          ...(input.updates.providerName !== undefined && { providerName: input.updates.providerName }),
          ...(input.updates.parsedData !== undefined && { parsedData: input.updates.parsedData }),
          ...(input.updates.status !== undefined && { status: input.updates.status }),
          updatedAt: new Date(),
        })
        .where(eq(clinicalDocuments.id, input.docId))
        .returning();

      return updated;
    }),

  /**
   * Delete a clinical document.
   */
  deleteClinicalDoc: trainerProcedure
    .input(z.object({ docId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db.query.clinicalDocuments.findFirst({
        where: eq(clinicalDocuments.id, input.docId),
      });
      if (!doc) throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });

      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, doc.clientId, ctx.userRole);

      await ctx.db.delete(clinicalDocuments)
        .where(eq(clinicalDocuments.id, input.docId));

      return { success: true };
    }),

  /**
   * Create a lab result entry for a client.
   */
  createLabResult: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      receivedAt: z.string(), // ISO date
      status: z.string().optional().default("reviewed"),
      biomarkers: z.array(z.object({
        code: z.string().min(1).max(50),
        value: z.number(),
        unit: z.string().max(50).optional().nullable(),
        refLow: z.number().optional().nullable(),
        refHigh: z.number().optional().nullable(),
        status: z.string().max(20).optional().nullable(), // normal, low, high, critical
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      // Create lab result
      const [lab] = await ctx.db.insert(labResults).values({
        clientId: input.clientId,
        receivedAt: new Date(input.receivedAt),
      }).returning();

      // Create biomarker values
      if (input.biomarkers.length > 0) {
        await ctx.db.insert(biomarkerValues).values(
          input.biomarkers.map((b) => ({
            resultId: lab.id,
            biomarkerCode: b.code,
            value: b.value,
            unit: b.unit ?? null,
            refLow: b.refLow ?? null,
            refHigh: b.refHigh ?? null,
            status: b.status ?? null,
          }))
        );
      }

      return { id: lab.id, biomarkerCount: input.biomarkers.length };
    }),

  /**
   * List lab results for a client.
   */
  listLabResults: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);

      const labs = await ctx.db.query.labResults.findMany({
        where: eq(labResults.clientId, input.clientId),
        orderBy: desc(labResults.receivedAt),
      });

      // Fetch biomarkers for all labs
      const results = [];
      for (const lab of labs) {
        const markers = await ctx.db.query.biomarkerValues.findMany({
          where: eq(biomarkerValues.resultId, lab.id),
        });
        results.push({
          ...lab,
          receivedAt: lab.receivedAt?.toISOString() ?? new Date().toISOString(),
          biomarkers: markers.map((b) => ({
            id: b.id,
            code: b.biomarkerCode,
            value: b.value,
            unit: b.unit,
            refLow: b.refLow,
            refHigh: b.refHigh,
            status: b.status,
          })),
        });
      }

      return results;
    }),
});
