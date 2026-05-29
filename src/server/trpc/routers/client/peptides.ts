import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { peptideCycles, peptideLogs } from "@/server/db/schema";
import { eq, desc, and } from "drizzle-orm";

export const clientPeptidesRouter = router({
  // Get all cycles for the current user
  getCycles: clientProcedure
    .input(z.object({ status: z.enum(["planned", "active", "completed", "paused"]).optional() }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(peptideCycles.clientId, ctx.dbUserId)];
      if (input.status) conditions.push(eq(peptideCycles.status, input.status));

      return ctx.db.query.peptideCycles.findMany({
        where: and(...conditions),
        orderBy: desc(peptideCycles.startDate),
      });
    }),

  // Get a single cycle by ID
  getCycle: clientProcedure
    .input(z.object({ id: z.string() }))
    .query(async ({ ctx, input }) => {
      return ctx.db.query.peptideCycles.findFirst({
        where: and(
          eq(peptideCycles.id, input.id),
          eq(peptideCycles.clientId, ctx.dbUserId),
        ),
      });
    }),

  // Create a new peptide cycle
  createCycle: clientProcedure
    .input(z.object({
      name: z.string().min(1),
      peptideName: z.string().min(1),
      dosage: z.string().optional(),
      unit: z.string().optional(),
      frequency: z.string().optional(),
      route: z.string().optional(),
      injectionSites: z.array(z.string()).optional(),
      startDate: z.string(),
      endDate: z.string().optional(),
      durationWeeks: z.number().optional(),
      status: z.enum(["planned", "active"]).optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [cycle] = await ctx.db.insert(peptideCycles).values({
        clientId: ctx.dbUserId,
        name: input.name,
        peptideName: input.peptideName,
        dosage: input.dosage,
        unit: input.unit,
        frequency: input.frequency,
        route: input.route ?? "subcutaneous",
        injectionSites: input.injectionSites ?? [],
        startDate: input.startDate,
        endDate: input.endDate,
        durationWeeks: input.durationWeeks,
        status: input.status ?? "planned",
        notes: input.notes,
      }).returning();
      return cycle;
    }),

  // Update cycle status
  updateCycleStatus: clientProcedure
    .input(z.object({
      id: z.string(),
      status: z.enum(["planned", "active", "completed", "paused"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.update(peptideCycles)
        .set({ status: input.status, updatedAt: new Date() })
        .where(and(
          eq(peptideCycles.id, input.id),
          eq(peptideCycles.clientId, ctx.dbUserId),
        ));
    }),

  // Delete a cycle
  deleteCycle: clientProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(peptideCycles)
        .where(and(
          eq(peptideCycles.id, input.id),
          eq(peptideCycles.clientId, ctx.dbUserId),
        ));
    }),

  // Log a peptide dose
  logDose: clientProcedure
    .input(z.object({
      cycleId: z.string().optional(),
      peptideName: z.string(),
      dosage: z.string().optional(),
      unit: z.string().optional(),
      date: z.string(),
      time: z.string().optional(),
      injectionSite: z.string().optional(),
      notes: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const [log] = await ctx.db.insert(peptideLogs).values({
        clientId: ctx.dbUserId,
        cycleId: input.cycleId,
        peptideName: input.peptideName,
        dosage: input.dosage,
        unit: input.unit,
        date: input.date,
        time: input.time,
        injectionSite: input.injectionSite,
        notes: input.notes,
      }).returning();
      return log;
    }),

  // Get recent dose logs
  getRecentLogs: clientProcedure
    .input(z.object({
      cycleId: z.string().optional(),
      limit: z.number().optional().default(30),
    }))
    .query(async ({ ctx, input }) => {
      const conditions = [eq(peptideLogs.clientId, ctx.dbUserId)];
      if (input.cycleId) conditions.push(eq(peptideLogs.cycleId, input.cycleId));

      return ctx.db.query.peptideLogs.findMany({
        where: and(...conditions),
        orderBy: desc(peptideLogs.date),
        limit: input.limit,
      });
    }),

  // Delete a log entry
  deleteLog: clientProcedure
    .input(z.object({ id: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db.delete(peptideLogs)
        .where(and(
          eq(peptideLogs.id, input.id),
          eq(peptideLogs.clientId, ctx.dbUserId),
        ));
    }),
});
