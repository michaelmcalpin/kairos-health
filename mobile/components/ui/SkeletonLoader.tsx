/**
 * SkeletonLoader — animated loading placeholder with a pulsing opacity effect.
 *
 * Configurable width, height, and borderRadius. Can be composed into
 * card-shaped skeletons for any screen.
 */

import React, { useEffect, useRef } from "react";
import {
  Animated,
  StyleSheet,
  ViewStyle,
  StyleProp,
  View,
} from "react-native";

import { Colors, Radii, Spacing } from "@/lib/constants";

/* ----------------------------------------------------------------------- */
/* Single skeleton bar                                                     */
/* ----------------------------------------------------------------------- */

interface SkeletonLoaderProps {
  /** Width of the skeleton. Defaults to "100%". */
  width?: number | string;
  /** Height of the skeleton in pixels. Defaults to 16. */
  height?: number;
  /** Border radius. Defaults to Radii.sm (6). */
  borderRadius?: number;
  /** Extra style overrides. */
  style?: StyleProp<ViewStyle>;
}

export function SkeletonLoader({
  width = "100%",
  height = 16,
  borderRadius = Radii.sm,
  style,
}: SkeletonLoaderProps) {
  const opacity = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, {
          toValue: 0.7,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(opacity, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ]),
    );

    animation.start();
    return () => animation.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        {
          width: width as any,
          height,
          borderRadius,
          backgroundColor: Colors.navyLight,
          opacity,
        },
        style,
      ]}
    />
  );
}

/* ----------------------------------------------------------------------- */
/* Pre-composed card skeleton                                               */
/* ----------------------------------------------------------------------- */

interface SkeletonCardProps {
  /** Number of text lines to show inside the card. Defaults to 3. */
  lines?: number;
  /** Extra style overrides for the card wrapper. */
  style?: StyleProp<ViewStyle>;
}

export function SkeletonCard({ lines = 3, style }: SkeletonCardProps) {
  return (
    <View style={[styles.card, style]}>
      {/* Title bar */}
      <SkeletonLoader width="60%" height={20} borderRadius={Radii.sm} />

      {/* Body lines */}
      {Array.from({ length: lines }).map((_, i) => (
        <SkeletonLoader
          key={i}
          width={i === lines - 1 ? "40%" : "100%"}
          height={14}
          borderRadius={Radii.sm}
          style={{ marginTop: Spacing.sm }}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: Colors.border,
    padding: Spacing.md,
  },
});
