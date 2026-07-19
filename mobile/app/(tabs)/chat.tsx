/**
 * Chat tab -- full-featured chat screen with AI Assistant and Coach Chat tabs.
 *
 * Uses tRPC hooks (clientPortal.chat.getHistory, clientPortal.chat.sendMessage)
 * for live data with automatic sample-data fallback when the API is unreachable.
 *
 * Features:
 * - Pill-style tab toggle between AI Assistant and Coach Chat
 * - Message bubbles with avatars and timestamps
 * - Typing indicator with pulsing dots
 * - Quick action chips for common queries
 * - Input bar with send, attachment, and voice buttons
 * - Coach online status and read receipts
 * - Keyboard-avoiding layout
 */

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Pressable,
  ListRenderItemInfo,
  RefreshControl,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Sparkles, Wifi } from "lucide-react-native";

import { useAuth } from "@clerk/clerk-expo";

import { Colors, Spacing, FontSizes, Radii, API_URL } from "@/lib/constants";
import { trpc, REALTIME_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";
import { TabSelector, type ChatTab } from "@/components/chat/TabSelector";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { QuickActionChips } from "@/components/chat/QuickActionChips";
import { ChatInput } from "@/components/chat/ChatInput";

// ---------------------------------------------------------------------------
// Types & Sample Data Fallback
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  isRead?: boolean;
}

/**
 * Map backend messages (from clientPortal.messaging.getMessages) to the
 * ChatMessage[] shape used by the UI. Backend message shape:
 * { id, conversationId, senderId, senderRole, isAiMessage, body, readAt, createdAt }
 */
function mapApiMessages(raw: any[]): ChatMessage[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((m: any, idx: number) => ({
    id: m.id ?? `msg-${idx}`,
    content: m.body ?? "",
    timestamp: m.createdAt ?? new Date().toISOString(),
    isUser: m.senderRole === "client",
    isRead: m.readAt != null,
  }));
}

/**
 * Parse an SSE (text/event-stream) response body from /api/chat into the
 * full assistant reply text. React Native fetch buffers the whole body,
 * so we read it as text and join the "text" delta events.
 */
function parseSSEReply(sseText: string): string {
  let reply = "";
  for (const line of sseText.split("\n")) {
    if (!line.startsWith("data: ")) continue;
    try {
      const evt = JSON.parse(line.slice(6));
      if (evt.type === "text" && evt.text) reply += evt.text;
      if (evt.type === "error") throw new Error(evt.error);
    } catch (e) {
      if (e instanceof Error && e.message && !e.message.includes("JSON")) throw e;
      // Ignore JSON parse errors on partial lines
    }
  }
  return reply;
}

// ---------------------------------------------------------------------------
// AI Assistant Tab
// ---------------------------------------------------------------------------

