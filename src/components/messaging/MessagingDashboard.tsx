"use client";

import { useState, useCallback } from "react";
import type { Conversation, ConversationFilter } from "@/lib/messaging/types";
import { CLIENT_QUICK_REPLIES, COACH_QUICK_REPLIES } from "@/lib/messaging/types";
import { getTypingUsers, setTyping } from "@/lib/messaging/typing";
import { trpc } from "@/lib/trpc";
import { ConversationList } from "./ConversationList";
import { ChatView } from "./ChatView";

interface MessagingDashboardProps {
  userId: string;
  role: "client" | "coach";
  userName: string;
}

export function MessagingDashboard({ userId, role, userName }: MessagingDashboardProps) {
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const utils = trpc.useUtils();

  // ── tRPC queries (role-based) ─────────────────────────────────

  const conversationsQuery = role === "client"
    ? trpc.clientPortal.messaging.listConversations.useQuery({ filter })
    : trpc.coach.messaging.listConversations.useQuery({ filter });

  const statsQuery = role === "client"
    ? trpc.clientPortal.messaging.getStats.useQuery()
    : trpc.coach.messaging.getStats.useQuery();

  const messagesQuery = selectedConversation
    ? (role === "client"
        ? trpc.clientPortal.messaging.getMessages.useQuery({ conversationId: selectedConversation.id })
        : trpc.coach.messaging.getMessages.useQuery({ conversationId: selectedConversation.id }))
    : { data: undefined };

  // ── tRPC mutations ────────────────────────────────────────────

  const sendMessageMutation = role === "client"
    ? trpc.clientPortal.messaging.sendMessage.useMutation({
        onSuccess: () => invalidateAll(),
      })
    : trpc.coach.messaging.sendMessage.useMutation({
        onSuccess: () => invalidateAll(),
      });

  const markAsReadMutation = role === "client"
    ? trpc.clientPortal.messaging.markAsRead.useMutation({
        onSuccess: () => invalidateAll(),
      })
    : trpc.coach.messaging.markAsRead.useMutation({
        onSuccess: () => invalidateAll(),
      });

  const clientStartConv = trpc.clientPortal.messaging.startConversation.useMutation({
    onSuccess: (conv) => {
      setSelectedConversation(conv);
      invalidateAll();
    },
  });
  const coachStartConv = trpc.coach.messaging.startConversation.useMutation({
    onSuccess: (conv) => {
      setSelectedConversation(conv);
      invalidateAll();
    },
  });

  function invalidateAll() {
    if (role === "client") {
      utils.clientPortal.messaging.listConversations.invalidate();
      utils.clientPortal.messaging.getStats.invalidate();
      if (selectedConversation) {
        utils.clientPortal.messaging.getMessages.invalidate({ conversationId: selectedConversation.id });
      }
    } else {
      utils.coach.messaging.listConversations.invalidate();
      utils.coach.messaging.getStats.invalidate();
      if (selectedConversation) {
        utils.coach.messaging.getMessages.invalidate({ conversationId: selectedConversation.id });
      }
    }
  }

  // ── Derived data ──────────────────────────────────────────────

  const conversations = conversationsQuery.data ?? [];
  const stats = statsQuery.data ?? {
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    unreadMessages: 0,
    avgResponseTimeMinutes: 0,
    messagesThisWeek: 0,
  };
  const currentMessages = messagesQuery.data ?? [];

  const typingUsers = selectedConversation
    ? getTypingUsers(selectedConversation.id, userId)
    : [];

  const quickReplies = role === "coach" ? COACH_QUICK_REPLIES : CLIENT_QUICK_REPLIES;

  // ── Handlers ──────────────────────────────────────────────────

  const handleSendMessage = useCallback(
    (body: string, replyTo?: string | null) => {
      if (!selectedConversation) return;
      sendMessageMutation.mutate({
        conversationId: selectedConversation.id,
        body,
        replyTo: replyTo ?? null,
      });
    },
    [selectedConversation, sendMessageMutation],
  );

  const handleTyping = useCallback(() => {
    if (!selectedConversation) return;
    setTyping(userId, userName, selectedConversation.id);
  }, [selectedConversation, userId, userName]);

  const handleMarkAsRead = useCallback(() => {
    if (!selectedConversation) return;
    markAsReadMutation.mutate({ conversationId: selectedConversation.id });
  }, [selectedConversation, markAsReadMutation]);

  const handleNewConversation = useCallback(() => {
    if (role === "client") {
      clientStartConv.mutate({
        coachId: null,
        coachName: "AI Health Coach",
        isAiCoach: true,
      });
    }
  }, [role, clientStartConv]);

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      setSelectedConversation(conv);
    },
    [],
  );

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col">
      {/* Stats Bar */}
      <div className="grid grid-cols-4 gap-4 mb-4">
        <div className="kairos-card p-3">
          <p className="text-xs text-gray-400">Conversations</p>
          <p className="text-xl font-heading font-bold text-white">{stats.totalConversations}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-xs text-gray-400">Unread</p>
          <p className="text-xl font-heading font-bold text-kairos-gold">{stats.unreadMessages}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-xs text-gray-400">This Week</p>
          <p className="text-xl font-heading font-bold text-white">{stats.messagesThisWeek}</p>
        </div>
        <div className="kairos-card p-3">
          <p className="text-xs text-gray-400">
            {role === "coach" ? "Avg Response" : "Active"}
          </p>
          <p className="text-xl font-heading font-bold text-white">
            {role === "coach"
              ? stats.avgResponseTimeMinutes > 0
                ? `${stats.avgResponseTimeMinutes}m`
                : "—"
              : stats.activeConversations}
          </p>
        </div>
      </div>

      {/* Chat Interface */}
      <div className="flex-1 kairos-card overflow-hidden flex">
        {/* Conversation sidebar */}
        <div className="w-80 flex-shrink-0">
          <ConversationList
            conversations={conversations}
            selectedId={selectedConversation?.id ?? null}
            onSelect={handleSelectConversation}
            onNewConversation={handleNewConversation}
            filter={filter}
            onFilterChange={setFilter}
          />
        </div>

        {/* Chat area */}
        <div className="flex-1">
          {selectedConversation ? (
            <ChatView
              conversation={selectedConversation}
              messages={currentMessages}
              currentUserId={userId}
              currentUserRole={role}
              typingUsers={typingUsers}
              quickReplies={quickReplies}
              onSendMessage={handleSendMessage}
              onTyping={handleTyping}
              onMarkAsRead={handleMarkAsRead}
              onBack={() => setSelectedConversation(null)}
            />
          ) : (
            <div className="h-full flex items-center justify-center text-center">
              <div>
                <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center mx-auto mb-4">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" className="text-gray-600">
                    <path
                      d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
                <h3 className="text-white font-heading font-semibold mb-1">Select a conversation</h3>
                <p className="text-sm text-gray-500">
                  Choose a conversation from the left to start messaging.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
