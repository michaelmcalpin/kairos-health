"use client";

import { useState, useCallback } from "react";
import type { Conversation, ConversationFilter } from "@/lib/messaging/types";
import { CLIENT_QUICK_REPLIES, COACH_QUICK_REPLIES } from "@/lib/messaging/types";
import {
  listConversations,
  getOrCreateConversation,
  sendMessage as engineSendMessage,
  getMessages,
  markAsRead,
  getTypingUsers,
  setTyping,
  getMessagingStats,
  getConversationForUser,
} from "@/lib/messaging/engine";
import { ConversationList } from "./ConversationList";
import { ChatView } from "./ChatView";

interface MessagingDashboardProps {
  userId: string;
  role: "client" | "coach";
  userName: string;
}

// Mock data for demo
function seedDemoConversations(userId: string, role: "client" | "coach") {
  if (role === "client") {
    // Create a coach conversation
    const conv1 = getOrCreateConversation(userId, "You", "coach-1", "Dr. Sarah Mitchell", false);
    engineSendMessage(conv1.id, "coach-1", "Dr. Sarah Mitchell", "coach", "Welcome to KAIROS! I'm Dr. Mitchell, your health optimization coach. How are you feeling today?");
    engineSendMessage(conv1.id, userId, "You", "client", "Hi Dr. Mitchell! I'm excited to get started. My main goals are improving my sleep quality and glucose stability.");
    engineSendMessage(conv1.id, "coach-1", "Dr. Sarah Mitchell", "coach", "Those are great goals! I've reviewed your onboarding data. Your sleep score average of 68 has room for improvement. Let's start with some evening routine adjustments.");
    engineSendMessage(conv1.id, userId, "You", "client", "That sounds perfect. What changes would you recommend?");
    engineSendMessage(conv1.id, "coach-1", "Dr. Sarah Mitchell", "coach", "Three key changes: 1) No screens 30 min before bed, 2) Keep your bedroom at 65-68°F, and 3) Try magnesium glycinate 400mg about an hour before sleep. These alone can improve sleep score by 15-20 points.");

    // AI coach conversation
    const conv2 = getOrCreateConversation(userId, "You", null, "AI Health Coach", true);
    engineSendMessage(conv2.id, null, "AI Health Coach", "ai_coach", "I've analyzed your glucose data from this week. Your time-in-range improved to 78% — that's a 5% increase from last week! Would you like me to break down what contributed to this improvement?", true);
  } else {
    // Coach view with client conversations
    const conv1 = getOrCreateConversation("client-1", "Alex Thompson", userId, "You", false);
    engineSendMessage(conv1.id, "client-1", "Alex Thompson", "client", "My glucose spiked to 180 after dinner last night. Should I be worried?");
    engineSendMessage(conv1.id, userId, "You", "coach", "Let's take a look at what you ate. Can you share your dinner details? A single spike isn't concerning, but I want to help you understand the trigger.");
    engineSendMessage(conv1.id, "client-1", "Alex Thompson", "client", "Had pasta with garlic bread and a glass of wine. I know... probably not the best combo for glucose.");

    const conv2 = getOrCreateConversation("client-2", "Jordan Chen", userId, "You", false);
    engineSendMessage(conv2.id, "client-2", "Jordan Chen", "client", "Hey coach! Just wanted to share that I hit my 7-hour sleep goal for 5 days straight!");
    engineSendMessage(conv2.id, userId, "You", "coach", "That's incredible progress, Jordan! Your consistency is really showing. How are you feeling energy-wise during the day?");

    const conv3 = getOrCreateConversation("client-3", "Maria Santos", userId, "You", false);
    engineSendMessage(conv3.id, "client-3", "Maria Santos", "client", "I'm struggling with supplement adherence. It's hard to remember everything.");
  }
}

export function MessagingDashboard({ userId, role, userName }: MessagingDashboardProps) {
  const [filter, setFilter] = useState<ConversationFilter>("all");
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [seeded, setSeeded] = useState(false);

  // Seed demo data once
  if (!seeded) {
    seedDemoConversations(userId, role);
    setSeeded(true);
  }

  const conversations = listConversations(userId, role, filter);
  const stats = getMessagingStats(userId, role);

  const currentMessages = selectedConversation
    ? getMessages(selectedConversation.id)
    : [];

  const typingUsers = selectedConversation
    ? getTypingUsers(selectedConversation.id, userId)
    : [];

  const quickReplies = role === "coach" ? COACH_QUICK_REPLIES : CLIENT_QUICK_REPLIES;

  const refresh = useCallback(() => setRefreshKey((k) => k + 1), []);

  const handleSendMessage = useCallback(
    (body: string, replyTo?: string | null) => {
      if (!selectedConversation) return;
      engineSendMessage(
        selectedConversation.id,
        userId,
        userName,
        role,
        body,
        false,
        replyTo ?? null,
      );
      refresh();
    },
    [selectedConversation, userId, userName, role, refresh],
  );

  const handleTyping = useCallback(() => {
    if (!selectedConversation) return;
    setTyping(userId, userName, selectedConversation.id);
  }, [selectedConversation, userId, userName]);

  const handleMarkAsRead = useCallback(() => {
    if (!selectedConversation) return;
    markAsRead(selectedConversation.id, userId);
    refresh();
  }, [selectedConversation, userId, refresh]);

  const handleNewConversation = useCallback(() => {
    if (role === "client") {
      // Start AI coach conversation
      const conv = getOrCreateConversation(userId, userName, null, "AI Health Coach", true);
      setSelectedConversation(conv);
      refresh();
    }
  }, [userId, userName, role, refresh]);

  const handleSelectConversation = useCallback(
    (conv: Conversation) => {
      // Get fresh version with unread count
      const fresh = getConversationForUser(conv.id, userId);
      setSelectedConversation(fresh ?? conv);
    },
    [userId],
  );

  return (
    <div className="h-[calc(100vh-120px)] flex flex-col" key={refreshKey}>
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
