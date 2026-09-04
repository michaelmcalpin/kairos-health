/**
 * Shared "today" checklist used by both Guided and Full home modes.
 * Renders grouped, one-tap-completable items (advice/progress handled by parent).
 */

import React from "react";
import { View, Text, StyleSheet, Pressable, Linking } from "react-native";
import { PlayCircle, Video } from "lucide-react-native";
import { openMeetingLink } from "@/lib/meeting";
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
import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Card } from "@/components/ui/Card";
import { formatClockTime, formatInstant } from "@/lib/format";
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
  const toggle = () => item.completable && onToggle(item);
  // Meeting times are stored as 24h "HH:MM" — show them as 12-hour + timezone
  // (e.g. "2:30 PM PST"). Other item times (e.g. "AM with food") pass through.
  const isAppt = item.kind === "appointment";
  // Meetings: prefer the absolute UTC instant rendered in the device timezone
  // (e.g. "2:30 PM PST"); fall back to the coach-local wall-clock for old rows.
  const timeLabel = isAppt
    ? formatInstant(item.startAtUtc) || formatClockTime(item.time)
    : item.time;
  // For a meeting with a "Join" button the time can't sit on the right, so fold
  // it into the subtitle line instead.
  const subtitleText =
    isAppt && timeLabel
      ? [item.subtitle, timeLabel].filter(Boolean).join(" · ")
      : item.subtitle;
  // Not a single full-row Pressable: the checkbox + text toggle completion,
  // while the "Watch demo" link is its own separate tap target so it opens the
  // video instead of toggling the task.
  return (
    <View style={styles.row}>
      <Pressable onPress={toggle} disabled={!item.completable} hitSlop={8}>
        {item.completable ? (
          <View style={[styles.checkbox, done && styles.checkboxDone]}>
            {done && <Check size={14} color={Colors.dark} strokeWidth={3} />}
          </View>
        ) : (
          <View style={styles.kindDot}>{kindIcon(item.kind, Colors.silver)}</View>
        )}
      </Pressable>
      <Pressable
        onPress={toggle}
        disabled={!item.completable}
        style={({ pressed }) => [styles.rowBody, pressed && item.completable && styles.rowPressed]}
      >
        <Text style={[styles.rowTitle, done && styles.rowTitleDone]} numberOfLines={1}>
          {item.title}
        </Text>
        {subtitleText ? (
          <Text style={styles.rowSubtitle} numberOfLines={2}>
            {subtitleText}
          </Text>
        ) : null}
      </Pressable>
      {item.link && item.kind === "appointment" ? (
        <Pressable
          onPress={() => openMeetingLink(item.link)}
          hitSlop={10}
          style={styles.watchBtn}
        >
          <Video size={16} color={Colors.gold} />
          <Text style={styles.watchText}>Join</Text>
        </Pressable>
      ) : item.link ? (
        <Pressable
          onPress={() => item.link && Linking.openURL(item.link)}
          hitSlop={10}
          style={styles.watchBtn}
        >
          <PlayCircle size={16} color={Colors.gold} />
          <Text style={styles.watchText}>Watch</Text>
        </Pressable>
      ) : timeLabel ? (
        <Text style={styles.rowTime}>{timeLabel}</Text>
      ) : null}
    </View>
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
  watchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: Radii.md,
    backgroundColor: "rgba(212,175,55,0.12)",
  },
  watchText: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },
  rowTime: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: Colors.border, marginLeft: 32 },
  emptyCard: { alignItems: "center", paddingVertical: Spacing.lg },
  emptyText: { color: Colors.silver, fontSize: FontSizes.sm },
});
