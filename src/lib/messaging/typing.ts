// ─── Typing Indicators (in-memory, ephemeral) ────────────────────────
// Separated from engine.ts so "use client" components can import
// these without pulling in server-only DB dependencies (postgres/tls).

import type { TypingIndicator } from "./types";

const typingStore = new Map<string, TypingIndicator>();
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
