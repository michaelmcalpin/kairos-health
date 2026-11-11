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
  labOrders,
  biomarkerValues,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { normalizeBiomarkers, statusFromRange } from "@/lib/labs/normalize";
import { initialReviewFields } from "@/lib/labs/review";
import { coachLabOverview } from "@/server/services/labs";
import { assertDocBelongsToClient, coachClientIds, auditDocUpload } from "@/server/services/doc-ownership";

// ─── PHI sanitization ───────────────────────────────────────
/**
 * Strip the raw storage URL out of a clinical document's parsedData. The file
 * is only reachable through the authorized /api/phi-file proxy; readers use the
 * returned `hasFile` flag plus the doc id to build a proxy link.
 */
function sanitizeClinicalDoc<
  T extends { parsedData: Record<string, unknown> | null },
>(doc: T): T & { hasFile: boolean } {
  const pd = doc.parsedData;
  const hasFile = !!(pd?.fileUrl ?? pd?.url);
  if (pd && (pd.fileUrl !== undefined || pd.url !== undefined)) {
    const { fileUrl: _fileUrl, url: _url, ...rest } = pd;
    return { ...doc, parsedData: rest, hasFile };
  }
  return { ...doc, hasFile };
}

// ─── Relationship guard ─────────────────────────────────────
async function verifyCoachClientRelationship(
  db: typeof import("@/server/db").db,
  coachId: string,
  clientId: string,
  userRole?: string,
) {
  if (userRole === "super_admin") return;
  // A coach is always allowed to view/edit their own record (dual-role).
  if (coachId === clientId) return;
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

      const docs = await ctx.db.query.clinicalDocuments.findMany({
        where: and(...conditions),
        orderBy: desc(clinicalDocuments.createdAt),
      });
      return docs.map(sanitizeClinicalDoc);
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
      return sanitizeClinicalDoc(doc);
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
      /** Uploader confirmed a file naming another person is intentional (e.g. demo data). */
      confirmOtherPerson: z.boolean().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      // Stop a file that names one of this coach's OTHER clients unless confirmed.
      const confirmedOtherPerson = await assertDocBelongsToClient(
        ctx.db, input.clientId, input, await coachClientIds(ctx.db, ctx.dbUserId), input.confirmOtherPerson === true,
      );

      const [doc] = await ctx.db.insert(clinicalDocuments).values({
        uploadedBy: ctx.dbUserId,
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

      await auditDocUpload(ctx.db, ctx.dbUserId, input.clientId, doc.id, {
        docType: input.docType, sourceFileName: input.sourceFileName, title: input.title, confirmedOtherPerson,
      });
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
      /** Add values to an existing result (e.g. a PDF the client uploaded) instead of creating one. */
      resultId: z.string().uuid().optional(),
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

      // Coach-entered values wait in "pending review" until the coach releases them.
      let lab: { id: string };
      if (input.resultId) {
        const existing = await ctx.db.query.labResults.findFirst({
          where: and(eq(labResults.id, input.resultId), eq(labResults.clientId, input.clientId)),
        });
        if (!existing) throw new TRPCError({ code: "NOT_FOUND", message: "Lab result not found for this client" });
        if (existing.releasedAt) throw new TRPCError({ code: "BAD_REQUEST", message: "This result is already released to the client" });
        lab = existing;
      } else {
        [lab] = await ctx.db.insert(labResults).values({
          clientId: input.clientId,
          receivedAt: new Date(input.receivedAt),
          ocrStatus: "coach_entered",
          ...initialReviewFields("coach"),
        }).returning();
      }

      // Create biomarker values
      if (input.biomarkers.length > 0) {
        await ctx.db.insert(biomarkerValues).values(
          normalizeBiomarkers(input.biomarkers).map((b) => ({
            resultId: lab.id,
            biomarkerCode: b.code,
            value: b.value,
            unit: b.unit,
            refLow: b.refLow,
            refHigh: b.refHigh,
            status: b.status,
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
        // Never expose the raw storage URL — route file access through the
        // authorized proxy instead.
        const { pdfUrl: _pdfUrl, ...labRest } = lab;
        results.push({
          ...labRest,
          pdfUrl: lab.pdfUrl ? `/api/phi-file?type=lab&id=${lab.id}` : null,
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

  /**
   * Labs tab: every panel (released or not) with review hints, grouped
   * marker trends, and how many panels still need review.
   */
  labOverview: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      return coachLabOverview(ctx.db, input.clientId);
    }),

  /**
   * Review a lab result: confirm/correct units and ranges, flag values,
   * add a note, and optionally release it to the client. Status is
   * recomputed from the (possibly corrected) range — never guessed.
   */
  reviewLabResult: trainerProcedure
    .input(z.object({
      clientId: z.string(),
      resultId: z.string().uuid(),
      note: z.string().max(2000).optional().nullable(),
      release: z.boolean().default(false),
      markers: z.array(z.object({
        id: z.string().uuid(),
        unit: z.string().max(50).optional().nullable(),
        refLow: z.number().optional().nullable(),
        refHigh: z.number().optional().nullable(),
        flagged: z.boolean().optional(),
      })).max(300).default([]),
    }))
    .mutation(async ({ ctx, input }) => {
      await verifyCoachClientRelationship(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const result = await ctx.db.query.labResults.findFirst({
        where: and(eq(labResults.id, input.resultId), eq(labResults.clientId, input.clientId)),
      });
      if (!result) throw new TRPCError({ code: "NOT_FOUND", message: "Lab result not found for this client" });

      const existing = await ctx.db.query.biomarkerValues.findMany({ where: eq(biomarkerValues.resultId, result.id) });
      const byId = new Map(existing.map((b) => [b.id, b]));
      if (input.release && existing.length === 0) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Add the values before releasing this result" });
      }

      for (const edit of input.markers) {
        const cur = byId.get(edit.id);
        if (!cur) continue; // not part of this result
        const unit = edit.unit !== undefined ? (edit.unit?.trim() || null) : cur.unit;
        const refLow = edit.refLow !== undefined ? edit.refLow : cur.refLow;
        const refHigh = edit.refHigh !== undefined ? edit.refHigh : cur.refHigh;
        const explicit = cur.status && cur.status !== "normal" ? cur.status : null;
        const status = statusFromRange(cur.value, refLow, refHigh) ?? explicit;
        await ctx.db.update(biomarkerValues)
          .set({ unit, refLow, refHigh, status, flagged: edit.flagged ?? cur.flagged })
          .where(eq(biomarkerValues.id, cur.id));
      }

      const now = new Date();
      const note = input.note === undefined ? result.coachNote : (input.note?.trim() || null);
      await ctx.db.update(labResults).set({
        reviewedAt: now,
        reviewedBy: ctx.dbUserId,
        coachNote: note,
        ...(input.release && !result.releasedAt ? { releasedAt: now } : {}),
      }).where(eq(labResults.id, result.id));

      // A released result is ready for the client: the order stops showing "reviewing".
      if (input.release && result.orderId) {
        await ctx.db.update(labOrders).set({ status: "results_received" }).where(eq(labOrders.id, result.orderId));
      }
      return { id: result.id, released: input.release || !!result.releasedAt };
    }),
});
