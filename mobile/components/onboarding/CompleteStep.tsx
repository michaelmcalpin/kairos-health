/**
 * Complete step — final onboarding screen with success animation.
 *
 * Summarizes what was set up and invites the user to explore the app.
 */

import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated } from "react-native";
import { CheckCircle, ArrowRight } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "@/components/ui/Button";
import { SummitGlyph } from "@/components/brand";

interface Props {
  profileName: string;
  goalsCount: number;
  devicesCount: number;
  onFinish: () => void;
}

export function CompleteStep({
  profileName,
  goalsCount,
  devicesCount,
  onFinish,
}: Props) {
  const scale = useRef(new Animated.Value(0)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.spring(scale, {
        toValue: 1,
        friction: 5,
        tension: 100,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [scale, opacity]);

  return (
    <View style={styles.container}>
      {/* Success animation */}
      <Animated.View style={[styles.successCircle, { transform: [{ scale }] }]}>
        <CheckCircle size={56} color={Colors.success} />
      </Animated.View>

      <Text style={styles.title}>You're all set, {profileName || "there"}!</Text>
      <Text style={styles.subtitle}>
        Your Everist.ai profile is ready. Here's what we've set up for you:
      </Text>

      {/* Summary cards */}
      <Animated.View style={[styles.summaryList, { opacity }]}>
        <SummaryItem
          emoji="👤"
          label="Profile"
          value="Complete"
        />
        <SummaryItem
          emoji="🎯"
          label="Health Goals"
          value={`${goalsCount} selected`}
        />
        <SummaryItem
          emoji="⌚"
          label="Devices"
          value={devicesCount > 0 ? `${devicesCount} connected` : "Set up later"}
        />
      </Animated.View>

      {/* What's next */}
      <View style={styles.nextCard}>
        <Text style={styles.nextTitle}>What's next?</Text>
        <Text style={styles.nextText}>
          Explore your dashboard, connect more devices, or chat with your AI
          health assistant. Your coach will review your profile and reach out
          shortly.
        </Text>
      </View>

      {/* CTA */}
      <Button
        title="Explore Everist.ai"
        variant="primary"
        size="lg"
        icon={<ArrowRight size={18} color={Colors.dark} />}
        onPress={onFinish}
        style={styles.cta}
      />

      {/* Brand */}
      <View style={styles.brandRow}>
        <SummitGlyph size={16} />
        <Text style={styles.brandText}>Powered by Everist.ai</Text>
      </View>
    </View>
  );
}

function SummaryItem({
  emoji,
  label,
  value,
}: {
  emoji: string;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryEmoji}>{emoji}</Text>
      <View style={styles.summaryText}>
        <Text style={styles.summaryLabel}>{label}</Text>
        <Text style={styles.summaryValue}>{value}</Text>
      </View>
      <CheckCircle size={16} color={Colors.success} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.successMuted,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  summaryList: {
    width: "100%",
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  summaryRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.md,
    padding: Spacing.md,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryEmoji: {
    fontSize: 24,
  },
  summaryText: {
    flex: 1,
  },
  summaryLabel: {
    fontSize: FontSizes.sm,
    fontWeight: "600",
    color: Colors.white,
  },
  summaryValue: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 2,
  },
  nextCard: {
    width: "100%",
    backgroundColor: "rgba(74, 144, 217, 0.06)",
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: "rgba(74, 144, 217, 0.15)",
    marginBottom: Spacing.xl,
  },
  nextTitle: {
    fontSize: FontSizes.md,
    fontWeight: "700",
    color: Colors.gold,
    marginBottom: Spacing.xs,
  },
  nextText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    lineHeight: 20,
  },
  cta: {
    width: "100%",
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.lg,
  },
  brandText: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    opacity: 0.6,
  },
});
