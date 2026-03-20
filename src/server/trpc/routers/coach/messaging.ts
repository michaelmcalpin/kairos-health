import { z } from "zod";
import { router, trainerProcedure as coachProcedure } from "@/server/trpc";
import {
  getOrCreateConversation,
  listConversations,
  getConversationForUser,
  sendMessage,
  getMessages,
  markAsRead,
  getUnreadCount,
  setTyping,
  clearTyping,
  getTypingUsers,
  searchMessages,
  getMessagingStats,
} from "@/lib/messaging/engine";

export const coachMessagingRouter = router({
  // List all conversations for the coach
  listConversations: coachProcedure
    .input(
      z.object({
        filter: z.enum(["all", "unread", "ai_coach", "human_coach"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filter = input?.filter ?? "all";
      return listConversations(ctx.dbUserId, "coach", filter);
    }),

  // Get a specific conversation
  getConversation: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getConversationForUser(input.conversationId, ctx.dbUserId);
    }),

  // Start conversation with a client
  startConversation: coachProcedure
    .input(
      z.object({
        clientId: z.string(),
        clientName: z.string(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, verify coach-client relationship exists
      return getOrCreateConversation(
        input.clientId,
        input.clientName,
        ctx.dbUserId,
        "Coach", // In production, fetch from profile
        false,
      );
    }),

  // Get messages for a conversation
  getMessages: coachProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(100).optional().default(50),
        before: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      const conv = getConversationForUser(input.conversationId, ctx.dbUserId);
      if (!conv || conv.coachId !== ctx.dbUserId) {
        throw new Error("Conversation not found");
      }
      return getMessages(input.conversationId, input.limit, input.before);
    }),

  // Send a message
  sendMessage: coachProcedure
    .input(
      z.object({
        conversationId: z.string(),
        body: z.string().min(1).max(5000),
        replyTo: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conv = getConversationForUser(input.conversationId, ctx.dbUserId);
      if (!conv || conv.coachId !== ctx.dbUserId) {
        throw new Error("Conversation not found");
      }
      return sendMessage(
        input.conversationId,
        ctx.dbUserId,
        "Coach",
        "coach",
        input.body,
        false,
        input.replyTo ?? null,
      );
    }),

  // Mark messages as read
  markAsRead: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return markAsRead(input.conversationId, ctx.dbUserId);
    }),

  // Get total unread count
  getUnreadCount: coachProcedure
    .query(async ({ ctx }) => {
      return { count: getUnreadCount(ctx.dbUserId, "coach") };
    }),

  // Typing indicators
  setTyping: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return setTyping(ctx.dbUserId, "Coach", input.conversationId);
    }),

  clearTyping: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      clearTyping(ctx.dbUserId, input.conversationId);
      return { success: true };
    }),

  getTypingUsers: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getTypingUsers(input.conversationId, ctx.dbUserId);
    }),

  // Search across all conversations
  search: coachProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      return searchMessages(ctx.dbUserId, "coach", input.query);
    }),

  // Messaging stats
  getStats: coachProcedure
    .query(async ({ ctx }) => {
      return getMessagingStats(ctx.dbUserId, "coach");
    }),
});
