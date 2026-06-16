/**
 * Chat tab -- full-featured chat screen with AI Assistant and Coach Chat tabs.
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

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { TabSelector, type ChatTab } from "@/components/chat/TabSelector";
import { MessageBubble } from "@/components/chat/MessageBubble";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { QuickActionChips } from "@/components/chat/QuickActionChips";
import { ChatInput } from "@/components/chat/ChatInput";

// ---------------------------------------------------------------------------
// Sample Data
// ---------------------------------------------------------------------------

interface ChatMessage {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  isRead?: boolean;
}

const AI_SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: "ai-1",
    content:
      "Good morning! I've reviewed your latest health data. Your resting heart rate has improved by 4 BPM over the past month, and your HRV is trending upward. Great progress on the cardiovascular front.",
    timestamp: "2026-06-13T08:15:00Z",
    isUser: false,
  },
  {
    id: "ai-2",
    content:
      "That's great to hear! How are my recent lab results looking? Anything I should be concerned about?",
    timestamp: "2026-06-13T08:16:00Z",
    isUser: true,
  },
  {
    id: "ai-3",
    content:
      "Your labs from June 8th look solid overall. A few highlights:\n\n- Vitamin D: 62 ng/mL (optimal range). Your supplementation protocol is working well.\n- hsCRP: 0.4 mg/L (excellent, down from 0.9 in March). Inflammation markers are improving.\n- Fasting glucose: 88 mg/dL (normal).\n- Testosterone: 680 ng/dL (good for your age).\n\nOne thing to watch: your LDL-P is at 1,180 nmol/L, slightly above the optimal threshold of 1,000. I'd recommend discussing apoB testing with your doctor at your next visit.",
    timestamp: "2026-06-13T08:17:00Z",
    isUser: false,
  },
  {
    id: "ai-4",
    content:
      "Good call on the LDL-P. What about my supplement stack -- am I taking anything that could help with that?",
    timestamp: "2026-06-13T08:19:00Z",
    isUser: true,
  },
  {
    id: "ai-5",
    content:
      "Your current supplement protocol includes Omega-3 (2g EPA/DHA) which supports healthy lipid levels. You might also consider adding Berberine (500mg with meals) or Citrus Bergamot, both of which have evidence for supporting LDL particle reduction.\n\nHowever, I'd recommend discussing any additions with your healthcare provider first, especially given your current stack of 8 supplements. Let me know if you'd like a full interaction check on your protocol.",
    timestamp: "2026-06-13T08:20:00Z",
    isUser: false,
  },
];

const COACH_SAMPLE_MESSAGES: ChatMessage[] = [
  {
    id: "coach-1",
    content:
      "Hey! I reviewed your workout logs from this week. Your volume is progressing nicely on the compound lifts. How's the shoulder feeling after we adjusted your pressing angle?",
    timestamp: "2026-06-12T14:30:00Z",
    isUser: false,
    isRead: true,
  },
  {
    id: "coach-2",
    content:
      "Much better actually! No pain during overhead press yesterday. The 15-degree incline adjustment made a big difference.",
    timestamp: "2026-06-12T14:35:00Z",
    isUser: true,
    isRead: true,
  },
  {
    id: "coach-3",
    content:
      "Excellent, that's exactly what I was hoping for. Let's keep that angle for the next 2 weeks and then we can reassess.\n\nAlso, I noticed your sleep score dropped to 68 on Tuesday and Wednesday. Are you staying up late or is something else going on? Recovery is crucial during this hypertrophy phase.",
    timestamp: "2026-06-12T14:38:00Z",
    isUser: false,
    isRead: true,
  },
  {
    id: "coach-4",
    content:
      "Yeah, I had some work deadlines. Back on track now though. Got 8 hours last night and feel recovered.",
    timestamp: "2026-06-12T15:02:00Z",
    isUser: true,
    isRead: true,
  },
  {
    id: "coach-5",
    content:
      "Good to hear. For tomorrow's session, let's do a deload on squats (drop to 80% of your working weight) and focus on tempo work -- 3 seconds eccentric. Your CNS will thank you after this heavy week. I've updated your protocol in the app.",
    timestamp: "2026-06-12T15:10:00Z",
    isUser: false,
    isRead: false,
  },
];

// ---------------------------------------------------------------------------
// AI Assistant Tab
// ---------------------------------------------------------------------------

function AIAssistantTab() {
  const [messages, setMessages] = useState<ChatMessage[]>(AI_SAMPLE_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate data refresh (will be replaced with real tRPC refetch later)
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
    setIsTyping(true);

    // Simulate AI response after a delay
    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: getAIResponse(text),
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiResponse]);
    }, 2000);
  }, [inputText]);

  const handleQuickAction = useCallback((message: string) => {
    setInputText("");
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: message,
      timestamp: new Date().toISOString(),
      isUser: true,
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsTyping(true);

    setTimeout(() => {
      const aiResponse: ChatMessage = {
        id: `ai-${Date.now()}`,
        content: getAIResponse(message),
        timestamp: new Date().toISOString(),
        isUser: false,
      };
      setIsTyping(false);
      setMessages((prev) => [...prev, aiResponse]);
    }, 2000);
  }, []);

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
  const [messages, setMessages] = useState<ChatMessage[]>(COACH_SAMPLE_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef<FlatList<ChatMessage>>(null);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Simulate data refresh (will be replaced with real tRPC refetch later)
    await new Promise(resolve => setTimeout(resolve, 1000));
    setRefreshing(false);
  }, []);

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

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      content: text,
      timestamp: new Date().toISOString(),
      isUser: true,
      isRead: false,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText("");
  }, [inputText]);

  const renderMessage = useCallback(
    ({ item }: ListRenderItemInfo<ChatMessage>) => (
      <MessageBubble
        id={item.id}
        content={item.content}
        timestamp={item.timestamp}
        isUser={item.isUser}
        avatarMode="coach"
        coachInitials="WK"
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
            <Text style={styles.coachAvatarText}>WK</Text>
            {/* Online indicator dot */}
            <View style={styles.coachOnlineBadge} />
          </View>
          <View style={styles.coachHeaderInfo}>
            <Text style={styles.coachHeaderName}>Coach Walid Kherat</Text>
            <View style={styles.onlineRow}>
              <Wifi size={11} color={Colors.success} />
              <Text style={styles.coachOnlineText}>Online</Text>
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
// Helpers
// ---------------------------------------------------------------------------

