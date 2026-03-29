import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { bodyMeasurements, heartRateReadings } from "@/server/db/schema";
import { eq, desc, and, gte, lte } from "drizzle-orm";
import { dateRangeInput } from "@/server/trpc/shared";

export const clientMeasurementsRouter = router({
  // List body measurements within a date range
  list: clientProcedure
    .input(dateRangeInput)
    .query(async ({ ctx, input }) => {
      const results = await ctx.db.query.bodyMeasurements.findMany({
        where: and(
          eq(bodyMeasurements.clientId, ctx.dbUserId),
          gte(bodyMeasurements.date, input.startDate),
          lte(bodyMeasurements.date, input.endDate)
        ),
        orderBy: desc(bodyMeasurements.date),
      });

      return results.map((m) => ({
        id: m.id,
        date: m.date,
        weightLbs: m.weightLbs,
        bodyFatPct: m.bodyFatPct,
        waistInches: m.waistInches,
        chestInches: m.chestInches,
        hipsInches: m.hipsInches,
        rightBicepInches: m.rightBicepInches,
        rightThighInches: m.rightThighInches,
        source: m.source,
      }));
    }),

  // Get latest measurement
  latest: clientProcedure.query(async ({ ctx }) => {
    const result = await ctx.db.query.bodyMeasurements.findFirst({
      where: eq(bodyMeasurements.clientId, ctx.dbUserId),
      orderBy: desc(bodyMeasurements.date),
    });
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
        rightThighInches: z.number().min(10).max(50).optional(),
        source: z.string().default("manual"),
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
          rightThighInches: input.rightThighInches ?? null,
          source: input.source,
        })
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
        rightThighInches: z.number().min(10).max(50).optional(),
        source: z.string().default("manual"),
        systolicBP: z.number().min(60).max(250).optional(),
        diastolicBP: z.number().min(30).max(150).optional(),
        restingHR: z.number().min(30).max(220).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // TODO: Create blood pressure schema table to store systolicBP and diastolicBP
      // For now, these values are accepted but not persisted
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
          rightThighInches: input.rightThighInches ?? null,
          source: input.source,
        })
        .returning();

      let hrStored = false;

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

      return {
        measurement: measurementResult[0],
        vitals: {
          systolicBP: input.systolicBP ?? null,
          diastolicBP: input.diastolicBP ?? null,
          restingHR: input.restingHR ?? null,
        },
        hrStored,
      };
    }),
});