function AIAssistantTab() {
  const { getToken } = useAuth();

  // ---- Step 1: ensure an AI conversation exists (idempotent get-or-create) ----
  const startConversationMutation = trpc.clientPortal.messaging.startConversation.useMutation();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    startConversationMutation.mutate(
      { coachId: null, coachName: "Everist AI", isAiCoach: true },
      {
        onSuccess: (conv: any) => {
          if (conv?.id) setConversationId(conv.id);
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---- Step 2: fetch message history for this conversation ----
  const historyQuery = trpc.clientPortal.messaging.getMessages.useQuery(
    { conversationId: conversationId ?? "", limit: 50 },
    { ...REALTIME_QUERY_OPTIONS, enabled: !!conversationId },
  );

  const apiMessages: ChatMessage[] = historyQuery.data
    ? mapApiMessages(historyQuery.data as any)
    : [];

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messages = [...apiMessages, ...localMessages];

  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Clear optimistic local messages once the server returns fresh data
  useEffect(() => {
    if (historyQuery.data) {
      setLocalMessages([]);
    }
  }, [historyQuery.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await historyQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [historyQuery]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  /**
   * Send a message to the AI via POST /api/chat.
   * The endpoint persists both the user message and the AI reply,
   * then we refetch history to display them.
   */
  const sendToAI = useCallback(
    async (text: string) => {
      const userMessage: ChatMessage = {
        id: `user-${Date.now()}`,
        content: text,
        timestamp: new Date().toISOString(),
        isUser: true,
      };
      setLocalMessages((prev) => [...prev, userMessage]);
      setIsTyping(true);

      try {
        const token = await getToken();
        const history = apiMessages.slice(-20).map((m) => ({
          role: m.isUser ? "client" : "ai_coach",
          body: m.content,
        }));

        const res = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            message: text,
            conversationId: conversationId ?? undefined,
            history,
          }),
        });

        if (!res.ok) {
          const err = await res.json().catch(() => null);
          throw new Error(err?.error ?? `Request failed (${res.status})`);
        }

        // The endpoint streams SSE; RN fetch buffers the full body
        const sseText = await res.text();
        const reply = parseSSEReply(sseText);

        setIsTyping(false);
        if (reply) {
          // Show the reply immediately, then sync with the server copy
          setLocalMessages((prev) => [
            ...prev,
            {
              id: `ai-${Date.now()}`,
              content: reply,
              timestamp: new Date().toISOString(),
              isUser: false,
            },
          ]);
        }
        historyQuery.refetch();
      } catch (error: any) {
        setIsTyping(false);
        setLocalMessages((prev) => [
          ...prev,
          {
            id: `error-${Date.now()}`,
            content:
              error?.message?.includes("not configured")
                ? "AI chat is not configured yet. Please contact support."
                : "Sorry, your message could not be sent. Please check your connection and try again.",
            timestamp: new Date().toISOString(),
            isUser: false,
          },
        ]);
      }
    },
    [getToken, conversationId, apiMessages, historyQuery],
  );

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;
    setInputText("");
    sendToAI(text);
  }, [inputText, sendToAI]);

  const handleQuickAction = useCallback(
    (message: string) => {
      setInputText("");
      sendToAI(message);
    },
    [sendToAI],
  );

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <MessageBubble
        id={item.id}
        content={item.content}
        timestamp={item.timestamp}
        isUser={item.isUser}
        avatarMode="ai"
      />
    ),
    []
  );

  const renderFooter = useCallback(() => {
    if (!isTyping) return null;
    return (
      <View style={styles.typingRow}>
        <View style={styles.typingAvatar}>
          <Sparkles size={14} color={Colors.gold} />
        </View>
        <View style={styles.typingBubble}>
          <TypingIndicator />
        </View>
      </View>
    );
  }, [isTyping]);

  return (
    <View style={styles.tabContent}>
      {/* AI Header */}
      <View style={styles.aiHeader}>
        <View style={styles.aiHeaderAvatar}>
          <Sparkles size={20} color={Colors.gold} />
        </View>
        <View style={styles.aiHeaderInfo}>
          <Text style={styles.aiHeaderName}>Everist AI Health Assistant</Text>
          <View style={styles.onlineRow}>
            <View style={styles.onlineDot} />
            <Text style={styles.onlineText}>Powered by Claude</Text>
          </View>
        </View>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        ListFooterComponent={renderFooter}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Quick action chips */}
      <QuickActionChips onSelect={handleQuickAction} />

      {/* Input */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        placeholder="Ask about your health..."
        disabled={isTyping}
      />

      {/* Disclaimer */}
      <Text style={styles.disclaimer}>
        Everist AI analyzes your health profile. Always consult your healthcare
        provider.
      </Text>
    </View>
  );
}

// ---------------------------------------------------------------------------
// Coach Chat Tab
// ---------------------------------------------------------------------------

