/**
 * Shared "today" checklist used by both Guided and Full home modes.
 * Renders grouped, one-tap-completable items (advice/progress handled by parent).
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { PlayCircle } from "lucide-react-native";
import {
  Calendar,
  Syringe,
  Pill,
  Utensils,
  Dumbbell,
  Clock,
  Check,
  ListChecks,
} from "lucide-react-native";
import { Colors, Spacing, FontSizes } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import type { TodayItem, TodaySection } from "@/hooks/useToday";

function kindIcon(kind: TodayItem["kind"], color: string) {
  const size = 15;
  switch (kind) {
    case "task":
      return <ListChecks size={size} color={color} />;
    case "appointment":
      return <Calendar size={size} color={color} />;
    case "peptide":
      return <Syringe size={size} color={color} />;
    case "supplement":
    case "medication":
      return <Pill size={size} color={color} />;
    case "meal":
      return <Utensils size={size} color={color} />;
    case "workout":
      return <Dumbbell size={size} color={color} />;
    case "fasting":
      return <Clock size={size} color={color} />;
  }
}

function Row({ item, onToggle }: { item: TodayItem; onToggle: (i: TodayItem) => void }) {
  const done = item.done;
  return (
    <Pressable
      onPress={() => onToggle(item)}
      disabled={!item.completable}
      style={({ pressed }) => [styles.row, pressed && item.completable && styles.rowPressed]}
    >
      {item.completable ? (
        <View style={[styles.checkbox, done && styles.checkboxDone]}>
          {done && <Check size={14} color={Colors.dark} strokeWidth={3} />}
        </View>
      ) : (
        <View style={styles.kindDot}>{kindIcon(item.kind, Colors.silver)}</View>
      )}
      <View style={styles.rowBody}>
        <Text style={[styles.rowTitle, done && styles.rowTitleDone]} numberOfLines={1}>
          {item.title}
        </Text>
        {item.subtitle ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {item.subtitle}
          </Text>
        ) : null}
        {item.link ? (
          <Pressable
            onPress={() => item.link && Linking.openURL(item.link)}
            hitSlop={6}
            style={styles.watchBtn}
          >
            <PlayCircle size={13} color={Colors.gold} />
            <Text style={styles.watchText}>Watch demo</Text>
          </Pressable>
        ) : null}
      </View>
      {item.time ? <Text style={styles.rowTime}>{item.time}</Text> : null}
    </Pressable>
  );
}

export function TodayChecklist({
  sections,
  onToggle,
}: {
  sections: TodaySection[];
  onToggle: (i: TodayItem) => void;
}) {
  if (sections.length === 0) {
    return (
      <Card style={styles.emptyCard}>
        <Text style={styles.emptyText}>Nothing on your plan yet today.</Text>
      </Card>
    );
  }
  return (
    <View>
      {sections.map((section) => (
        <View key={section.key} style={styles.section}>
          <Text style={styles.sectionLabel}>{section.label}</Text>
          <Card style={styles.sectionCard}>
            {section.items.map((item, i) => (
              <View key={item.key}>
                {i > 0 && <View style={styles.divider} />}
                <Row item={item} onToggle={onToggle} />
              </View>
            ))}
          </Card>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  section: { marginBottom: Spacing.md },
  sectionLabel: {
    color: Colors.gold,
    fontSize: 11,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
    marginBottom: Spacing.xs,
  },
  sectionCard: { paddingVertical: 4 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: Spacing.sm,
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  rowPressed: { opacity: 0.6 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.silver,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxDone: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  kindDot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navyLight,
  },
  rowBody: { flex: 1 },
  rowTitle: { color: Colors.white, fontSize: FontSizes.sm, fontWeight: "600" },
  rowTitleDone: { color: Colors.silver, textDecorationLine: "line-through" },
  rowSubtitle: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 2 },
  watchBtn: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 5 },
  watchText: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },
  rowTime: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 32 },
  emptyCard: { alignItems: "center", paddingVertical: Spacing.lg },
  emptyText: { color: Colors.silver, fontSize: FontSizes.sm },
});
