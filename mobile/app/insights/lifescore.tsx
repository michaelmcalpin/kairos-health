/**
 * Everist LifeScore™ — mobile whole-person wellbeing screen.
 *
 * "Your health is more than your body. LifeScore measures the five dimensions
 * that shape how well you're actually living." Five dimensions: Body, Mind,
 * Purpose, Relationships, Work. The client rates each (skippable), reflects in a
 * private journal (tagged by AI into shareable themes), and sees their composite
 * score + per-dimension breakdown vs their own baseline.
 */

import React, { useMemo, useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet, TextInput, Alert, ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Svg, { Circle } from "react-native-svg";
import {
  HeartPulse, Brain, Compass, Users, Briefcase, Sparkles, Lock,
} from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

type Dimension = "body" | "mind" | "purpose" | "relationships" | "work";

const DIMENSIONS: {
  key: Dimension; label: string; scope: string; Icon: typeof HeartPulse; color: string;
}[] = [
  { key: "body", label: "Body", scope: "Fitness, sleep, nutrition", Icon: HeartPulse, color: "#5DCAA5" },
  { key: "mind", label: "Mind", scope: "Mental, emotional", Icon: Brain, color: "#8F7FD6" },
  { key: "purpose", label: "Purpose", scope: "Meaning, values", Icon: Compass, color: "#7FB5E0" },
  { key: "relationships", label: "Relationships", scope: "Family, friends, connection", Icon: Users, color: "#E78FB1" },
  { key: "work", label: "Work", scope: "Career, stress, stability", Icon: Briefcase, color: "#E0A24A" },
];

function sentimentColor(s: string): string {
  if (s === "well") return Colors.success;
  if (s === "struggling") return Colors.warning;
  if (s === "steady") return Colors.silver;
  return Colors.border;
}
function sentimentLabel(s: string): string {
  if (s === "well") return "Going well";
  if (s === "struggling") return "Struggling";
  if (s === "steady") return "Steady";
  return "No data yet";
}

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
          <Text style={styles.ringLabel}>LifeScore</Text>
        </View>
      </View>
    </View>
  );
}

