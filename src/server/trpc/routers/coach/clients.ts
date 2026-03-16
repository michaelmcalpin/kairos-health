import { z } from "zod";
import { router, coachProcedure } from "@/server/trpc";
import {
  seedCoachClients,
  listCoachClients,
  getCoachClient,
  getRosterStats,
  filterCoachClients,
  resolveAlert,
  addCoachNote,
  getCoachNotes,
  pinNote,
  deleteNote,
} from "@/lib/coach-clients/engine";

export const coachClientsRouter = router({
  // List all coach's clients with summary
  list: coachProcedure
    .input(
      z.object({
        search: z.string().optional(),
        tier: z.enum(["tier1", "tier2", "tier3", "all"]).optional(),
        status: z.enum(["stable", "attention", "critical", "all"]).optional(),
        sortBy: z.enum(["name", "healthScore", "alerts", "lastActive", "adherence"]).optional(),
        sortOrder: z.enum(["asc", "desc"]).optional(),
      }).optional()
    )
    .query(({ ctx, input }) => {
      const coachId = ctx.dbUserId;
      seedCoachClients(coachId);

      if (input) {
        return filterCoachClients(coachId, {
          search: input.search,
          tier: input.tier,
          status: input.status,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder,
        });
      }

      return listCoachClients(coachId);
    }),

  // Get detailed view of a single client
  getDetail: coachProcedure
    .input(z.object({ clientId: z.string() }))
    .query(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return getCoachClient(input.clientId);
    }),

  // Get roster stats
  getStats: coachProcedure.query(({ ctx }) => {
    return getRosterStats(ctx.dbUserId);
  }),

  // Resolve an alert
  resolveAlert: coachProcedure
    .input(z.object({ clientId: z.string(), alertId: z.string() }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return resolveAlert(input.clientId, input.alertId);
    }),

  // Add a coach note
  addNote: coachProcedure
    .input(z.object({ clientId: z.string(), content: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return addCoachNote(input.clientId, ctx.dbUserId, input.content);
    }),

  // Get notes for a client
  getNotes: coachProcedure
    .input(z.object({ clientId: z.string() }))
    .query(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return getCoachNotes(input.clientId);
    }),

  // Pin/unpin a note
  pinNote: coachProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return pinNote(input.clientId, input.noteId);
    }),

  // Delete a note
  deleteNote: coachProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return deleteNote(input.clientId, input.noteId);
    }),
});
