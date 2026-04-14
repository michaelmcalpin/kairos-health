import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, clientProcedure } from "@/server/trpc";
import { conversations, messages, users } from "@/server/db/schema";
import { eq, and, desc, sql, isNull, ilike, or } from "drizzle-orm";

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
      const conditions = [eq(conversations.clientId, ctx.dbUserId)];

      if (filter === "unread") {
        conditions.push(sql`${conversations.unreadCountClient} > 0`);
      } else if (filter === "ai_coach") {
        conditions.push(eq(conversations.isAiTrainer, true));
      } else if (filter === "human_coach") {
        conditions.push(eq(conversations.isAiTrainer, false));
      }

      const convs = await ctx.db.query.conversations.findMany({
        where: and(...conditions),
        orderBy: desc(conversations.lastMessageAt),
      });

      // Get client name
      const clientUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.dbUserId),
      });
      const clientName = clientUser
        ? `${clientUser.firstName ?? ""} ${clientUser.lastName ?? ""}`.trim() || clientUser.email
        : "Client";

      // Enrich with coach names
      const enriched = await Promise.all(
        convs.map(async (c) => {
          let coachName = "AI Coach";
          if (c.trainerId) {
            const coach = await ctx.db.query.users.findFirst({
              where: eq(users.id, c.trainerId),
            });
            if (coach) coachName = `${coach.firstName ?? ""} ${coach.lastName ?? ""}`.trim() || coach.email;
          }

          // Get last message preview
          const lastMsg = await ctx.db.query.messages.findFirst({
            where: eq(messages.conversationId, c.id),
            orderBy: desc(messages.createdAt),
          });

          const lastMessage = lastMsg
            ? {
                body: lastMsg.body,
                senderName: lastMsg.senderRole === "client" ? clientName : coachName,
                senderRole: lastMsg.senderRole as "client" | "coach" | "ai_coach" | "system",
                createdAt: lastMsg.createdAt?.toISOString() ?? new Date().toISOString(),
              }
            : null;

          return {
            id: c.id,
            coachId: c.trainerId ?? null,
            clientId: c.clientId,
            coachName,
            clientName,
            isAiCoach: c.isAiTrainer ?? false,
            unreadCount: c.unreadCountClient ?? 0,
            lastMessage,
            createdAt: c.lastMessageAt?.toISOString() ?? new Date().toISOString(),
            updatedAt: c.lastMessageAt?.toISOString() ?? new Date().toISOString(),
          };
        })
      );

      return enriched;
    }),

  // Get a specific conversation
  getConversation: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conv = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.clientId, ctx.dbUserId),
        ),
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      return conv;
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
      // Check for existing conversation
      const existing = input.coachId
        ? await ctx.db.query.conversations.findFirst({
            where: and(
              eq(conversations.clientId, ctx.dbUserId),
              eq(conversations.trainerId, input.coachId),
            ),
          })
        : await ctx.db.query.conversations.findFirst({
            where: and(
              eq(conversations.clientId, ctx.dbUserId),
              eq(conversations.isAiTrainer, true),
            ),
          });

      if (existing) return existing;

      const [created] = await ctx.db
        .insert(conversations)
        .values({
          clientId: ctx.dbUserId,
          trainerId: input.coachId,
          isAiTrainer: input.isAiCoach,
          lastMessageAt: new Date(),
        })
        .returning();

      return created;
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
      // Verify conversation belongs to client
      const conv = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.clientId, ctx.dbUserId),
        ),
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

      const conditions = [eq(messages.conversationId, input.conversationId)];
      if (input.before) {
        conditions.push(sql`${messages.createdAt} < ${input.before}`);
      }

      const results = await ctx.db.query.messages.findMany({
        where: and(...conditions),
        orderBy: desc(messages.createdAt),
        limit: input.limit,
      });

      return results.reverse(); // oldest first
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
      // Verify conversation belongs to client
      const conv = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.clientId, ctx.dbUserId),
        ),
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

      const [msg] = await ctx.db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          senderId: ctx.dbUserId,
          senderRole: "client",
          isAiMessage: false,
          body: input.body,
          replyTo: input.replyTo,
        })
        .returning();

      // Update conversation timestamps and unread counts
      await ctx.db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          unreadCountTrainer: sql`${conversations.unreadCountTrainer} + 1`,
        })
        .where(eq(conversations.id, input.conversationId));

      return msg;
    }),

  // Mark messages as read
  markAsRead: clientProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(conversations)
        .set({ unreadCountClient: 0 })
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.clientId, ctx.dbUserId),
          )
        );

      // Mark individual messages as read
      await ctx.db
        .update(messages)
        .set({ readAt: new Date() })
        .where(
          and(
            eq(messages.conversationId, input.conversationId),
            isNull(messages.readAt),
            sql`${messages.senderId} != ${ctx.dbUserId}`,
          )
        );

      return { success: true };
    }),

  // Get total unread count across all conversations
  getUnreadCount: clientProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ total: sql<number>`coalesce(sum(${conversations.unreadCountClient}), 0)` })
      .from(conversations)
      .where(eq(conversations.clientId, ctx.dbUserId));

    return { count: Number(result[0]?.total ?? 0) };
  }),

  // Search messages across conversations
  search: clientProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const clientConvs = await ctx.db.query.conversations.findMany({
        where: eq(conversations.clientId, ctx.dbUserId),
      });
      const convIds = clientConvs.map((c) => c.id);

      if (convIds.length === 0) return [];

      const results = await ctx.db.query.messages.findMany({
        where: and(
          sql`${messages.conversationId} IN (${sql.join(convIds.map(id => sql`${id}`), sql`, `)})`,
          ilike(messages.body, `%${input.query}%`),
        ),
        orderBy: desc(messages.createdAt),
        limit: 20,
      });

      return results;
    }),

  // Get messaging stats
  getStats: clientProcedure.query(async ({ ctx }) => {
    const convCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.clientId, ctx.dbUserId));

    const msgCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.clientId, ctx.dbUserId));

    return {
      totalConversations: Number(convCount[0]?.count ?? 0),
      totalMessages: Number(msgCount[0]?.count ?? 0),
    };
  }),
});
