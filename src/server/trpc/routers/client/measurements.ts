import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { bodyMeasurements, heartRateReadings, bloodPressureReadings, hrvReadings, activitySummaries } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

async function safeQ<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch { return fallback; }
}

export const clientMeasurementsRouter = router({
  // List body measurements within a date range
  list: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await safeQ(() => ctx.db.query.bodyMeasurements.findMany({
        where: and(
          eq(bodyMeasurements.clientId, ctx.dbUserId),
          gte(bodyMeasurements.date, input.startDate),
          lte(bodyMeasurements.date, input.endDate)
        ),
        orderBy: desc(bodyMeasurements.date),
      }), []);

      return results.map((m) => ({
        id: m.id,
        date: m.date,
        weightLbs: m.weightLbs,
        bodyFatPct: m.bodyFatPct,
        waistInches: m.waistInches,
        chestInches: m.chestInches,
        hipsInches: m.hipsInches,
        rightBicepInches: m.rightBicepInches,
        leftBicepInches: m.leftBicepInches,
        rightThighInches: m.rightThighInches,
        leftThighInches: m.leftThighInches,
        rightCalfInches: m.rightCalfInches,
        leftCalfInches: m.leftCalfInches,
        neckInches: m.neckInches,
        shouldersInches: m.shouldersInches,
        source: m.source,
        notes: m.notes,
      }));
    }),

  // Get latest measurement
  latest: clientProcedure.query(async ({ ctx }) => {
    const result = await safeQ(() => ctx.db.query.bodyMeasurements.findFirst({
      where: eq(bodyMeasurements.clientId, ctx.dbUserId),
      orderBy: desc(bodyMeasurements.date),
    }), undefined);
    return result ?? null;
  }),

  // Log a new measurement
  create: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        weightLbs: z.number().min(50).max(700).optional(),
        bodyFatPct: z.number().min(1).max(60).optional(),
        waistInches: z.number().min(15).max(80).optional(),
        chestInches: z.number().min(20).max(80).optional(),
        hipsInches: z.number().min(20).max(80).optional(),
        rightBicepInches: z.number().min(5).max(30).optional(),
        leftBicepInches: z.number().min(5).max(30).optional(),
        rightThighInches: z.number().min(10).max(50).optional(),
        leftThighInches: z.number().min(10).max(50).optional(),
        rightCalfInches: z.number().min(5).max(30).optional(),
        leftCalfInches: z.number().min(5).max(30).optional(),
        neckInches: z.number().min(8).max(30).optional(),
        shouldersInches: z.number().min(30).max(70).optional(),
        source: z.string().max(50).default("manual"),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const result = await ctx.db
        .insert(bodyMeasurements)
        .values({
          clientId: ctx.dbUserId,
          date: input.date ?? new Date().toISOString().split("T")[0],
          weightLbs: input.weightLbs ?? null,
          bodyFatPct: input.bodyFatPct ?? null,
          waistInches: input.waistInches ?? null,
          chestInches: input.chestInches ?? null,
          hipsInches: input.hipsInches ?? null,
          rightBicepInches: input.rightBicepInches ?? null,
          leftBicepInches: input.leftBicepInches ?? null,
          rightThighInches: input.rightThighInches ?? null,
          leftThighInches: input.leftThighInches ?? null,
          rightCalfInches: input.rightCalfInches ?? null,
          leftCalfInches: input.leftCalfInches ?? null,
          neckInches: input.neckInches ?? null,
          shouldersInches: input.shouldersInches ?? null,
          source: input.source,
          notes: input.notes,
        })
        .returning();

      return result[0];
    }),

  // Update an existing measurement row (verifies ownership by clientId).
  // Only fields explicitly provided are written; undefined fields are left as-is.
  update: clientProcedure
    .input(
      z.object({
        measurementId: z.string().uuid(),
        weightLbs: z.number().min(50).max(700).optional(),
        bodyFatPct: z.number().min(1).max(60).optional(),
        waistInches: z.number().min(15).max(80).optional(),
        chestInches: z.number().min(20).max(80).optional(),
        hipsInches: z.number().min(20).max(80).optional(),
        rightBicepInches: z.number().min(5).max(30).optional(),
        leftBicepInches: z.number().min(5).max(30).optional(),
        rightThighInches: z.number().min(10).max(50).optional(),
        leftThighInches: z.number().min(10).max(50).optional(),
        rightCalfInches: z.number().min(5).max(30).optional(),
        leftCalfInches: z.number().min(5).max(30).optional(),
        neckInches: z.number().min(8).max(30).optional(),
        shouldersInches: z.number().min(30).max(70).optional(),
        notes: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { measurementId, ...fields } = input;

      // Build a set object from only the provided (defined) fields so we never
      // clobber existing values with nulls.
      const updateData: Partial<typeof bodyMeasurements.$inferInsert> = {};
      for (const [key, value] of Object.entries(fields)) {
        if (value !== undefined) {
          (updateData as Record<string, unknown>)[key] = value;
        }
      }

      // Nothing to update — return the existing row so the caller can refetch.
      if (Object.keys(updateData).length === 0) {
        return await safeQ(() => ctx.db.query.bodyMeasurements.findFirst({
          where: and(
            eq(bodyMeasurements.id, measurementId),
            eq(bodyMeasurements.clientId, ctx.dbUserId)
          ),
        }), undefined);
      }

      const result = await ctx.db
        .update(bodyMeasurements)
        .set(updateData)
        .where(
          and(
            eq(bodyMeasurements.id, measurementId),
            eq(bodyMeasurements.clientId, ctx.dbUserId)
          )
        )
        .returning();

      return result[0];
    }),

  // Log measurements with vital signs (BP and heart rate)
  createWithVitals: clientProcedure
    .input(
      z.object({
        date: z.string().optional(),
        weightLbs: z.number().min(50).max(700).optional(),
        bodyFatPct: z.number().min(1).max(60).optional(),
        waistInches: z.number().min(15).max(80).optional(),
        chestInches: z.number().min(20).max(80).optional(),
        hipsInches: z.number().min(20).max(80).optional(),
        rightBicepInches: z.number().min(5).max(30).optional(),
        leftBicepInches: z.number().min(5).max(30).optional(),
        rightThighInches: z.number().min(10).max(50).optional(),
        leftThighInches: z.number().min(10).max(50).optional(),
        rightCalfInches: z.number().min(5).max(30).optional(),
        leftCalfInches: z.number().min(5).max(30).optional(),
        neckInches: z.number().min(8).max(30).optional(),
        shouldersInches: z.number().min(30).max(70).optional(),
        source: z.string().max(50).default("manual"),
        notes: z.string().optional(),
        systolicBP: z.number().min(60).max(250).optional(),
        diastolicBP: z.number().min(30).max(150).optional(),
        restingHR: z.number().min(30).max(220).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const measurementDate =
        input.date ?? new Date().toISOString().split("T")[0];

      // Insert body measurements
      const measurementResult = await ctx.db
        .insert(bodyMeasurements)
        .values({
          clientId: ctx.dbUserId,
          date: measurementDate,
          weightLbs: input.weightLbs ?? null,
          bodyFatPct: input.bodyFatPct ?? null,
          waistInches: input.waistInches ?? null,
          chestInches: input.chestInches ?? null,
          hipsInches: input.hipsInches ?? null,
          rightBicepInches: input.rightBicepInches ?? null,
          leftBicepInches: input.leftBicepInches ?? null,
          rightThighInches: input.rightThighInches ?? null,
          leftThighInches: input.leftThighInches ?? null,
          rightCalfInches: input.rightCalfInches ?? null,
          leftCalfInches: input.leftCalfInches ?? null,
          neckInches: input.neckInches ?? null,
          shouldersInches: input.shouldersInches ?? null,
          source: input.source,
          notes: input.notes,
        })
        .returning();

      let hrStored = false;
      let bpStored = false;

      // Insert heart rate if provided
      if (input.restingHR !== undefined && input.restingHR !== null) {
        const timestamp = new Date(measurementDate + "T00:00:00Z");
        await ctx.db.insert(heartRateReadings).values({
          clientId: ctx.dbUserId,
          timestamp,
          bpm: input.restingHR,
          source: input.source,
          activityContext: "resting",
        });
        hrStored = true;
      }

      // Insert blood pressure if both systolic and diastolic provided
      if (input.systolicBP !== undefined && input.diastolicBP !== undefined) {
        await ctx.db.insert(bloodPressureReadings).values({
          clientId: ctx.dbUserId,
          date: measurementDate,
          systolic: input.systolicBP,
          diastolic: input.diastolicBP,
          source: input.source,
        });
        bpStored = true;
      }

      return {
        measurement: measurementResult[0],
        vitals: {
          systolicBP: input.systolicBP ?? null,
          diastolicBP: input.diastolicBP ?? null,
          restingHR: input.restingHR ?? null,
        },
        hrStored,
        bpStored,
      };
    }),

  // ── Manual heart-rate logging → heartRateReadings ──
  logHeartRate: clientProcedure
    .input(
      z.object({
        bpm: z.number().int().min(20).max(250),
        recordedAt: z.string().optional(),
        activityContext: z.string().max(20).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ts = input.recordedAt ? new Date(input.recordedAt) : new Date();
      const [result] = await ctx.db
        .insert(heartRateReadings)
        .values({
          clientId: ctx.dbUserId,
          timestamp: isNaN(ts.getTime()) ? new Date() : ts,
          bpm: input.bpm,
          source: "manual",
          activityContext: input.activityContext ?? null,
        })
        .returning();
      return result;
    }),

  // ── Manual HRV logging → hrvReadings (rmssd, ms) ──
  logHrv: clientProcedure
    .input(
      z.object({
        rmssd: z.number().min(1).max(500),
        recordedAt: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const ts = input.recordedAt ? new Date(input.recordedAt) : new Date();
      const [result] = await ctx.db
        .insert(hrvReadings)
        .values({
          clientId: ctx.dbUserId,
          timestamp: isNaN(ts.getTime()) ? new Date() : ts,
          rmssd: input.rmssd,
          source: "manual",
        })
        .returning();
      return result;
    }),

  // ── Manual steps logging → activitySummaries (upsert by clientId+date, manual source) ──
  logSteps: clientProcedure
    .input(
      z.object({
        steps: z.number().int().min(0).max(200000),
        date: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? new Date().toISOString().split("T")[0];

      // Upsert: update an existing manual row for this date, else insert one.
      const existing = await safeQ(
        () =>
          ctx.db.query.activitySummaries.findFirst({
            where: and(
              eq(activitySummaries.clientId, ctx.dbUserId),
              eq(activitySummaries.date, date),
              eq(activitySummaries.source, "manual")
            ),
          }),
        undefined
      );

      if (existing) {
        const [updated] = await ctx.db
          .update(activitySummaries)
          .set({ steps: input.steps })
          .where(eq(activitySummaries.id, existing.id))
          .returning();
        return updated;
      }

      const [inserted] = await ctx.db
        .insert(activitySummaries)
        .values({
          clientId: ctx.dbUserId,
          date,
          steps: input.steps,
          source: "manual",
        })
        .returning();
      return inserted;
    }),

  // ── Recent heart-rate readings (newest first) ──
  recentHeartRate: clientProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await safeQ(
        () =>
          ctx.db.query.heartRateReadings.findMany({
            where: eq(heartRateReadings.clientId, ctx.dbUserId),
            orderBy: desc(heartRateReadings.timestamp),
            limit: input?.limit ?? 50,
          }),
        []
      );
    }),

  // ── Recent HRV readings (newest first) ──
  recentHrv: clientProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await safeQ(
        () =>
          ctx.db.query.hrvReadings.findMany({
            where: eq(hrvReadings.clientId, ctx.dbUserId),
            orderBy: desc(hrvReadings.timestamp),
            limit: input?.limit ?? 50,
          }),
        []
      );
    }),

  // ── Recent activity summaries (newest first) ──
  recentActivity: clientProcedure
    .input(z.object({ limit: z.number().int().min(1).max(500).optional() }).optional())
    .query(async ({ ctx, input }) => {
      return await safeQ(
        () =>
          ctx.db.query.activitySummaries.findMany({
            where: eq(activitySummaries.clientId, ctx.dbUserId),
            orderBy: desc(activitySummaries.date),
            limit: input?.limit ?? 30,
          }),
        []
      );
    }),
});
