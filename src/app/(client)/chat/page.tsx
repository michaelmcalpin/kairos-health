"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import {
  Send,
  Bot,
  User,
  Sparkles,
  Loader2,
  RefreshCw,
  Trash2,
  MessageSquare,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

// ---------------------------------------------------------------------------
// Markdown-lite renderer (bold, italic, bullets, code, links)
// ---------------------------------------------------------------------------

function renderMarkdown(text: string) {
  const lines = text.split("\n");
  const elements: React.ReactNode[] = [];
  let listBuffer: string[] = [];
  let key = 0;

  function flushList() {
    if (listBuffer.length === 0) return;
    elements.push(
      <ul key={key++} className="list-disc list-inside space-y-1 my-2">
        {listBuffer.map((item, i) => (
          <li key={i} className="text-sm font-body">
            {inlineFormat(item)}
          </li>
        ))}
      </ul>
    );
    listBuffer = [];
  }

  function inlineFormat(str: string): React.ReactNode {
    // Process inline formatting: **bold**, *italic*, `code`, [link](url)
    const parts: React.ReactNode[] = [];
    let remaining = str;
    let idx = 0;

    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|\[(.+?)\]\((.+?)\))/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(remaining)) !== null) {
      if (match.index > lastIndex) {
        parts.push(remaining.slice(lastIndex, match.index));
      }
      if (match[2]) {
        parts.push(<strong key={idx++} className="font-semibold text-white">{match[2]}</strong>);
      } else if (match[3]) {
        parts.push(<em key={idx++} className="italic">{match[3]}</em>);
      } else if (match[4]) {
        parts.push(
          <code key={idx++} className="bg-kairos-royal-surface px-1.5 py-0.5 rounded text-xs font-mono text-kairos-gold">
            {match[4]}
          </code>
        );
      } else if (match[5] && match[6]) {
        parts.push(
          <a key={idx++} href={match[6]} target="_blank" rel="noopener noreferrer" className="text-kairos-gold underline hover:text-kairos-gold/80">
            {match[5]}
          </a>
        );
      }
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < remaining.length) {
      parts.push(remaining.slice(lastIndex));
    }

    return parts.length === 1 ? parts[0] : <>{parts}</>;
  }

  for (const line of lines) {
    const trimmed = line.trim();

    // Bullet points
    if (/^[-*•]\s/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^[-*•]\s/, ""));
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(trimmed)) {
      listBuffer.push(trimmed.replace(/^\d+\.\s/, ""));
      continue;
    }

    flushList();

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h4 key={key++} className="font-heading font-semibold text-white text-sm mt-3 mb-1">
          {inlineFormat(trimmed.slice(4))}
        </h4>
      );
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h3 key={key++} className="font-heading font-bold text-white mt-3 mb-1">
          {inlineFormat(trimmed.slice(3))}
        </h3>
      );
    } else if (trimmed === "") {
      elements.push(<div key={key++} className="h-2" />);
    } else {
      elements.push(
        <p key={key++} className="text-sm font-body leading-relaxed">
          {inlineFormat(trimmed)}
        </p>
      );
    }
  }

  flushList();
  return elements;
}

// ---------------------------------------------------------------------------
// Suggested questions
// ---------------------------------------------------------------------------

