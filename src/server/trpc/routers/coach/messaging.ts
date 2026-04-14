import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { router, trainerProcedure as coachProcedure } from "@/server/trpc";
import { conversations, messages, users } from "@/server/db/schema";
import { eq, and, desc, sql, isNull, ilike, inArray } from "drizzle-orm";

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
      const conditions = [eq(conversations.trainerId, ctx.dbUserId)];

      if (filter === "unread") {
        conditions.push(sql`${conversations.unreadCountTrainer} > 0`);
      }

      const convs = await ctx.db.query.conversations.findMany({
        where: and(...conditions),
        orderBy: desc(conversations.lastMessageAt),
      });

      // Get coach name
      const coachUser = await ctx.db.query.users.findFirst({
        where: eq(users.id, ctx.dbUserId),
      });
      const coachName = coachUser
        ? `${coachUser.firstName ?? ""} ${coachUser.lastName ?? ""}`.trim() || coachUser.email
        : "Coach";

      // Batch-load client users and last messages to avoid N+1
      const clientIds = Array.from(new Set(convs.map((c) => c.clientId)));
      const convIds = convs.map((c) => c.id);

      const [clientRows, allMessages] = await Promise.all([
        clientIds.length > 0
          ? ctx.db.query.users.findMany({ where: inArray(users.id, clientIds) })
          : Promise.resolve([]),
        convIds.length > 0
          ? ctx.db.query.messages.findMany({
              where: inArray(messages.conversationId, convIds),
              orderBy: desc(messages.createdAt),
            })
          : Promise.resolve([]),
      ]);

      const clientMap = new Map(clientRows.map((c) => [c.id, c]));
      // Pick first (most recent) message per conversation since results are ordered desc
      const lastMessageMap = new Map<string, typeof allMessages[number]>();
      for (const m of allMessages) {
        if (!lastMessageMap.has(m.conversationId)) {
          lastMessageMap.set(m.conversationId, m);
        }
      }

      const enriched = convs.map((c) => {
        const client = clientMap.get(c.clientId);
        const clientName = client
          ? `${client.firstName ?? ""} ${client.lastName ?? ""}`.trim() || client.email
          : "Client";

        const lastMsg = lastMessageMap.get(c.id);
        const lastMessage = lastMsg
          ? {
              body: lastMsg.body,
              senderName: lastMsg.senderRole === "coach" ? coachName : clientName,
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
          unreadCount: c.unreadCountTrainer ?? 0,
          lastMessage,
          createdAt: c.lastMessageAt?.toISOString() ?? new Date().toISOString(),
          updatedAt: c.lastMessageAt?.toISOString() ?? new Date().toISOString(),
        };
      });

      return enriched;
    }),

  // Get a specific conversation
  getConversation: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .query(async ({ ctx, input }) => {
      const conv = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.trainerId, ctx.dbUserId),
        ),
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });
      return conv;
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
      const existing = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.trainerId, ctx.dbUserId),
          eq(conversations.clientId, input.clientId),
        ),
      });

      if (existing) return existing;

      const [created] = await ctx.db
        .insert(conversations)
        .values({
          trainerId: ctx.dbUserId,
          clientId: input.clientId,
          isAiTrainer: false,
          lastMessageAt: new Date(),
        })
        .returning();

      return created;
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
      const conv = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.trainerId, ctx.dbUserId),
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

      return results.reverse();
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
      const conv = await ctx.db.query.conversations.findFirst({
        where: and(
          eq(conversations.id, input.conversationId),
          eq(conversations.trainerId, ctx.dbUserId),
        ),
      });
      if (!conv) throw new TRPCError({ code: "NOT_FOUND", message: "Conversation not found" });

      const [msg] = await ctx.db
        .insert(messages)
        .values({
          conversationId: input.conversationId,
          senderId: ctx.dbUserId,
          senderRole: "coach",
          isAiMessage: false,
          body: input.body,
          replyTo: input.replyTo,
        })
        .returning();

      // Update conversation
      await ctx.db
        .update(conversations)
        .set({
          lastMessageAt: new Date(),
          unreadCountClient: sql`${conversations.unreadCountClient} + 1`,
        })
        .where(eq(conversations.id, input.conversationId));

      return msg;
    }),

  // Mark messages as read
  markAsRead: coachProcedure
    .input(z.object({ conversationId: z.string() }))
    .mutation(async ({ ctx, input }) => {
      await ctx.db
        .update(conversations)
        .set({ unreadCountTrainer: 0 })
        .where(
          and(
            eq(conversations.id, input.conversationId),
            eq(conversations.trainerId, ctx.dbUserId),
          )
        );

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

  // Get total unread count
  getUnreadCount: coachProcedure.query(async ({ ctx }) => {
    const result = await ctx.db
      .select({ total: sql<number>`coalesce(sum(${conversations.unreadCountTrainer}), 0)` })
      .from(conversations)
      .where(eq(conversations.trainerId, ctx.dbUserId));

    return { count: Number(result[0]?.total ?? 0) };
  }),

  // Search across all conversations
  search: coachProcedure
    .input(z.object({ query: z.string().min(1).max(200) }))
    .query(async ({ ctx, input }) => {
      const coachConvs = await ctx.db.query.conversations.findMany({
        where: eq(conversations.trainerId, ctx.dbUserId),
      });
      const convIds = coachConvs.map((c) => c.id);

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

  // Messaging stats
  getStats: coachProcedure.query(async ({ ctx }) => {
    const convCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(conversations)
      .where(eq(conversations.trainerId, ctx.dbUserId));

    const msgCount = await ctx.db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .innerJoin(conversations, eq(messages.conversationId, conversations.id))
      .where(eq(conversations.trainerId, ctx.dbUserId));

    return {
      totalConversations: Number(convCount[0]?.count ?? 0),
      totalMessages: Number(msgCount[0]?.count ?? 0),
    };
  }),
});
