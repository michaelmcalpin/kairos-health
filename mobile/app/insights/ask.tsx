/**
 * AI Health Q&A -- chat-style screen for asking health questions
 * with data-driven AI responses and pre-built question chips.
 */

import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  Pressable,
  ScrollView,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useLocalSearchParams } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Sparkles,
  Send,
  Activity,
  Pill,
  Heart,
  Moon,
  FileText,
  AlertCircle,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { TypingIndicator } from "@/components/chat/TypingIndicator";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

interface QAMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
  citations?: Citation[];
}

interface Citation {
  source: string;
  detail: string;
}

/* ------------------------------------------------------------------ */
/* Pre-built question chips                                            */
/* ------------------------------------------------------------------ */

const QUESTION_CHIPS = [
  {
    label: "Why is my glucose spiking?",
    icon: <Activity size={14} color={Colors.gold} />,
  },
  {
    label: "Should I adjust my supplements?",
    icon: <Pill size={14} color={Colors.gold} />,
  },
  {
    label: "How's my heart health?",
    icon: <Heart size={14} color={Colors.gold} />,
  },
  {
    label: "Is my sleep improving?",
    icon: <Moon size={14} color={Colors.gold} />,
  },
];

/* ------------------------------------------------------------------ */
/* Sample conversation                                                 */
/* ------------------------------------------------------------------ */

const INITIAL_MESSAGES: QAMessage[] = [
  {
    id: "m0",
    role: "assistant",
    content:
      "Hello! I'm your health analysis assistant. I have access to your biomarker data, wearable metrics, and health records. Ask me anything about your health -- I'll provide data-driven answers with references to your actual readings.",
    timestamp: new Date().toISOString(),
  },
];

const GLUCOSE_RESPONSE: QAMessage = {
  id: "m2",
  role: "assistant",
  content:
    "Based on your CGM data from the past 30 days, your post-prandial glucose spikes are primarily occurring after lunch and dinner, averaging 162 mg/dL with peaks reaching 185 mg/dL.\n\nHere's what the data shows:\n\n1. Timing pattern: Spikes occur 45-60 minutes after meals, taking ~2.5 hours to return to baseline (optimal is <2 hours).\n\n2. Meal correlation: Your highest spikes (>170 mg/dL) correspond to meals with >60g of carbohydrates, particularly refined carbs. Meals with protein-first eating show 23% lower peaks.\n\n3. Activity impact: On days with post-meal walks (10+ min), your peak glucose was 18% lower on average.\n\nSuggestions:\n- Try eating protein and vegetables before carbohydrates\n- A 10-15 minute walk after meals can significantly blunt spikes\n- Consider discussing berberine supplementation with your doctor\n- Your fasting glucose (92 mg/dL) and A1C (5.4%) are still within normal range, so this is about optimization rather than clinical concern",
  timestamp: new Date().toISOString(),
  citations: [
    { source: "Dexcom G7 CGM", detail: "30-day continuous glucose data" },
    { source: "Lab Results", detail: "A1C 5.4% (Jun 2, 2026)" },
    { source: "Food Log", detail: "Meal composition correlation analysis" },
  ],
};

const DOCTOR_RESPONSE: QAMessage = {
  id: "m4",
  role: "assistant",
  content:
    "Good question. Based on your current data, here's my assessment on when to involve your physician:\n\nYour current status is not clinically urgent:\n- Fasting glucose: 92 mg/dL (normal range: 70-100)\n- A1C: 5.4% (normal: <5.7%, pre-diabetic: 5.7-6.4%)\n- These numbers put you well within the normal clinical range\n\nHowever, consider discussing with your doctor if:\n- Post-prandial spikes consistently exceed 180 mg/dL\n- Fasting glucose rises above 100 mg/dL on multiple readings\n- You want to explore glucose-lowering supplements like berberine or metformin for longevity purposes\n\nFor your next appointment, I can generate a summary report of your glucose trends, including CGM data visualizations, to share with your doctor. This would give them actionable data beyond a single A1C reading.\n\nWould you like me to prepare that report?",
  timestamp: new Date().toISOString(),
  citations: [
    { source: "Lab Results", detail: "Fasting glucose 92 mg/dL, A1C 5.4%" },
    { source: "Clinical Guidelines", detail: "ADA diagnostic thresholds" },
  ],
};

/* ------------------------------------------------------------------ */
/* Component                                                           */
/* ------------------------------------------------------------------ */

