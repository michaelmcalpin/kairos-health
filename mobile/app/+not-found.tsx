/**
 * 404 — catch-all for unmatched routes.
 */

import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Link, Stack } from "expo-router";

import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export default function NotFoundScreen() {
  return (
    <>
      <Stack.Screen options={{ title: "Not Found" }} />
      <View style={styles.container}>
        <Text style={styles.title}>Page not found</Text>
        <Text style={styles.message}>
          The screen you're looking for doesn't exist.
        </Text>
        <Link href="/" asChild>
          <Button title="Go to Home" variant="secondary" />
        </Link>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.dark,
    alignItems: "center",
    justifyContent: "center",
    padding: Spacing.lg,
  },
  title: {
    color: Colors.white,
    fontSize: FontSizes.xxl,
    fontWeight: "700",
    marginBottom: Spacing.sm,
  },
  message: {
    color: Colors.silver,
    fontSize: FontSizes.md,
    textAlign: "center",
    marginBottom: Spacing.xl,
  },
});
