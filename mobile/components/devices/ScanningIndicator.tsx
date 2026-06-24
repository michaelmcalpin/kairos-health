/**
 * ScanningIndicator -- animated pulsing circles used on the
 * Add Device (pairing) screen to show Bluetooth scanning state.
 */

import React, { useEffect, useRef } from "react";
import { View, Animated, StyleSheet, Easing } from "react-native";
import { Bluetooth } from "lucide-react-native";

import { Colors } from "@/lib/constants";

interface ScanningIndicatorProps {
  active?: boolean;
}

export function ScanningIndicator({ active = true }: ScanningIndicatorProps) {
  const pulse1 = useRef(new Animated.Value(0)).current;
  const pulse2 = useRef(new Animated.Value(0)).current;
  const pulse3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) return;

    const createPulse = (anim: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(anim, {
            toValue: 1,
            duration: 2000,
            easing: Easing.out(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(anim, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ])
      );

    const a1 = createPulse(pulse1, 0);
    const a2 = createPulse(pulse2, 600);
    const a3 = createPulse(pulse3, 1200);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [active, pulse1, pulse2, pulse3]);

  const makeStyle = (anim: Animated.Value) => ({
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [1, 2.5],
        }),
      },
    ],
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.4, 0],
    }),
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, makeStyle(pulse1)]} />
      <Animated.View style={[styles.ring, makeStyle(pulse2)]} />
      <Animated.View style={[styles.ring, makeStyle(pulse3)]} />
      <View style={styles.center}>
        <Bluetooth size={32} color={Colors.gold} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: 160,
    height: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  ring: {
    position: "absolute",
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 2,
    borderColor: Colors.gold,
  },
  center: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: "rgba(74, 144, 217, 0.15)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: Colors.gold,
  },
});
