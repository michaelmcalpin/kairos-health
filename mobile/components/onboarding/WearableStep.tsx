/**
 * Wearable selection step — "Which wearable do you use?"
 *
 * Inspired by Bevel's wearable onboarding screen.
 * Lists the major wearable platforms as large tappable cards.
 * Selecting one records the preference and proceeds to the next step.
 */

import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import {
  Watch,
  Activity,
  Moon,
  Zap,
  Heart,
  Smartphone,
  CircleOff,
  ChevronRight,
  Check,
} from "lucide-react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";
import { Button } from "@/components/ui/Button";

export interface WearableChoice {
  id: string;
  name: string;
}

interface Props {
  selected: WearableChoice[];
  onSelect: (choices: WearableChoice[]) => void;
  onContinue: () => void;
  onBack: () => void;
}

interface WearableOption {
  id: string;
  name: string;
  subtitle: string;
  icon: React.ReactNode;
  iconBg: string;
}

const WEARABLE_OPTIONS: WearableOption[] = [
  {
    id: "apple_watch",
    name: "Apple Watch",
    subtitle: "via Apple Health",
    icon: <Watch size={22} color="#FF375F" />,
    iconBg: "rgba(255, 55, 95, 0.12)",
  },
  {
    id: "garmin",
    name: "Garmin",
    subtitle: "Garmin Connect",
    icon: <Activity size={22} color="#4A90D9" />,
    iconBg: "rgba(74, 144, 217, 0.12)",
  },
  {
    id: "oura",
    name: "Oura Ring",
    subtitle: "Sleep & Recovery",
    icon: <Moon size={22} color="#A78BFA" />,
    iconBg: "rgba(167, 139, 250, 0.12)",
  },
  {
    id: "whoop",
    name: "WHOOP",
    subtitle: "Strain & Recovery",
    icon: <Zap size={22} color="#F97316" />,
    iconBg: "rgba(249, 115, 22, 0.12)",
  },
  {
    id: "dexcom",
    name: "Dexcom CGM",
    subtitle: "Glucose Monitoring",
    icon: <Activity size={22} color="#4A9D5B" />,
    iconBg: "rgba(74, 157, 91, 0.12)",
  },
  {
    id: "apple_health",
    name: "Other via Apple Health",
    subtitle: "Fitbit, Withings, etc.",
    icon: <Heart size={22} color="#FF375F" fill="#FF375F" />,
    iconBg: "rgba(255, 55, 95, 0.12)",
  },
  {
    id: "none",
    name: "I don't have a device",
    subtitle: "You can connect one later",
    icon: <CircleOff size={22} color={Colors.silver} />,
    iconBg: "rgba(192, 197, 206, 0.12)",
  },
];

export function WearableStep({ selected, onSelect, onContinue, onBack }: Props) {
  const isSelected = (id: string) => selected.some((s) => s.id === id);

  const handleToggle = (option: WearableOption) => {
    if (option.id === "none") {
      // "No device" deselects everything else
      onSelect([{ id: "none", name: "None" }]);
      return;
    }

    // Remove "none" if present, then toggle
    const withoutNone = selected.filter((s) => s.id !== "none");
    if (isSelected(option.id)) {
      onSelect(withoutNone.filter((s) => s.id !== option.id));
    } else {
      onSelect([...withoutNone, { id: option.id, name: option.name }]);
    }
  };

  const canContinue = selected.length > 0;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Which wearable do you use?</Text>
        <Text style={styles.subtitle}>
          Select your devices to begin syncing health data.{"\n"}
          You can connect additional devices later.
        </Text>
      </View>

      {/* Options */}
      <View style={styles.optionsList}>
        {WEARABLE_OPTIONS.map((option) => {
          const active = isSelected(option.id);
          return (
            <Pressable
              key={option.id}
              style={({ pressed }) => [
                styles.optionCard,
                active && styles.optionCardActive,
                pressed && styles.optionCardPressed,
              ]}
              onPress={() => handleToggle(option)}
            >
              <View style={[styles.optionIcon, { backgroundColor: option.iconBg }]}>
                {option.icon}
              </View>
              <View style={styles.optionText}>
                <Text style={[styles.optionName, active && styles.optionNameActive]}>
                  {option.name}
                </Text>
                <Text style={styles.optionSub}>{option.subtitle}</Text>
              </View>
              {active ? (
                <View style={styles.checkCircle}>
                  <Check size={14} color={Colors.dark} strokeWidth={3} />
                </View>
              ) : (
                <ChevronRight size={18} color={Colors.silver} />
              )}
            </Pressable>
          );
        })}
      </View>

      {/* Actions */}
      <View style={styles.actions}>
        <Pressable onPress={onBack} hitSlop={12}>
          <Text style={styles.backText}>Back</Text>
        </Pressable>
        <Button
          title={canContinue ? "Continue" : "Skip for Now"}
          variant="primary"
          onPress={onContinue}
          style={styles.continueBtn}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  header: {
    alignItems: "center",
    marginBottom: Spacing.lg,
    marginTop: Spacing.sm,
  },
  title: {
    fontSize: FontSizes.xxl,
    fontWeight: "800",
    color: Colors.white,
    textAlign: "center",
    marginBottom: Spacing.sm,
  },
  subtitle: {
    fontSize: FontSizes.sm,
    color: Colors.silver,
    textAlign: "center",
    lineHeight: 20,
  },
  optionsList: {
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  optionCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.navy,
    borderRadius: Radii.lg,
    padding: Spacing.md,
    borderWidth: 1.5,
    borderColor: Colors.border,
    gap: Spacing.md,
  },
  optionCardActive: {
    borderColor: Colors.gold,
    backgroundColor: "rgba(74, 144, 217, 0.06)",
  },
  optionCardPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.99 }],
  },
  optionIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionName: {
    fontSize: FontSizes.md,
    fontWeight: "600",
    color: Colors.white,
  },
  optionNameActive: {
    color: Colors.gold,
  },
  optionSub: {
    fontSize: FontSizes.xs,
    color: Colors.silver,
    marginTop: 2,
  },
  checkCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.gold,
    alignItems: "center",
    justifyContent: "center",
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: Spacing.md,
  },
  backText: {
    fontSize: FontSizes.md,
    color: Colors.silver,
    fontWeight: "500",
  },
  continueBtn: {
    minWidth: 140,
  },
});
