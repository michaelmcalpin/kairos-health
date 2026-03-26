// ─── Messaging Engine ─────────────────────────────────────────────────
// Manages conversations, messages, read receipts, typing indicators,
// and conversation state. PostgreSQL via Drizzle for persistence;
// typing indicators remain in-memory (ephemeral by nature).

import type {
  Message,
  Conversation,
  MessagePreview,
  MessageRole,
  TypingIndicator,
  ReadReceipt,
  ConversationFilter,
} from "./types";
import { truncatePreview } from "./types";
import { db } from "@/server/db";
import { conversations, messages, users } from "@/server/db/schema";
import { eq, and, desc, lt, sql, ilike, or } from "drizzle-orm";

// ─── Typing Indicators (re-exported from typing.ts) ──────────────────
// Typing indicators are in a separate file so client components
// can import them without pulling in server-only DB deps.
export { setTyping, clearTyping, getTypingUsers } from "./typing";

// ─── Helpers ──────────────────────────────────────────────────────────

async function rowToMessage(row: {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderRole: string;
  isAiMessage: boolean | null;
  body: string;
  replyTo: string | null;
  readAt: Date | null;
  createdAt: Date;
}): Promise<Message> {
  let senderName = "System";
  if (row.senderId) {
    const user = await db.query.users.findFirst({
      where: eq(users.id, row.senderId),
    });
    senderName = user
      ? [user.firstName, user.lastName].filter(Boolean).join(" ") || user.email
      : "Unknown";
  } else if (row.senderRole === "ai_coach") {
    senderName = "AI Health Coach";
  }

  return {
    id: row.id,
    conversationId: row.conversationId,
    senderId: row.senderId,
    senderName,
    senderRole: row.senderRole as MessageRole,
    body: row.body,
    isAiMessage: row.isAiMessage ?? false,
    readAt: row.readAt?.toISOString() ?? null,
    createdAt: row.createdAt.toISOString(),
    attachments: [],
    replyTo: row.replyTo,
  };
}

async function buildConversation(row: {
  id: string;
  trainerId: string | null;
  clientId: string;
  isAiTrainer: boolean | null;
  lastMessageAt: Date | null;
  unreadCountTrainer: number | null;
  unreadCountClient: number | null;
}): Promise<Conversation> {
  // Fetch participant names
  const clientUser = await db.query.users.findFirst({
    where: eq(users.id, row.clientId),
  });
  const coachUser = row.trainerId
    ? await db.query.users.findFirst({ where: eq(users.id, row.trainerId) })
    : null;

  const clientName = clientUser
    ? [clientUser.firstName, clientUser.lastName].filter(Boolean).join(" ") || clientUser.email
    : "Unknown Client";
  const coachName = row.isAiTrainer
    ? "AI Health Coach"
    : coachUser
      ? [coachUser.firstName, coachUser.lastName].filter(Boolean).join(" ") || coachUser.email
      : "Unknown Coach";

  // Get last message preview
  const lastMsg = await db.query.messages.findFirst({
    where: eq(messages.conversationId, row.id),
    orderBy: [desc(messages.createdAt)],
  });

  let lastMessage: MessagePreview | null = null;
  if (lastMsg) {
    const fullMsg = await rowToMessage(lastMsg);
    lastMessage = {
      body: truncatePreview(fullMsg.body),
      senderName: fullMsg.senderName,
      senderRole: fullMsg.senderRole,
      createdAt: fullMsg.createdAt,
    };
  }

  return {
    id: row.id,
    coachId: row.trainerId,
    clientId: row.clientId,
    coachName,
    clientName,
    isAiCoach: row.isAiTrainer ?? false,
    lastMessage,
    unreadCount: 0, // Caller should set this based on viewer
    createdAt: (row.lastMessageAt ?? new Date()).toISOString(),
    updatedAt: (row.lastMessageAt ?? new Date()).toISOString(),
  };
}

// ─── Conversation Management ──────────────────────────────────────────

