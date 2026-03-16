// ─── Messaging Engine ─────────────────────────────────────────────────
// Manages conversations, messages, read receipts, typing indicators,
// and conversation state. In-memory store for development; production
// uses PostgreSQL via Drizzle.

import type {
  Message,
  Conversation,
  MessagePreview,
  MessageRole,
  TypingIndicator,
  ReadReceipt,
  ConversationFilter,
} from "./types";
import { createMessage, createConversation, truncatePreview } from "./types";

// ─── In-Memory Store ──────────────────────────────────────────────────

const conversationsStore = new Map<string, Conversation>();
const messagesStore = new Map<string, Message[]>(); // conversationId → messages
const typingStore = new Map<string, TypingIndicator>(); // `${userId}:${convId}` → indicator

// ─── Conversation Management ──────────────────────────────────────────

export function getOrCreateConversation(
  clientId: string,
  clientName: string,
  coachId: string | null,
  coachName: string,
  isAiCoach: boolean = false,
): Conversation {
  // Check for existing conversation between this client and coach
  const existing = Array.from(conversationsStore.values()).find(
    (c) => c.clientId === clientId && c.coachId === coachId && c.isAiCoach === isAiCoach
  );
  if (existing) return existing;

  const conv = createConversation(clientId, clientName, coachId, coachName, isAiCoach);
  conversationsStore.set(conv.id, conv);
  messagesStore.set(conv.id, []);

  // Add system message
  const systemMsg = createMessage(
    conv.id,
    null,
    "System",
    "system",
    isAiCoach
      ? "Welcome! Your AI health coach is ready to help."
      : `Conversation started with ${coachName}.`,
  );
  messagesStore.get(conv.id)!.push(systemMsg);

  return { ...conv, lastMessage: toPreview(systemMsg) };
}

export function listConversations(
  userId: string,
  role: "client" | "coach",
  filter: ConversationFilter = "all",
): Conversation[] {
  const all = Array.from(conversationsStore.values()).filter((c) =>
    role === "client" ? c.clientId === userId : c.coachId === userId
  );

  let filtered: Conversation[];
  switch (filter) {
    case "unread":
      filtered = all.filter((c) => c.unreadCount > 0);
      break;
    case "ai_coach":
      filtered = all.filter((c) => c.isAiCoach);
      break;
    case "human_coach":
      filtered = all.filter((c) => !c.isAiCoach);
      break;
    default:
      filtered = all;
  }

  // Sort by most recent message
  return filtered.sort((a, b) => {
    const aTime = a.lastMessage?.createdAt ?? a.createdAt;
    const bTime = b.lastMessage?.createdAt ?? b.createdAt;
    return new Date(bTime).getTime() - new Date(aTime).getTime();
  });
}

export function getConversation(conversationId: string): Conversation | null {
  return conversationsStore.get(conversationId) ?? null;
}

// ─── Message Operations ───────────────────────────────────────────────

export function sendMessage(
  conversationId: string,
  senderId: string | null,
  senderName: string,
  senderRole: MessageRole,
  body: string,
  isAi: boolean = false,
  replyTo: string | null = null,
): Message {
  const conv = conversationsStore.get(conversationId);
  if (!conv) throw new Error("Conversation not found");

  const trimmedBody = body.trim();
  if (!trimmedBody) throw new Error("Message body cannot be empty");

  const msg = createMessage(conversationId, senderId, senderName, senderRole, trimmedBody, isAi, replyTo);
  const messages = messagesStore.get(conversationId) ?? [];
  messages.push(msg);
  messagesStore.set(conversationId, messages);

  // Update conversation
  const preview = toPreview(msg);
  const updatedConv: Conversation = {
    ...conv,
    lastMessage: preview,
    updatedAt: msg.createdAt,
    // Increment unread for the other party
    unreadCount:
      senderRole === "client" || senderRole === "system"
        ? conv.unreadCount // don't change (this is viewer-relative, set by getConvForUser)
        : conv.unreadCount,
  };
  conversationsStore.set(conversationId, updatedConv);

  // Clear typing indicator for sender
  if (senderId) {
    clearTyping(senderId, conversationId);
  }

  return msg;
}

export function getMessages(
  conversationId: string,
  limit: number = 50,
  before?: string,
): Message[] {
  const all = messagesStore.get(conversationId) ?? [];

  let filtered = all;
  if (before) {
    const cutoff = new Date(before).getTime();
    filtered = all.filter((m) => new Date(m.createdAt).getTime() < cutoff);
  }

  // Return most recent `limit` messages
  return filtered.slice(-limit);
}

export function getMessage(conversationId: string, messageId: string): Message | null {
  const messages = messagesStore.get(conversationId) ?? [];
  return messages.find((m) => m.id === messageId) ?? null;
}

