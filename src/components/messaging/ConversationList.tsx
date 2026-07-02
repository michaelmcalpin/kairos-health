"use client";

import { useState } from "react";
import type { Conversation, ConversationFilter } from "@/lib/messaging/types";
import { formatMessageTime } from "@/lib/messaging/types";

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: string | null;
  onSelect: (conversation: Conversation) => void;
  onNewConversation: () => void;
  filter: ConversationFilter;
  onFilterChange: (filter: ConversationFilter) => void;
}

const FILTERS: { value: ConversationFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "unread", label: "Unread" },
  { value: "human_coach", label: "Coach" },
  { value: "ai_coach", label: "AI Coach" },
];

export function ConversationList({
  conversations,
  selectedId,
  onSelect,
  onNewConversation,
  filter,
  onFilterChange,
}: ConversationListProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = conversations.filter((c) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      c.coachName.toLowerCase().includes(q) ||
      c.clientName.toLowerCase().includes(q) ||
      c.lastMessage?.body.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col h-full border-r border-gray-800">
      {/* Header */}
      <div className="p-4 border-b border-gray-800">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-heading font-semibold text-white">Messages</h2>
          <button
            onClick={onNewConversation}
            className="w-8 h-8 rounded-full bg-kairos-gold/10 text-kairos-gold hover:bg-kairos-gold/20 flex items-center justify-center transition-colors"
            title="New conversation"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="relative mb-3">
          <svg
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
            width="14"
            height="14"
            viewBox="0 0 16 16"
            fill="none"
          >
            <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="2" />
            <path d="M11 11l3.5 3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full pl-9 pr-3 py-2 bg-gray-800/50 border border-gray-700 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>

        {/* Filters */}
        <div className="flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => onFilterChange(f.value)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filter === f.value
                  ? "bg-kairos-gold/20 text-kairos-gold"
                  : "text-gray-400 hover:text-gray-300 hover:bg-gray-800"
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-gray-500 text-sm">
            {searchQuery ? "No conversations match your search." : "No conversations yet."}
          </div>
        ) : (
          filtered.map((conv) => (
            <button
              key={conv.id}
              onClick={() => onSelect(conv)}
              className={`w-full p-4 text-left border-b border-gray-800/50 hover:bg-gray-800/30 transition-colors ${
                selectedId === conv.id ? "bg-gray-800/50 border-l-2 border-l-kairos-gold" : ""
              }`}
            >
              <div className="flex items-start gap-3">
                {/* Avatar */}
                <div
                  className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                    conv.isAiCoach
                      ? "bg-purple-500/20 text-purple-400"
                      : "bg-kairos-royal/50 text-kairos-gold"
                  }`}
                >
                  {conv.isAiCoach ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path
                        d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7v1h1.27c.34.6.73 1.26.73 2a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V14a5 5 0 00-5-5h-1v1.27c.6.34 1 .99 1 1.73a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V9h-1a5 5 0 00-5 5v1.27c.6.34 1 .99 1 1.73a2 2 0 01-4 0c0-.74.4-1.39 1-1.73V14a7 7 0 017-7h1V5.73c-.6-.34-1-.99-1-1.73a2 2 0 012-2z"
                        fill="currentColor"
                      />
                    </svg>
                  ) : (
                    <span className="text-sm font-semibold">
                      {conv.coachName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-white truncate">
                      {conv.isAiCoach ? "AI Health Coach" : conv.coachName}
                    </span>
                    {conv.lastMessage && (
                      <span className="text-xs text-gray-500 flex-shrink-0 ml-2">
                        {formatMessageTime(conv.lastMessage.createdAt)}
                      </span>
                    )}
                  </div>

                  {conv.lastMessage ? (
                    <p className="text-xs text-gray-400 mt-0.5 truncate">
                      {conv.lastMessage.senderRole === "system"
                        ? conv.lastMessage.body
                        : `${conv.lastMessage.senderName}: ${conv.lastMessage.body}`}
                    </p>
                  ) : (
                    <p className="text-xs text-gray-500 mt-0.5">No messages yet</p>
                  )}
                </div>

                {/* Unread badge */}
                {conv.unreadCount > 0 && (
                  <span className="w-5 h-5 rounded-full bg-kairos-gold text-kairos-royal text-xs font-bold flex items-center justify-center flex-shrink-0">
                    {conv.unreadCount > 9 ? "9+" : conv.unreadCount}
                  </span>
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
}
