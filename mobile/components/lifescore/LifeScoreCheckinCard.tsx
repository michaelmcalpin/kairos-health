/**
 * Compact Everist LifeScore™ daily check-in — rate the five dimensions and get
 * one adaptive follow-up. Embedded on the Guided home screen and reused inside
 * the full LifeScore view. Self-contained: owns its own queries + mutations.
 */

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert } from "react-native";
import { Sparkles } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { DIMENSIONS, type Dimension } from "./dimensions";

export function LifeScoreCheckinCard({ onSaved }: { onSaved?: () => void }) {
  const utils = trpc.useUtils();
  const [ratings, setRatings] = useState<Partial<Record<Dimension, number>>>({});
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const promptQuery = trpc.clientPortal.lifeScore.getPrompt.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const submitCheckin = trpc.clientPortal.lifeScore.submitCheckin.useMutation();
  const prompt = promptQuery.data as { text: string; dimension: string } | undefined;

  const setRating = (dim: Dimension, val: number) =>
    setRatings((p) => ({ ...p, [dim]: p[dim] === val ? undefined : val }));

  const handleSubmit = async () => {
    const entries = DIMENSIONS.filter((d) => ratings[d.key] != null)
      .map((d) => ({ dimension: d.key, rating: ratings[d.key] as number }));
    if (entries.length === 0) {
      Alert.alert("Nothing to save", "Rate at least one area, or skip for today.");
      return;
    }
    setSaving(true);
    try {
      const res = await submitCheckin.mutateAsync({ ratings: entries });
      setFollowUp((res as { followUp: string | null })?.followUp ?? null);
      await Promise.all([
        utils.clientPortal.lifeScore.getScore.invalidate(),
        utils.clientPortal.lifeScore.getPrompt.invalidate(),
      ]);
      onSaved?.();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card style={styles.card}>
      <Text style={styles.title}>How are you today?</Text>
      <Text style={styles.hint}>Rate each area. Skip any you&apos;d rather not.</Text>
      {DIMENSIONS.map((d) => (
        <View key={d.key} style={styles.row}>
          <View style={styles.labelWrap}>
            <d.Icon size={16} color={d.color} />
            <Text style={styles.label}>{d.label}</Text>
          </View>
          <View style={styles.dots}>
            {[1, 2, 3, 4, 5].map((n) => {
              const active = (ratings[d.key] ?? 0) >= n;
              return (
                <Pressable key={n} onPress={() => setRating(d.key, n)} hitSlop={6}>
                  <View style={[styles.dot, active && { backgroundColor: d.color, borderColor: d.color }]} />
                </Pressable>
              );
            })}
          </View>
        </View>
      ))}

      {(followUp || prompt?.text) && (
        <View style={styles.promptBox}>
          <View style={styles.promptHead}>
            <Sparkles size={13} color={Colors.goldLight} />
            <Text style={styles.promptHeadText}>{followUp ? "Follow-up" : "Reflection"}</Text>
          </View>
          <Text style={styles.promptText}>{followUp ?? prompt?.text}</Text>
        </View>
      )}

      <Button
        title={saving ? "Saving…" : "Save check-in"}
        onPress={handleSubmit}
        disabled={saving}
        style={{ marginTop: Spacing.md }}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  card: { marginBottom: Spacing.md },
  title: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.white },
  hint: { fontSize: FontSizes.xs, color: Colors.silver, marginTop: 2, marginBottom: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 7 },
  labelWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  label: { fontSize: FontSizes.sm, color: Colors.white },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: "transparent" },
  promptBox: { backgroundColor: Colors.navyLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md },
  promptHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  promptHeadText: { fontSize: FontSizes.xs, color: Colors.goldLight, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  promptText: { fontSize: FontSizes.sm, color: Colors.white, lineHeight: 20 },
});
