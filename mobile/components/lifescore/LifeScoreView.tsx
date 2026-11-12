/**
 * Everist LifeScore™ — full whole-person view. Composite ring + five-dimension
 * breakdown, the daily check-in, a private AI-tagged journal, and history.
 * Rendered as its own bottom-tab screen and reused elsewhere.
 */

import React, { useCallback, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, TextInput, Alert, ActivityIndicator,
  KeyboardAvoidingView, Platform, Keyboard, Pressable,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import Svg, { Circle } from "react-native-svg";
import { Lock, ChevronRight } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { LifeScoreCheckinCard } from "./LifeScoreCheckinCard";
import { LifeScoreBreakdown, type BreakdownData } from "./LifeScoreBreakdown";

function Ring({ score }: { score: number | null }) {
  const size = 148, stroke = 13, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <View style={{ width: size, height: size, alignItems: "center", justifyContent: "center" }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={Colors.navyLight} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={Colors.gold} strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={StyleSheet.absoluteFill as never}>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Text style={styles.ringScore}>{score == null ? "—" : score}</Text>
          <Text style={styles.ringLabel}>Core LifeScore</Text>
        </View>
      </View>
    </View>
  );
}

export default function LifeScoreView() {
  const utils = trpc.useUtils();
  const [journal, setJournal] = useState("");
  const [savingJournal, setSavingJournal] = useState(false);

  const scoreQuery = trpc.clientPortal.lifeScore.getScore.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const historyQuery = trpc.clientPortal.lifeScore.getJournalHistory.useQuery({ limit: 10 }, DEFAULT_QUERY_OPTIONS);
  const saveJournal = trpc.clientPortal.lifeScore.saveJournal.useMutation();

  const score = scoreQuery.data as (BreakdownData & { score: number | null; hasData: boolean; actions?: Array<{ title: string; gain: number | null }> }) | undefined;
  const topAction = score?.actions?.[0];
  const router = useRouter();

  const history = (historyQuery.data as { id: string; date: string; text: string; themes: { dimension: string; theme: string; valence: string }[] }[] | undefined) ?? [];

  // Refetch whenever the screen regains focus so an update made elsewhere
  // (or on a previous visit) is reflected when the user returns.
  const refetchScore = scoreQuery.refetch;
  const refetchHistory = historyQuery.refetch;
  useFocusEffect(
    useCallback(() => {
      refetchScore();
      refetchHistory();
    }, [refetchScore, refetchHistory]),
  );

  const handleSaveJournal = async () => {
    if (!journal.trim()) return;
    setSavingJournal(true);
    try {
      await saveJournal.mutateAsync({ text: journal.trim() });
      setJournal("");
      await Promise.all([historyQuery.refetch(), utils.clientPortal.lifeScore.getScore.invalidate()]);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingJournal(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="interactive"
      >
        <Text style={styles.tagline}>
          Your health is more than your body. Your Core LifeScore blends Physical health (60%: devices, labs, medications, genetics) with Mental wellbeing (40%: mind, purpose, relationships, work).
        </Text>

        {/* Score ring + dimension breakdown */}
        <Card style={styles.card}>
          {scoreQuery.isLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ paddingVertical: Spacing.xl }} />
          ) : (
            <>
              <Pressable
                onPress={() => router.push("/insights/lifescore-explained" as never)}
                accessibilityRole="button"
                accessibilityLabel="Open your LifeScore explained"
              >
                <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
                  <Ring score={score?.score ?? null} />
                </View>
                {score && <LifeScoreBreakdown data={score} />}
              </Pressable>
              {score && (
                <Pressable onPress={() => router.push("/insights/lifescore-explained" as never)} style={styles.explainRow}>
                  <Text style={styles.explainText} numberOfLines={2}>
                    {topAction ? `Biggest win: ${topAction.title}${topAction.gain != null ? ` (up to +${topAction.gain >= 10 ? Math.round(topAction.gain) : topAction.gain} pts)` : ""}` : "What's behind your score and how to raise it"}
                  </Text>
                  <ChevronRight size={16} color={Colors.gold} />
                </Pressable>
              )}
              {!score?.hasData && (
                <Text style={styles.emptyHint}>Rate a few areas below to start building your LifeScore.</Text>
              )}
            </>
          )}
        </Card>

        {/* Daily check-in */}
        <LifeScoreCheckinCard />

        {/* Journal */}
        <Text style={styles.sectionTitle}>Journal</Text>
        <Card style={styles.card}>
          <TextInput
            style={styles.journalInput}
            placeholder="Anything on your mind — work, relationships, how you're feeling…"
            placeholderTextColor={Colors.silver}
            value={journal}
            onChangeText={setJournal}
            multiline
          />
          <View style={styles.privacyRow}>
            <View style={styles.privacyLeft}>
              <Lock size={13} color={Colors.silver} />
              <Text style={styles.privacyText}>Private — your coach sees themes, not the words.</Text>
            </View>
            <Pressable onPress={() => Keyboard.dismiss()} hitSlop={8}>
              <Text style={styles.doneText}>Done</Text>
            </Pressable>
          </View>
          <Button
            title={savingJournal ? "Saving…" : "Save entry"}
            variant="secondary"
            onPress={handleSaveJournal}
            disabled={savingJournal || !journal.trim()}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        {/* History */}
        {history.length > 0 && (
          <>
            <Text style={styles.sectionTitle}>Recent entries</Text>
            {history.map((h) => (
              <Card key={h.id} style={styles.card}>
                <Text style={styles.histDate}>{h.date}</Text>
                <Text style={styles.histText}>{h.text}</Text>
                {h.themes.length > 0 && (
                  <View style={styles.chips}>
                    {h.themes.map((t, i) => (
                      <View key={i} style={styles.chip}>
                        <Text style={styles.chipText}>{t.dimension} · {t.theme}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </Card>
            ))}
          </>
        )}
      </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  explainRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.md, paddingTop: Spacing.md, borderTopWidth: 1, borderTopColor: "rgba(192,197,206,0.15)" },
  explainText: { flex: 1, color: Colors.silver, fontSize: FontSizes.sm },
  safe: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  tagline: { fontSize: FontSizes.sm, color: Colors.silver, lineHeight: 20, marginBottom: Spacing.md },
  card: { marginBottom: Spacing.md },

  ringScore: { fontSize: 40, fontWeight: "700", color: Colors.white },
  ringLabel: { fontSize: FontSizes.xs, color: Colors.silver, marginTop: 2 },

  emptyHint: { fontSize: FontSizes.xs, color: Colors.silver, textAlign: "center", marginTop: Spacing.md },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: "600", color: Colors.white, marginBottom: Spacing.sm, marginTop: Spacing.xs },

  journalInput: {
    minHeight: 96, color: Colors.white, fontSize: FontSizes.sm, lineHeight: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, borderRadius: Radii.md,
    padding: Spacing.md, textAlignVertical: "top",
  },
  privacyRow: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    gap: 6, marginTop: Spacing.sm,
  },
  privacyLeft: { flexDirection: "row", alignItems: "center", gap: 6, flex: 1 },
  privacyText: { fontSize: FontSizes.xs, color: Colors.silver, flexShrink: 1 },
  doneText: { fontSize: FontSizes.sm, color: Colors.gold, fontWeight: "700", paddingLeft: 8 },

  histDate: { fontSize: FontSizes.xs, color: Colors.gold, marginBottom: 4 },
  histText: { fontSize: FontSizes.sm, color: Colors.white, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: Spacing.sm },
  chip: { backgroundColor: Colors.navyLight, borderRadius: Radii.full, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontSize: FontSizes.xs, color: Colors.silver },
});
