import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { labOrders, labResults, biomarkerValues } from "@/server/db/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export const clientLabsRouter = router({
  // List lab orders for the client
  listOrders: clientProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
      })
    )
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.labOrders.findMany({
        where: eq(labOrders.clientId, ctx.dbUserId),
        orderBy: desc(labOrders.orderedAt),
        limit: input.limit,
      });

      return results.map((o) => ({
        id: o.id,
        provider: o.provider,
        panelName: o.panelName,
        status: o.status,
        orderedAt: o.orderedAt,
      }));
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
      const values = await ctx.db.query.biomarkerValues.findMany({
        where: eq(biomarkerValues.resultId, result.id),
      });

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
    const results = await ctx.db
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
      .orderBy(desc(labResults.receivedAt));

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
});
