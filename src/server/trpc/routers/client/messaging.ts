import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
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

export const clientMessagingRouter = router({
  // List all conversations for the client
  listConversations: clientProcedure
    .input(
      z.object({
        filter: z.enum(["all", "unread", "ai_coach", "human_coach"]).optional().default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const filter = input?.filter ?? "all";
      return listConversations(ctx.dbUserId, "client", filter);
    }),

  // Get a specific conversation
  getConversation: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getConversationForUser(input.conversationId, ctx.dbUserId);
    }),

  // Start or get existing conversation with coach
  startConversation: clientProcedure
    .input(
      z.object({
        coachId: z.string().nullable(),
        coachName: z.string(),
        isAiCoach: z.boolean().optional().default(false),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // In production, verify coach-client relationship
      return getOrCreateConversation(
        ctx.dbUserId,
        "You", // Client's own name — in production, fetch from profile
        input.coachId,
        input.coachName,
        input.isAiCoach,
      );
    }),

  // Get messages for a conversation
  getMessages: clientProcedure
    .input(
      z.object({
        conversationId: z.string(),
        limit: z.number().min(1).max(100).optional().default(50),
        before: z.string().optional(),
      })
    )
    .query(async ({ ctx, input }) => {
      // Verify client is part of this conversation
      const conv = getConversationForUser(input.conversationId, ctx.dbUserId);
      if (!conv || conv.clientId !== ctx.dbUserId) {
        throw new Error("Conversation not found");
      }
      return getMessages(input.conversationId, input.limit, input.before);
    }),

  // Send a message
  sendMessage: clientProcedure
    .input(
      z.object({
        conversationId: z.string(),
        body: z.string().min(1).max(5000),
        replyTo: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const conv = getConversationForUser(input.conversationId, ctx.dbUserId);
      if (!conv || conv.clientId !== ctx.dbUserId) {
        throw new Error("Conversation not found");
      }
      return sendMessage(
        input.conversationId,
        ctx.dbUserId,
        "You",
        "client",
        input.body,
        false,
        input.replyTo ?? null,
      );
    }),

  // Mark messages as read
  markAsRead: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return markAsRead(input.conversationId, ctx.dbUserId);
    }),

  // Get total unread count across all conversations
  getUnreadCount: clientProcedure
    .query(async ({ ctx }) => {
      return { count: getUnreadCount(ctx.dbUserId, "client") };
    }),

  // Set typing indicator
  setTyping: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      return setTyping(ctx.dbUserId, "You", input.conversationId);
    }),

  // Clear typing indicator
  clearTyping: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      clearTyping(ctx.dbUserId, input.conversationId);
      return { success: true };
    }),

  // Get who is typing in a conversation
  getTypingUsers: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      return getTypingUsers(input.conversationId, ctx.dbUserId);
    }),

  // Search messages across conversations
  search: clientProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      return searchMessages(ctx.dbUserId, "client", input.query);
    }),

  // Get messaging stats
  getStats: clientProcedure
    .query(async ({ ctx }) => {
      return getMessagingStats(ctx.dbUserId, "client");
    }),
});
