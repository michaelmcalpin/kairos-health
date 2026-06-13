/**
 * Onboarding screen for the Everist.ai mobile app.
 *
 * Three swipeable pages introducing the app's core value propositions.
 * Uses ScrollView with pagingEnabled for simple horizontal paging.
 */

import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ScrollView,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Heart, Sparkles, Users } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

interface OnboardingPage {
  icon: React.ReactNode;
  title: string;
  description: string;
}

const PAGES: OnboardingPage[] = [
  {
    icon: <Heart size={64} color={Colors.gold} strokeWidth={1.5} />,
    title: "Track Your Health",
    description:
      "Monitor biomarkers, vitals, and lab results in one private dashboard. See trends over time and understand what your data means.",
  },
  {
    icon: <Sparkles size={64} color={Colors.gold} strokeWidth={1.5} />,
    title: "AI-Powered Insights",
    description:
      "Our AI analyzes your health data to surface personalized insights, flag potential concerns early, and suggest evidence-based actions.",
  },
  {
    icon: <Users size={64} color={Colors.gold} strokeWidth={1.5} />,
    title: "Expert Coaching",
    description:
      "Connect with board-certified physicians and longevity coaches who review your data and create custom protocols for optimal health.",
  },
];

export default function OnboardingScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [activeIndex, setActiveIndex] = useState(0);

  const handleScroll = useCallback(
    (event: NativeSyntheticEvent<NativeScrollEvent>) => {
      const offsetX = event.nativeEvent.contentOffset.x;
      const index = Math.round(offsetX / SCREEN_WIDTH);
      setActiveIndex(index);
    },
    [],
  );

  const handleGetStarted = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  const handleSkip = useCallback(() => {
    router.replace("/(tabs)");
  }, [router]);

  const isLastPage = activeIndex === PAGES.length - 1;

  return (
    <SafeAreaView style={styles.container}>
      {/* Skip button */}
      <View style={styles.header}>
        <Pressable onPress={handleSkip} hitSlop={12}>
          <Text style={styles.skipText}>Skip</Text>
        </Pressable>
      </View>

      {/* Swipeable pages */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        bounces={false}
      >
        {PAGES.map((page, index) => (
          <View key={index} style={styles.page}>
            <View style={styles.iconContainer}>{page.icon}</View>
            <Text style={styles.pageTitle}>{page.title}</Text>
            <Text style={styles.pageDescription}>{page.description}</Text>
          </View>
        ))}
      </ScrollView>

      {/* Bottom section: dots + button */}
      <View style={styles.bottomSection}>
        {/* Dot indicators */}
        <View style={styles.dotsRow}>
          {PAGES.map((_, index) => (
            <View
              key={index}
              style={[
                styles.dot,
                index === activeIndex ? styles.dotActive : styles.dotInactive,
              ]}
            />
          ))}
        </View>

        {/* Get Started / Next area */}
        {isLastPage ? (
          <Pressable
            style={({ pressed }) => [
              styles.getStartedButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={handleGetStarted}
          >
            <Text style={styles.getStartedText}>Get Started</Text>
          </Pressable>
        ) : (
          <Pressable
            style={({ pressed }) => [
              styles.nextButton,
              pressed && styles.buttonPressed,
            ]}
            onPress={() => {
              const nextIndex = activeIndex + 1;
              scrollRef.current?.scrollTo({
                x: nextIndex * SCREEN_WIDTH,
                animated: true,
              });
            }}
          >
            <Text style={styles.nextButtonText}>Next</Text>
          </Pressable>
        )}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
  },

  /* Header */
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
  },
  skipText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    fontWeight: "500",
  },

  /* Pages */
  page: {
    width: SCREEN_WIDTH,
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: Spacing.xxl,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: Radii.full,
    backgroundColor: Colors.navy,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: Spacing.xl,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  pageTitle: {
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.md,
  },
  pageDescription: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 24,
    maxWidth: 320,
  },

  /* Bottom section */
  bottomSection: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    gap: Spacing.lg,
  },

  /* Dots */
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: Spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: Radii.full,
  },
  dotActive: {
    backgroundColor: Colors.gold,
    width: 24,
  },
  dotInactive: {
    backgroundColor: Colors.border,
  },

  /* Buttons */
  getStartedButton: {
    backgroundColor: Colors.gold,
    borderRadius: Radii.md,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  getStartedText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.dark,
  },
  nextButton: {
    backgroundColor: "transparent",
    borderRadius: Radii.md,
    borderWidth: 1.5,
    borderColor: Colors.gold,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.gold,
  },
  buttonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
});
