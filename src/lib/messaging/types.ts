// ─── Coach-Client Messaging Types ─────────────────────────────────────
// Real-time messaging between coaches and clients with threads,
// read receipts, typing indicators, and AI coach support.

// ─── Core Types ────────────────────────────────────────────────────────

export type MessageRole = "client" | "coach" | "ai_coach" | "system";

export interface Message {
  id: string;
  conversationId: string;
  senderId: string | null;
  senderName: string;
  senderRole: MessageRole;
  body: string;
  isAiMessage: boolean;
  readAt: string | null;
  createdAt: string;
  attachments: MessageAttachment[];
  replyTo: string | null;
}

export interface MessageAttachment {
  id: string;
  type: "image" | "file" | "link" | "metric_snapshot";
  name: string;
  url: string;
  size?: number;
  mimeType?: string;
  metadata?: Record<string, unknown>;
}

export interface Conversation {
  id: string;
  coachId: string | null;
  clientId: string;
  coachName: string;
  clientName: string;
  isAiCoach: boolean;
  lastMessage: MessagePreview | null;
  unreadCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface MessagePreview {
  body: string;
  senderName: string;
  senderRole: MessageRole;
  createdAt: string;
}

// ─── Typing Indicators ──────────────────────────────────────────────────

export interface TypingIndicator {
  userId: string;
  userName: string;
  conversationId: string;
  startedAt: string;
}

// ─── Read Receipts ──────────────────────────────────────────────────────

export interface ReadReceipt {
  messageId: string;
  readBy: string;
  readAt: string;
}

// ─── Conversation Filters ───────────────────────────────────────────────

export type ConversationFilter = "all" | "unread" | "ai_coach" | "human_coach";

// ─── Quick Reply Templates ──────────────────────────────────────────────

export interface QuickReply {
  id: string;
  label: string;
  body: string;
  category: "greeting" | "follow_up" | "encouragement" | "scheduling" | "health_tip";
}

export const COACH_QUICK_REPLIES: QuickReply[] = [
  {
    id: "qr_greeting",
    label: "Hello",
    body: "Hi! How are you feeling today?",
    category: "greeting",
  },
  {
    id: "qr_checkin",
    label: "Check-in",
    body: "Just checking in — how has your week been going? Any changes in how you're feeling?",
    category: "follow_up",
  },
  {
    id: "qr_great_progress",
    label: "Great progress",
    body: "I'm really impressed with your progress! Keep up the great work.",
    category: "encouragement",
  },
  {
    id: "qr_schedule",
    label: "Schedule call",
    body: "Would you like to schedule a call this week to review your progress?",
    category: "scheduling",
  },
  {
    id: "qr_hydration",
    label: "Hydration tip",
    body: "Quick reminder: staying well-hydrated can improve your glucose stability and sleep quality. Aim for at least 8 glasses today!",
    category: "health_tip",
  },
  {
    id: "qr_sleep_tip",
    label: "Sleep hygiene",
    body: "Try to avoid screens 30 minutes before bed and keep your bedroom cool (65-68°F). These small changes can make a big difference in sleep quality.",
    category: "health_tip",
  },
];

export const CLIENT_QUICK_REPLIES: QuickReply[] = [
  {
    id: "qr_feeling_good",
    label: "Feeling good",
    body: "Feeling great today! Everything is on track.",
    category: "greeting",
  },
  {
    id: "qr_question",
    label: "Quick question",
    body: "I have a quick question about my protocol — do you have a moment?",
    category: "follow_up",
  },
  {
    id: "qr_struggling",
    label: "Need help",
    body: "I've been struggling a bit this week. Could we talk about adjusting my plan?",
    category: "follow_up",
  },
  {
    id: "qr_thanks",
    label: "Thanks",
    body: "Thank you for the advice! I'll give it a try.",
    category: "encouragement",
  },
];

// ─── System Message Templates ────────────────────────────────────────────

export type SystemMessageType =
  | "conversation_started"
  | "coach_assigned"
  | "coach_changed"
  | "goal_achieved"
  | "milestone_reached"
  | "tier_upgraded";

export const SYSTEM_MESSAGES: Record<SystemMessageType, string> = {
  conversation_started: "Conversation started. Your coach will respond shortly.",
  coach_assigned: "A coach has been assigned to your account.",
  coach_changed: "Your coaching assignment has been updated.",
  goal_achieved: "Congratulations! You've achieved a health goal.",
  milestone_reached: "You've reached a new milestone on your journey!",
  tier_upgraded: "Your subscription tier has been upgraded.",
};

// ─── Helpers ────────────────────────────────────────────────────────────

export function uid(): string {
  return `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createMessage(
  conversationId: string,
  senderId: string | null,
  senderName: string,
  senderRole: MessageRole,
  body: string,
  isAi: boolean = false,
  replyTo: string | null = null,
): Message {
  return {
    id: uid(),
    conversationId,
    senderId,
    senderName,
    senderRole,
    body,
    isAiMessage: isAi,
    readAt: null,
    createdAt: new Date().toISOString(),
    attachments: [],
    replyTo,
  };
}

export function createConversation(
  clientId: string,
  clientName: string,
  coachId: string | null,
  coachName: string,
  isAiCoach: boolean = false,
): Conversation {
  const now = new Date().toISOString();
  return {
    id: uid(),
    coachId,
    clientId,
    coachName,
    clientName,
    isAiCoach,
    lastMessage: null,
    unreadCount: 0,
    createdAt: now,
    updatedAt: now,
  };
}

// ─── Formatting Helpers ─────────────────────────────────────────────────

export function formatMessageTime(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;

  return date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

export function truncatePreview(body: string, maxLength: number = 80): string {
  if (body.length <= maxLength) return body;
  return body.slice(0, maxLength).trimEnd() + "…";
}

export function groupMessagesByDate(messages: Message[]): Map<string, Message[]> {
  const groups = new Map<string, Message[]>();
  for (const msg of messages) {
    const dateKey = new Date(msg.createdAt).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
    const existing = groups.get(dateKey);
    if (existing) {
      existing.push(msg);
    } else {
      groups.set(dateKey, [msg]);
    }
  }
  return groups;
}
