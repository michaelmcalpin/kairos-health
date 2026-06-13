/**
 * ChatInput -- bottom input bar with text field, send, attachment, and mic buttons.
 * Handles keyboard avoidance via the parent KeyboardAvoidingView.
 */

import React from "react";
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
} from "react-native";
import { Send, Paperclip, Mic } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface ChatInputProps {
  value: string;
  onChangeText: (text: string) => void;
  onSend: () => void;
  onAttach?: () => void;
  onVoice?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

export function ChatInput({
  value,
  onChangeText,
  onSend,
  onAttach,
  onVoice,
  placeholder = "Type a message...",
  disabled = false,
}: ChatInputProps) {
  const hasText = value.trim().length > 0;

  return (
    <View style={styles.container}>
      {/* Attachment button */}
      <Pressable
        style={({ pressed }) => [
          styles.iconBtn,
          pressed && styles.iconBtnPressed,
        ]}
        onPress={onAttach}
        hitSlop={8}
      >
        <Paperclip size={20} color={Colors.silver} />
      </Pressable>

      {/* Text input */}
      <TextInput
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={Colors.silver}
        multiline
        maxLength={2000}
        editable={!disabled}
        returnKeyType="default"
      />

      {/* Voice or Send */}
      {hasText ? (
        <Pressable
          style={({ pressed }) => [
            styles.sendBtn,
            pressed && styles.sendBtnPressed,
            !hasText && styles.sendBtnDisabled,
          ]}
          onPress={onSend}
          disabled={!hasText || disabled}
          hitSlop={8}
        >
          <Send size={18} color={Colors.dark} />
        </Pressable>
      ) : (
        <Pressable
          style={({ pressed }) => [
            styles.iconBtn,
            pressed && styles.iconBtnPressed,
          ]}
          onPress={onVoice}
          hitSlop={8}
        >
          <Mic size={20} color={Colors.silver} />
        </Pressable>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.sm,
    gap: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: Colors.border,
    backgroundColor: Colors.dark,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnPressed: {
    backgroundColor: Colors.navyLight,
  },
  input: {
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
  sendBtnPressed: {
    backgroundColor: Colors.goldDark,
  },
  sendBtnDisabled: {
    opacity: 0.4,
  },
});
