/**
 * Compact Guided/Full segmented toggle for the home header.
 */

import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Colors, FontSizes, Radii } from "@/lib/constants";

export function ModeToggle({
  mode,
  onChange,
}: {
  mode: "guided" | "full";
  onChange: (m: "guided" | "full") => void;
}) {
  return (
    <View style={styles.wrap}>
      {(["guided", "full"] as const).map((m) => {
        const active = mode === m;
        return (
          <Pressable key={m} onPress={() => onChange(m)} style={[styles.seg, active && styles.segActive]}>
            <Text style={[styles.segText, active && styles.segTextActive]}>
              {m === "guided" ? "Guided" : "Full"}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: "row",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.full,
    padding: 2,
  },
  seg: {
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: Radii.full,
  },
  segActive: { backgroundColor: Colors.gold },
  segText: { color: Colors.silver, fontSize: FontSizes.xs, fontWeight: "600" },
  segTextActive: { color: Colors.dark, fontWeight: "700" },
});
