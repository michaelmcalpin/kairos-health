/**
 * RestTimer — countdown timer displayed between sets.
 * Shows a circular progress indicator with remaining seconds.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { X } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

interface RestTimerProps {
  /** Total rest duration in seconds */
  duration: number;
  /** Called when the timer reaches zero */
  onComplete: () => void;
  /** Called to skip rest early */
  onSkip: () => void;
}

export function RestTimer({ duration, onComplete, onSkip }: RestTimerProps) {
  const [remaining, setRemaining] = useState(duration);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    setRemaining(duration);
    intervalRef.current = setInterval(() => {
      setRemaining((prev) => {
        if (prev <= 1) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [duration]);

  useEffect(() => {
    if (remaining === 0) {
      onComplete();
    }
  }, [remaining, onComplete]);

  const progress = 1 - remaining / duration;
  const minutes = Math.floor(remaining / 60);
  const seconds = remaining % 60;
  const display = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <View style={styles.container}>
      <View style={styles.overlay}>
        <Text style={styles.label}>REST</Text>
        <Text style={styles.time}>{display}</Text>

        {/* Progress bar */}
        <View style={styles.progressTrack}>
          <View style={[styles.progressFill, { width: `${progress * 100}%` }]} />
        </View>

        <Pressable onPress={onSkip} style={styles.skipButton}>
          <X size={16} color={Colors.silver} />
          <Text style={styles.skipText}>Skip Rest</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginVertical: Spacing.sm,
  },
  overlay: {
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.lg,
    borderWidth: 1,
    borderColor: Colors.gold,
    padding: Spacing.lg,
    alignItems: "center",
    gap: Spacing.sm,
  },
  label: {
    fontSize: FontSizes.xs,
    fontWeight: "700",
    color: Colors.gold,
    letterSpacing: 2,
    textTransform: "uppercase",
  },
  time: {
    fontSize: 48,
    fontWeight: "700",
    color: Colors.white,
    fontVariant: ["tabular-nums"],
  },
  progressTrack: {
    height: 4,
    width: "100%",
    backgroundColor: Colors.navy,
    borderRadius: Radii.full,
    overflow: "hidden",
    marginTop: Spacing.xs,
  },
  progressFill: {
    height: "100%",
    backgroundColor: Colors.gold,
    borderRadius: Radii.full,
  },
  skipButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
    paddingHorizontal: Spacing.md,
  },
  skipText: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    fontWeight: "500",
  },
});
