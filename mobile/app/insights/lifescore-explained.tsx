/**
 * "Your LifeScore, explained" — opened by tapping the LifeScore ring or card.
 * Physical and Mental breakdown, every measure behind Physical, and the
 * actions that would raise the score most, with estimated points (computed on
 * the server with the score's own weights; see src/lib/lifescore/actions.ts).
 */

import React, { useCallback } from "react";
import { View, Text, ScrollView, StyleSheet, ActivityIndicator, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useFocusEffect, useRouter } from "expo-router";
import { ChevronRight, TrendingUp, HeartPulse, Brain } from "lucide-react-native";

import { Card } from "@/components/ui/Card";
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";
import { LifeScoreBreakdown, type BreakdownData } from "@/components/lifescore/LifeScoreBreakdown";

interface Action { key: string; area: "physical" | "mental"; title: string; detail: string; gain: number | null; href: string }
type Score = BreakdownData & {
  score: number | null;
  actions?: Action[];
  physical?: BreakdownData["physical"] & { measures?: Array<{ key: string; label: string; score: number }> };
};

/** Web routes in the action list → the matching app screen. */
const APP_ROUTE: Record<string, string> = {
  "/sleep": "/health/sleep",
  "/workouts": "/health/activity",
  "/vitals": "/health/vitals",
  "/health-data": "/health/all",
  "/labs": "/clinical/labs",
  "/genetics": "/clinical/genetics",
  "/nutrition": "/protocols/meals",
  "/goals": "/health/goals",
  "/dashboard": "/protocols/supplements",
  "/lifescore": "/lifescore",
};

const PHYSICAL = "#5DCAA5";
const MENTAL = "#8F7FD6";
const scoreColor = (s: number) => (s >= 85 ? Colors.success : s >= 70 ? PHYSICAL : s >= 50 ? "#D4A843" : "#E07070");
const gainText = (g: number | null) => (g == null ? "Unlocks more of your score" : `up to +${g >= 10 ? Math.round(g) : g} pts`);

function ActionRow({ a }: { a: Action }) {
  const router = useRouter();
  const target = APP_ROUTE[a.href];
  return (
    <Pressable
      onPress={() => target && router.push(target as never)}
      style={({ pressed }) => [styles.action, pressed && { opacity: 0.7 }]}
      accessibilityRole="button"
      accessibilityLabel={`${a.title}. ${gainText(a.gain)}. ${a.detail}`}
    >
      <View style={{ flex: 1 }}>
        <Text style={styles.actionTitle}>{a.title}</Text>
        <Text style={[styles.gain, a.gain == null && styles.gainUnlock]}>{gainText(a.gain)}</Text>
        <Text style={styles.actionDetail}>{a.detail}</Text>
      </View>
      {target && <ChevronRight size={18} color={Colors.silver} />}
    </Pressable>
  );
}

function Actions({ list, empty }: { list: Action[]; empty: string }) {
  if (list.length === 0) return <Text style={styles.muted}>{empty}</Text>;
  return <View style={{ gap: Spacing.sm }}>{list.map((a) => <ActionRow key={a.key} a={a} />)}</View>;
}