export default function LifeScoreScreen() {
  const utils = trpc.useUtils();
  const [ratings, setRatings] = useState<Partial<Record<Dimension, number>>>({});
  const [journal, setJournal] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);
  const [savingCheckin, setSavingCheckin] = useState(false);
  const [savingJournal, setSavingJournal] = useState(false);

  const scoreQuery = trpc.clientPortal.lifeScore.getScore.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const promptQuery = trpc.clientPortal.lifeScore.getPrompt.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const historyQuery = trpc.clientPortal.lifeScore.getJournalHistory.useQuery({ limit: 10 }, DEFAULT_QUERY_OPTIONS);

  const submitCheckin = trpc.clientPortal.lifeScore.submitCheckin.useMutation();
  const saveJournal = trpc.clientPortal.lifeScore.saveJournal.useMutation();

  const score = scoreQuery.data as
    | { score: number | null; hasData: boolean; dimensions: { dimension: Dimension; score: number | null; sentiment: string; weight: number }[] }
    | undefined;
  const dimResults = useMemo(() => {
    const map = new Map<string, { score: number | null; sentiment: string }>();
    for (const d of score?.dimensions ?? []) map.set(d.dimension, { score: d.score, sentiment: d.sentiment });
    return map;
  }, [score]);

  const prompt = promptQuery.data as { text: string; dimension: string } | undefined;
  const history = (historyQuery.data as { id: string; date: string; text: string; themes: { dimension: string; theme: string; valence: string }[] }[] | undefined) ?? [];

  const setRating = (dim: Dimension, val: number) =>
    setRatings((p) => ({ ...p, [dim]: p[dim] === val ? undefined : val }));

  const handleSubmitCheckin = async () => {
    const entries = DIMENSIONS
      .filter((d) => ratings[d.key] != null)
      .map((d) => ({ dimension: d.key, rating: ratings[d.key] as number }));
    if (entries.length === 0) {
      Alert.alert("Nothing to save", "Rate at least one dimension, or skip for today.");
      return;
    }
    setSavingCheckin(true);
    try {
      const res = await submitCheckin.mutateAsync({ ratings: entries });
      setFollowUp((res as { followUp: string | null })?.followUp ?? null);
      await Promise.all([
        utils.clientPortal.lifeScore.getScore.invalidate(),
        utils.clientPortal.lifeScore.getPrompt.invalidate(),
      ]);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingCheckin(false);
    }
  };

  const handleSaveJournal = async () => {
    if (!journal.trim()) return;
    setSavingJournal(true);
    try {
      await saveJournal.mutateAsync({ text: journal.trim() });
      setJournal("");
      await Promise.all([
        historyQuery.refetch(),
        utils.clientPortal.lifeScore.getScore.invalidate(),
      ]);
    } catch (err) {
      Alert.alert("Couldn't save", err instanceof Error ? err.message : "Please try again.");
    } finally {
      setSavingJournal(false);
    }
  };

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.tagline}>
          Your health is more than your body. LifeScore measures the five dimensions that shape how well you&apos;re living.
        </Text>

        {/* ── Score ring + dimension breakdown ── */}
        <Card style={styles.card}>
          {scoreQuery.isLoading ? (
            <ActivityIndicator color={Colors.gold} style={{ paddingVertical: Spacing.xl }} />
          ) : (
            <>
              <View style={{ alignItems: "center", marginBottom: Spacing.md }}>
                <Ring score={score?.score ?? null} />
              </View>
              {DIMENSIONS.map((d) => {
                const r = dimResults.get(d.key);
                const val = r?.score ?? null;
                const sent = r?.sentiment ?? "no_data";
                return (
                  <View key={d.key} style={styles.dimRow}>
                    <d.Icon size={18} color={d.color} />
                    <View style={{ flex: 1 }}>
                      <View style={styles.dimBarTrack}>
                        <View style={[styles.dimBarFill, { width: `${val ?? 0}%`, backgroundColor: d.color }]} />
                      </View>
                    </View>
                    <Text style={styles.dimLabel}>{d.label}</Text>
                    <Text style={[styles.dimSent, { color: sentimentColor(sent) }]}>
                      {val == null ? "—" : val}
                    </Text>
                  </View>
                );
              })}
              {!score?.hasData && (
                <Text style={styles.emptyHint}>
                  Rate a few dimensions below to start building your LifeScore.
                </Text>
              )}
            </>
          )}
        </Card>

        {/* ── Daily check-in ── */}
        <Text style={styles.sectionTitle}>Today&apos;s check-in</Text>
        <Card style={styles.card}>
          <Text style={styles.checkinHint}>Rate each area. Skip any you&apos;d rather not.</Text>
          {DIMENSIONS.map((d) => (
            <View key={d.key} style={styles.rateRow}>
              <View style={styles.rateLabelWrap}>
                <d.Icon size={16} color={d.color} />
                <Text style={styles.rateLabel}>{d.label}</Text>
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

          {/* Prompt / adaptive follow-up */}
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
            title={savingCheckin ? "Saving…" : "Save check-in"}
            onPress={handleSubmitCheckin}
            disabled={savingCheckin}
            style={{ marginTop: Spacing.md }}
          />
        </Card>

        {/* ── Journal ── */}
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
            <Lock size={13} color={Colors.silver} />
            <Text style={styles.privacyText}>Private — your coach sees themes, not the words.</Text>
          </View>
          <Button
            title={savingJournal ? "Saving…" : "Save entry"}
            variant="secondary"
            onPress={handleSaveJournal}
            disabled={savingJournal || !journal.trim()}
            style={{ marginTop: Spacing.sm }}
          />
        </Card>

        {/* ── History ── */}
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
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, paddingBottom: Spacing.xxl },
  tagline: { fontSize: FontSizes.sm, color: Colors.silver, lineHeight: 20, marginBottom: Spacing.md },
  card: { marginBottom: Spacing.md },

  ringScore: { fontSize: 40, fontWeight: "700", color: Colors.white },
  ringLabel: { fontSize: FontSizes.xs, color: Colors.silver, marginTop: 2 },

  dimRow: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, marginTop: Spacing.sm },
  dimBarTrack: { height: 6, borderRadius: 3, backgroundColor: Colors.navyLight, overflow: "hidden" },
  dimBarFill: { height: 6, borderRadius: 3 },
  dimLabel: { fontSize: FontSizes.xs, color: Colors.white, width: 84, textAlign: "right" },
  dimSent: { fontSize: FontSizes.sm, fontWeight: "700", width: 30, textAlign: "right" },
  emptyHint: { fontSize: FontSizes.xs, color: Colors.silver, textAlign: "center", marginTop: Spacing.md },

  sectionTitle: { fontSize: FontSizes.lg, fontWeight: "600", color: Colors.white, marginBottom: Spacing.sm, marginTop: Spacing.xs },
  checkinHint: { fontSize: FontSizes.xs, color: Colors.silver, marginBottom: Spacing.sm },

  rateRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginVertical: 7 },
  rateLabelWrap: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  rateLabel: { fontSize: FontSizes.sm, color: Colors.white },
  dots: { flexDirection: "row", gap: 8 },
  dot: { width: 18, height: 18, borderRadius: 9, borderWidth: 1.5, borderColor: Colors.border, backgroundColor: "transparent" },

  promptBox: { backgroundColor: Colors.navyLight, borderRadius: Radii.md, padding: Spacing.md, marginTop: Spacing.md },
  promptHead: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 6 },
  promptHeadText: { fontSize: FontSizes.xs, color: Colors.goldLight, fontWeight: "600", textTransform: "uppercase", letterSpacing: 0.5 },
  promptText: { fontSize: FontSizes.sm, color: Colors.white, lineHeight: 20 },

  journalInput: {
    minHeight: 96, color: Colors.white, fontSize: FontSizes.sm, lineHeight: 20,
    borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, borderRadius: Radii.md,
    padding: Spacing.md, textAlignVertical: "top",
  },
  privacyRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: Spacing.sm },
  privacyText: { fontSize: FontSizes.xs, color: Colors.silver },

  histDate: { fontSize: FontSizes.xs, color: Colors.gold, marginBottom: 4 },
  histText: { fontSize: FontSizes.sm, color: Colors.white, lineHeight: 20 },
  chips: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: Spacing.sm },
  chip: { backgroundColor: Colors.navyLight, borderRadius: Radii.full, paddingVertical: 4, paddingHorizontal: 10 },
  chipText: { fontSize: FontSizes.xs, color: Colors.silver },
});
