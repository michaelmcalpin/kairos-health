import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { vitalsReadings } from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";

// Only swallow "relation/table does not exist" errors (e.g. a table that has
// not been migrated yet); rethrow everything else so tRPC surfaces a real DB
// error and the UI can show its error state instead of a false "no data".
async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    const code = (err as { code?: string })?.code;
    const message = err instanceof Error ? err.message : String(err);
    if (code === "42P01" || message.includes("does not exist")) {
      return fallback;
    }
    throw err;
  }
}

// The four generic vitals persisted in `vitalsReadings`.
export const vitalTypeEnum = z.enum([
  "spo2",
  "respiratory_rate",
  "vo2max",
  "body_temp",
]);

export const clientVitalsRouter = router({
  // Recent readings for a given vital type (newest first)
  getRecent: clientProcedure
    .input(
      z.object({
        type: vitalTypeEnum,
        limit: z.number().int().min(1).max(500).optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      return await safeQ(
        () =>
          ctx.db.query.vitalsReadings.findMany({
            where: and(
              eq(vitalsReadings.clientId, ctx.dbUserId),
              eq(vitalsReadings.type, input.type)
            ),
            orderBy: desc(vitalsReadings.recordedAt),
            limit: input.limit ?? 100,
          }),
        []
      );
    }),

  // Single latest reading for a given vital type
  getLatest: clientProcedure
    .input(z.object({ type: vitalTypeEnum }))
    .query(async ({ ctx, input }) => {
      return await safeQ(
        () =>
          ctx.db.query.vitalsReadings.findFirst({
            where: and(
              eq(vitalsReadings.clientId, ctx.dbUserId),
              eq(vitalsReadings.type, input.type)
            ),
            orderBy: desc(vitalsReadings.recordedAt),
          }),
        undefined
      );
    }),

  // Log a manual reading
  log: clientProcedure
    .input(
      z.object({
        type: vitalTypeEnum,
        value: z.number(),
        unit: z.string().max(20).optional(),
        recordedAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const recordedAt = input.recordedAt ? new Date(input.recordedAt) : new Date();
      const [result] = await ctx.db
        .insert(vitalsReadings)
        .values({
          clientId: ctx.dbUserId,
          type: input.type,
          value: input.value,
          unit: input.unit,
          source: "manual",
          recordedAt: isNaN(recordedAt.getTime()) ? new Date() : recordedAt,
        })
        .returning();

      return result;
    }),
});
