/**
 * Day stepper shared by the Guided and Full home views. Lets the client step
 * back to complete something they forgot to mark yesterday, or forward to
 * preview tomorrow's plan. The selected date drives useToday(dateStr) so both
 * the data and the complete/undo mutation are keyed by that day server-side.
 */

import React, { useMemo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

// Local (not UTC) YYYY-MM-DD for a given Date.
export function toDateStr(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export interface DayNavState {
  selectedDate: Date;
  dateStr: string;
  isToday: boolean;
  relLabel: string;
  fullLabel: string;
  shiftDay: (delta: number) => void;
  resetToday: () => void;
}

export function useDayNav(): DayNavState {
  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const dateStr = toDateStr(selectedDate);
  const isToday = dateStr === toDateStr(new Date());

  const shiftDay = (delta: number) =>
    setSelectedDate((d) => {
      const n = new Date(d);
      n.setDate(n.getDate() + delta);
      return n;
    });
  const resetToday = () => setSelectedDate(new Date());

  const { relLabel, fullLabel } = useMemo(() => {
    const y = new Date(); y.setDate(y.getDate() - 1);
    const t = new Date(); t.setDate(t.getDate() + 1);
    const rel = isToday
      ? "Today"
      : dateStr === toDateStr(y)
        ? "Yesterday"
        : dateStr === toDateStr(t)
          ? "Tomorrow"
          : selectedDate.toLocaleDateString("en-US", { weekday: "long" });
    const full = selectedDate.toLocaleDateString("en-US", { month: "long", day: "numeric" });
    return { relLabel: rel, fullLabel: full };
  }, [dateStr, isToday, selectedDate]);

  return { selectedDate, dateStr, isToday, relLabel, fullLabel, shiftDay, resetToday };
}

export function DayNav({ nav }: { nav: DayNavState }) {
  return (
    <>
      <View style={styles.dayNav}>
        <Pressable onPress={() => nav.shiftDay(-1)} hitSlop={10} style={styles.navBtn}>
          <ChevronLeft size={22} color={Colors.gold} />
        </Pressable>
        <View style={styles.dayNavCenter}>
          <Text style={styles.dayRel}>{nav.relLabel}</Text>
          <Text style={styles.dayFull}>{nav.fullLabel}</Text>
        </View>
        <Pressable onPress={() => nav.shiftDay(1)} hitSlop={10} style={styles.navBtn}>
          <ChevronRight size={22} color={Colors.gold} />
        </Pressable>
      </View>
      {!nav.isToday && (
        <Pressable onPress={nav.resetToday} style={styles.jumpToday} hitSlop={6}>
          <CalendarDays size={13} color={Colors.gold} />
          <Text style={styles.jumpTodayText}>Back to today</Text>
        </Pressable>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  dayNav: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.navyLight,
    borderRadius: Radii.lg,
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  navBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  dayNavCenter: { alignItems: "center", flex: 1 },
  dayRel: { color: Colors.white, fontSize: FontSizes.md, fontWeight: "700" },
  dayFull: { color: Colors.silver, fontSize: FontSizes.xs, marginTop: 1 },
  jumpToday: {
    flexDirection: "row", alignItems: "center", alignSelf: "center", gap: 5,
    marginTop: Spacing.sm, paddingVertical: 4, paddingHorizontal: 10,
  },
  jumpTodayText: { color: Colors.gold, fontSize: FontSizes.xs, fontWeight: "600" },
});
