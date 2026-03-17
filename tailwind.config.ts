import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        kairos: {
          royal: {
            DEFAULT: "rgb(var(--k-primary) / <alpha-value>)",
            light: "rgb(var(--k-primary-light) / <alpha-value>)",
            dark: "rgb(var(--k-bg) / <alpha-value>)",
            surface: "rgb(var(--k-card) / <alpha-value>)",
          },
          gold: {
            DEFAULT: "rgb(var(--k-accent) / <alpha-value>)",
            light: "rgb(var(--k-accent-light) / <alpha-value>)",
            dim: "rgb(var(--k-accent-deep) / <alpha-value>)",
            muted: "var(--k-accent-muted)",
          },
          silver: {
            DEFAULT: "rgb(var(--k-text) / <alpha-value>)",
            dark: "rgb(var(--k-text-secondary) / <alpha-value>)",
            light: "rgb(var(--k-text-light) / <alpha-value>)",
          },
          card: "rgb(var(--k-card) / <alpha-value>)",
          "card-hover": "rgb(var(--k-card-hover) / <alpha-value>)",
          border: "var(--k-border)",
          input: "rgb(var(--k-input) / <alpha-value>)",
        },
        success: "rgb(var(--k-success) / <alpha-value>)",
        warning: "rgb(var(--k-warning) / <alpha-value>)",
        danger: "rgb(var(--k-danger) / <alpha-value>)",
        info: "rgb(var(--k-info) / <alpha-value>)",
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
