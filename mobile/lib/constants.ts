/**
 * Everist.ai Mobile App Constants
 * Summit Glyph dark theme color palette and configuration.
 */

export const APP_VERSION = "1.1.0";

/** API URL — set via EXPO_PUBLIC_API_URL env var or falls back to localhost */
export const API_URL =
  process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

/** Clerk publishable key — set via EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY */
export const CLERK_PUBLISHABLE_KEY =
  process.env.EXPO_PUBLIC_CLERK_PUBLISHABLE_KEY ?? "";

/**
 * Color palette matching the Everist.ai Summit Glyph web theme.
 *
 * Summit theme — matches web app's default theme
 */
export const Colors = {
  /** Primary backgrounds */
  dark: "#0A1628",        // Glacial Navy
  bg: "#050D18",          // Deep Abyss (web page bg)
  navy: "#0F1D32",        // Card background
  navyLight: "#162440",   // Elevated card

  /** Accent — Ice Blue (property names kept as 'gold' for compatibility) */
  gold: "#4A90D9",        // Ice Blue (web accent)
  goldLight: "#6AAAE8",   // Ice Blue Light
  goldDark: "#3A78BE",    // Ice Blue Deep

  /** Neutral text */
  silver: "#C0C5CE",      // Silver Ridge (matches web)
  silverLight: "#CBD5E1",
  white: "#F8FAFC",

  /** Semantic (matches web exactly) */
  success: "#4A9D5B",
  successMuted: "rgba(74, 157, 91, 0.15)",
  warning: "#D4A843",
  warningMuted: "rgba(212, 168, 67, 0.15)",
  danger: "#C65D5D",
  dangerMuted: "rgba(198, 93, 93, 0.15)",
  info: "#4A90D9",
  infoMuted: "rgba(74, 144, 217, 0.15)",

  /** Borders & dividers */
  border: "rgba(192, 197, 206, 0.15)",
  borderLight: "rgba(192, 197, 206, 0.25)",

  /** Transparent overlays */
  overlay: "rgba(10, 22, 40, 0.8)",
  cardShadow: "rgba(5, 13, 24, 0.4)",
} as const;

/**
 * Font families — matches web app's Summit theme typography.
 * Uses system fonts as fallback until Montserrat/Open Sans are installed.
 */
export const Fonts = {
  heading: "Montserrat",
  body: "OpenSans",
  headingFallback: "System",
  bodyFallback: "System",
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
