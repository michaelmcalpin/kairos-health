import { describe, it, expect, beforeEach } from "vitest";
import {
  setTyping,
  clearTyping,
  getTypingUsers,
} from "../typing";

// ─── Typing Indicators (in-memory, testable without DB) ───────────

describe("typing indicators", () => {
  const convId = "test-conv-1";

  beforeEach(() => {
    // Clear any leftover typing indicators
    clearTyping("coach-1", convId);
    clearTyping("client-1", convId);
  });

  it("sets and retrieves typing indicator", () => {
    setTyping("coach-1", "Dr. Smith", convId);

    const typing = getTypingUsers(convId, "client-1");
    expect(typing).toHaveLength(1);
    expect(typing[0].userName).toBe("Dr. Smith");
  });

  it("excludes current user from typing list", () => {
    setTyping("client-1", "Alice", convId);

    const typing = getTypingUsers(convId, "client-1");
    expect(typing).toHaveLength(0);
  });

  it("clears typing indicator", () => {
    setTyping("coach-1", "Dr. Smith", convId);
    clearTyping("coach-1", convId);

    const typing = getTypingUsers(convId, "client-1");
    expect(typing).toHaveLength(0);
  });

  it("returns multiple typing users", () => {
    setTyping("coach-1", "Dr. Smith", convId);
    setTyping("coach-2", "Dr. Jones", convId);

    const typing = getTypingUsers(convId, "client-1");
    expect(typing).toHaveLength(2);
  });

  it("returns empty for no typing users", () => {
    const typing = getTypingUsers(convId);
    expect(typing).toHaveLength(0);
  });
});
