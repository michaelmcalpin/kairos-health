import type { Config } from "tailwindcss";

/**
 * Role-based color tokens (see docs/design-tokens.md).
 * Values come from the theme CSS variables in src/app/globals.css, so all
 * three themes (Summit, Warm Slate, Classic Royal) swap them at runtime.
 * The legacy `kairos-*` names below are aliases of these same values.
 */
const rgb = (v: string) => `rgb(var(${v}) / <alpha-value>)`;

const role = {
  bg: rgb("--k-bg"),
  surface: rgb("--k-card"),
  surfaceRaised: rgb("--k-card-hover"),
  surfaceHover: rgb("--k-surface-hover"),
  input: rgb("--k-input"),
  border: "var(--k-border)",
  textPrimary: rgb("--k-text"),
  textSecondary: rgb("--k-text-secondary"),
  textMuted: rgb("--k-text-muted"),
  accent: rgb("--k-accent"),
  accentHover: rgb("--k-accent-light"),
  accentPressed: rgb("--k-accent-deep"),
  accentMuted: "var(--k-accent-muted)",
  accentPremium: rgb("--k-accent-premium"),
  brand: rgb("--k-primary"),
  brandLight: rgb("--k-primary-light"),
  success: rgb("--k-success"),
  warning: rgb("--k-warning"),
  danger: rgb("--k-danger"),
  info: rgb("--k-info"),
} as const;

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // ── Role tokens (use these in new code) ──────────────────────
        bg: role.bg,
        surface: {
          DEFAULT: role.surface,
          raised: role.surfaceRaised,
          hover: role.surfaceHover,
        },
        input: role.input,
        border: role.border,
        // `content-*` works with any utility (border-content-muted, fill-…);
        // the text-only shortcuts text-primary / -secondary / -muted are below.
        content: {
          primary: role.textPrimary,
          secondary: role.textSecondary,
          muted: role.textMuted,
        },
        accent: {
          DEFAULT: role.accent,
          hover: role.accentHover,
          pressed: role.accentPressed,
          muted: role.accentMuted,
          premium: role.accentPremium,
        },
        success: { DEFAULT: role.success, wash: "var(--k-success-wash)" },
        warning: { DEFAULT: role.warning, wash: "var(--k-warning-wash)" },
        danger: { DEFAULT: role.danger, wash: "var(--k-danger-wash)" },
        info: { DEFAULT: role.info, wash: "var(--k-info-wash)" },

        // ── Legacy aliases (kept so existing classes keep working) ───
        // "royal" = brand navy / backgrounds, "gold" = the accent (it is
        // blue in Summit), "silver" = text.
        kairos: {
          royal: {
            DEFAULT: role.brand,
            light: role.brandLight,
            dark: role.bg,
            surface: role.surface,
          },
          gold: {
            DEFAULT: role.accent,
            light: role.accentHover,
            dim: role.accentPressed,
            muted: role.accentMuted,
          },
          silver: {
            DEFAULT: role.textPrimary,
            dark: role.textSecondary,
            light: rgb("--k-text-light"),
          },
          card: role.surface,
          "card-hover": role.surfaceRaised,
          border: role.border,
          input: role.input,
        },
      },
      textColor: {
        primary: role.textPrimary,
        secondary: role.textSecondary,
        muted: role.textMuted,
      },
      fontFamily: {
        heading: ["Montserrat", "system-ui", "sans-serif"],
        body: ["Open Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { kairos: "12px", "kairos-sm": "8px" },
      boxShadow: {
        kairos: "var(--k-shadow)",
        "kairos-lg": "var(--k-shadow-lg)",
        "gold-glow": "var(--k-accent-glow)",
      },
      animation: {
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 var(--k-accent-muted)" },
          "50%": { boxShadow: "0 0 20px 10px transparent" },
        },
        fadeIn: {
          "0%": { opacity: "0", transform: "translateY(4px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
    },
  },
  plugins: [],
};
export default config;
