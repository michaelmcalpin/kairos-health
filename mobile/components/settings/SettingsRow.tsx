/**
 * SettingsRow -- a single row inside a settings card.
 *
 * Supports several right-hand variants:
 *   - chevron  (default) -- navigable row with >
 *   - toggle   -- Switch control
 *   - value    -- static value text
 *   - badge    -- small colored badge (e.g. connected device status)
 *   - custom   -- arbitrary ReactNode on the right
 */

import React from "react";
import {
  View,
  Text,
  Pressable,
  Switch,
  StyleSheet,
  Platform,
} from "react-native";
import { ChevronRight } from "lucide-react-native";

import { Colors, Spacing, FontSizes } from "@/lib/constants";

interface SettingsRowBaseProps {
  icon?: React.ReactNode;
  label: string;
  subtitle?: string;
  danger?: boolean;
  /** Hide the bottom border (last item in a section). */
  last?: boolean;
}

interface ChevronRow extends SettingsRowBaseProps {
  type?: "chevron";
  onPress?: () => void;
}

interface ToggleRow extends SettingsRowBaseProps {
  type: "toggle";
  value: boolean;
  onValueChange: (v: boolean) => void;
}

interface ValueRow extends SettingsRowBaseProps {
  type: "value";
  value: string;
  onPress?: () => void;
}

interface BadgeRow extends SettingsRowBaseProps {
  type: "badge";
  badgeLabel: string;
  badgeColor: string;
  onPress?: () => void;
}

interface CustomRow extends SettingsRowBaseProps {
  type: "custom";
  right: React.ReactNode;
  onPress?: () => void;
}

export type SettingsRowProps =
  | ChevronRow
  | ToggleRow
  | ValueRow
  | BadgeRow
  | CustomRow;

export function SettingsRow(props: SettingsRowProps) {
  const { icon, label, subtitle, danger = false, last = false } = props;

  const renderRight = () => {
    switch (props.type) {
      case "toggle":
        return (
          <Switch
            value={props.value}
            onValueChange={props.onValueChange}
            trackColor={{ false: Colors.navyLight, true: Colors.goldDark }}
            thumbColor={props.value ? Colors.gold : Colors.silver}
            ios_backgroundColor={Colors.navyLight}
          />
        );
      case "value":
        return (
          <View style={styles.valueRow}>
            <Text style={styles.valueText}>{props.value}</Text>
            <ChevronRight size={16} color={Colors.silver} />
          </View>
        );
      case "badge":
        return (
          <View style={styles.badgeRow}>
            <View
              style={[
                styles.statusDot,
                { backgroundColor: props.badgeColor },
              ]}
            />
            <Text style={[styles.badgeText, { color: props.badgeColor }]}>
              {props.badgeLabel}
            </Text>
          </View>
        );
      case "custom":
        return <>{props.right}</>;
      default:
        return <ChevronRight size={18} color={Colors.silver} />;
    }
  };

  const isToggle = props.type === "toggle";

  const content = (
    <View
      style={[
        styles.row,
        !last && styles.rowBorder,
      ]}
    >
      <View style={styles.left}>
        {icon && <View style={styles.iconWrap}>{icon}</View>}
        <View style={styles.labelWrap}>
          <Text
            style={[styles.label, danger && styles.dangerLabel]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {subtitle ? (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          ) : null}
        </View>
      </View>
      {renderRight()}
    </View>
  );

  if (isToggle) {
    return content;
  }

  const onPress =
    (props as ChevronRow | ValueRow | BadgeRow | CustomRow).onPress ??
    undefined;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && onPress && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    paddingHorizontal: Spacing.md,
    minHeight: 52,
  },
  rowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: Colors.border,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    marginRight: Spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: Colors.navyLight,
    alignItems: "center",
    justifyContent: "center",
    marginRight: Spacing.md,
  },
  labelWrap: {
    flex: 1,
  },
  label: {
    color: Colors.white,
    fontSize: FontSizes.md,
    fontWeight: "500",
  },
  dangerLabel: {
    color: Colors.danger,
  },
  subtitle: {
    color: Colors.silver,
    fontSize: FontSizes.xs,
    marginTop: 2,
  },
  valueRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  valueText: {
    color: Colors.silver,
    fontSize: FontSizes.sm,
  },
  badgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  badgeText: {
    fontSize: FontSizes.xs,
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.7,
  },
});
