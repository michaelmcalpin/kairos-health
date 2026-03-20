import { z } from "zod";
import { router, trainerProcedure } from "@/server/trpc";
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
  // List all trainer's clients with summary
  list: trainerProcedure
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
      const trainerId = ctx.dbUserId;
      seedCoachClients(trainerId);

      if (input) {
        return filterCoachClients(trainerId, {
          search: input.search,
          tier: input.tier,
          status: input.status,
          sortBy: input.sortBy,
          sortOrder: input.sortOrder,
        });
      }

      return listCoachClients(trainerId);
    }),

  // Get detailed view of a single client
  getDetail: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return getCoachClient(input.clientId);
    }),

  // Get roster stats
  getStats: trainerProcedure.query(({ ctx }) => {
    return getRosterStats(ctx.dbUserId);
  }),

  // Resolve an alert
  resolveAlert: trainerProcedure
    .input(z.object({ clientId: z.string(), alertId: z.string() }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return resolveAlert(input.clientId, input.alertId);
    }),

  // Add a trainer note
  addNote: trainerProcedure
    .input(z.object({ clientId: z.string(), content: z.string().min(1) }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return addCoachNote(input.clientId, ctx.dbUserId, input.content);
    }),

  // Get notes for a client
  getNotes: trainerProcedure
    .input(z.object({ clientId: z.string() }))
    .query(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return getCoachNotes(input.clientId);
    }),

  // Pin/unpin a note
  pinNote: trainerProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return pinNote(input.clientId, input.noteId);
    }),

  // Delete a note
  deleteNote: trainerProcedure
    .input(z.object({ clientId: z.string(), noteId: z.string() }))
    .mutation(({ ctx, input }) => {
      seedCoachClients(ctx.dbUserId);
      return deleteNote(input.clientId, input.noteId);
    }),
});
