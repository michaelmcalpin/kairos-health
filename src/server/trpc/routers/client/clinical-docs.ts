import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import { clinicalDocuments } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

/**
 * Strip the raw storage URL out of a clinical document's parsedData. The file
 * is only reachable through the authorized /api/phi-file proxy; readers use the
 * returned `hasFile` flag plus the doc id to build a proxy link.
 */
function sanitizeDoc<
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

export const clientClinicalDocsRouter = router({
  // List ALL clinical documents for the user (document repository)
  listAll: clientProcedure
    .query(async ({ ctx }) => {
      const docs = await safeQ(
        () => ctx.db.query.clinicalDocuments.findMany({
          where: eq(clinicalDocuments.clientId, ctx.dbUserId),
          orderBy: desc(clinicalDocuments.createdAt),
        }),
        [],
      );
      return docs.map(sanitizeDoc);
    }),

  // List all clinical documents of a given type
  list: clientProcedure
    .input(
      z.object({
        docType: z.enum(["dexa_scan", "gut_biome", "medical_record"]),
      })
    )
    .query(async ({ ctx, input }) => {
      const docs = await safeQ(
        () => ctx.db.query.clinicalDocuments.findMany({
          where: and(
            eq(clinicalDocuments.clientId, ctx.dbUserId),
            eq(clinicalDocuments.docType, input.docType)
          ),
          orderBy: desc(clinicalDocuments.createdAt),
        }),
        [],
      );
      return docs.map(sanitizeDoc);
    }),

  // Get a single clinical document
  getById: clientProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const doc = await safeQ(
        () => ctx.db.query.clinicalDocuments.findFirst({
          where: and(
            eq(clinicalDocuments.id, input.id),
            eq(clinicalDocuments.clientId, ctx.dbUserId)
          ),
        }),
        undefined,
      );
      if (!doc) throw new TRPCError({ code: "NOT_FOUND" });
      return sanitizeDoc(doc);
    }),

  // Upload / create a new clinical document
  create: clientProcedure
    .input(
      z.object({
        docType: z.enum(["dexa_scan", "gut_biome", "medical_record"]),
        title: z.string().min(1).max(255),
        sourceFileName: z.string().optional(),
        parsedData: z.record(z.string(), z.unknown()).optional(),
        notes: z.string().optional(),
        reportDate: z.string().optional(),
        providerName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const doc = await ctx.db
        .insert(clinicalDocuments)
        .values({
          clientId: ctx.dbUserId,
          docType: input.docType,
          title: input.title,
          sourceFileName: input.sourceFileName,
          parsedData: input.parsedData,
          notes: input.notes,
          reportDate: input.reportDate ? new Date(input.reportDate) : undefined,
          providerName: input.providerName,
          status: input.parsedData ? "processed" : "pending",
        })
        .returning();

      return doc[0];
    }),

  // Update parsed data after processing
  update: clientProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        parsedData: z.record(z.string(), z.unknown()).optional(),
        notes: z.string().optional(),
        status: z.string().optional(),
        title: z.string().optional(),
        providerName: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.clinicalDocuments.findFirst({
        where: and(
          eq(clinicalDocuments.id, input.id),
          eq(clinicalDocuments.clientId, ctx.dbUserId)
        ),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      const updates: Record<string, unknown> = { updatedAt: new Date() };
      if (input.parsedData !== undefined) updates.parsedData = input.parsedData;
      if (input.notes !== undefined) updates.notes = input.notes;
      if (input.status !== undefined) updates.status = input.status;
      if (input.title !== undefined) updates.title = input.title;
      if (input.providerName !== undefined) updates.providerName = input.providerName;

      await ctx.db
        .update(clinicalDocuments)
        .set(updates)
        .where(eq(clinicalDocuments.id, input.id));

      return { success: true };
    }),

  // Delete a clinical document
  delete: clientProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.clinicalDocuments.findFirst({
        where: and(
          eq(clinicalDocuments.id, input.id),
          eq(clinicalDocuments.clientId, ctx.dbUserId)
        ),
      });
      if (!existing) throw new TRPCError({ code: "NOT_FOUND" });

      await ctx.db
        .delete(clinicalDocuments)
        .where(eq(clinicalDocuments.id, input.id));

      return { success: true };
    }),
});
