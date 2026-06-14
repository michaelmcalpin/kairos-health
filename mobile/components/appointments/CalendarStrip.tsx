/**
 * CalendarStrip — horizontally scrollable strip showing 14 days.
 * Today highlighted in gold. Selected date has gold background.
 */

import React, { useRef, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  Pressable,
  StyleSheet,
} from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAY_WIDTH = 56;

interface CalendarStripProps {
  selectedDate: Date;
  onSelectDate: (date: Date) => void;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function generateDays(count: number): Date[] {
  const today = new Date();
  const days: Date[] = [];
  for (let i = 0; i < count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export function CalendarStrip({
  selectedDate,
  onSelectDate,
}: CalendarStripProps) {
  const scrollRef = useRef<ScrollView>(null);
  const today = new Date();
  const days = generateDays(14);

  // Scroll to selected date on mount
  useEffect(() => {
    const idx = days.findIndex((d) => isSameDay(d, selectedDate));
    if (idx > 0 && scrollRef.current) {
      scrollRef.current.scrollTo({
        x: Math.max(0, idx * (DAY_WIDTH + 8) - 100),
        animated: true,
      });
    }
  }, []);

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollRef}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          const isSelected = isSameDay(day, selectedDate);
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <Pressable
              key={day.toISOString()}
              onPress={() => onSelectDate(day)}
              style={[
                styles.dayCell,
                isSelected && styles.dayCellSelected,
                isToday && !isSelected && styles.dayCellToday,
              ]}
            >
              <Text
                style={[
                  styles.dayName,
                  isSelected && styles.dayNameSelected,
                  isWeekend && !isSelected && styles.dayNameWeekend,
                ]}
              >
                {DAY_NAMES[day.getDay()]}
              </Text>
              <Text
                style={[
                  styles.dayNumber,
                  isSelected && styles.dayNumberSelected,
                  isToday && !isSelected && styles.dayNumberToday,
                ]}
              >
                {day.getDate()}
              </Text>
              {isToday && (
                <View
                  style={[
                    styles.todayDot,
                    isSelected && styles.todayDotSelected,
                  ]}
                />
              )}
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    paddingHorizontal: Spacing.xs,
    gap: 8,
  },
  dayCell: {
    width: DAY_WIDTH,
    height: 76,
    borderRadius: Radii.md,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.navy,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  dayCellSelected: {
    backgroundColor: Colors.gold,
    borderColor: Colors.gold,
  },
  dayCellToday: {
    borderColor: Colors.goldDark,
  },
  dayName: {
    fontSize: 11,
    fontWeight: "500",
    color: Colors.silver,
    marginBottom: 4,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  dayNameSelected: {
    color: Colors.dark,
  },
  dayNameWeekend: {
    color: "rgba(148, 163, 184, 0.5)",
  },
  dayNumber: {
    fontSize: FontSizes.lg,
    fontWeight: "700",
    color: Colors.white,
  },
  dayNumberSelected: {
    color: Colors.dark,
  },
  dayNumberToday: {
    color: Colors.gold,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.gold,
    marginTop: 4,
  },
  todayDotSelected: {
    backgroundColor: Colors.dark,
  },
});
