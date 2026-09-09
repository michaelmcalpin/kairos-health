/**
 * Everist LifeScore™ — client-facing router.
 *
 * The client owns their LifeScore: they submit dimension ratings, write private
 * journal entries (tagged by AI into shareable themes), reflect on missed tasks,
 * and see their own score + history. Journal TEXT is theirs alone; coaches only
 * ever see scores, sentiment, and derived themes (see coach/clients.ts).
 */

import { z } from "zod";
import { and, desc, eq } from "drizzle-orm";

import { router, clientProcedure } from "@/server/trpc";
import {
  lifeScoreCheckins,
  lifeScoreJournalEntries,
  lifeScoreWeights,
  taskMissReasons,
  dailyChecklistCompletions,
  LIFE_DIMENSIONS,
} from "@/server/db/schema";
import { computeLifeScore } from "@/lib/lifescore/score";
import { selectPrompt } from "@/lib/lifescore/prompts";
import { tagJournalEntry, generateFollowUp } from "@/lib/lifescore/tag";
import { computeToday } from "./today";

const dimensionEnum = z.enum(["body", "mind", "purpose", "relationships", "work"]);
const today = () => new Date().toISOString().slice(0, 10);

export const clientLifeScoreRouter = router({
  // Composite score + per-dimension scores/sentiment for the client's own view.
  getScore: clientProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      return computeLifeScore(ctx.db, ctx.dbUserId, input?.date ?? today());
    }),

  // The curated (non-AI) daily prompt, chosen from today's ratings so far.
  getPrompt: clientProcedure
    .input(z.object({ date: z.string().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const date = input?.date ?? today();
      const rows = await ctx.db.select().from(lifeScoreCheckins).where(and(
        eq(lifeScoreCheckins.clientId, ctx.dbUserId),
        eq(lifeScoreCheckins.date, date),
      )).catch(() => []);
      const ratings: Partial<Record<(typeof LIFE_DIMENSIONS)[number], number>> = {};
      for (const r of rows) {
        if (r.rating != null) ratings[r.dimension as (typeof LIFE_DIMENSIONS)[number]] = r.rating;
      }
      let missedTasks = false;
      try {
        const t = await computeToday(ctx.db, ctx.dbUserId, date);
        missedTasks = t.progress.total > 0 && t.progress.done < t.progress.total;
      } catch { /* ignore */ }
      const prompt = selectPrompt({ ratings, missedTasks });
      return { text: prompt.text, dimension: prompt.dimension };
    }),

  // Upsert today's dimension ratings. Returns a tailored AI follow-up ONLY when
  // a clear signal exists (a dimension rated low, or tasks missed); otherwise
  // null and the curated prompt stands. Most days make no AI call.
  submitCheckin: clientProcedure
    .input(z.object({
      date: z.string().optional(),
      ratings: z.array(z.object({
        dimension: dimensionEnum,
        rating: z.number().int().min(1).max(5).nullable(),
        note: z.string().max(2000).optional(),
      })).min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? today();
      for (const r of input.ratings) {
        await ctx.db.insert(lifeScoreCheckins).values({
          clientId: ctx.dbUserId, date, dimension: r.dimension,
          rating: r.rating, note: r.note ?? null,
        }).onConflictDoUpdate({
          target: [lifeScoreCheckins.clientId, lifeScoreCheckins.date, lifeScoreCheckins.dimension],
          set: { rating: r.rating, note: r.note ?? null, updatedAt: new Date() },
        });
      }

      // Mark the day's "LifeScore check-in" to-do complete so it counts toward
      // the daily plan progress (same mechanism as other checklist items).
      // No unique constraint on the table, so check-then-insert like toggleComplete.
      try {
        const key = `lifescore:${date}`;
        const existing = await ctx.db.query.dailyChecklistCompletions.findFirst({
          where: and(
            eq(dailyChecklistCompletions.clientId, ctx.dbUserId),
            eq(dailyChecklistCompletions.date, date),
            eq(dailyChecklistCompletions.itemKey, key),
          ),
        });
        if (!existing) {
          await ctx.db.insert(dailyChecklistCompletions).values({
            clientId: ctx.dbUserId, date, itemKey: key,
          });
        }
      } catch { /* non-fatal: the check-in itself already saved */ }

      // Decide whether the data clearly warrants a tailored follow-up.
      const low = input.ratings
        .filter((r) => r.rating != null && r.rating <= 2)
        .sort((a, b) => (a.rating ?? 5) - (b.rating ?? 5))[0];
      let missedTasks = false;
      try {
        const t = await computeToday(ctx.db, ctx.dbUserId, date);
        missedTasks = t.progress.total > 0 && t.progress.done < t.progress.total;
      } catch { /* ignore */ }

      let followUp: string | null = null;
      if (low || missedTasks) {
        const bits: string[] = [];
        if (low) bits.push(`They rated ${low.dimension} low (${low.rating}/5) today.`);
        if (missedTasks) bits.push(`They missed one or more planned tasks today.`);
        followUp = await generateFollowUp(bits.join(" "));
      }
      return { ok: true, followUp };
    }),

  // Save a private journal entry; tag it into shareable themes (best-effort).
  saveJournal: clientProcedure
    .input(z.object({ date: z.string().optional(), text: z.string().min(1).max(8000) }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? today();
      const themes = await tagJournalEntry(input.text);
      const [row] = await ctx.db.insert(lifeScoreJournalEntries).values({
        clientId: ctx.dbUserId, date, text: input.text, themes,
      }).returning();
      return { id: row?.id, themes };
    }),

  // The client's own journal history (text + themes). Client-only.
  getJournalHistory: clientProcedure
    .input(z.object({ limit: z.number().int().min(1).max(60).optional().default(20) }).optional())
    .query(async ({ ctx, input }) => {
      const rows = await ctx.db.select().from(lifeScoreJournalEntries)
        .where(eq(lifeScoreJournalEntries.clientId, ctx.dbUserId))
        .orderBy(desc(lifeScoreJournalEntries.date), desc(lifeScoreJournalEntries.createdAt))
        .limit(input?.limit ?? 20).catch(() => []);
      return rows.map((r) => ({ id: r.id, date: r.date, text: r.text, themes: r.themes ?? [] }));
    }),

  // Log why a scheduled task was missed.
  logMissReason: clientProcedure
    .input(z.object({
      date: z.string().optional(),
      itemKey: z.string().max(160),
      reason: z.enum(["too_tired", "no_time", "forgot", "pain", "not_feeling_it", "other"]),
      note: z.string().max(1000).optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      const date = input.date ?? today();
      await ctx.db.insert(taskMissReasons).values({
        clientId: ctx.dbUserId, date, itemKey: input.itemKey,
        reason: input.reason, note: input.note ?? null,
      }).onConflictDoUpdate({
        target: [taskMissReasons.clientId, taskMissReasons.date, taskMissReasons.itemKey],
        set: { reason: input.reason, note: input.note ?? null },
      });
      return { ok: true };
    }),

  // The client can view how their LifeScore is weighted (coach-adjustable).
  getWeights: clientProcedure.query(async ({ ctx }) => {
    const [row] = await ctx.db.select().from(lifeScoreWeights)
      .where(eq(lifeScoreWeights.clientId, ctx.dbUserId)).catch(() => []);
    return {
      body: row?.body ?? 20, mind: row?.mind ?? 20, purpose: row?.purpose ?? 20,
      relationships: row?.relationships ?? 20, work: row?.work ?? 20,
    };
  }),
});
