"use client";

import { useState, useCallback, useEffect } from "react";
import type { Conversation, ConversationFilter } from "@/lib/messaging/types";
import { CLIENT_QUICK_REPLIES, COACH_QUICK_REPLIES } from "@/lib/messaging/types";
import { getTypingUsers, setTyping } from "@/lib/messaging/typing";
import { trpc } from "@/lib/trpc";
import { ConversationList } from "./ConversationList";
import { ChatView } from "./ChatView";

interface AssignedClient {
  id: string;
  name: string;
  email: string;
  initials: string;
}

interface MessagingDashboardProps {
  userId: string;
  role: "client" | "coach";
  userName: string;
  initialConversationId?: string | null;
}

export function MessagingDashboard({ userId, role, userName, initialConversationId }: MessagingDashboardProps) {
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [didAutoSelect, setDidAutoSelect] = useState(false);
  const [showClientPicker, setShowClientPicker] = useState(false);
  const [clientSearch, setClientSearch] = useState("");
  const utils = trpc.useUtils();

  // For coaches: fetch assigned clients so they can start new conversations
  const clientsQuery = trpc.coach.clients.list.useQuery(undefined, {
    enabled: role === "coach",
  });

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

  // ── Auto-select conversation from deep link ───────────────────
  useEffect(() => {
    if (didAutoSelect || !initialConversationId) return;
    const convos = conversationsQuery.data;
    if (!convos) return; // still loading
    const match = convos.find((c: Conversation) => c.id === initialConversationId);
    if (match) {
      setSelectedConversation(match);
      setDidAutoSelect(true);
    } else if (convos.length > 0) {
      // Conversation might not be in first page — still mark as attempted
      setDidAutoSelect(true);
    }
  }, [initialConversationId, conversationsQuery.data, didAutoSelect]);

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
      // Transform raw DB record into Conversation shape
      const enriched: Conversation = {
        id: conv.id,
        coachId: conv.trainerId ?? null,
        clientId: conv.clientId,
        coachName: "AI Health Coach",
        clientName: userName,
        isAiCoach: conv.isAiTrainer ?? false,
        lastMessage: null,
        unreadCount: 0,
        createdAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : new Date().toISOString(),
        updatedAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : new Date().toISOString(),
      };
      setSelectedConversation(enriched);
      invalidateAll();
    },
  });
  const coachStartConv = trpc.coach.messaging.startConversation.useMutation({
    onSuccess: (conv) => {
      const client = (clientsQuery.data ?? []).find((c: AssignedClient) => c.id === conv.clientId);
      const clientName = client?.name || "Client";
      const enriched: Conversation = {
        id: conv.id,
        coachId: conv.trainerId ?? null,
        clientId: conv.clientId,
        coachName: userName,
        clientName,
        isAiCoach: false,
        lastMessage: null,
        unreadCount: 0,
        createdAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : new Date().toISOString(),
        updatedAt: conv.lastMessageAt ? new Date(conv.lastMessageAt).toISOString() : new Date().toISOString(),
      };
      setSelectedConversation(enriched);
      setShowClientPicker(false);
      setClientSearch("");
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
  interface MessagingStats {
    totalConversations: number;
    activeConversations: number;
    totalMessages: number;
    unreadMessages: number;
    avgResponseTimeMinutes: number;
    messagesThisWeek: number;
  }
  const defaultStats: MessagingStats = {
    totalConversations: 0,
    activeConversations: 0,
    totalMessages: 0,
    unreadMessages: 0,
    avgResponseTimeMinutes: 0,
    messagesThisWeek: 0,
  };
  const stats: MessagingStats = { ...defaultStats, ...statsQuery.data };
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
    } else {
      // Coach: open client picker to choose who to message
      setShowClientPicker(true);
    }
  }, [role, clientStartConv]);

  const handleStartCoachConversation = useCallback((client: AssignedClient) => {
    coachStartConv.mutate({
      clientId: client.id,
      clientName: client.name,
    });
  }, [coachStartConv]);

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
                  {role === "coach"
                    ? "Choose a conversation from the left, or click + to message a client."
                    : "Choose a conversation from the left to start messaging."}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Client Picker Modal (Coach only) */}
      {showClientPicker && role === "coach" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="bg-kairos-card border border-kairos-border rounded-xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-kairos-border">
              <h3 className="text-white font-heading font-semibold">New Conversation</h3>
              <button
                onClick={() => { setShowClientPicker(false); setClientSearch(""); }}
                className="text-gray-400 hover:text-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            <div className="p-4">
              <input
                type="text"
                value={clientSearch}
                onChange={(e) => setClientSearch(e.target.value)}
                placeholder="Search clients..."
                className="kairos-input w-full mb-3"
                autoFocus
              />
              <div className="max-h-64 overflow-y-auto space-y-1">
                {(clientsQuery.data ?? [])
                  .filter((c: AssignedClient) => {
                    if (!clientSearch) return true;
                    const q = clientSearch.toLowerCase();
                    return c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q);
                  })
                  .map((c: AssignedClient) => (
                    <button
                      key={c.id}
                      onClick={() => handleStartCoachConversation(c)}
                      disabled={coachStartConv.isPending}
                      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-kairos-card-hover transition-colors text-left disabled:opacity-50"
                    >
                      <div className="w-9 h-9 rounded-full bg-kairos-gold/15 text-kairos-gold flex items-center justify-center text-sm font-semibold flex-shrink-0">
                        {c.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.name}</p>
                        {c.email && <p className="text-xs text-gray-500 truncate">{c.email}</p>}
                      </div>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 flex-shrink-0">
                        <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2v10z" />
                      </svg>
                    </button>
                  ))}
                {(clientsQuery.data ?? []).length === 0 && !clientsQuery.isLoading && (
                  <p className="text-center text-gray-500 text-sm py-4">No assigned clients yet.</p>
                )}
                {clientsQuery.isLoading && (
                  <p className="text-center text-gray-500 text-sm py-4">Loading clients...</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
