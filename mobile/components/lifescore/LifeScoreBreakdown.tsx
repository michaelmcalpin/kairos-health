/**
 * Physical (60%) and Mental (40%) halves of the Core LifeScore.
 * Physical lists its parts (health data, labs, medications, genetics) and the
 * measures to work on; Mental lists Mind / Purpose / Relationships / Work.
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { DIMENSIONS } from "./dimensions";

export interface BreakdownData {
  physical?: {
    score: number | null;
    sentiment: string;
    parts: Array<{ key: string; label: string; score: number | null; weight: number; detail: string | null }>;
    focus?: Array<{ key: string; label: string; score: number }>;
    strengths?: Array<{ key: string; label: string; score: number }>;
  };
  mental?: { score: number | null; sentiment: string; practice?: { minPerDay: number; bonus: number } | null };
  dimensions: Array<{ dimension: string; score: number | null; sentiment: string }>;
}

const PHYSICAL_COLOR = "#5DCAA5";
const MENTAL_COLOR = "#8F7FD6";
const SENT: Record<string, { label: string; color: string }> = {
  well: { label: "Going well", color: Colors.success },
  steady: { label: "Steady", color: Colors.info },
  struggling: { label: "Needs care", color: Colors.warning },
  no_data: { label: "No data yet", color: Colors.silver },
};

function Bar({ value, color }: { value: number | null; color: string }) {
  return (
    <View style={styles.track}>
      <View style={[styles.fill, { width: `${value ?? 0}%`, backgroundColor: color }]} />
    </View>
  );
}

function Side({ title, weight, score, sentiment, color }: { title: string; weight: number; score: number | null; sentiment: string; color: string }) {
  const s = SENT[sentiment] ?? SENT.no_data;
  return (
    <View style={styles.side}>
      <Text style={styles.sideTitle}>{title} · {weight}%</Text>
      <Text style={[styles.sideScore, { color }]}>{score ?? "—"}</Text>
      <Text style={[styles.sideSent, { color: s.color }]}>{s.label}</Text>
    </View>
  );
}

export function LifeScoreBreakdown({ data }: { data: BreakdownData }) {
  const dims = new Map(data.dimensions.map((d) => [d.dimension, d]));
  const physical = data.physical ?? { score: dims.get("body")?.score ?? null, sentiment: dims.get("body")?.sentiment ?? "no_data", parts: [] };
  const mental = data.mental ?? { score: null, sentiment: "no_data" };
  const mentalDims = DIMENSIONS.filter((d) => d.key !== "body");

  return (
    <View style={styles.wrap}>
      <View style={styles.sides}>
        <Side title="Physical" weight={60} score={physical.score} sentiment={physical.sentiment} color={PHYSICAL_COLOR} />
        <Side title="Mental" weight={40} score={mental.score} sentiment={mental.sentiment} color={MENTAL_COLOR} />
      </View>

      <Text style={[styles.head, { color: PHYSICAL_COLOR }]}>Physical</Text>
      {physical.parts.length === 0 && <Text style={styles.muted}>No physical data yet.</Text>}
      {physical.parts.map((p) => (
        <View key={p.key} style={styles.partRow}>
          <View style={styles.row}>
            <Text style={styles.label}>{p.label}</Text>
            <Bar value={p.score} color={PHYSICAL_COLOR} />
            <Text style={styles.value}>{p.score ?? "—"}</Text>
          </View>
          <Text style={styles.detail}>{p.detail ?? "No data yet"}{p.weight ? ` · ${p.weight}% of Physical` : ""}</Text>
        </View>
      ))}
      {!!physical.focus?.length && (
        <View style={styles.chips}>
          <Text style={styles.chipHead}>Work on</Text>
          {physical.focus.map((m) => (
            <View key={m.key} style={[styles.chip, { backgroundColor: Colors.warningMuted }]}>
              <Text style={[styles.chipText, { color: Colors.warning }]}>{m.label} · {m.score}</Text>
            </View>
          ))}
        </View>
      )}
      {!!physical.strengths?.length && (
        <View style={styles.chips}>
          <Text style={styles.chipHead}>Strengths</Text>
          {physical.strengths.map((m) => (
            <View key={m.key} style={[styles.chip, { backgroundColor: Colors.successMuted }]}>
              <Text style={[styles.chipText, { color: Colors.success }]}>{m.label} · {m.score}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={[styles.head, { color: MENTAL_COLOR, marginTop: Spacing.sm }]}>Mental</Text>
      {mentalDims.map((d) => {
        const r = dims.get(d.key);
        return (
          <View key={d.key} style={[styles.row, { marginBottom: Spacing.sm }]}>
            <d.Icon size={16} color={d.color} />
            <Text style={styles.label}>{d.label}</Text>
            <Bar value={r?.score ?? null} color={d.color} />
            <Text style={styles.value}>{r?.score ?? "—"}</Text>
          </View>
        );
      })}
      {!!data.mental?.practice && data.mental.practice.bonus > 0 && (
        <Text style={styles.practice}>
          Mindful minutes: {data.mental.practice.minPerDay} a day, adding +{data.mental.practice.bonus} to Mind.
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.xs },
  practice: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: Spacing.xs },
  sides: { flexDirection: "row", gap: Spacing.sm, marginBottom: Spacing.sm },
  side: { flex: 1, backgroundColor: Colors.navyLight, borderRadius: Radii.md, padding: Spacing.sm },
  sideTitle: { color: Colors.silver, fontSize: 11, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  sideScore: { fontSize: FontSizes.xxl, fontWeight: "700", marginTop: 2 },
  sideSent: { fontSize: 11, fontWeight: "600" },
  head: { fontSize: FontSizes.sm, fontWeight: "700", marginBottom: 4 },
  muted: { color: Colors.silver, fontSize: FontSizes.xs },
  partRow: { marginBottom: Spacing.sm },
  row: { flexDirection: "row", alignItems: "center", gap: Spacing.sm },
  label: { color: Colors.silverLight, fontSize: FontSizes.xs, width: 118 },
  value: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "700", width: 30, textAlign: "right" },
  detail: { color: Colors.silver, fontSize: 10, marginTop: 2 },
  track: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.navyLight, overflow: "hidden" },
  fill: { height: "100%", borderRadius: 3 },
  chips: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: 6, marginBottom: 4 },
  chipHead: { color: Colors.silver, fontSize: 10, fontWeight: "700", textTransform: "uppercase" },
  chip: { borderRadius: Radii.full, paddingVertical: 2, paddingHorizontal: 8 },
  chipText: { fontSize: 11, fontWeight: "600" },
});
