"use client";

import { useState, useRef, useEffect } from "react";
import type { Message, Conversation, TypingIndicator, QuickReply } from "@/lib/messaging/types";
import { formatMessageTime, groupMessagesByDate } from "@/lib/messaging/types";

interface ChatViewProps {
  conversation: Conversation;
  messages: Message[];
  currentUserId: string;
  currentUserRole: "client" | "coach";
  typingUsers: TypingIndicator[];
  quickReplies: QuickReply[];
  onSendMessage: (body: string, replyTo?: string | null) => void;
  onTyping: () => void;
  onMarkAsRead: () => void;
  onBack?: () => void;
}

export function ChatView({
  conversation,
  messages,
  currentUserId,
  currentUserRole,
  typingUsers,
  quickReplies,
  onSendMessage,
  onTyping,
  onMarkAsRead,
  onBack,
}: ChatViewProps) {
  const [inputValue, setInputValue] = useState("");
  const [replyTo, setReplyTo] = useState<Message | null>(null);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length]);

  // Mark as read when viewing
  useEffect(() => {
    onMarkAsRead();
  }, [conversation.id, onMarkAsRead]);

  const handleInputChange = (value: string) => {
    setInputValue(value);

    // Debounced typing indicator
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    if (value.trim()) {
      onTyping();
      typingTimeoutRef.current = setTimeout(() => {
        // Typing stopped
      }, 3000);
    }
  };

  const handleSend = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;

    onSendMessage(trimmed, replyTo?.id ?? null);
    setInputValue("");
    setReplyTo(null);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleQuickReply = (qr: QuickReply) => {
    setInputValue(qr.body);
    setShowQuickReplies(false);
    inputRef.current?.focus();
  };

  const otherName = currentUserRole === "client"
    ? (conversation.isAiCoach ? "AI Health Trainer" : conversation.coachName)
    : conversation.clientName;

  // Group messages by date
  const grouped = groupMessagesByDate(messages);
  const dateGroups = Array.from(grouped.entries());

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="flex items-center gap-3 p-4 border-b border-gray-800">
        {onBack && (
          <button
            onClick={onBack}
            className="text-gray-400 hover:text-white transition-colors lg:hidden"
          >
            <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
              <path d="M12 4l-6 6 6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        )}

        <div
          className={`w-10 h-10 rounded-full flex items-center justify-center ${
            conversation.isAiCoach
              ? "bg-purple-500/20 text-purple-400"
              : "bg-kairos-royal/50 text-kairos-gold"
          }`}
        >
          {conversation.isAiCoach ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1.27c.34.6.73 1.26.73 2a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V14a5 5 0 00-5-5h-1v1.27c.6.34 1 .99 1 1.73a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V9h-1a5 5 0 00-5 5v1.27c.6.34 1 .99 1 1.73a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V14a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"
                fill="currentColor"
              />
            </svg>
          ) : (
            <span className="text-sm font-semibold">{otherName.charAt(0).toUpperCase()}</span>
          )}
        </div>

        <div className="flex-1">
          <h3 className="text-sm font-semibold text-white">{otherName}</h3>
          <p className="text-xs text-gray-400">
            {conversation.isAiCoach ? "Always available" : "Trainer"}
          </p>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {dateGroups.map(([dateLabel, msgs]) => (
          <div key={dateLabel}>
            {/* Date Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-gray-800" />
              <span className="text-xs text-gray-500 font-medium">{dateLabel}</span>
              <div className="flex-1 h-px bg-gray-800" />
            </div>

            {/* Messages for this date */}
            <div className="space-y-3">
              {msgs.map((msg) => {
                const isOwn = msg.senderId === currentUserId;
                const isSystem = msg.senderRole === "system";

                if (isSystem) {
                  return (
                    <div key={msg.id} className="flex justify-center">
                      <span className="text-xs text-gray-500 bg-gray-800/50 px-3 py-1 rounded-full">
                        {msg.body}
                      </span>
                    </div>
                  );
                }

                return (
                  <div
                    key={msg.id}
                    className={`flex ${isOwn ? "justify-end" : "justify-start"}`}
                  >
                    <div className={`max-w-[75%] ${isOwn ? "order-2" : "order-1"}`}>
                      {/* Reply context */}
                      {msg.replyTo && (
                        <div className="text-xs text-gray-500 mb-1 pl-3 border-l-2 border-gray-700">
                          Replying to a message
                        </div>
                      )}

                      <div
                        className={`rounded-2xl px-4 py-2.5 ${
                          isOwn
                            ? "bg-kairos-gold/20 text-white rounded-br-md"
                            : msg.isAiMessage
                              ? "bg-purple-500/10 text-gray-200 rounded-bl-md"
                              : "bg-gray-800 text-gray-200 rounded-bl-md"
                        }`}
                      >
                        {!isOwn && (
                          <p className="text-xs font-medium text-kairos-gold mb-1">
                            {msg.senderName ?? msg.senderRole}
                          </p>
                        )}
                        <p className="text-sm whitespace-pre-wrap break-words">{msg.body}</p>
                      </div>

                      {/* Time and read status */}
                      <div
                        className={`flex items-center gap-1.5 mt-1 ${
                          isOwn ? "justify-end" : "justify-start"
                        }`}
                      >
                        <span className="text-[10px] text-gray-600">
                          {formatMessageTime(msg.createdAt)}
                        </span>
                        {isOwn && (
                          <span className="text-[10px]">
                            {msg.readAt ? (
                              <span className="text-kairos-gold" title="Read">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                  <path d="M2 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                  <path d="M6 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.5" />
                                </svg>
                              </span>
                            ) : (
                              <span className="text-gray-600" title="Sent">
                                <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
                                  <path d="M2 8l3 3 7-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                              </span>
                            )}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}

        {/* Typing indicator */}
        {typingUsers.length > 0 && (
          <div className="flex items-center gap-2 text-gray-400">
            <div className="flex gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
            <span className="text-xs">
              {typingUsers.map((t) => t.userName).join(", ")} typing...
            </span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Reply banner */}
      {replyTo && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-800/30 flex items-center justify-between">
          <div className="text-xs text-gray-400">
            <span className="text-kairos-gold">Replying to {replyTo.senderName ?? replyTo.senderRole}</span>
            <p className="truncate max-w-[300px]">{replyTo.body}</p>
          </div>
          <button
            onClick={() => setReplyTo(null)}
            className="text-gray-500 hover:text-gray-300"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
              <path d="M4 4l8 8M12 4l-8 8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick Replies */}
      {showQuickReplies && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-800/30">
          <div className="flex flex-wrap gap-2">
            {quickReplies.map((qr) => (
              <button
                key={qr.id}
                onClick={() => handleQuickReply(qr)}
                className="px-3 py-1.5 rounded-full bg-gray-700 text-xs text-gray-300 hover:bg-gray-600 hover:text-white transition-colors"
              >
                {qr.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Input Area */}
      <div className="p-4 border-t border-gray-800">
        <div className="flex items-end gap-2">
          <button
            onClick={() => setShowQuickReplies(!showQuickReplies)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              showQuickReplies
                ? "bg-kairos-gold/20 text-kairos-gold"
                : "text-gray-500 hover:text-gray-300 hover:bg-gray-800"
            }`}
            title="Quick replies"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 8a6 6 0 01-6 6H3l1.5-1.5A6 6 0 1114 8z" stroke="currentColor" strokeWidth="1.5" />
            </svg>
          </button>

          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => handleInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type a message..."
              rows={1}
              className="w-full px-4 py-2.5 bg-gray-800/50 border border-gray-700 rounded-xl text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50 resize-none"
              style={{ maxHeight: 120 }}
            />
          </div>

          <button
            onClick={handleSend}
            disabled={!inputValue.trim()}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors flex-shrink-0 ${
              inputValue.trim()
                ? "bg-kairos-gold text-kairos-royal hover:bg-kairos-gold/80"
                : "bg-gray-800 text-gray-600 cursor-not-allowed"
            }`}
            title="Send"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M14 2L7 9M14 2l-4 12-3-5-5-3 12-4z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