export async function getOrCreateConversation(
  clientId: string,
  _clientName: string,
  coachId: string | null,
  _coachName: string,
  isAiCoach: boolean = false,
): Promise<Conversation> {
  // Check for existing
  const existing = coachId
    ? await db.query.conversations.findFirst({
        where: and(
          eq(conversations.clientId, clientId),
          eq(conversations.trainerId, coachId),
        ),
      })
    : await db.query.conversations.findFirst({
        where: and(
          eq(conversations.clientId, clientId),
          eq(conversations.isAiTrainer, true),
        ),
      });

  if (existing) {
    return buildConversation(existing);
  }

  // Create new
  const [created] = await db
    .insert(conversations)
    .values({
      clientId,
      trainerId: coachId,
      isAiTrainer: isAiCoach,
      lastMessageAt: new Date(),
      unreadCountTrainer: 0,
      unreadCountClient: 0,
    })
    .returning();

  // Add system message
  const welcomeBody = isAiCoach
    ? "Welcome! Your AI health coach is ready to help."
    : `Conversation started.`;

  await db.insert(messages).values({
    conversationId: created.id,
    senderId: null,
    senderRole: "system",
    isAiMessage: false,
    body: welcomeBody,
  });

  return buildConversation(created);
}

export async function listConversations(
  userId: string,
  role: "client" | "coach",
  filter: ConversationFilter = "all",
): Promise<Conversation[]> {
  const whereClause =
    role === "client"
      ? eq(conversations.clientId, userId)
      : eq(conversations.trainerId, userId);

  const rows = await db.query.conversations.findMany({
    where: whereClause,
    orderBy: [desc(conversations.lastMessageAt)],
  });

  let filtered = rows;
  switch (filter) {
    case "ai_coach":
      filtered = rows.filter((r) => r.isAiTrainer);
      break;
    case "human_coach":
      filtered = rows.filter((r) => !r.isAiTrainer);
      break;
    // "unread" and "all" handled after building
  }

  const built = await Promise.all(filtered.map(buildConversation));

  if (filter === "unread") {
    // Need to compute unread per conversation for this user
    const withUnread = await Promise.all(
      built.map(async (conv) => {
        const unread = await getConversationUnreadCount(conv.id, userId);
        return { ...conv, unreadCount: unread };
      }),
    );
    return withUnread.filter((c) => c.unreadCount > 0);
  }

  return built;
}

export async function getConversation(conversationId: string): Promise<Conversation | null> {
  const row = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!row) return null;
  return buildConversation(row);
}

// ─── Message Operations ───────────────────────────────────────────────

export async function sendMessage(
  conversationId: string,
  senderId: string | null,
  _senderName: string,
  senderRole: MessageRole,
  body: string,
  isAi: boolean = false,
  replyTo: string | null = null,
): Promise<Message> {
  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Message body cannot be empty");

  const [row] = await db
    .insert(messages)
    .values({
      conversationId,
      senderId,
      senderRole,
      isAiMessage: isAi,
      body: trimmedBody,
      replyTo,
    })
    .returning();

  // Update conversation timestamps and unread counts
  const updateFields: Record<string, unknown> = {
    lastMessageAt: new Date(),
  };
  if (senderRole === "client" || senderRole === "system") {
    // Increment coach's unread
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        unreadCountTrainer: sql`${conversations.unreadCountTrainer} + 1`,
      })
      .where(eq(conversations.id, conversationId));
  } else {
    // Increment client's unread
    await db
      .update(conversations)
      .set({
        lastMessageAt: new Date(),
        unreadCountClient: sql`${conversations.unreadCountClient} + 1`,
      })
      .where(eq(conversations.id, conversationId));
  }

  // Clear typing indicator for sender
  if (senderId) {
    clearTyping(senderId, conversationId);
  }

  return rowToMessage(row);
}

export async function getMessages(
  conversationId: string,
  limit: number = 50,
  before?: string,
): Promise<Message[]> {
  const conditions = [eq(messages.conversationId, conversationId)];
  if (before) {
    conditions.push(lt(messages.createdAt, new Date(before)));
  }

  const rows = await db.query.messages.findMany({
    where: and(...conditions),
    orderBy: [desc(messages.createdAt)],
    limit,
  });

  // Reverse so oldest first
  rows.reverse();

  return Promise.all(rows.map(rowToMessage));
}