function CoachChatTab() {
  const router = useRouter();

  // ---- Load the client's real coach ----
  const coachQuery = trpc.clientPortal.settings.getMyCoach.useQuery(
    undefined,
    STATIC_QUERY_OPTIONS,
  );
  const coach = coachQuery.data as any;
  const coachName = coach
    ? `${coach.firstName ?? ""} ${coach.lastName ?? ""}`.trim() || "Your Coach"
    : "Your Coach";
  const coachInitials = coach
    ? `${coach.firstName?.[0] ?? ""}${coach.lastName?.[0] ?? ""}`.toUpperCase() || "C"
    : "C";

  // ---- Ensure a conversation with the coach exists ----
  const startConversationMutation = trpc.clientPortal.messaging.startConversation.useMutation();
  const markAsReadMutation = trpc.clientPortal.messaging.markAsRead.useMutation();
  const [conversationId, setConversationId] = useState<string | null>(null);

  useEffect(() => {
    if (!coach?.id) return;
    startConversationMutation.mutate(
      { coachId: coach.id, coachName, isAiCoach: false },
      {
        onSuccess: (conv: any) => {
          if (conv?.id) {
            setConversationId(conv.id);
            markAsReadMutation.mutate({ conversationId: conv.id });
          }
        },
      },
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coach?.id]);

  // ---- Fetch messages for this conversation ----
  const historyQuery = trpc.clientPortal.messaging.getMessages.useQuery(
    { conversationId: conversationId ?? "", limit: 50 },
    { ...REALTIME_QUERY_OPTIONS, enabled: !!conversationId },
  );

  // ---- Send message mutation (correct input shape: conversationId + body) ----
  const sendMutation = trpc.clientPortal.messaging.sendMessage.useMutation();

  const apiMessages: ChatMessage[] = historyQuery.data
    ? mapApiMessages(historyQuery.data as any)
    : [];

  const [localMessages, setLocalMessages] = useState<ChatMessage[]>([]);
  const messages = [...apiMessages, ...localMessages];

  const [inputText, setInputText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  // Clear optimistic local messages once the server returns fresh data
  useEffect(() => {
    if (historyQuery.data) {
      setLocalMessages([]);
    }
  }, [historyQuery.data]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await historyQuery.refetch();
    } finally {
      setRefreshing(false);
    }
  }, [historyQuery]);

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages.length, scrollToBottom]);

  const handleSend = useCallback(() => {
    const text = inputText.trim();
    if (!text) return;

    if (!conversationId) {
      setLocalMessages((prev) => [
        ...prev,
        {
          id: `error-${Date.now()}`,
          content: coach
            ? "Setting up your conversation — please try again in a moment."
            : "You don't have a coach assigned yet. Contact support to get matched with a coach.",
          timestamp: new Date().toISOString(),
          isUser: false,
        },
      ]);
      return;
    }

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      timestamp: new Date().toISOString(),
      isUser: true,
      isRead: false,
    };

    // Optimistically add the user message
    setLocalMessages((prev) => [...prev, userMessage]);
    setInputText("");

    sendMutation.mutate(
      { conversationId, body: text },
      {
        onSuccess: () => {
          historyQuery.refetch();
        },
        onError: (error: any) => {
          setLocalMessages((prev) => [
            ...prev,
            {
              id: `error-${Date.now()}`,
              content:
                error?.message ??
                "Your message could not be sent. Please check your connection and try again.",
              timestamp: new Date().toISOString(),
              isUser: false,
            },
          ]);
        },
      },
    );
  }, [inputText, conversationId, coach, sendMutation, historyQuery]);

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <MessageBubble
        id={item.id}
        content={item.content}
        timestamp={item.timestamp}
        isUser={item.isUser}
        avatarMode="coach"
        coachInitials={coachInitials}
        showReadReceipt
        isRead={item.isRead}
      />
    ),
    []
  );

  return (
    <View style={styles.tabContent}>
      {/* Coach Header */}
      <View style={styles.coachHeader}>
        <Pressable
          style={styles.coachHeaderLeft}
          onPress={() => router.push("/coach")}
        >
          <View style={styles.coachHeaderAvatar}>
            <Text style={styles.coachAvatarText}>{coachInitials}</Text>
            {/* Online indicator dot */}
            <View style={styles.coachOnlineBadge} />
          </View>
          <View style={styles.coachHeaderInfo}>
            <Text style={styles.coachHeaderName}>
              {coach ? `Coach ${coachName}` : "Your Coach"}
            </Text>
            <View style={styles.onlineRow}>
              <Wifi size={11} color={Colors.success} />
              <Text style={styles.coachOnlineText}>
                {coach ? "Available" : "Not assigned yet"}
              </Text>
            </View>
          </View>
        </Pressable>
        <Pressable
          style={styles.coachActionBtn}
          onPress={() => router.push("/coach")}
        >
          <Text style={styles.coachActionText}>Profile</Text>
        </Pressable>
      </View>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={scrollToBottom}
        showsVerticalScrollIndicator={false}
        refreshing={refreshing}
        onRefresh={onRefresh}
      />

      {/* Input */}
      <ChatInput
        value={inputText}
        onChangeText={setInputText}
        onSend={handleSend}
        placeholder="Message your coach..."
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// Main Chat Screen
// ---------------------------------------------------------------------------

export default function ChatScreen() {
  const [activeTab, setActiveTab] = useState<ChatTab>("ai");

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        {/* Tab selector */}
        <TabSelector activeTab={activeTab} onTabChange={setActiveTab} />

        {/* Tab content */}
        {activeTab === "ai" ? <AIAssistantTab /> : <CoachChatTab />}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ---------------------------------------------------------------------------
// Styles
// ---------------------------------------------------------------------------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  flex: {
    flex: 1,
  },
  tabContent: {
    flex: 1,
  },
  messageList: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.sm,
  },

  /* --- AI Header --- */
  aiHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.dark,
    gap: 12,
  },
  aiHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  aiHeaderInfo: {
    flex: 1,
  },
  aiHeaderName: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },
  onlineRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 2,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.success,
  },
  onlineText: {
    fontSize: 11,
    color: Colors.success,
  },

  /* --- Coach Header --- */
  coachHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
    backgroundColor: Colors.dark,
    gap: 12,
  },
  coachHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  coachHeaderAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  coachAvatarText: {
    color: "#10B981",
    fontSize: 14,
    fontWeight: "700",
  },
  coachOnlineBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.success,
    borderWidth: 2,
    borderColor: Colors.dark,
  },
  coachHeaderInfo: {
    flex: 1,
  },
  coachHeaderName: {
    color: Colors.white,
    fontSize: FontSizes.sm,
    fontWeight: "700",
  },
  coachOnlineText: {
    fontSize: 11,
    color: Colors.success,
  },
  coachActionBtn: {
    paddingVertical: 6,
    paddingHorizontal: 14,
    borderRadius: Radii.full,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.4)",
    backgroundColor: "rgba(16, 185, 129, 0.1)",
  },
  coachActionText: {
    color: "#10B981",
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },

  /* --- Typing indicator row --- */
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  typingAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
  },
  typingBubble: {
    backgroundColor: Colors.navy,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 2,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },

  /* --- Disclaimer --- */
  disclaimer: {
    textAlign: "center",
    fontSize: 10,
    color: Colors.silver,
    paddingVertical: 4,
    paddingHorizontal: Spacing.md,
  },
});
