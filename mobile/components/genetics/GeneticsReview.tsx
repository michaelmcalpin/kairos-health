/**
 * Client genetics review for iOS — the same plain-language, sectioned view the
 * web uses, in client mode: what each gene does, signs to watch, lifestyle &
 * food, supplements and labs. Peptide and prescription notes are never shown;
 * the client is pointed to their coach instead.
 */

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import {
  interpretMarkers, groupBySection, startHere, STRENGTH_LABEL,
  type RawMarker, type GeneView, type Strength,
} from "@/lib/genetics/interpret";

const TONE: Record<Strength, { fg: string; bg: string }> = {
  two: { fg: Colors.danger, bg: Colors.dangerMuted },
  one: { fg: Colors.warning, bg: Colors.warningMuted },
  none: { fg: Colors.success, bg: Colors.successMuted },
  unknown: { fg: Colors.silver, bg: Colors.navyLight },
};

interface Props {
  markers: RawMarker[];
  uploadType?: string | null;
  createdAt?: string | Date | null;
}

export function GeneticsReview({ markers, uploadType, createdAt }: Props) {
  const genes = useMemo(() => interpretMarkers(markers), [markers]);
  const attentionCount = genes.filter((g) => g.needsAttention).length;
  const focus = useMemo(() => startHere(genes), [genes]);
  const [filter, setFilter] = useState<"attention" | "all">(attentionCount > 0 ? "attention" : "all");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showKey, setShowKey] = useState(false);

  const sections = useMemo(
    () => groupBySection(genes.filter((g) => filter === "all" || g.needsAttention)),
    [genes, filter],
  );

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const openGene = (id: string) => {
    setFilter("all");
    setOpen((prev) => new Set(prev).add(id));
  };

  const count = (s: Strength) => genes.filter((g) => g.strength === s).length;
  const added = createdAt ? new Date(createdAt) : null;

  return (
    <View style={styles.wrap}>
      {/* Summary */}
      <Card style={styles.gap}>
        <View style={styles.rowBetween}>
          <Text style={styles.title}>Your Genetics</Text>
          <Pressable onPress={() => setShowKey((s) => !s)} hitSlop={8}>
            <Text style={styles.link}>{showKey ? "Hide" : "How to read this"}</Text>
          </Pressable>
        </View>
        <Text style={styles.meta}>
          {genes.length} genes checked
          {uploadType ? ` · ${uploadType}` : ""}
          {added && !isNaN(added.getTime()) ? ` · Added ${added.toLocaleDateString()}` : ""}
        </Text>

        <View style={styles.tiles}>
          <Tile tone="two" value={count("two")} label="Two copies changed" />
          <Tile tone="one" value={count("one")} label="One copy changed" />
          <Tile tone="none" value={count("none")} label="No change" />
        </View>

        {showKey && (
          <View style={styles.keyBox}>
            <Text style={styles.body}>Everyone has two copies of each gene, one from each parent.</Text>
            {(["two", "one", "none"] as Strength[]).map((s) => (
              <View key={s} style={styles.keyRow}>
                <Pill tone={s} label={STRENGTH_LABEL[s].short} />
                <Text style={[styles.body, styles.flex]}>{STRENGTH_LABEL[s].long}</Text>
              </View>
            ))}
            <Text style={styles.muted}>Genes are not destiny. Food, sleep, movement, and stress change how genes act.</Text>
          </View>
        )}

        {focus.length > 0 && (
          <View style={styles.gapSm}>
            <Text style={styles.label}>Start here</Text>
            <View style={styles.wrapRow}>
              {focus.map((g) => (
                <Pressable key={g.id} onPress={() => openGene(g.id)} style={styles.focusChip}>
                  <Text style={styles.focusGene}>{g.gene}</Text>
                  {!!g.nickname && <Text style={styles.focusNick}>{g.nickname}</Text>}
                </Pressable>
              ))}
            </View>
          </View>
        )}
      </Card>

      {/* Filter */}
      <View style={styles.segment}>
        {(["attention", "all"] as const).map((f) => (
          <Pressable key={f} onPress={() => setFilter(f)} style={[styles.segBtn, filter === f && styles.segOn]}>
            <Text style={[styles.segText, filter === f && styles.segTextOn]}>
              {f === "attention" ? `Needs attention (${attentionCount})` : `All genes (${genes.length})`}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Sections */}
      {sections.map((s) => (
        <Card key={s.key} style={styles.gapSm}>
          <Text style={styles.sectionTitle}>{s.title}</Text>
          <Text style={styles.muted}>{s.blurb}</Text>
          {s.genes.map((g) => (
            <GeneRow key={g.id} gene={g} open={open.has(g.id)} onToggle={() => toggle(g.id)} />
          ))}
        </Card>
      ))}

      <Text style={styles.disclaimer}>
        This is for learning, not a diagnosis. Talk with your coach or doctor before changing medicines or supplements.
      </Text>
    </View>
  );
}

function Tile({ tone, value, label }: { tone: Strength; value: number; label: string }) {
  return (
    <View style={[styles.tile, { backgroundColor: TONE[tone].bg }]}>
      <Text style={[styles.tileValue, { color: TONE[tone].fg }]}>{value}</Text>
      <Text style={[styles.tileLabel, { color: TONE[tone].fg }]}>{label}</Text>
    </View>
  );
}

function Pill({ tone, label }: { tone: Strength; label: string }) {
  return (
    <View style={[styles.pill, { backgroundColor: TONE[tone].bg }]}>
      <Text style={[styles.pillText, { color: TONE[tone].fg }]}>{label}</Text>
    </View>
  );
}

function GeneRow({ gene: g, open, onToggle }: { gene: GeneView; open: boolean; onToggle: () => void }) {
  const [showTech, setShowTech] = useState(false);
  const changed = g.strength !== "none";
  return (
    <View style={styles.gene}>
      <Pressable onPress={onToggle} style={styles.geneHead} accessibilityState={{ expanded: open }}>
        <View style={styles.flex}>
          <View style={styles.wrapRow}>
            <Text style={styles.geneName}>{g.gene}</Text>
            <Pill tone={g.strength} label={STRENGTH_LABEL[g.strength].short} />
          </View>
          {!!g.nickname && <Text style={styles.focusNick}>{g.nickname}</Text>}
          <Text style={styles.body}>{g.plain}</Text>
        </View>
        <Ionicons name={open ? "chevron-up" : "chevron-down"} size={18} color={Colors.silver} />
      </Pressable>

      {open && (
        <View style={styles.geneBody}>
          {!changed && <Text style={[styles.body, { color: Colors.success }]}>Good news: this gene looks typical. No extra steps needed.</Text>}
          {changed && !!g.changed && (
            <View style={styles.gapXs}>
              <Text style={styles.label}>What this change can mean</Text>
              <Text style={styles.body}>{g.changed}</Text>
            </View>
          )}
          {changed && g.symptoms.length > 0 && (
            <View style={styles.gapXs}>
              <Text style={styles.label}>Signs to watch for</Text>
              <View style={styles.wrapRow}>
                {g.symptoms.map((s) => (
                  <View key={s} style={styles.chip}><Text style={styles.chipText}>{s}</Text></View>
                ))}
              </View>
            </View>
          )}
          {changed && (
            <>
              <Block icon="leaf-outline" color={Colors.success} title="Lifestyle & food" items={g.lifestyle} />
              <Block icon="medkit-outline" color={Colors.info} title="Supplements" items={g.supplements} />
              <View style={styles.block}>
                <Text style={[styles.blockTitle, { color: Colors.goldLight }]}>More options</Text>
                <Text style={styles.body}>Ask your coach about other options, like peptides or prescription medicines, that may fit you.</Text>
              </View>
              {g.labs.length > 0 && <Block icon="flask-outline" color={Colors.silver} title="Labs to check" items={g.labs} />}
            </>
          )}
          {(g.technical.function || g.technical.effect || g.rsId || g.genotype) && (
            <View>
              <Pressable onPress={() => setShowTech((s) => !s)} hitSlop={6}>
                <Text style={styles.techToggle}>{showTech ? "Hide" : "Show"} science detail</Text>
              </Pressable>
              {showTech && (
                <View style={[styles.block, styles.gapXs]}>
                  {(!!g.rsId || !!g.genotype) && (
                    <Text style={styles.muted}>{g.rsId ? `${g.rsId} · ` : ""}{g.genotype ? `Result: ${g.genotype}` : ""}</Text>
                  )}
                  {!!g.technical.function && <Text style={styles.muted}>Function: {g.technical.function}</Text>}
                  {!!g.technical.effect && <Text style={styles.muted}>When changed: {g.technical.effect}</Text>}
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

function Block({ icon, color, title, items }: {
  icon: React.ComponentProps<typeof Ionicons>["name"]; color: string; title: string; items: string[];
}) {
  if (items.length === 0) return null;
  return (
    <View style={styles.block}>
      <View style={styles.blockHead}>
        <Ionicons name={icon} size={14} color={color} />
        <Text style={[styles.blockTitle, { color }]}>{title}</Text>
      </View>
      {items.map((it) => (
        <Text key={it} style={styles.body}>{"•  "}{it}</Text>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: Spacing.md },
  gap: { gap: Spacing.sm },
  gapSm: { gap: Spacing.sm },
  gapXs: { gap: Spacing.xs },
  flex: { flex: 1 },
  rowBetween: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  wrapRow: { flexDirection: "row", flexWrap: "wrap", alignItems: "center", gap: Spacing.xs },
  title: { fontSize: FontSizes.xl, fontWeight: "700", color: Colors.white },
  link: { fontSize: FontSizes.sm, color: Colors.gold },
  meta: { fontSize: FontSizes.xs, color: Colors.silver },
  label: { fontSize: FontSizes.xs, fontWeight: "600", color: Colors.silver, textTransform: "uppercase", letterSpacing: 0.5 },
  body: { fontSize: FontSizes.sm, color: Colors.silverLight, lineHeight: 20 },
  muted: { fontSize: FontSizes.xs, color: Colors.silver, lineHeight: 18 },
  tiles: { flexDirection: "row", gap: Spacing.sm },
  tile: { flex: 1, borderRadius: Radii.md, padding: Spacing.sm, alignItems: "center" },
  tileValue: { fontSize: FontSizes.xxl, fontWeight: "700" },
  tileLabel: { fontSize: FontSizes.xs, textAlign: "center", fontWeight: "600" },
  keyBox: { backgroundColor: Colors.navyLight, borderRadius: Radii.md, padding: Spacing.md, gap: Spacing.sm },
  keyRow: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  focusChip: { backgroundColor: Colors.infoMuted, borderColor: Colors.gold, borderWidth: StyleSheet.hairlineWidth, borderRadius: Radii.md, paddingVertical: 6, paddingHorizontal: 10 },
  focusGene: { fontSize: FontSizes.sm, fontWeight: "700", color: Colors.white },
  focusNick: { fontSize: FontSizes.xs, color: Colors.goldLight },
  segment: { flexDirection: "row", borderRadius: Radii.md, borderWidth: StyleSheet.hairlineWidth, borderColor: Colors.border, overflow: "hidden" },
  segBtn: { flex: 1, paddingVertical: Spacing.sm, alignItems: "center" },
  segOn: { backgroundColor: Colors.gold },
  segText: { fontSize: FontSizes.xs, color: Colors.silver },
  segTextOn: { color: Colors.dark, fontWeight: "700" },
  sectionTitle: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.gold },
  gene: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: Colors.border, paddingTop: Spacing.sm },
  geneHead: { flexDirection: "row", gap: Spacing.sm, alignItems: "flex-start" },
  geneName: { fontSize: FontSizes.md, fontWeight: "700", color: Colors.white },
  geneBody: { gap: Spacing.sm, marginTop: Spacing.sm },
  pill: { borderRadius: Radii.full, paddingVertical: 2, paddingHorizontal: 8 },
  pillText: { fontSize: 11, fontWeight: "600" },
  chip: { backgroundColor: Colors.navyLight, borderRadius: Radii.full, paddingVertical: 3, paddingHorizontal: 9 },
  chipText: { fontSize: FontSizes.xs, color: Colors.silverLight },
  block: { backgroundColor: Colors.navyLight, borderRadius: Radii.sm, padding: Spacing.sm, gap: 4 },
  blockHead: { flexDirection: "row", alignItems: "center", gap: 6 },
  blockTitle: { fontSize: FontSizes.xs, fontWeight: "700", textTransform: "uppercase", letterSpacing: 0.5 },
  techToggle: { fontSize: FontSizes.xs, color: Colors.silver, textDecorationLine: "underline" },
  disclaimer: { fontSize: FontSizes.xs, color: Colors.silver, lineHeight: 18, textAlign: "center", paddingHorizontal: Spacing.sm },
});