const SUGGESTED_QUESTIONS = [
  "Give me a full health analysis based on all my data",
  "What do my genetics say about my diet and supplements?",
  "Analyze my sleep patterns and give me recommendations",
  "How are my lab results? Anything outside optimal range?",
  "Review my supplement protocol against my genetic profile",
  "What dietary changes should I make based on my glucose data?",
  "How is my blood pressure trending and what can I improve?",
  "What are my top health priorities right now?",
];

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ChatMessage = {
  id: string;
  role: "client" | "ai_coach";
  body: string;
  createdAt: string;
  isStreaming?: boolean;
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [showSuggestions, setShowSuggestions] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  const utils = trpc.useUtils();

  // Get or create AI conversation
  const startConversation = trpc.clientPortal.messaging.startConversation.useMutation({
    onSuccess: (conv) => {
      setConversationId(conv.id);
    },
  });

  // Load existing AI conversation
  const { data: conversations = [] } = trpc.clientPortal.messaging.listConversations.useQuery(
    { filter: "ai_coach" },
    { staleTime: 30_000 }
  );

  // Load messages from existing conversation
  const existingConvId = conversations[0]?.id;
  const { data: existingMessages = [] } = trpc.clientPortal.messaging.getMessages.useQuery(
    { conversationId: existingConvId ?? "", limit: 50 },
    { enabled: !!existingConvId && chatMessages.length === 0 }
  );

  // Initialize conversation and messages
  useEffect(() => {
    if (existingConvId && !conversationId) {
      setConversationId(existingConvId);
    }
  }, [existingConvId, conversationId]);

  useEffect(() => {
    if (existingMessages.length > 0 && chatMessages.length === 0) {
      setChatMessages(
        existingMessages.map((m) => ({
          id: m.id,
          role: m.senderRole as "client" | "ai_coach",
          body: m.body,
          createdAt: typeof m.createdAt === "string" ? m.createdAt : (m.createdAt as Date)?.toISOString?.() ?? new Date().toISOString(),
        }))
      );
      setShowSuggestions(false);
    }
  }, [existingMessages, chatMessages.length]);

  // Auto-scroll
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // Ensure we have a conversation before sending
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

  // Send message with streaming
  const handleSend = useCallback(
    async (messageText?: string) => {
      const text = (messageText ?? input).trim();
      if (!text || isStreaming) return;

      setInput("");
      setShowSuggestions(false);

      const userMsg: ChatMessage = {
        id: `temp-${Date.now()}`,
        role: "client",
        body: text,
        createdAt: new Date().toISOString(),
      };

      const aiMsg: ChatMessage = {
        id: `ai-${Date.now()}`,
        role: "ai_coach",
        body: "",
        createdAt: new Date().toISOString(),
        isStreaming: true,
      };

      setChatMessages((prev) => [...prev, userMsg, aiMsg]);
      setIsStreaming(true);

      try {
        const convId = await ensureConversation();

        // Build history from existing messages
        const history = chatMessages.map((m) => ({
          role: m.role,
          body: m.body,
        }));

        const controller = new AbortController();
        abortRef.current = controller;

        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: text,
            conversationId: convId,
            history,
          }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.error || `Request failed (${res.status})`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response stream");

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
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.isStreaming) {
                    updated[updated.length - 1] = {
                      ...lastMsg,
                      body: lastMsg.body + data.text,
                    };
                  }
                  return updated;
                });
              } else if (data.type === "done") {
                setChatMessages((prev) => {
                  const updated = [...prev];
                  const lastMsg = updated[updated.length - 1];
                  if (lastMsg && lastMsg.isStreaming) {
                    updated[updated.length - 1] = { ...lastMsg, isStreaming: false };
                  }
                  return updated;
                });
              } else if (data.type === "error") {
                throw new Error(data.error);
              }
            } catch {
              // skip unparseable lines
            }
          }
        }

        // Finalize streaming state
        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.isStreaming) {
            updated[updated.length - 1] = { ...lastMsg, isStreaming: false };
          }
          return updated;
        });

        // Invalidate tRPC cache so conversation list updates
        utils.clientPortal.messaging.listConversations.invalidate();
        utils.clientPortal.messaging.getMessages.invalidate();
      } catch (err) {
        if ((err as Error).name === "AbortError") return;

        setChatMessages((prev) => {
          const updated = [...prev];
          const lastMsg = updated[updated.length - 1];
          if (lastMsg && lastMsg.isStreaming) {
            updated[updated.length - 1] = {
              ...lastMsg,
              body: "I'm sorry, I encountered an error. Please try again.",
              isStreaming: false,
            };
          }
          return updated;
        });
      } finally {
        setIsStreaming(false);
        abortRef.current = null;
        inputRef.current?.focus();
      }
    },
    [input, isStreaming, chatMessages, ensureConversation, utils]
  );

  const handleNewChat = () => {
    setChatMessages([]);
    setConversationId(null);
    setShowSuggestions(true);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  function formatTime(timestamp: string): string {
    const d = new Date(timestamp);
    return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  }

  const hasMessages = chatMessages.length > 0;

  // ---- Render ----
  return (
    <div className="flex flex-col h-[calc(100vh-130px)] animate-fade-in">
      {/* Chat Header */}
      <div className="kairos-card mb-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500/30 to-kairos-gold/30 flex items-center justify-center">
          <Sparkles size={20} className="text-kairos-gold" />
        </div>
        <div className="flex-1">
          <p className="text-sm font-heading font-semibold text-white">Everist AI Health Assistant</p>
          <p className="text-xs font-body text-green-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-green-400" /> Powered by Claude
          </p>
        </div>
        {hasMessages && (
          <button
            onClick={handleNewChat}
            className="text-kairos-silver-dark hover:text-white transition-colors p-2 rounded-lg hover:bg-kairos-royal-surface"
            title="New conversation"
          >
            <RefreshCw size={16} />
          </button>
        )}
      </div>

      {/* ================================================================= */}
      {/* Welcome / Suggestions (when no messages) */}
      {/* ================================================================= */}
      {showSuggestions && !hasMessages && (
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-purple-500/20 to-kairos-gold/20 flex items-center justify-center mb-6">
            <Sparkles size={36} className="text-kairos-gold" />
          </div>
          <h3 className="font-heading font-bold text-xl text-white mb-2">
            Hi! I&apos;m your EVERIST AI health analyst. I have access to your genetics, labs, medications, CGM data, blood pressure, sleep, and protocols
          </h3>
          <p className="text-sm font-body text-kairos-silver-dark text-center max-w-md mb-8">
            I have access to your health data and can help with questions about nutrition, exercise,
            sleep, supplements, and more. What would you like to know?
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-xl">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                onClick={() => handleSend(q)}
                className="text-left px-4 py-3 rounded-xl border border-kairos-border bg-kairos-card hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all text-sm font-body text-kairos-silver-dark hover:text-white group"
              >
                <span className="flex items-start gap-2">
                  <MessageSquare
                    size={14}
                    className="text-kairos-gold/50 group-hover:text-kairos-gold mt-0.5 flex-shrink-0"
                  />
                  {q}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* ================================================================= */}
      {/* Messages */}
      {/* ================================================================= */}
      {hasMessages && (
        <div className="flex-1 overflow-y-auto space-y-4 px-1 custom-scrollbar">
          {chatMessages.map((msg) => {
            const isMe = msg.role === "client";
            return (
              <div key={msg.id} className={`flex ${isMe ? "justify-end" : "justify-start"}`}>
                <div className={`flex gap-2.5 max-w-[80%] ${isMe ? "flex-row-reverse" : ""}`}>
                  {/* Avatar */}
                  <div
                    className={cn(
                      "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 mt-1",
                      isMe
                        ? "bg-kairos-gold/20"
                        : "bg-gradient-to-br from-purple-500/20 to-kairos-gold/20"
                    )}
                  >
                    {isMe ? (
                      <User size={14} className="text-kairos-gold" />
                    ) : (
                      <Sparkles size={14} className="text-kairos-gold" />
                    )}
                  </div>

                  {/* Bubble */}
                  <div>
                    <div
                      className={cn(
                        "px-4 py-3 rounded-2xl",
                        isMe
                          ? "bg-kairos-gold text-kairos-royal-dark rounded-br-sm"
                          : "bg-kairos-card border border-kairos-border text-kairos-silver rounded-bl-sm"
                      )}
                    >
                      {isMe ? (
                        <p className="text-sm font-body">{msg.body}</p>
                      ) : msg.isStreaming && !msg.body ? (
                        <div className="flex items-center gap-2 py-1">
                          <Loader2 size={14} className="animate-spin text-kairos-gold" />
                          <span className="text-sm font-body text-kairos-silver-dark">
                            Thinking...
                          </span>
                        </div>
                      ) : (
                        <div className="prose-kairos">{renderMarkdown(msg.body)}</div>
                      )}

                      {/* Streaming cursor */}
                      {msg.isStreaming && msg.body && (
                        <span className="inline-block w-1.5 h-4 bg-kairos-gold/60 animate-pulse ml-0.5 align-text-bottom rounded-sm" />
                      )}
                    </div>

                    <p
                      className={`text-[10px] font-body text-kairos-silver-dark mt-1 ${
                        isMe ? "text-right" : ""
                      }`}
                    >
                      {msg.isStreaming ? "" : formatTime(msg.createdAt)}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>
      )}

      {/* ================================================================= */}
      {/* Input */}
      {/* ================================================================= */}
      <div className="mt-4 flex items-center gap-2">
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isStreaming ? "Waiting for response..." : "Ask about your health, nutrition, exercise..."}
          disabled={isStreaming}
          className="kairos-input flex-1 disabled:opacity-50"
        />
        <button
          onClick={() => handleSend()}
          disabled={!input.trim() || isStreaming}
          className="kairos-btn-gold p-2.5 disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {isStreaming ? (
            <Loader2 size={16} className="animate-spin" />
          ) : (
            <Send size={16} />
          )}
        </button>
      </div>

      {/* Disclaimer */}
      <p className="text-[10px] font-body text-kairos-silver-dark text-center mt-2">
        EVERIST AI analyzes your complete health profile including genetics, labs, CGM, and protocols. Always consult your healthcare provider before making changes to your health regimen.
      </p>
    </div>
  );
}
