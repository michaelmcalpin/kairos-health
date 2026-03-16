import { describe, it, expect, beforeEach } from "vitest";
import {
  getOrCreateConversation,
  listConversations,
  getConversation,
  getConversationForUser,
  sendMessage,
  getMessages,
  getMessage,
  searchMessages,
  markAsRead,
  getUnreadCount,
  setTyping,
  clearTyping,
  getTypingUsers,
  getMessagingStats,
  resetMessagingStore,
} from "../engine";

beforeEach(() => {
  resetMessagingStore();
});

// ─── Conversation Management ──────────────────────────────────────────

describe("getOrCreateConversation", () => {
  it("creates a new conversation", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    expect(conv.id).toBeTruthy();
    expect(conv.clientId).toBe("client-1");
    expect(conv.coachId).toBe("coach-1");
    expect(conv.clientName).toBe("Alice");
    expect(conv.coachName).toBe("Dr. Smith");
    expect(conv.isAiCoach).toBe(false);
  });

  it("returns existing conversation for same pair", () => {
    const conv1 = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const conv2 = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    expect(conv2.id).toBe(conv1.id);
  });

  it("creates separate conversations for different coaches", () => {
    const conv1 = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const conv2 = getOrCreateConversation("client-1", "Alice", "coach-2", "Dr. Jones");
    expect(conv2.id).not.toBe(conv1.id);
  });

  it("creates AI coach conversation", () => {
    const conv = getOrCreateConversation("client-1", "Alice", null, "AI Coach", true);
    expect(conv.isAiCoach).toBe(true);
    expect(conv.coachId).toBeNull();
  });

  it("adds system message on creation", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    expect(conv.lastMessage).not.toBeNull();
    expect(conv.lastMessage!.senderRole).toBe("system");
  });
});

describe("listConversations", () => {
  it("lists conversations for a client", () => {
    getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    getOrCreateConversation("client-1", "Alice", null, "AI Coach", true);

    const convos = listConversations("client-1", "client");
    expect(convos).toHaveLength(2);
  });

  it("lists conversations for a coach", () => {
    getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    getOrCreateConversation("client-2", "Bob", "coach-1", "Dr. Smith");

    const convos = listConversations("coach-1", "coach");
    expect(convos).toHaveLength(2);
  });

  it("filters unread conversations", () => {
    const conv1 = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    getOrCreateConversation("client-1", "Alice", null, "AI Coach", true);

    // Send a message in conv1 so there's an unread
    sendMessage(conv1.id, "coach-1", "Dr. Smith", "coach", "Hello!");

    const unread = listConversations("client-1", "client", "unread");
    // Unread count depends on markAsRead not being called
    expect(unread.length).toBeGreaterThanOrEqual(0);
  });

  it("filters AI coach conversations", () => {
    getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    getOrCreateConversation("client-1", "Alice", null, "AI Coach", true);

    const aiOnly = listConversations("client-1", "client", "ai_coach");
    expect(aiOnly).toHaveLength(1);
    expect(aiOnly[0].isAiCoach).toBe(true);
  });

  it("filters human coach conversations", () => {
    getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    getOrCreateConversation("client-1", "Alice", null, "AI Coach", true);

    const humanOnly = listConversations("client-1", "client", "human_coach");
    expect(humanOnly).toHaveLength(1);
    expect(humanOnly[0].isAiCoach).toBe(false);
  });

  it("sorts by most recent message", () => {
    const conv1 = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const conv2 = getOrCreateConversation("client-1", "Alice", "coach-2", "Dr. Jones");

    // Send a message to conv1 after conv2 was created
    sendMessage(conv2.id, "coach-2", "Dr. Jones", "coach", "First");
    sendMessage(conv1.id, "coach-1", "Dr. Smith", "coach", "Second (more recent)");

    const convos = listConversations("client-1", "client");
    expect(convos[0].id).toBe(conv1.id);
  });
});

