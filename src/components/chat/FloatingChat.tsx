"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  MessageSquare,
  X,
  Send,
  Sparkles,
  User,
  Loader2,
  Maximize2,
  UserCircle,
} from "lucide-react";
import { useRouter, usePathname } from "next/navigation";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Simple inline markdown (bold, italic, bullets)
// ---------------------------------------------------------------------------

function renderInline(text: string): React.ReactNode {
  // Just handle **bold** and *italic*
  const parts: React.ReactNode[] = [];
  let remaining = text;
  let idx = 0;
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`)/g;
  let lastIndex = 0;
  let match;

  while ((match = regex.exec(remaining)) !== null) {
    if (match.index > lastIndex) parts.push(remaining.slice(lastIndex, match.index));
    if (match[2]) parts.push(<strong key={idx++} className="font-semibold text-white">{match[2]}</strong>);
    else if (match[3]) parts.push(<em key={idx++}>{match[3]}</em>);
    else if (match[4]) parts.push(<code key={idx++} className="bg-kairos-royal px-1 rounded text-[11px] text-kairos-gold">{match[4]}</code>);
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < remaining.length) parts.push(remaining.slice(lastIndex));
  return parts.length === 1 ? parts[0] : <>{parts}</>;
}

function renderMiniMarkdown(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    if (trimmed === "") return <div key={i} className="h-1" />;
    if (/^[-*•]\s/.test(trimmed)) {
      return (
        <p key={i} className="text-xs font-body ml-2">
          • {renderInline(trimmed.replace(/^[-*•]\s/, ""))}
        </p>
      );
    }
    if (trimmed.startsWith("## ") || trimmed.startsWith("### ")) {
      return (
        <p key={i} className="text-xs font-heading font-semibold text-white mt-1">
          {renderInline(trimmed.replace(/^#{2,3}\s/, ""))}
        </p>
      );
    }
    return (
      <p key={i} className="text-xs font-body leading-relaxed">
        {renderInline(trimmed)}
      </p>
    );
  });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type MiniMessage = {
  id: string;
  role: "client" | "ai_coach";
  body: string;
  isStreaming?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FloatingChat() {
  const router = useRouter();
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<MiniMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const startConversation = trpc.clientPortal.messaging.startConversation.useMutation();

  // Check for unread coach messages
  const { data: unreadData } = trpc.clientPortal.messaging.getUnreadCount.useQuery(
    undefined,
    { refetchInterval: 30_000, retry: false }
  );
  const coachUnread = unreadData?.count ?? 0;

  // Don't show on the full chat page — must be AFTER all hooks
  const isOnChatPage = pathname === "/chat";

  useEffect(() => {
    if (open) {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [open, messages.length]);

  const ensureConversation = useCallback(async (): Promise<string> => {
    if (conversationId) return conversationId;
    const conv = await startConversation.mutateAsync({
      coachId: null,
      coachName: "Everist AI",
      isAiCoach: true,
    });
    setConversationId(conv.id);
    return conv.id;
  }, [conversationId, startConversation]);

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");

    const userMsg: MiniMessage = {
      id: `u-${Date.now()}`,
      role: "client",
      body: text,
    };
    const aiMsg: MiniMessage = {
      id: `ai-${Date.now()}`,
      role: "ai_coach",
      body: "",
      isStreaming: true,
    };

    setMessages((prev) => [...prev, userMsg, aiMsg]);
    setIsStreaming(true);

    try {
      const convId = await ensureConversation();

      const history = messages.map((m) => ({ role: m.role, body: m.body }));

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: text, conversationId: convId, history }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => null);
        throw new Error(errData?.error || "Request failed");
      }

      const reader = res.body?.getReader();
      if (!reader) throw new Error("No stream");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.type === "text") {
              setMessages((prev) => {
                const updated = [...prev];
                const last = updated[updated.length - 1];
                if (last?.isStreaming) {
                  updated[updated.length - 1] = { ...last, body: last.body + data.text };
                }
                return updated;
              });
            }
          } catch { /* skip */ }
        }
      }

      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isStreaming) updated[updated.length - 1] = { ...last, isStreaming: false };
        return updated;
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Sorry, an error occurred.";
      setMessages((prev) => {
        const updated = [...prev];
        const last = updated[updated.length - 1];
        if (last?.isStreaming) {
          updated[updated.length - 1] = { ...last, body: errMsg, isStreaming: false };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, messages, ensureConversation]);

  // Don't render on the full chat page
  if (isOnChatPage) return null;

  return (
    <>
      {/* ---- Floating button ---- */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-kairos-gold to-amber-600 text-kairos-royal-dark shadow-lg shadow-kairos-gold/25 flex items-center justify-center hover:scale-105 active:scale-95 transition-transform"
          aria-label="Open AI chat"
        >
          <Sparkles size={24} />
          {coachUnread > 0 && (
            <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 text-white text-[10px] font-bold flex items-center justify-center shadow-md">
              {coachUnread > 9 ? "9+" : coachUnread}
            </span>
          )}
        </button>
      )}

      {/* ---- Chat panel ---- */}
      {open && (
        <div className="fixed bottom-6 right-6 z-50 w-[380px] h-[520px] bg-kairos-royal border border-kairos-border rounded-2xl shadow-2xl shadow-black/40 flex flex-col overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="flex items-center gap-3 px-4 py-3 border-b border-kairos-border bg-kairos-royal-surface/50">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500/30 to-kairos-gold/30 flex items-center justify-center">
              <Sparkles size={16} className="text-kairos-gold" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-heading font-semibold text-white truncate">Everist AI</p>
              <p className="text-[10px] font-body text-green-400">Online</p>
            </div>
            {coachUnread > 0 && (
              <button
                onClick={() => {
                  setOpen(false);
                  router.push("/chat?tab=coach");
                }}
                className="relative p-1.5 rounded-lg text-emerald-400 hover:text-emerald-300 hover:bg-kairos-royal-surface transition-colors"
                title="Open coach chat"
              >
                <UserCircle size={14} />
                <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-500" />
              </button>
            )}
            <button
              onClick={() => {
                setOpen(false);
                router.push("/chat");
              }}
              className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-white hover:bg-kairos-royal-surface transition-colors"
              title="Open full chat"
            >
              <Maximize2 size={14} />
            </button>
            <button
              onClick={() => setOpen(false)}
              className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-white hover:bg-kairos-royal-surface transition-colors"
            >
              <X size={14} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 custom-scrollbar">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <Sparkles size={28} className="text-kairos-gold/40 mb-3" />
                <p className="text-sm font-heading font-semibold text-white mb-1">Ask me anything</p>
                <p className="text-xs font-body text-kairos-silver-dark">
                  I can help with nutrition, exercise, sleep, supplements, and your health data.
                </p>
              </div>
            )}

            {messages.map((msg) => {
              const isMe = msg.role === "client";
              return (
                <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                  <div
                    className={cn(
                      "max-w-[85%] px-3 py-2 rounded-xl",
                      isMe
                        ? "bg-kairos-gold text-kairos-royal-dark rounded-br-sm"
                        : "bg-kairos-card border border-kairos-border text-kairos-silver rounded-bl-sm"
                    )}
                  >
                    {isMe ? (
                      <p className="text-xs font-body">{msg.body}</p>
                    ) : msg.isStreaming && !msg.body ? (
                      <div className="flex items-center gap-1.5 py-0.5">
                        <Loader2 size={12} className="animate-spin text-kairos-gold" />
                        <span className="text-xs font-body text-kairos-silver-dark">Thinking...</span>
                      </div>
                    ) : (
                      <div>{renderMiniMarkdown(msg.body)}</div>
                    )}
                    {msg.isStreaming && msg.body && (
                      <span className="inline-block w-1 h-3 bg-kairos-gold/60 animate-pulse ml-0.5 rounded-sm" />
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div className="px-3 py-2.5 border-t border-kairos-border flex items-center gap-2">
            <input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Ask a question..."
              disabled={isStreaming}
              className="flex-1 bg-kairos-royal-surface border border-kairos-border text-white rounded-lg px-3 py-2 text-xs font-body focus:border-kairos-gold focus:outline-none disabled:opacity-50 placeholder:text-kairos-silver-dark"
            />
            <button
              onClick={handleSend}
              disabled={!input.trim() || isStreaming}
              className="p-2 rounded-lg bg-kairos-gold text-kairos-royal-dark disabled:opacity-30 disabled:cursor-not-allowed hover:bg-kairos-gold/90 transition-colors"
            >
              {isStreaming ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
