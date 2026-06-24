/**
 * MessageBubble -- renders a single chat message with avatar, timestamp,
 * and optional read-receipt checkmarks.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Sparkles, User, Check, CheckCheck } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

export interface MessageBubbleProps {
  id: string;
  content: string;
  timestamp: string;
  isUser: boolean;
  /** Show double-check read receipts (coach chat) */
  showReadReceipt?: boolean;
  isRead?: boolean;
  /** Show AI sparkle avatar vs. coach avatar */
  avatarMode?: "ai" | "coach";
  /** Coach initials for avatar */
  coachInitials?: string;
}

export function MessageBubble({
  content,
  timestamp,
  isUser,
  showReadReceipt = false,
  isRead = false,
  avatarMode = "ai",
  coachInitials = "DR",
}: MessageBubbleProps) {
  const formattedTime = formatTime(timestamp);

  return (
    <View style={[styles.row, isUser && styles.rowReverse]}>
      {/* Avatar */}
      {!isUser && (
        <View
          style={[
            styles.avatar,
            avatarMode === "ai" ? styles.avatarAi : styles.avatarCoach,
          ]}
        >
          {avatarMode === "ai" ? (
            <Sparkles size={14} color={Colors.gold} />
          ) : (
            <Text style={styles.avatarText}>{coachInitials}</Text>
          )}
        </View>
      )}

      <View style={styles.bubbleWrapper}>
        {/* Bubble */}
        <View
          style={[
            styles.bubble,
            isUser ? styles.bubbleUser : styles.bubbleOther,
          ]}
        >
          <Text
            style={[
              styles.messageText,
              isUser ? styles.messageTextUser : styles.messageTextOther,
            ]}
          >
            {content}
          </Text>
        </View>

        {/* Timestamp + read receipt */}
        <View
          style={[
            styles.metaRow,
            isUser && styles.metaRowRight,
          ]}
        >
          <Text style={styles.timestamp}>{formattedTime}</Text>
          {isUser && showReadReceipt && (
            isRead ? (
              <CheckCheck size={12} color={Colors.success} />
            ) : (
              <Check size={12} color={Colors.silver} />
            )
          )}
        </View>
      </View>
    </View>
  );
}

function formatTime(timestamp: string): string {
  const d = new Date(timestamp);
  return d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "flex-end",
    marginBottom: Spacing.sm,
    gap: 8,
  },
  rowReverse: {
    flexDirection: "row-reverse",
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 18, // offset for meta row
  },
  avatarAi: {
    backgroundColor: "rgba(74, 144, 217, 0.15)",
  },
  avatarCoach: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
  },
  avatarText: {
    color: "#10B981",
    fontSize: 11,
    fontWeight: "700",
  },
  bubbleWrapper: {
    maxWidth: "75%",
    flexShrink: 1,
  },
  bubble: {
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  bubbleUser: {
    backgroundColor: Colors.gold,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: Colors.navy,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: FontSizes.sm,
    lineHeight: 20,
  },
  messageTextUser: {
    color: Colors.dark,
  },
  messageTextOther: {
    color: Colors.silverLight,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 3,
    paddingHorizontal: 4,
  },
  metaRowRight: {
    justifyContent: "flex-end",
  },
  timestamp: {
    fontSize: 10,
    color: Colors.silver,
  },
});
