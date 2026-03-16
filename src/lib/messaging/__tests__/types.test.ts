import { describe, it, expect } from "vitest";
import {
  uid,
  createMessage,
  createConversation,
  formatMessageTime,
  truncatePreview,
  groupMessagesByDate,
  COACH_QUICK_REPLIES,
  CLIENT_QUICK_REPLIES,
  SYSTEM_MESSAGES,
} from "../types";
import type { Message } from "../types";

describe("uid", () => {
  it("generates unique ids", () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(uid());
    }
    expect(ids.size).toBe(100);
  });
});

describe("createMessage", () => {
  it("creates a message with correct fields", () => {
    const msg = createMessage("conv-1", "user-1", "Alice", "client", "Hello!");
    expect(msg.id).toBeTruthy();
    expect(msg.conversationId).toBe("conv-1");
    expect(msg.senderId).toBe("user-1");
    expect(msg.senderName).toBe("Alice");
    expect(msg.senderRole).toBe("client");
    expect(msg.body).toBe("Hello!");
    expect(msg.isAiMessage).toBe(false);
    expect(msg.readAt).toBeNull();
    expect(msg.attachments).toEqual([]);
    expect(msg.replyTo).toBeNull();
  });

  it("creates AI message", () => {
    const msg = createMessage("conv-1", null, "AI Coach", "ai_coach", "Analysis...", true);
    expect(msg.isAiMessage).toBe(true);
    expect(msg.senderId).toBeNull();
  });

  it("supports replyTo", () => {
    const msg = createMessage("conv-1", "user-1", "Alice", "client", "Reply!", false, "msg-42");
    expect(msg.replyTo).toBe("msg-42");
  });
});

describe("createConversation", () => {
  it("creates a conversation with correct fields", () => {
    const conv = createConversation("client-1", "Alice", "coach-1", "Dr. Smith");
    expect(conv.id).toBeTruthy();
    expect(conv.clientId).toBe("client-1");
    expect(conv.coachId).toBe("coach-1");
    expect(conv.clientName).toBe("Alice");
    expect(conv.coachName).toBe("Dr. Smith");
    expect(conv.isAiCoach).toBe(false);
    expect(conv.lastMessage).toBeNull();
    expect(conv.unreadCount).toBe(0);
  });

  it("creates AI coach conversation", () => {
    const conv = createConversation("client-1", "Alice", null, "AI Coach", true);
    expect(conv.isAiCoach).toBe(true);
    expect(conv.coachId).toBeNull();
  });
});

describe("formatMessageTime", () => {
  it("returns 'Just now' for recent messages", () => {
    const now = new Date().toISOString();
    expect(formatMessageTime(now)).toBe("Just now");
  });

  it("returns minutes ago for recent messages", () => {
    const fiveMinAgo = new Date(Date.now() - 5 * 60000).toISOString();
    expect(formatMessageTime(fiveMinAgo)).toBe("5m ago");
  });

  it("returns hours ago", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 3600000).toISOString();
    expect(formatMessageTime(threeHoursAgo)).toBe("3h ago");
  });

  it("returns days ago", () => {
    const twoDaysAgo = new Date(Date.now() - 2 * 86400000).toISOString();
    expect(formatMessageTime(twoDaysAgo)).toBe("2d ago");
  });

  it("returns date for older messages", () => {
    const twoWeeksAgo = new Date(Date.now() - 14 * 86400000).toISOString();
    const result = formatMessageTime(twoWeeksAgo);
    // Should be something like "Mar 1"
    expect(result).toMatch(/\w+ \d+/);
  });
});

describe("truncatePreview", () => {
  it("returns short text unchanged", () => {
    expect(truncatePreview("Hello!")).toBe("Hello!");
  });

  it("truncates long text with ellipsis", () => {
    const long = "A".repeat(100);
    const result = truncatePreview(long, 80);
    expect(result.length).toBeLessThanOrEqual(81); // 80 + ellipsis char
    expect(result.endsWith("…")).toBe(true);
  });

  it("respects custom max length", () => {
    const result = truncatePreview("Hello World!", 5);
    expect(result).toBe("Hello…");
  });
});

describe("groupMessagesByDate", () => {
  it("groups messages by date", () => {
    const messages: Message[] = [
      createMessage("conv-1", "user-1", "Alice", "client", "Msg 1"),
      createMessage("conv-1", "user-2", "Bob", "coach", "Msg 2"),
    ];
    // Both created "now" so should be in same group
    const groups = groupMessagesByDate(messages);
    const entries = Array.from(groups.entries());
    expect(entries).toHaveLength(1);
    expect(entries[0][1]).toHaveLength(2);
  });

  it("handles empty array", () => {
    const groups = groupMessagesByDate([]);
    expect(groups.size).toBe(0);
  });
});

describe("quick replies", () => {
  it("has coach quick replies", () => {
    expect(COACH_QUICK_REPLIES.length).toBeGreaterThan(0);
    for (const qr of COACH_QUICK_REPLIES) {
      expect(qr.id).toBeTruthy();
      expect(qr.label).toBeTruthy();
      expect(qr.body).toBeTruthy();
      expect(qr.category).toBeTruthy();
    }
  });

  it("has client quick replies", () => {
    expect(CLIENT_QUICK_REPLIES.length).toBeGreaterThan(0);
    for (const qr of CLIENT_QUICK_REPLIES) {
      expect(qr.id).toBeTruthy();
      expect(qr.label).toBeTruthy();
      expect(qr.body).toBeTruthy();
    }
  });
});

describe("system messages", () => {
  it("has all system message types", () => {
    const keys = Object.keys(SYSTEM_MESSAGES);
    expect(keys).toContain("conversation_started");
    expect(keys).toContain("coach_assigned");
    expect(keys).toContain("goal_achieved");
    expect(keys).toContain("milestone_reached");
    expect(keys).toContain("tier_upgraded");
  });
});
