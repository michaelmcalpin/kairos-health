/**
 * EVERIST Coach Shared-Access Router
 *
 * Coach-side of client-controlled sharing:
 *  - list clients who granted me access (beyond my primary roster)
 *  - check my access levels for a specific client
 *  - coach-to-coach discussion threads about a shared client
 *
 * PRIVACY INVARIANT: coach threads are NEVER exposed through any
 * clientProcedure — clients cannot read coach-to-coach messages.
 * Every thread procedure verifies the calling coach has access to the
 * client (primary or granted) before returning anything.
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure } from "@/server/trpc";
import {
  users,
  clientCoachAccess,
  trainerClientRelationships,
  coachThreads,
  coachThreadMessages,
} from "@/server/db/schema";
import { eq, and, desc } from "drizzle-orm";
import { getCoachAccess, requireCoachAccess } from "@/lib/access/coach-access";

export const coachSharedAccessRouter = router({
  /**
   * Clients who granted ME access (excludes my primary roster, which
   * comes from coach.clients.list).
   */
  sharedWithMe: trainerProcedure.query(async ({ ctx }) => {
    const grants = await ctx.db.query.clientCoachAccess.findMany({
      where: and(
        eq(clientCoachAccess.coachId, ctx.dbUserId),
        eq(clientCoachAccess.status, "active"),
      ),
      orderBy: desc(clientCoachAccess.grantedAt),
    });

    return Promise.all(
      grants.map(async (g) => {
        const client = await ctx.db.query.users.findFirst({
          where: eq(users.id, g.clientId),
        });
        return {
          grantId: g.id,
          clientId: g.clientId,
          firstName: client?.firstName ?? null,
          lastName: client?.lastName ?? null,
          email: client?.email ?? null,
          avatarUrl: client?.avatarUrl ?? null,
          dietAccess: g.dietAccess,
          exerciseAccess: g.exerciseAccess,
          labsAccess: g.labsAccess,
          healthDataAccess: g.healthDataAccess,
          grantedAt: g.grantedAt,
        };
      }),
    );
  }),

  /**
   * My access levels for one client — used by the client detail page
   * to gate sections (diet / exercise / labs / health data).
   */
  myAccess: trainerProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getCoachAccess(ctx.db, ctx.dbUserId, input.clientId);
    }),

  /**
   * All coaches with access to a client (primary + granted) — the
   * potential participants in a coach-to-coach discussion.
   */
  coachesForClient: trainerProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      await requireCoachAccess(ctx.db, ctx.dbUserId, input.clientId);

      const results: Array<{
        coachId: string;
        firstName: string | null;
        lastName: string | null;
        email: string | null;
        avatarUrl: string | null;
        isPrimary: boolean;
      }> = [];

      const rel = await ctx.db.query.trainerClientRelationships.findFirst({
        where: and(
          eq(trainerClientRelationships.clientId, input.clientId),
          eq(trainerClientRelationships.status, "active"),
        ),
      });
      if (rel) {
        const coach = await ctx.db.query.users.findFirst({ where: eq(users.id, rel.trainerId) });
        if (coach) {
          results.push({
            coachId: coach.id,
            firstName: coach.firstName,
            lastName: coach.lastName,
            email: coach.email,
            avatarUrl: coach.avatarUrl,
            isPrimary: true,
          });
        }
      }

      const grants = await ctx.db.query.clientCoachAccess.findMany({
        where: and(
          eq(clientCoachAccess.clientId, input.clientId),
          eq(clientCoachAccess.status, "active"),
        ),
      });
      for (const g of grants) {
        if (results.some((r) => r.coachId === g.coachId)) continue;
        const coach = await ctx.db.query.users.findFirst({ where: eq(users.id, g.coachId) });
        if (coach) {
          results.push({
            coachId: coach.id,
            firstName: coach.firstName,
            lastName: coach.lastName,
            email: coach.email,
            avatarUrl: coach.avatarUrl,
            isPrimary: false,
          });
        }
      }

      return results;
    }),

  // ─── Coach-to-coach discussion threads ─────────────────────────────

  /**
   * Get (or create) the discussion thread for a client. Idempotent —
   * one thread per client.
   */
  getThread: trainerProcedure
    .input(z.object({ clientId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      await requireCoachAccess(ctx.db, ctx.dbUserId, input.clientId);

      const existing = await ctx.db.query.coachThreads.findFirst({
        where: eq(coachThreads.clientId, input.clientId),
      });
      if (existing) return existing;

      const [created] = await ctx.db
        .insert(coachThreads)
        .values({ clientId: input.clientId, createdBy: ctx.dbUserId })
        .returning();
      return created;
    }),

  /**
   * Messages in a client's coach thread (oldest first).
   */
  getThreadMessages: trainerProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        limit: z.number().min(1).max(200).default(100),
      }),
    )
    .query(async ({ ctx, input }) => {
      const thread = await ctx.db.query.coachThreads.findFirst({
        where: eq(coachThreads.id, input.threadId),
      });
      if (!thread) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      }
      // Access check against the thread's client
      await requireCoachAccess(ctx.db, ctx.dbUserId, thread.clientId);

      const msgs = await ctx.db.query.coachThreadMessages.findMany({
        where: eq(coachThreadMessages.threadId, input.threadId),
        orderBy: coachThreadMessages.createdAt,
        limit: input.limit,
      });

      // Attach sender names
      const senderIds = Array.from(new Set(msgs.map((m) => m.senderCoachId)));
      const senders = new Map<string, { firstName: string | null; lastName: string | null }>();
      for (const id of senderIds) {
        const u = await ctx.db.query.users.findFirst({ where: eq(users.id, id) });
        if (u) senders.set(id, { firstName: u.firstName, lastName: u.lastName });
      }

      return msgs.map((m) => ({
        id: m.id,
        threadId: m.threadId,
        senderCoachId: m.senderCoachId,
        senderName: senders.has(m.senderCoachId)
          ? `${senders.get(m.senderCoachId)!.firstName ?? ""} ${senders.get(m.senderCoachId)!.lastName ?? ""}`.trim()
          : "Coach",
        isMe: m.senderCoachId === ctx.dbUserId,
        body: m.body,
        createdAt: m.createdAt,
      }));
    }),

  /**
   * Post a message to a client's coach thread.
   */
  postThreadMessage: trainerProcedure
    .input(
      z.object({
        threadId: z.string().uuid(),
        body: z.string().min(1).max(5000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const thread = await ctx.db.query.coachThreads.findFirst({
        where: eq(coachThreads.id, input.threadId),
      });
      if (!thread) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Thread not found." });
      }
      await requireCoachAccess(ctx.db, ctx.dbUserId, thread.clientId);

      const [msg] = await ctx.db
        .insert(coachThreadMessages)
        .values({
          threadId: input.threadId,
          senderCoachId: ctx.dbUserId,
          body: input.body,
        })
        .returning();

      await ctx.db
        .update(coachThreads)
        .set({ lastMessageAt: new Date() })
        .where(eq(coachThreads.id, input.threadId));

      return msg;
    }),
});
