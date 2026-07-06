import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { labOrders, labResults, biomarkerValues } from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientLabsRouter = router({
  // List lab orders for the client
  listOrders: clientProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const orders = await ctx.db.query.labOrders.findMany({
        where: eq(labOrders.clientId, ctx.dbUserId),
        orderBy: desc(labOrders.orderedAt),
        limit: input.limit,
      });

      // Fetch test dates from labResults for each order
      const orderIds = orders.map((o) => o.id);
      const results = orderIds.length > 0
        ? await ctx.db.query.labResults.findMany({
            where: sql`${labResults.orderId} IN (${sql.join(orderIds.map(id => sql`${id}`), sql`, `)})`,
          })
        : [];
      const resultByOrder = new Map(results.map((r) => [r.orderId, r]));

      return orders.map((o) => {
        const result = resultByOrder.get(o.id);
        return {
          id: o.id,
          provider: o.provider,
          panelName: o.panelName,
          status: o.status,
          orderedAt: o.orderedAt,
          testDate: result?.receivedAt ?? o.orderedAt, // actual test date from results
        };
      });
    }),

  // Get results for a specific lab order
  getResults: clientProcedure
    .input(z.object({ orderId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      // Verify the order belongs to this client
      const order = await ctx.db.query.labOrders.findFirst({
        where: and(
          eq(labOrders.id, input.orderId),
          eq(labOrders.clientId, ctx.dbUserId)
        ),
      });

      if (!order) return null;

      // Get lab result record
      const result = await ctx.db.query.labResults.findFirst({
        where: eq(labResults.orderId, input.orderId),
      });

      if (!result) return { order, result: null, biomarkers: [] };

      // Get biomarker values
      const values = await safeQ(() => ctx.db.query.biomarkerValues.findMany({
        where: eq(biomarkerValues.resultId, result.id),
      }), []);

      return {
        order,
        result: {
          id: result.id,
          receivedAt: result.receivedAt,
          pdfUrl: result.pdfUrl,
          ocrStatus: result.ocrStatus,
        },
        biomarkers: values.map((v) => ({
          id: v.id,
          biomarkerCode: v.biomarkerCode,
          value: v.value,
          unit: v.unit,
          refLow: v.refLow,
          refHigh: v.refHigh,
          status: v.status,
        })),
      };
    }),

  // Get latest biomarker values across all markers (most recent for each code)
  listBiomarkers: clientProcedure.query(async ({ ctx }) => {
    // Get all unique biomarker codes with latest values for this client
    const results = await safeQ(() => ctx.db
      .select({
        biomarkerCode: biomarkerValues.biomarkerCode,
        value: biomarkerValues.value,
        unit: biomarkerValues.unit,
        refLow: biomarkerValues.refLow,
        refHigh: biomarkerValues.refHigh,
        status: biomarkerValues.status,
        receivedAt: labResults.receivedAt,
      })
      .from(biomarkerValues)
      .innerJoin(labResults, eq(biomarkerValues.resultId, labResults.id))
      .where(eq(labResults.clientId, ctx.dbUserId))
      .orderBy(desc(labResults.receivedAt)), []);

    // Deduplicate: keep only the latest value per biomarker code
    const latestByCode = new Map<string, (typeof results)[0]>();
    for (const row of results) {
      if (!latestByCode.has(row.biomarkerCode)) {
        latestByCode.set(row.biomarkerCode, row);
      }
    }

    // Enrich with biomarker definitions
    const definitions = await ctx.db.query.biomarkerDefinitions.findMany();
    const defMap = new Map(definitions.map((d) => [d.code, d]));

    return Array.from(latestByCode.values()).map((v) => {
      const def = defMap.get(v.biomarkerCode);
      return {
        code: v.biomarkerCode,
        name: def?.name ?? v.biomarkerCode,
        category: def?.category ?? "unknown",
        value: v.value,
        unit: v.unit ?? def?.unit,
        refLow: v.refLow ?? def?.defaultRefLow,
        refHigh: v.refHigh ?? def?.defaultRefHigh,
        status: v.status,
        lastMeasured: v.receivedAt,
      };
    });
  }),

  // Get full history for a single biomarker (for trending)
  getBiomarkerHistory: clientProcedure
    .input(z.object({ code: z.string() }))
    .query(async ({ ctx, input }) => {
      const rows = await safeQ(() => ctx.db
        .select({
          value: biomarkerValues.value,
          unit: biomarkerValues.unit,
          refLow: biomarkerValues.refLow,
          refHigh: biomarkerValues.refHigh,
          status: biomarkerValues.status,
          receivedAt: labResults.receivedAt,
        })
        .from(biomarkerValues)
        .innerJoin(labResults, eq(biomarkerValues.resultId, labResults.id))
        .where(and(eq(labResults.clientId, ctx.dbUserId), eq(biomarkerValues.biomarkerCode, input.code)))
        .orderBy(labResults.receivedAt), []);

      return rows.map((r) => ({
        value: r.value,
        unit: r.unit,
        refLow: r.refLow,
        refHigh: r.refHigh,
        status: r.status,
        date: r.receivedAt?.toISOString() ?? new Date().toISOString(),
      }));
    }),

  // Get history for ALL biomarkers (for "all trended" view)
  getAllBiomarkerHistory: clientProcedure.query(async ({ ctx }) => {
    const rows = await safeQ(() => ctx.db
      .select({
        code: biomarkerValues.biomarkerCode,
        value: biomarkerValues.value,
        unit: biomarkerValues.unit,
        refLow: biomarkerValues.refLow,
        refHigh: biomarkerValues.refHigh,
        status: biomarkerValues.status,
        receivedAt: labResults.receivedAt,
      })
      .from(biomarkerValues)
      .innerJoin(labResults, eq(biomarkerValues.resultId, labResults.id))
      .where(eq(labResults.clientId, ctx.dbUserId))
      .orderBy(labResults.receivedAt), []);

    // Group by biomarker code
    const grouped: Record<string, Array<{ value: number; date: string; refLow: number | null; refHigh: number | null }>> = {};
    for (const r of rows) {
      if (!grouped[r.code]) grouped[r.code] = [];
      grouped[r.code].push({
        value: r.value,
        date: r.receivedAt?.toISOString() ?? new Date().toISOString(),
        refLow: r.refLow,
        refHigh: r.refHigh,
      });
    }

    // Only return biomarkers with 2+ data points (trendable)
    const definitions = await ctx.db.query.biomarkerDefinitions.findMany();
    const defMap = new Map(definitions.map((d) => [d.code, d]));

    return Object.entries(grouped)
      .filter(([, points]) => points.length >= 2)
      .map(([code, points]) => ({
        code,
        name: defMap.get(code)?.name ?? code,
        category: defMap.get(code)?.category ?? "unknown",
        unit: defMap.get(code)?.unit ?? points[0]?.refLow != null ? "" : "",
        points,
      }));
  }),

  // Get total count of orders and results
  summary: clientProcedure.query(async ({ ctx }) => {
    const orderCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(labOrders)
      .where(eq(labOrders.clientId, ctx.dbUserId));

    const resultCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(labResults)
      .where(eq(labResults.clientId, ctx.dbUserId));

    return {
      totalOrders: Number(orderCount[0]?.count ?? 0),
      totalResults: Number(resultCount[0]?.count ?? 0),
    };
  }),

  // Upload a PDF and create lab order + result
  uploadPdf: clientProcedure
    .input(
      z.object({
        panelName: z.string(),
        provider: z.string().optional(),
        pdfUrl: z.string().url(),
        receivedDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderId = crypto.randomUUID();
      const resultId = crypto.randomUUID();
      const now = new Date();
      const receivedAt = input.receivedDate
        ? new Date(input.receivedDate)
        : now;

      // Create lab order
      await ctx.db.insert(labOrders).values({
        id: orderId,
        clientId: ctx.dbUserId,
        panelName: input.panelName,
        provider: input.provider,
        status: "results_received",
        orderedAt: now,
      });

      // Create lab result
      await ctx.db.insert(labResults).values({
        id: resultId,
        orderId: orderId,
        clientId: ctx.dbUserId,
        receivedAt: receivedAt,
        pdfUrl: input.pdfUrl,
        ocrStatus: "pending",
      });

      return {
        order: {
          id: orderId,
          panelName: input.panelName,
          provider: input.provider,
          status: "results_received",
          orderedAt: now,
        },
        result: {
          id: resultId,
          orderId: orderId,
          receivedAt: receivedAt,
          pdfUrl: input.pdfUrl,
          ocrStatus: "pending",
        },
      };
    }),

  // Import results from a URL source
  importUrl: clientProcedure
    .input(
      z.object({
        panelName: z.string(),
        provider: z.string().optional(),
        sourceUrl: z.string().url(),
        receivedDate: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderId = crypto.randomUUID();
      const resultId = crypto.randomUUID();
      const now = new Date();
      const receivedAt = input.receivedDate
        ? new Date(input.receivedDate)
        : now;

      // Create lab order
      await ctx.db.insert(labOrders).values({
        id: orderId,
        clientId: ctx.dbUserId,
        panelName: input.panelName,
        provider: input.provider,
        status: "results_received",
        orderedAt: now,
      });

      // Create lab result
      await ctx.db.insert(labResults).values({
        id: resultId,
        orderId: orderId,
        clientId: ctx.dbUserId,
        receivedAt: receivedAt,
        pdfUrl: input.sourceUrl,
        ocrStatus: "url_imported",
      });

      return {
        order: {
          id: orderId,
          panelName: input.panelName,
          provider: input.provider,
          status: "results_received",
          orderedAt: now,
        },
        result: {
          id: resultId,
          orderId: orderId,
          receivedAt: receivedAt,
          pdfUrl: input.sourceUrl,
          ocrStatus: "url_imported",
        },
      };
    }),

  // Add manually entered results with biomarker values
  addManualResults: clientProcedure
    .input(
      z.object({
        panelName: z.string(),
        provider: z.string().optional(),
        receivedDate: z.string().optional(),
        biomarkers: z.array(
          z.object({
            code: z.string(),
            name: z.string(),
            value: z.number(),
            unit: z.string().optional(),
            refLow: z.number().optional(),
            refHigh: z.number().optional(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const orderId = crypto.randomUUID();
      const resultId = crypto.randomUUID();
      const now = new Date();
      const receivedAt = input.receivedDate
        ? new Date(input.receivedDate)
        : now;

      // Create lab order
      await ctx.db.insert(labOrders).values({
        id: orderId,
        clientId: ctx.dbUserId,
        panelName: input.panelName,
        provider: input.provider,
        status: "results_received",
        orderedAt: now,
      });

      // Create lab result
      await ctx.db.insert(labResults).values({
        id: resultId,
        orderId: orderId,
        clientId: ctx.dbUserId,
        receivedAt: receivedAt,
        pdfUrl: null,
        ocrStatus: "manual",
      });

      // Insert biomarker values
      const biomarkerRows = input.biomarkers.map((bm) => {
        let status = "normal";
        if (bm.refLow !== undefined && bm.value < bm.refLow) {
          status = "low";
        } else if (bm.refHigh !== undefined && bm.value > bm.refHigh) {
          status = "high";
        }

        return {
          id: crypto.randomUUID(),
          resultId: resultId,
          biomarkerCode: bm.code,
          value: bm.value,
          unit: bm.unit,
          refLow: bm.refLow,
          refHigh: bm.refHigh,
          status: status,
        };
      });

      if (biomarkerRows.length > 0) {
        await ctx.db.insert(biomarkerValues).values(biomarkerRows);
      }

      return {
        order: {
          id: orderId,
          panelName: input.panelName,
          provider: input.provider,
          status: "results_received",
          orderedAt: now,
        },
        result: {
          id: resultId,
          orderId: orderId,
          receivedAt: receivedAt,
          pdfUrl: null,
          ocrStatus: "manual",
        },
        biomarkerCount: input.biomarkers.length,
      };
    }),
});