function getAIResponse(userMessage: string): string {
  const lower = userMessage.toLowerCase();

  if (lower.includes("lab") || lower.includes("result")) {
    return "Based on your most recent labs from June 8th, here are the key findings:\n\n- Vitamin D: 62 ng/mL (optimal)\n- hsCRP: 0.4 mg/L (excellent, improved from March)\n- Fasting glucose: 88 mg/dL (within range)\n- ApoB: 95 mg/dL (borderline -- worth monitoring)\n\nOverall your biomarkers are trending in the right direction. Your inflammation markers show significant improvement since starting the anti-inflammatory protocol. Would you like me to dive deeper into any specific marker?";
  }

  if (lower.includes("supplement")) {
    return "Your current supplement protocol includes 8 active supplements:\n\n1. Omega-3 Fish Oil -- 2g EPA/DHA (morning)\n2. Vitamin D3+K2 -- 5,000 IU (morning with food)\n3. Magnesium Glycinate -- 400mg (evening)\n4. Creatine Monohydrate -- 5g (any time)\n5. CoQ10 (Ubiquinol) -- 200mg (morning)\n6. Zinc -- 30mg (evening)\n7. Ashwagandha KSM-66 -- 600mg (evening)\n8. NAC -- 600mg (morning)\n\nNo significant interactions detected. Your Vitamin D levels confirm the current dosage is appropriate. Would you like me to check if any adjustments are needed based on your latest labs?";
  }

  if (lower.includes("symptom")) {
    return "I'm here to help you understand your symptoms. Please describe what you're experiencing, including:\n\n- When the symptoms started\n- How severe they are (1-10)\n- Whether they're constant or intermittent\n- Any triggers you've noticed\n\nI'll cross-reference with your health data, recent labs, and current protocols to give you insights. Remember, I can provide analysis but always consult your healthcare provider for medical advice.";
  }

  if (lower.includes("protocol") || lower.includes("today")) {
    return "Here's your protocol for today (Friday, June 13):\n\nMorning:\n- Omega-3, Vitamin D3+K2, CoQ10, NAC (with breakfast)\n- 20 min zone 2 cardio or morning walk\n\nAfternoon:\n- Creatine (with lunch)\n- Scheduled: Upper body strength training (Dr. Kim's program)\n\nEvening:\n- Magnesium, Zinc, Ashwagandha (with dinner)\n- Blue light blocking glasses after 8 PM\n- Target bedtime: 10:30 PM\n\nAdherence this week: 89%. You missed your evening magnesium on Tuesday. Keep it up!";
  }

  return "I've analyzed your question against your health profile. Based on your current biomarkers, supplement protocol, and recent trends, I can see several areas worth discussing.\n\nCould you give me a bit more context about what specific aspect you'd like to explore? I can look at your lab trends, supplement interactions, sleep patterns, or cardiovascular metrics in detail.";
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
    backgroundColor: "rgba(200, 169, 81, 0.15)",
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
    backgroundColor: "rgba(200, 169, 81, 0.15)",
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