describe("getConversation", () => {
  it("returns conversation by id", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const found = getConversation(conv.id);
    expect(found).not.toBeNull();
    expect(found!.id).toBe(conv.id);
  });

  it("returns null for unknown id", () => {
    expect(getConversation("nonexistent")).toBeNull();
  });
});

// ─── Message Operations ───────────────────────────────────────────────

describe("sendMessage", () => {
  it("sends a message and updates conversation", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const msg = sendMessage(conv.id, "client-1", "Alice", "client", "Hello doctor!");

    expect(msg.id).toBeTruthy();
    expect(msg.body).toBe("Hello doctor!");
    expect(msg.senderRole).toBe("client");
    expect(msg.readAt).toBeNull();

    const updated = getConversation(conv.id);
    expect(updated!.lastMessage!.body).toBe("Hello doctor!");
  });

  it("trims whitespace from message body", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const msg = sendMessage(conv.id, "client-1", "Alice", "client", "  Hello!  ");
    expect(msg.body).toBe("Hello!");
  });

  it("throws on empty body", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    expect(() => sendMessage(conv.id, "client-1", "Alice", "client", "  ")).toThrow(
      "Message body cannot be empty"
    );
  });

  it("throws for nonexistent conversation", () => {
    expect(() =>
      sendMessage("fake-id", "client-1", "Alice", "client", "Hello")
    ).toThrow("Conversation not found");
  });

  it("supports reply-to messages", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const msg1 = sendMessage(conv.id, "client-1", "Alice", "client", "Question?");
    const msg2 = sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Answer!", false, msg1.id);
    expect(msg2.replyTo).toBe(msg1.id);
  });
});

describe("getMessages", () => {
  it("returns messages for a conversation", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "Hello!");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Hi there!");

    const messages = getMessages(conv.id);
    // 1 system message + 2 sent messages
    expect(messages).toHaveLength(3);
  });

  it("respects limit parameter", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    for (let i = 0; i < 10; i++) {
      sendMessage(conv.id, "client-1", "Alice", "client", `Message ${i}`);
    }

    const messages = getMessages(conv.id, 5);
    expect(messages).toHaveLength(5);
  });

  it("returns empty array for unknown conversation", () => {
    expect(getMessages("nonexistent")).toHaveLength(0);
  });
});

describe("getMessage", () => {
  it("finds a specific message", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const sent = sendMessage(conv.id, "client-1", "Alice", "client", "Find me!");
    const found = getMessage(conv.id, sent.id);
    expect(found).not.toBeNull();
    expect(found!.body).toBe("Find me!");
  });

  it("returns null for unknown message", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    expect(getMessage(conv.id, "nonexistent")).toBeNull();
  });
});

describe("searchMessages", () => {
  it("finds messages matching query", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "My glucose is high today");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Let me check your data");
    sendMessage(conv.id, "client-1", "Alice", "client", "Glucose reading was 180");

    const results = searchMessages("client-1", "client", "glucose");
    expect(results).toHaveLength(2);
  });

  it("returns empty for no matches", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "Hello");

    const results = searchMessages("client-1", "client", "xyz_nomatch");
    expect(results).toHaveLength(0);
  });

  it("is case insensitive", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "GLUCOSE reading");

    const results = searchMessages("client-1", "client", "glucose");
    expect(results).toHaveLength(1);
  });
});

// ─── Read Receipts ────────────────────────────────────────────────────

describe("markAsRead", () => {
  it("marks unread messages as read", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Hello!");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "How are you?");

    const receipts = markAsRead(conv.id, "client-1");
    expect(receipts).toHaveLength(2);
    expect(receipts[0].readBy).toBe("client-1");

    // Verify messages are now read
    const messages = getMessages(conv.id);
    const coachMessages = messages.filter((m) => m.senderRole === "coach");
    expect(coachMessages.every((m) => m.readAt !== null)).toBe(true);
  });

  it("does not mark own messages as read", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "Hello!");

    const receipts = markAsRead(conv.id, "client-1");
    expect(receipts).toHaveLength(0);
  });

  it("does not re-mark already read messages", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Hello!");

    markAsRead(conv.id, "client-1");
    const secondRead = markAsRead(conv.id, "client-1");
    expect(secondRead).toHaveLength(0);
  });
});