export default function AskScreen() {
  const { initialQuestion } = useLocalSearchParams<{
    initialQuestion?: string;
  }>();

  const [messages, setMessages] = useState<QAMessage[]>(INITIAL_MESSAGES);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList<QAMessage>>(null);

  // Handle initial question from analyze screen
  useEffect(() => {
    if (initialQuestion) {
      handleSendMessage(initialQuestion);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const simulateResponse = useCallback(
    (userMsg: string): QAMessage => {
      const lower = userMsg.toLowerCase();
      if (lower.includes("glucose") || lower.includes("spiking")) {
        return {
          ...GLUCOSE_RESPONSE,
          id: `m-${Date.now()}-resp`,
          timestamp: new Date().toISOString(),
        };
      }
      if (lower.includes("doctor") || lower.includes("physician")) {
        return {
          ...DOCTOR_RESPONSE,
          id: `m-${Date.now()}-resp`,
          timestamp: new Date().toISOString(),
        };
      }
      // Generic response for other questions
      return {
        id: `m-${Date.now()}-resp`,
        role: "assistant",
        content: `Based on your health data, I can see several relevant data points related to your question about "${userMsg.slice(0, 60)}..."\n\nLet me analyze your recent biomarker readings, wearable data, and health records to provide a comprehensive answer. Your overall health trajectory shows positive trends, and I'd recommend reviewing this in the context of your full analysis.\n\nWould you like me to go deeper into any specific aspect of this topic?`,
        timestamp: new Date().toISOString(),
        citations: [
          { source: "Health Dashboard", detail: "Aggregated health metrics" },
        ],
      };
    },
    []
  );

  const handleSendMessage = useCallback(
    (text?: string) => {
      const messageText = text || inputText.trim();
      if (!messageText) return;

      const userMessage: QAMessage = {
        id: `m-${Date.now()}`,
        role: "user",
        content: messageText,
        timestamp: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setInputText("");
      setIsTyping(true);

      // Simulate AI thinking time
      setTimeout(() => {
        const response = simulateResponse(messageText);
        setMessages((prev) => [...prev, response]);
        setIsTyping(false);
      }, 2000);
    },
    [inputText, simulateResponse]
  );

  const handleChipPress = useCallback(
    (label: string) => {
      handleSendMessage(label);
    },
    [handleSendMessage]
  );

  const scrollToEnd = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, []);

  useEffect(() => {
    scrollToEnd();
  }, [messages, isTyping, scrollToEnd]);

  /* ---- Render message ---- */
  const renderMessage = useCallback(({ item }: { item: QAMessage }) => {
    const isUser = item.role === "user";
    return (
      <View style={[styles.msgRow, isUser && styles.msgRowUser]}>
        {/* Avatar */}
        {!isUser && (
          <View style={styles.avatar}>
            <Sparkles size={14} color={Colors.gold} />
          </View>
        )}

        <View style={styles.msgBubbleWrap}>
          {/* Bubble */}
          <View
            style={[
              styles.msgBubble,
              isUser ? styles.msgBubbleUser : styles.msgBubbleAi,
            ]}
          >
            <Text
              style={[
                styles.msgText,
                isUser ? styles.msgTextUser : styles.msgTextAi,
              ]}
            >
              {item.content}
            </Text>
          </View>

          {/* Citations */}
          {!isUser && item.citations && item.citations.length > 0 && (
            <View style={styles.citationsWrap}>
              <View style={styles.citationsHeader}>
                <FileText size={12} color={Colors.silver} />
                <Text style={styles.citationsLabel}>Sources</Text>
              </View>
              {item.citations.map((cite, i) => (
                <View key={i} style={styles.citationItem}>
                  <View style={styles.citationDot} />
                  <Text style={styles.citationText}>
                    <Text style={styles.citationSource}>{cite.source}</Text>
                    {" -- "}
                    {cite.detail}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Timestamp */}
          <Text style={[styles.msgTime, isUser && styles.msgTimeUser]}>
            {formatTime(item.timestamp)}
          </Text>
        </View>
      </View>
    );
  }, []);

  const hasText = inputText.trim().length > 0;
  const showChips = messages.length <= 1 && !isTyping;

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={100}
      >
        {/* ---- Messages ---- */}
        <FlatList
          ref={flatListRef}
          data={messages}
          keyExtractor={(item) => item.id}
          renderItem={renderMessage}
          contentContainerStyle={styles.messageList}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            showChips ? (
              <View style={styles.chipsSection}>
                <View style={styles.chipsHeader}>
                  <AlertCircle size={16} color={Colors.gold} />
                  <Text style={styles.chipsTitle}>
                    Quick Questions
                  </Text>
                </View>
                <Text style={styles.chipsSubtitle}>
                  Tap a question or type your own below
                </Text>
                <View style={styles.chipsGrid}>
                  {QUESTION_CHIPS.map((chip) => (
                    <Pressable
                      key={chip.label}
                      style={({ pressed }) => [
                        styles.questionChip,
                        pressed && styles.questionChipPressed,
                      ]}
                      onPress={() => handleChipPress(chip.label)}
                    >
                      {chip.icon}
                      <Text style={styles.questionChipText}>
                        {chip.label}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            ) : null
          }
          ListFooterComponent={
            isTyping ? (
              <View style={styles.typingRow}>
                <View style={styles.avatar}>
                  <Sparkles size={14} color={Colors.gold} />
                </View>
                <View style={styles.typingBubble}>
                  <TypingIndicator />
                </View>
              </View>
            ) : null
          }
        />

        {/* ---- Quick chips (inline, when conversation is active) ---- */}
        {!showChips && !isTyping && messages.length > 1 && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.inlineChipsContent}
            style={styles.inlineChips}
          >
            {QUESTION_CHIPS.map((chip) => (
              <Pressable
                key={chip.label}
                style={({ pressed }) => [
                  styles.inlineChip,
                  pressed && styles.inlineChipPressed,
                ]}
                onPress={() => handleChipPress(chip.label)}
              >
                {chip.icon}
                <Text style={styles.inlineChipText}>{chip.label}</Text>
              </Pressable>
            ))}
          </ScrollView>
        )}

        {/* ---- Input Bar ---- */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask about your health data..."
            placeholderTextColor={Colors.silver}
            multiline
            maxLength={2000}
            editable={!isTyping}
          />
          <Pressable
            style={[
              styles.sendBtn,
              (!hasText || isTyping) && styles.sendBtnDisabled,
            ]}
            onPress={() => handleSendMessage()}
            disabled={!hasText || isTyping}
          >
            <Send size={18} color={Colors.dark} />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Helpers                                                             */
/* ------------------------------------------------------------------ */

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  flex: {
    flex: 1,
  },

  /* Message list */
  messageList: {
    padding: Spacing.md,
    paddingBottom: Spacing.sm,
  },

  /* Chips section (initial state) */
  chipsSection: {
    marginBottom: Spacing.lg,
  },
  chipsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 4,
  },
  chipsTitle: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  chipsSubtitle: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginBottom: Spacing.md,
  },
  chipsGrid: {
    gap: Spacing.sm,
  },
  questionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
  questionChipPressed: {
    backgroundColor: "rgba(74, 144, 217, 0.1)",
    borderColor: "rgba(74, 144, 217, 0.3)",
  },
  questionChipText: {
    fontSize: FontSizes.sm,
    color: Colors.silverLight,
    fontWeight: "500",
    flex: 1,
  },

  /* Message rows */
  msgRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Spacing.md,
    gap: 8,
  },
  msgRowUser: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18,
  },
  msgBubbleWrap: {
    maxWidth: "78%",
    flexShrink: 1,
  },
  msgBubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  msgBubbleUser: {
    backgroundColor: Colors.gold,
    borderBottomRightRadius: 4,
  },
  msgBubbleAi: {
    backgroundColor: Colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  msgText: {
    fontSize: FontSizes.sm,
    lineHeight: 21,
  },
  msgTextUser: {
    color: Colors.dark,
  },
  msgTextAi: {
    color: Colors.silverLight,
  },
  msgTime: {
    fontSize: 10,
    color: Colors.silver,
    marginTop: 3,
    paddingHorizontal: 4,
  },
  msgTimeUser: {
    textAlign: "right",
  },

  /* Citations */
  citationsWrap: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.sm,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.sm,
    marginTop: 6,
  },
  citationsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 4,
  },
  citationsLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: Colors.silver,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  citationItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    marginTop: 3,
  },
  citationDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
    marginTop: 6,
  },
  citationText: {
    flex: 1,
    fontSize: 11,
    color: Colors.silver,
    lineHeight: 16,
  },
  citationSource: {
    color: Colors.goldLight,
    fontWeight: "600",
  },

  /* Typing indicator */
  typingRow: {
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 8,
    marginBottom: Spacing.sm,
  },
  typingBubble: {
    backgroundColor: Colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderRadius: 18,
    borderBottomLeftRadius: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },

  /* Inline chips (during conversation) */
  inlineChips: {
    maxHeight: 44,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.dark,
  },
  inlineChipsContent: {
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
    gap: 8,
    alignItems: "center",
  },
  inlineChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  inlineChipPressed: {
    backgroundColor: "rgba(74, 144, 217, 0.12)",
    borderColor: Colors.gold,
  },
  inlineChipText: {
    fontSize: 11,
    color: Colors.silverLight,
    fontWeight: "500",
  },

  /* Input bar */
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.dark,
  },
  textInput: {
    flex: 1,
    backgroundColor: Colors.navy,
    borderRadius: Radii.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    fontSize: FontSizes.sm,
    color: Colors.white,
    maxHeight: 100,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