export async function searchMessages(
  userId: string,
  role: "client" | "coach",
  query: string,
): Promise<Message[]> {
  const convos = await listConversations(userId, role);
  const convIds = convos.map((c) => c.id);

  if (convIds.length === 0) return [];

  const rows = await db.query.messages.findMany({
    where: and(
      ilike(messages.body, `%${query}%`),
      // Filter to user's conversations
      or(...convIds.map((id) => eq(messages.conversationId, id))),
    ),
    orderBy: [desc(messages.createdAt)],
    limit: 50,
  });

  return Promise.all(rows.map(rowToMessage));
}

// ─── Read Receipts ────────────────────────────────────────────────────

export async function markAsRead(
  conversationId: string,
  userId: string,
): Promise<ReadReceipt[]> {
  const now = new Date();

  // Get unread messages from others
  const unread = await db.query.messages.findMany({
    where: and(
      eq(messages.conversationId, conversationId),
      sql`${messages.senderId} IS DISTINCT FROM ${userId}`,
      sql`${messages.readAt} IS NULL`,
      sql`${messages.senderRole} != 'system'`,
    ),
  });

  if (unread.length === 0) return [];

  // Mark them read
  const ids = unread.map((m) => m.id);
  await db
    .update(messages)
    .set({ readAt: now })
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} IS DISTINCT FROM ${userId}`,
        sql`${messages.readAt} IS NULL`,
        sql`${messages.senderRole} != 'system'`,
      ),
    );

  // Reset unread count on conversation
  const conv = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (conv) {
    if (conv.clientId === userId) {
      await db
        .update(conversations)
        .set({ unreadCountClient: 0 })
        .where(eq(conversations.id, conversationId));
    } else {
      await db
        .update(conversations)
        .set({ unreadCountTrainer: 0 })
        .where(eq(conversations.id, conversationId));
    }
  }

  return unread.map((m) => ({
    messageId: m.id,
    readBy: userId,
    readAt: now.toISOString(),
  }));
}

async function getConversationUnreadCount(
  conversationId: string,
  userId: string,
): Promise<number> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(messages)
    .where(
      and(
        eq(messages.conversationId, conversationId),
        sql`${messages.senderId} IS DISTINCT FROM ${userId}`,
        sql`${messages.readAt} IS NULL`,
        sql`${messages.senderRole} != 'system'`,
      ),
    );
  return Number(result[0]?.count ?? 0);
}

export async function getUnreadCount(userId: string, role: "client" | "coach"): Promise<number> {
  const convos = await listConversations(userId, role);
  let total = 0;
  for (const conv of convos) {
    total += await getConversationUnreadCount(conv.id, userId);
  }
  return total;
}

// ─── Conversation for User (with relative unread) ────────────────────

export async function getConversationForUser(
  conversationId: string,
  userId: string,
): Promise<Conversation | null> {
  const row = await db.query.conversations.findFirst({
    where: eq(conversations.id, conversationId),
  });
  if (!row) return null;

  const conv = await buildConversation(row);
  const unreadCount = await getConversationUnreadCount(conversationId, userId);
  return { ...conv, unreadCount };
}

// ─── Conversation Stats ───────────────────────────────────────────────

export interface MessagingStats {
  totalConversations: number;
  activeConversations: number;
  totalMessages: number;
  unreadMessages: number;
  avgResponseTimeMinutes: number;
  messagesThisWeek: number;
}

export async function getMessagingStats(
  userId: string,
  role: "client" | "coach",
): Promise<MessagingStats> {
  const convos = await listConversations(userId, role);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let totalMessages = 0;
  let messagesThisWeek = 0;
  let activeConversations = 0;

  for (const conv of convos) {
    const countResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(eq(messages.conversationId, conv.id));
    const msgCount = Number(countResult[0]?.count ?? 0);
    totalMessages += msgCount;

    const weekResult = await db
      .select({ count: sql<number>`count(*)` })
      .from(messages)
      .where(
        and(
          eq(messages.conversationId, conv.id),
          sql`${messages.createdAt} > ${weekAgo}`,
        ),
      );
    const weekCount = Number(weekResult[0]?.count ?? 0);
    messagesThisWeek += weekCount;
    if (weekCount > 0) activeConversations++;
  }

  const unreadMessages = await getUnreadCount(userId, role);

  return {
    totalConversations: convos.length,
    activeConversations,
    totalMessages,
    unreadMessages,
    avgResponseTimeMinutes: 0, // Simplified for now
    messagesThisWeek,
  };
}