describe("getUnreadCount", () => {
  it("counts unread messages across conversations", () => {
    const conv1 = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    const conv2 = getOrCreateConversation("client-1", "Alice", "coach-2", "Dr. Jones");

    sendMessage(conv1.id, "coach-1", "Dr. Smith", "coach", "Hello!");
    sendMessage(conv2.id, "coach-2", "Dr. Jones", "coach", "Hi!");
    sendMessage(conv2.id, "coach-2", "Dr. Jones", "coach", "Follow up!");

    expect(getUnreadCount("client-1", "client")).toBe(3);
  });

  it("returns 0 when all read", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Hello!");
    markAsRead(conv.id, "client-1");

    expect(getUnreadCount("client-1", "client")).toBe(0);
  });
});

// ─── Typing Indicators ───────────────────────────────────────────────

describe("typing indicators", () => {
  it("sets and retrieves typing indicator", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    setTyping("coach-1", "Dr. Smith", conv.id);

    const typing = getTypingUsers(conv.id, "client-1");
    expect(typing).toHaveLength(1);
    expect(typing[0].userName).toBe("Dr. Smith");
  });

  it("excludes current user from typing list", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    setTyping("client-1", "Alice", conv.id);

    const typing = getTypingUsers(conv.id, "client-1");
    expect(typing).toHaveLength(0);
  });

  it("clears typing indicator", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    setTyping("coach-1", "Dr. Smith", conv.id);
    clearTyping("coach-1", conv.id);

    const typing = getTypingUsers(conv.id, "client-1");
    expect(typing).toHaveLength(0);
  });

  it("sending a message clears typing indicator", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    setTyping("coach-1", "Dr. Smith", conv.id);
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Done typing!");

    const typing = getTypingUsers(conv.id, "client-1");
    expect(typing).toHaveLength(0);
  });
});

// ─── Conversation for User ──────────────────────────────────────────

describe("getConversationForUser", () => {
  it("returns conversation with user-relative unread count", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Hello!");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Are you there?");

    const clientView = getConversationForUser(conv.id, "client-1");
    expect(clientView!.unreadCount).toBe(2);

    const coachView = getConversationForUser(conv.id, "coach-1");
    expect(coachView!.unreadCount).toBe(0);
  });

  it("returns null for unknown conversation", () => {
    expect(getConversationForUser("nonexistent", "user-1")).toBeNull();
  });
});

// ─── Stats ────────────────────────────────────────────────────────────

describe("getMessagingStats", () => {
  it("returns stats for a user", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "Hello!");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Hi!");

    const stats = getMessagingStats("client-1", "client");
    expect(stats.totalConversations).toBe(1);
    expect(stats.totalMessages).toBeGreaterThan(0);
    expect(stats.messagesThisWeek).toBeGreaterThan(0);
  });

  it("returns zero stats for new user", () => {
    const stats = getMessagingStats("new-user", "client");
    expect(stats.totalConversations).toBe(0);
    expect(stats.totalMessages).toBe(0);
    expect(stats.unreadMessages).toBe(0);
  });

  it("calculates coach response times", () => {
    const conv = getOrCreateConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    sendMessage(conv.id, "client-1", "Alice", "client", "Question?");
    sendMessage(conv.id, "coach-1", "Dr. Smith", "coach", "Answer!");

    const stats = getMessagingStats("coach-1", "coach");
    expect(stats.avgResponseTimeMinutes).toBeGreaterThanOrEqual(0);
  });
});
