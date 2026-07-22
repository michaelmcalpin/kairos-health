/**
 * Send Feedback screen.
 *
 * Lets the user submit a bug report, feature request, or redesign
 * suggestion to the team via the root-level `feedback.submit` tRPC
 * procedure ({ type, message, page, platform } -> { id }).
 */

import React, { useState } from "react";
import {
  View,
  Text,
  ScrollView,
  TextInput,
  StyleSheet,
  Pressable,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Bug, Lightbulb, Paintbrush, MessageSquarePlus } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { trpc } from "@/lib/api";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

type FeedbackType = "bug" | "feature" | "redesign";

const FEEDBACK_TYPES: {
  key: FeedbackType;
  label: string;
  icon: React.ComponentType<any>;
}[] = [
  { key: "bug", label: "Bug", icon: Bug },
  { key: "feature", label: "Feature", icon: Lightbulb },
  { key: "redesign", label: "Redesign", icon: Paintbrush },
];

const MIN_LENGTH = 3;
const MAX_LENGTH = 5000;

/* ------------------------------------------------------------------ */
/* Screen                                                              */
/* ------------------------------------------------------------------ */

export default function FeedbackScreen() {
  const router = useRouter();

  const [type, setType] = useState<FeedbackType>("bug");
  const [message, setMessage] = useState("");

  const submitMutation = (trpc as any).feedback.submit.useMutation();

  const handleSubmit = () => {
    const trimmed = message.trim();
    if (trimmed.length < MIN_LENGTH) {
      Alert.alert(
        "Message Too Short",
        "Please describe your feedback in a few more words.",
      );
      return;
    }
    if (trimmed.length > MAX_LENGTH) {
      Alert.alert(
        "Message Too Long",
        `Please keep your feedback under ${MAX_LENGTH} characters.`,
      );
      return;
    }

    submitMutation.mutate(
      {
        type,
        message: trimmed,
        page: "mobile-app",
        platform: "mobile",
      },
      {
        onSuccess: () => {
          Alert.alert(
            "Feedback Sent",
            "Thank you! Your feedback has been sent to the team.",
            [{ text: "OK", onPress: () => router.back() }],
          );
        },
        onError: (error: any) => {
          Alert.alert(
            "Couldn't Send Feedback",
            error?.message ?? "Something went wrong. Please try again.",
          );
        },
      },
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={100}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* ── Intro ─────────────────────────────────────────────── */}
          <Text style={styles.introText}>
            Found a bug, missing a feature, or have an idea to make the app
            better? We read every submission.
          </Text>

          {/* ── Type chips ────────────────────────────────────────── */}
          <Card style={styles.section}>
            <Text style={styles.fieldLabel}>Feedback Type</Text>
            <View style={styles.chipRow}>
              {FEEDBACK_TYPES.map(({ key, label, icon: Icon }) => {
                const selected = type === key;
                return (
                  <Pressable
                    key={key}
                    onPress={() => setType(key)}
                    style={[styles.chip, selected && styles.chipSelected]}
                  >
                    <Icon
                      size={16}
                      color={selected ? Colors.gold : Colors.silver}
                    />
                    <Text
                      style={[
                        styles.chipText,
                        selected && styles.chipTextSelected,
                      ]}
                    >
                      {label}
                    </Text>
                  </Pressable>
                );
              })}
            </View>

            {/* ── Message ───────────────────────────────────────── */}
            <Text style={styles.fieldLabel}>Message</Text>
            <TextInput
              style={styles.input}
              value={message}
              onChangeText={setMessage}
              placeholder={
                type === "bug"
                  ? "What happened? What did you expect to happen?"
                  : type === "feature"
                    ? "What would you like the app to do?"
                    : "What should look or work differently?"
              }
              placeholderTextColor={Colors.silver}
              multiline
              numberOfLines={6}
              textAlignVertical="top"
              maxLength={MAX_LENGTH}
            />
            <Text style={styles.charCount}>
              {message.trim().length}/{MAX_LENGTH}
            </Text>

            <Button
              title={submitMutation.isPending ? "Sending..." : "Send Feedback"}
              variant="primary"
              size="lg"
              icon={<MessageSquarePlus size={16} color={Colors.dark} />}
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending || message.trim().length < MIN_LENGTH}
              onPress={handleSubmit}
              style={styles.submitBtn}
            />
          </Card>

          {/* ── Footer note ───────────────────────────────────────── */}
          <Text style={styles.footerNote}>
            Need help with your account or health data? Contact your care team
            or support@everist.ai instead.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },
  scrollContent: {
    padding: Spacing.md,
    paddingBottom: Spacing.xxl + 32,
  },

  introText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    lineHeight: 20,
    marginBottom: Spacing.md,
  },

  /* Sections */
  section: {
    marginBottom: Spacing.md,
  },

  fieldLabel: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },

  /* Chips */
  chipRow: {
    flexDirection: "row",
    gap: Spacing.sm,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: Radii.full,
    borderWidth: 1.5,
    borderColor: Colors.border,
    backgroundColor: Colors.navy,
  },
  chipSelected: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(74, 144, 217, 0.12)",
  },
  chipText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
    fontWeight: "600",
  },
  chipTextSelected: {
    color: Colors.gold,
  },

  /* Input */
  input: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.md,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    color: Colors.white,
    fontSize: FontSizes.md,
    paddingVertical: 12,
    paddingHorizontal: Spacing.md,
    minHeight: 140,
    lineHeight: 22,
  },
  charCount: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    textAlign: "right",
    marginTop: 4,
    opacity: 0.7,
  },

  submitBtn: {
    marginTop: Spacing.md,
  },

  /* Footer */
  footerNote: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    lineHeight: 18,
    textAlign: "center",
    paddingHorizontal: Spacing.md,
    opacity: 0.8,
  },
});