export default function LifeScoreExplainedScreen() {
  const router = useRouter();
  const q = trpc.clientPortal.lifeScore.getScore.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const refetch = q.refetch;
  useFocusEffect(useCallback(() => { refetch(); }, [refetch]));
  const data = q.data as Score | undefined;
  const actions = data?.actions ?? [];
  const measures = data?.physical?.measures ?? [];

  return (
    <SafeAreaView style={styles.safe} edges={["bottom"]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.intro}>
          Your Core LifeScore is 60% Physical and 40% Mental, averaged over 7 days. Anything you haven&apos;t tracked is left out, never counted as zero.
        </Text>

        {q.isLoading && <ActivityIndicator color={Colors.gold} style={{ paddingVertical: Spacing.xl }} />}
        {q.isError && <Text style={styles.muted}>Your score couldn&apos;t load right now. Pull back and try again.</Text>}

        {data && (
          <>
            <View style={styles.scoresRow}>
              {([["Core", data.score, Colors.gold], ["Physical", data.physical?.score ?? null, PHYSICAL], ["Mental", data.mental?.score ?? null, MENTAL]] as const).map(([label, s, c]) => (
                <View key={label} style={styles.scoreTile}>
                  <Text style={[styles.scoreNum, { color: c }]}>{s ?? "—"}</Text>
                  <Text style={styles.scoreLabel}>{label}</Text>
                </View>
              ))}
            </View>

            <Card style={styles.card}>
              <View style={styles.heading}><TrendingUp size={18} color={Colors.gold} /><Text style={styles.h2}>How to raise your score</Text></View>
              <Actions list={actions.slice(0, 5)} empty="You're at or near target on everything we track. Keep it up and keep checking in." />
              <Text style={styles.footnote}>
                Points are estimates: what your Core LifeScore could gain if that one thing reached its target, everything else the same. Better sleep, more movement, daily check-ins and following your protocol all add up.
              </Text>
            </Card>

            <Card style={styles.card}>
              <View style={styles.heading}><HeartPulse size={18} color={PHYSICAL} /><Text style={styles.h2}>Physical · {data.physical?.score ?? "—"}</Text></View>
              <Text style={styles.muted}>Device data (sleep, heart, activity, vitals, workouts, plan goals), labs, following your protocol, and genetics follow-through.</Text>
              <LifeScoreBreakdown data={data} />
              {measures.length > 0 && (
                <View style={{ gap: 6, marginTop: Spacing.sm }}>
                  <Text style={styles.h3}>Every measure in your score</Text>
                  {measures.map((m) => (
                    <View key={m.key} style={styles.measure}>
                      <Text style={styles.measureLabel} numberOfLines={1}>{m.label}</Text>
                      <View style={styles.track}><View style={[styles.fill, { width: `${m.score}%`, backgroundColor: scoreColor(m.score) }]} /></View>
                      <Text style={styles.measureScore}>{m.score}</Text>
                    </View>
                  ))}
                </View>
              )}
              <Text style={styles.h3}>To raise Physical</Text>
              <Actions list={actions.filter((a) => a.area === "physical")} empty="Your physical measures are at or near target." />
            </Card>

            <Card style={styles.card}>
              <View style={styles.heading}><Brain size={18} color={MENTAL} /><Text style={styles.h2}>Mental · {data.mental?.score ?? "—"}</Text></View>
              <Text style={styles.muted}>Your daily 1–5 ratings of Mind, Purpose, Relationships and Work. Mindful minutes add a small bonus to Mind. Your coach sees scores and trends, never what you write.</Text>
              <Text style={styles.h3}>To raise Mental</Text>
              <Actions list={actions.filter((a) => a.area === "mental")} empty="Your mental areas look strong. Keep up your daily check-ins." />
              <Pressable onPress={() => router.push("/lifescore" as never)} style={styles.cta}>
                <Text style={styles.ctaText}>Do today&apos;s check-in</Text>
                <ChevronRight size={16} color={Colors.gold} />
              </Pressable>
            </Card>
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.dark },
  content: { padding: Spacing.md, gap: Spacing.md, paddingBottom: Spacing.xl * 2 },
  intro: { color: Colors.silver, fontSize: FontSizes.sm, lineHeight: 20 },
  scoresRow: { flexDirection: "row", gap: Spacing.sm },
  scoreTile: { flex: 1, backgroundColor: Colors.navyLight, borderRadius: Radii.md, paddingVertical: Spacing.md, alignItems: "center" },
  scoreNum: { fontSize: FontSizes.xxl, fontWeight: "700" },
  scoreLabel: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 2 },
  card: { gap: Spacing.sm },
  heading: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  h2: { color: Colors.white, fontSize: FontSizes.lg, fontWeight: "700" },
  h3: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "700", marginTop: Spacing.sm },
  muted: { color: Colors.silver, fontSize: FontSizes.sm, lineHeight: 20 },
  footnote: { color: Colors.silver, fontSize: FontSizes.xs, lineHeight: 17, marginTop: Spacing.xs },
  action: { flexDirection: "row", alignItems: "center", gap: Spacing.sm, borderWidth: 1, borderColor: "rgba(192,197,206,0.15)", borderRadius: Radii.md, padding: Spacing.sm },
  actionTitle: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "700" },
  gain: { color: Colors.success, fontSize: FontSizes.xs, fontWeight: "700", marginTop: 2 },
  gainUnlock: { color: Colors.gold },
  actionDetail: { color: Colors.silver, fontSize: FontSizes.sm, marginTop: 4, lineHeight: 19 },
  measure: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  measureLabel: { color: Colors.silver, fontSize: FontSizes.sm, flex: 1 },
  track: { width: 90, height: 6, borderRadius: 3, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  measureScore: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "700", width: 28, textAlign: "right" },
  cta: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: Spacing.sm },
  ctaText: { color: Colors.gold, fontSize: FontSizes.sm, fontWeight: "700" },
});