export function searchMessages(
  userId: string,
  role: "client" | "coach",
  query: string,
): Message[] {
  const lowerQuery = query.toLowerCase();
  const results: Message[] = [];

  const convos = listConversations(userId, role);
  for (const conv of convos) {
    const messages = messagesStore.get(conv.id) ?? [];
    for (const msg of messages) {
      if (msg.body.toLowerCase().includes(lowerQuery)) {
        results.push(msg);
      }
    }
  }

  return results.sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

// ─── Read Receipts ────────────────────────────────────────────────────

export function markAsRead(
  conversationId: string,
  userId: string,
): ReadReceipt[] {
  const messages = messagesStore.get(conversationId) ?? [];
  const now = new Date().toISOString();
  const receipts: ReadReceipt[] = [];

  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    // Mark messages from OTHER users as read
    if (msg.senderId !== userId && !msg.readAt && msg.senderRole !== "system") {
      messages[i] = { ...msg, readAt: now };
      receipts.push({
        messageId: msg.id,
        readBy: userId,
        readAt: now,
      });
    }
  }
  messagesStore.set(conversationId, messages);

  // Reset unread count for this user's side of the conversation
  const conv = conversationsStore.get(conversationId);
  if (conv) {
    conversationsStore.set(conversationId, {
      ...conv,
      unreadCount: 0,
    });
  }

  return receipts;
}

export function getUnreadCount(userId: string, role: "client" | "coach"): number {
  const convos = listConversations(userId, role);
  let total = 0;

  for (const conv of convos) {
    const messages = messagesStore.get(conv.id) ?? [];
    for (const msg of messages) {
      if (msg.senderId !== userId && !msg.readAt && msg.senderRole !== "system") {
        total++;
      }
    }
  }

  return total;
}

// ─── Typing Indicators ───────────────────────────────────────────────

const TYPING_TIMEOUT_MS = 5000;

export function setTyping(
  userId: string,
  userName: string,
  conversationId: string,
): TypingIndicator {
  const key = `${userId}:${conversationId}`;
  const indicator: TypingIndicator = {
    userId,
    userName,
    conversationId,
    startedAt: new Date().toISOString(),
  };
  typingStore.set(key, indicator);
  return indicator;
}

export function clearTyping(userId: string, conversationId: string): void {
  const key = `${userId}:${conversationId}`;
  typingStore.delete(key);
}

export function getTypingUsers(conversationId: string, excludeUserId?: string): TypingIndicator[] {
  const now = Date.now();
  const result: TypingIndicator[] = [];

  const entries = Array.from(typingStore.entries());
  for (const [key, indicator] of entries) {
    // Clean up expired typing indicators
    if (now - new Date(indicator.startedAt).getTime() > TYPING_TIMEOUT_MS) {
      typingStore.delete(key);
      continue;
    }
    if (
      indicator.conversationId === conversationId &&
      indicator.userId !== excludeUserId
    ) {
      result.push(indicator);
    }
  }

  return result;
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

export function getMessagingStats(
  userId: string,
  role: "client" | "coach",
): MessagingStats {
  const convos = listConversations(userId, role);
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);

  let totalMessages = 0;
  let messagesThisWeek = 0;
  let activeConversations = 0;
  const responseTimes: number[] = [];

  for (const conv of convos) {
    const messages = messagesStore.get(conv.id) ?? [];
    totalMessages += messages.length;

    const hasRecent = messages.some(
      (m) => new Date(m.createdAt).getTime() > weekAgo.getTime()
    );
    if (hasRecent) activeConversations++;

    for (const msg of messages) {
      if (new Date(msg.createdAt).getTime() > weekAgo.getTime()) {
        messagesThisWeek++;
      }
    }

    // Calculate response times (coach responses to client messages)
    if (role === "coach") {
      for (let i = 1; i < messages.length; i++) {
        const prev = messages[i - 1];
        const curr = messages[i];
        if (prev.senderRole === "client" && curr.senderRole === "coach") {
          const responseMs =
            new Date(curr.createdAt).getTime() - new Date(prev.createdAt).getTime();
          responseTimes.push(responseMs / 60000);
        }
      }
    }
  }

  const avgResponseTimeMinutes =
    responseTimes.length > 0
      ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
      : 0;

  return {
    totalConversations: convos.length,
    activeConversations,
    totalMessages,
    unreadMessages: getUnreadCount(userId, role),
    avgResponseTimeMinutes,
    messagesThisWeek,
  };
}

// ─── Conversation for User (with relative unread) ────────────────────

export function getConversationForUser(
  conversationId: string,
  userId: string,
): Conversation | null {
  const conv = conversationsStore.get(conversationId);
  if (!conv) return null;

  // Count unread messages for this specific user
  const messages = messagesStore.get(conversationId) ?? [];
  const unreadCount = messages.filter(
    (m) => m.senderId !== userId && !m.readAt && m.senderRole !== "system"
  ).length;

  return { ...conv, unreadCount };
}

// ─── Helpers ──────────────────────────────────────────────────────────

function toPreview(msg: Message): MessagePreview {
  return {
    body: truncatePreview(msg.body),
    senderName: msg.senderName,
    senderRole: msg.senderRole,
    createdAt: msg.createdAt,
  };
}

// ─── Store Reset (for testing) ────────────────────────────────────────

export function resetMessagingStore(): void {
  conversationsStore.clear();
  messagesStore.clear();
  typingStore.clear();
}
