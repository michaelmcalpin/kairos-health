/**
 * Compact Everist LifeScore™ daily check-in. Rate the five dimensions once a
 * day; afterward the card shows a "checked in" state with the adaptive
 * follow-up question and a journal box to answer it (the answer is saved as a
 * private journal entry). Embedded on the Guided home screen and reused inside
 * the full LifeScore view. Self-contained: owns its own queries + mutations.
 */

import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet, Alert, TextInput, Keyboard } from "react-native";
import { Sparkles, CircleCheck, Lock } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { DIMENSIONS, type Dimension } from "./dimensions";

export function LifeScoreCheckinCard({ onSaved }: { onSaved?: () => void }) {
  const utils = trpc.useUtils();
  const [ratings, setRatings] = useState<Partial<Record<Dimension, number>>>({});
  const [submittedFollowUp, setSubmittedFollowUp] = useState<string | null>(null);
  const [justSubmitted, setJustSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  // Journal response to the follow-up.
  const [journal, setJournal] = useState("");
  const [savingJournal, setSavingJournal] = useState(false);
  const [journalSaved, setJournalSaved] = useState(false);

  const promptQuery = trpc.clientPortal.lifeScore.getPrompt.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const submitCheckin = trpc.clientPortal.lifeScore.submitCheckin.useMutation();
  const saveJournal = trpc.clientPortal.lifeScore.saveJournal.useMutation();
  const prompt = promptQuery.data as
    | { text: string; dimension: string; answeredToday?: boolean }
    | undefined;

  // Already checked in today (from the server) or just did so this session.
  const checkedIn = justSubmitted || (prompt?.answeredToday ?? false);
  // The question to reflect on: the tailored follow-up if we just submitted,
  // otherwise the curated daily prompt.
  const activePrompt = submittedFollowUp ?? prompt?.text ?? null;
  const promptLabel = submittedFollowUp ? "Follow-up" : "Reflection";

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
      setSubmittedFollowUp((res as { followUp: string | null })?.followUp ?? null);
      setJustSubmitted(true);
      await Promise.all([
        utils.clientPortal.lifeScore.getScore.invalidate(),
        utils.clientPortal.lifeScore.getPrompt.invalidate(),
        // Refresh the daily plan so the "LifeScore check-in" to-do flips to done.
        utils.clientPortal.today.getToday.invalidate(),
        utils.clientPortal.today.getAdherence.invalidate(),
      ]);
      onSaved?.();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!journal.trim()) return;
    setSavingJournal(true);
    try {
      // Prefix the prompt so the entry reads as a reflection on today's question.
      const text = activePrompt ? `${activePrompt}\n\n${journal.trim()}` : journal.trim();
      await saveJournal.mutateAsync({ text });
      setJournal("");
      setJournalSaved(true);
      Keyboard.dismiss();
      await utils.clientPortal.lifeScore.getScore.invalidate();
      onSaved?.();
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingJournal(false);
    }
  };

  // ── Checked-in state: confirmation + answerable follow-up (journal) ──
  if (checkedIn) {
    return (
      <Card style={styles.card}>
        <View style={styles.doneHead}>
          <CircleCheck size={18} color={Colors.success} />
          <Text style={styles.doneTitle}>Checked in for today</Text>
        </View>

        {activePrompt && (
          <>
            <View style={styles.promptBox}>
              <View style={styles.promptHead}>
                <Sparkles size={13} color={Colors.goldLight} />
                <Text style={styles.promptHeadText}>{promptLabel}</Text>
              </View>
              <Text style={styles.promptText}>{activePrompt}</Text>
            </View>

            <TextInput
              style={styles.journalInput}
              placeholder="Write your reflection…"
              placeholderTextColor={Colors.silver}
              value={journal}
              onChangeText={(t) => { setJournal(t); setJournalSaved(false); }}
              multiline
            />
            <View style={styles.journalFooter}>
              <View style={styles.privacyRow}>
                <Lock size={12} color={Colors.silver} />
                <Text style={styles.privacyText}>Private to you</Text>
              </View>
              {journalSaved ? (
                <Text style={styles.savedText}>Saved ✓</Text>
              ) : (
                <Pressable onPress={handleSaveJournal} disabled={savingJournal || !journal.trim()} hitSlop={8}>
                  <Text style={[styles.saveLink, (savingJournal || !journal.trim()) && { opacity: 0.4 }]}>
                    {savingJournal ? "Saving…" : "Save entry"}
                  </Text>
                </Pressable>
              )}
            </View>
          </>
        )}
      </Card>
    );
  }

  // ── Not yet checked in: rate the five dimensions ──
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

  doneHead: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: Spacing.sm },
  doneTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.white },

  promptBox: { backgroundColor: Colors.navyLight, borderRadius: Radii.md, padding: Spacing.md, marginBottom: Spacing.sm },
  promptHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  promptHeadText: { fontSize: FontSizes.xs, color: Colors.goldLight, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  promptText: { fontSize: FontSizes.sm, color: Colors.white, lineHeight: 20 },

  journalInput: {
    minHeight: 80, color: Colors.white, fontSize: FontSizes.sm, lineHeight: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, borderRadius: Radii.md,
    padding: Spacing.md, textAlignVertical: "top",
  },
  journalFooter: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: Spacing.sm },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 5 },
  privacyText: { fontSize: FontSizes.xs, color: Colors.silver },
  saveLink: { fontSize: FontSizes.sm, color: Colors.gold, fontWeight: "700" },
  savedText: { fontSize: FontSizes.sm, color: Colors.success, fontWeight: "700" },
});
