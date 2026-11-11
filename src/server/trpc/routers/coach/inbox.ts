import { z } from "zod";
import { router, trainerProcedure } from "@/server/trpc";
import { loadInbox, setInboxState } from "@/server/services/coach-inbox";

/**
 * One Inbox for the coach (replaces Alerts, Follow-ups, Needs Attention and
 * Awaiting Your Reply). The page filters and counts the returned list with
 * src/lib/coach-inbox/model.ts, so header counts always equal the rows shown.
 */
export const coachInboxRouter = router({
  list: trainerProcedure
    .input(z.object({ includeResolved: z.boolean().default(false) }).optional())
    .query(async ({ ctx, input }) => {
      const items = await loadInbox(ctx.db, ctx.dbUserId, { includeResolved: input?.includeResolved ?? false });
      return { items };
    }),

  /** Open (not resolved) items, for the top-bar badge; same source as the page. */
  openCount: trainerProcedure.query(async ({ ctx }) => {
    const items = await loadInbox(ctx.db, ctx.dbUserId, { includeResolved: false });
    return { count: items.filter((i) => i.state !== "resolved").length };
  }),

  setState: trainerProcedure
    .input(z.object({
      key: z.string().min(1).max(200),
      state: z.enum(["new", "acknowledged", "resolved"]),
    }))
    .mutation(async ({ ctx, input }) => {
      await setInboxState(ctx.db, ctx.dbUserId, input.key, input.state);
      return { success: true };
    }),
});
