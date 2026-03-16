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
          royal: { DEFAULT: "#122055", light: "#1A2D6D", dark: "#0A0F1F", surface: "#0D1229" },
          gold: { DEFAULT: "#D4AF37", light: "#E8D48B", dim: "#B8962F", muted: "rgba(212,175,55,0.15)" },
          silver: { DEFAULT: "#E0E0E0", dark: "#9E9E9E", light: "#F5F5F7" },
          card: "#12183A",
          "card-hover": "#162050",
          border: "#1E2A5A",
          input: "#182244",
        },
        success: "#2E7D32",
        warning: "#E65100",
        danger: "#C62828",
        info: "#1565C0",
      },
      fontFamily: {
        heading: ["Montserrat", "system-ui", "sans-serif"],
        body: ["Open Sans", "system-ui", "sans-serif"],
      },
      borderRadius: { kairos: "12px", "kairos-sm": "8px" },
      boxShadow: {
        kairos: "0 4px 24px rgba(18,32,85,0.3)",
        "kairos-lg": "0 8px 40px rgba(18,32,85,0.4)",
        "gold-glow": "0 0 20px rgba(212,175,55,0.3)",
      },
      animation: {
        "pulse-gold": "pulse-gold 2s ease-in-out infinite",
        "fade-in": "fadeIn 0.3s ease-out",
      },
      keyframes: {
        "pulse-gold": {
          "0%, 100%": { boxShadow: "0 0 0 0 rgba(212,175,55,0.4)" },
          "50%": { boxShadow: "0 0 20px 10px rgba(212,175,55,0)" },
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
