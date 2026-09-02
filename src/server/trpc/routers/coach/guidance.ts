/**
 * Coach guidance router — the coach-authored inputs that drive a client's
 * mobile "today" home:
 *   - daily advice line (overrides the rule-based one)
 *   - tasks that appear in the client's daily checklist
 *
 * Access is gated by the shared coach-access model (primary coach or a granted
 * relationship).
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import { clientDailyAdvice, clientTasks } from "@/server/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { getCoachAccess, hasAnyWriteAccess } from "@/lib/access/coach-access";

type Database = typeof import("@/server/db").db;

/** Read gate: any access (primary, granted, self, or super_admin). */
async function assertRead(db: Database, coachId: string, clientId: string, role?: string) {
  const access = await getCoachAccess(db, coachId, clientId, role);
  if (!access.hasAnyAccess) {
    throw new TRPCError({ code: "FORBIDDEN", message: "No access to this client" });
  }
}

/** Write gate: advice/tasks are client-facing writes — require write access,
 *  not merely a read-only grant on some category. */
async function assertWrite(db: Database, coachId: string, clientId: string, role?: string) {
  const access = await getCoachAccess(db, coachId, clientId, role);
  if (!hasAnyWriteAccess(access)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You have read-only access to this client and can't change their tasks or advice.",
    });
  }
}

async function assertTaskOwner(db: Database, coachId: string, taskId: string, role?: string) {
  const task = await db.query.clientTasks.findFirst({ where: eq(clientTasks.id, taskId) });
  if (!task) throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
  await assertWrite(db, coachId, task.clientId, role);
  return task;
}

export const coachGuidanceRouter = router({
  getGuidance: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(async ({ ctx, input }) => {
      await assertRead(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const advice = await ctx.db.query.clientDailyAdvice.findFirst({
        where: eq(clientDailyAdvice.clientId, input.clientId),
        orderBy: desc(clientDailyAdvice.updatedAt),
      });
      const tasks = await ctx.db.query.clientTasks.findMany({
        where: eq(clientTasks.clientId, input.clientId),
        orderBy: desc(clientTasks.createdAt),
      });
      return {
        advice: advice ? { message: advice.message, date: advice.date } : null,
        tasks,
      };
    }),

  setAdvice: trainerProcedure
    .input(z.object({ clientId: z.string(), message: z.string(), date: z.string().nullish() }))
    .mutation(async ({ ctx, input }) => {
      await assertWrite(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const dateCond = input.date
        ? eq(clientDailyAdvice.date, input.date)
        : isNull(clientDailyAdvice.date);
      const existing = await ctx.db.query.clientDailyAdvice.findFirst({
        where: and(eq(clientDailyAdvice.clientId, input.clientId), dateCond),
      });
      const message = input.message.trim();
      // Empty message clears the advice.
      if (!message) {
        if (existing) await ctx.db.delete(clientDailyAdvice).where(eq(clientDailyAdvice.id, existing.id));
        return { ok: true, cleared: true };
      }
      if (existing) {
        await ctx.db
          .update(clientDailyAdvice)
          .set({ message, updatedAt: new Date() })
          .where(eq(clientDailyAdvice.id, existing.id));
      } else {
        await ctx.db.insert(clientDailyAdvice).values({
          clientId: input.clientId,
          coachId: ctx.dbUserId,
          date: input.date ?? null,
          message,
        });
      }
      return { ok: true };
    }),

  createTask: trainerProcedure
    .input(
      z.object({
        clientId: z.string(),
        title: z.string().min(1).max(255),
        notes: z.string().optional().nullable(),
        dueDate: z.string().nullish(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertWrite(ctx.db, ctx.dbUserId, input.clientId, ctx.userRole);
      const [task] = await ctx.db
        .insert(clientTasks)
        .values({
          clientId: input.clientId,
          coachId: ctx.dbUserId,
          title: input.title.trim(),
          notes: input.notes ?? null,
          dueDate: input.dueDate ?? null,
        })
        .returning();
      return task;
    }),

  updateTask: trainerProcedure
    .input(
      z.object({
        taskId: z.string(),
        title: z.string().min(1).max(255).optional(),
        notes: z.string().nullish(),
        dueDate: z.string().nullish(),
        completed: z.boolean().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      await assertTaskOwner(ctx.db, ctx.dbUserId, input.taskId, ctx.userRole);
      const set: Record<string, unknown> = {};
      if (input.title !== undefined) set.title = input.title.trim();
      if (input.notes !== undefined) set.notes = input.notes;
      if (input.dueDate !== undefined) set.dueDate = input.dueDate;
      if (input.completed !== undefined) {
        set.completed = input.completed;
        set.completedAt = input.completed ? new Date() : null;
      }
      await ctx.db.update(clientTasks).set(set).where(eq(clientTasks.id, input.taskId));
      return { ok: true };
    }),

  deleteTask: trainerProcedure
    .input(z.object({ taskId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await assertTaskOwner(ctx.db, ctx.dbUserId, input.taskId, ctx.userRole);
      await ctx.db.delete(clientTasks).where(eq(clientTasks.id, input.taskId));
      return { ok: true };
    }),
});
