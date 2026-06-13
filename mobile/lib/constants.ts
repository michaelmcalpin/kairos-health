/**
 * Everist.ai Mobile App Constants
 * Summit Glyph dark theme color palette and configuration.
 */

export const APP_VERSION = "1.0.0";

/** API URL — set via EXPO_PUBLIC_API_URL env var or falls back to localhost */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** Clerk publishable key — set via EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY */
export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

/**
 * Color palette matching the Everist.ai Summit Glyph web theme.
 */
export const Colors = {
  /** Primary backgrounds */
  dark: "#0A1628",
  navy: "#0F1D32",
  navyLight: "#162440",

  /** Accent — gold */
  gold: "#C8A951",
  goldLight: "#D4BC6A",
  goldDark: "#A68B3C",

  /** Neutral text */
  silver: "#94A3B8",
  silverLight: "#CBD5E1",
  white: "#F8FAFC",

  /** Semantic */
  success: "#22C55E",
  successMuted: "rgba(34, 197, 94, 0.15)",
  warning: "#EAB308",
  warningMuted: "rgba(234, 179, 8, 0.15)",
  danger: "#EF4444",
  dangerMuted: "rgba(239, 68, 68, 0.15)",
  info: "#3B82F6",
  infoMuted: "rgba(59, 130, 246, 0.15)",

  /** Borders & dividers */
  border: "rgba(148, 163, 184, 0.15)",
  borderLight: "rgba(148, 163, 184, 0.25)",

  /** Transparent overlays */
  overlay: "rgba(10, 22, 40, 0.8)",
  cardShadow: "rgba(0, 0, 0, 0.3)",
} as const;

/**
 * Spacing scale (4-pt grid).
 */
export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/**
 * Font sizes.
 */
export const FontSizes = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 22,
  xxl: 28,
  title: 34,
} as const;

/**
 * Border radii.
 */
export const Radii = {
  sm: 6,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;
