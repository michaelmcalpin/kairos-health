/**
 * Button component — gold primary, outline secondary, dark tertiary.
 * Matches the Everist.ai Summit Glyph design system.
 */

import React from "react";
import {
  Pressable,
  Text,
  ActivityIndicator,
  StyleSheet,
  ViewStyle,
  StyleProp,
} from "react-native";

import { Colors, Spacing, FontSizes, Radii } from "@/lib/constants";

type ButtonVariant = "primary" | "secondary" | "tertiary" | "danger";
type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  title: string;
  onPress?: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  style?: StyleProp<ViewStyle>;
  icon?: React.ReactNode;
}

export function Button({
  title,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  style,
  icon,
}: ButtonProps) {
  const isDisabled = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        sizeStyles[size],
        variantStyles[variant],
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="small"
          color={variant === "primary" ? Colors.dark : Colors.gold}
        />
      ) : (
        <>
          {icon}
          <Text
            style={[
              styles.text,
              textSizeStyles[size],
              textVariantStyles[variant],
              isDisabled && styles.disabledText,
            ]}
          >
            {title}
          </Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: Spacing.sm,
    borderRadius: Radii.md,
  },
  text: {
    fontWeight: "600",
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  disabled: {
    opacity: 0.5,
  },
  disabledText: {
    opacity: 0.7,
  },
});

const sizeStyles: Record<ButtonSize, ViewStyle> = StyleSheet.create({
  sm: { paddingVertical: 8, paddingHorizontal: 14 },
  md: { paddingVertical: 12, paddingHorizontal: 20 },
  lg: { paddingVertical: 16, paddingHorizontal: 28 },
});

const textSizeStyles = StyleSheet.create({
  sm: { fontSize: FontSizes.sm },
  md: { fontSize: FontSizes.md },
  lg: { fontSize: FontSizes.lg },
});

const variantStyles: Record<ButtonVariant, ViewStyle> = StyleSheet.create({
  primary: {
    backgroundColor: Colors.gold,
  },
  secondary: {
    backgroundColor: "transparent",
    borderWidth: 1.5,
    borderColor: Colors.gold,
  },
  tertiary: {
    backgroundColor: Colors.navyLight,
  },
  danger: {
    backgroundColor: Colors.dangerMuted,
    borderWidth: 1,
    borderColor: Colors.danger,
  },
});

const textVariantStyles = StyleSheet.create({
  primary: { color: Colors.dark },
  secondary: { color: Colors.gold },
  tertiary: { color: Colors.silverLight },
  danger: { color: Colors.danger },
});
