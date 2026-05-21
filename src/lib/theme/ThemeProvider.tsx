"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// ─── Theme Definitions ──────────────────────────────────────────

export type ThemeId = "summit" | "warm-slate" | "classic-royal";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  summit: {
    id: "summit",
    name: "Summit",
    description: "Glacial Navy & Ice Blue — the official Everist.ai brand",
  },
  "warm-slate": {
    id: "warm-slate",
    name: "Warm Slate",
    description: "Soft cream & dusty rose — a warm, approachable feel",
  },
  "classic-royal": {
    id: "classic-royal",
    name: "Classic Royal",
    description: "Deep royal blue & champagne gold — bold and luxurious",
  },
};

// ─── Hex Color Maps (for chart libraries / SVG that need raw strings) ────

export interface ThemeColors {
  primary: string;
  primaryLight: string;
  accent: string;
  accentLight: string;
  accentDeep: string;
  bg: string;
  card: string;
  text: string;
  textSecondary: string;
  success: string;
  warning: string;
  danger: string;
  info: string;
}

export const THEME_COLORS: Record<ThemeId, ThemeColors> = {
  summit: {
    primary: "#0A1628",
    primaryLight: "#142238",
    accent: "#4A90D9",
    accentLight: "#6AAAE8",
    accentDeep: "#3A78BE",
    bg: "#050D18",
    card: "#0A1628",
    text: "#FFFFFF",
    textSecondary: "#C0C5CE",
    success: "#4A9D5B",
    warning: "#D4A843",
    danger: "#C65D5D",
    info: "#4A90D9",
  },
  "warm-slate": {
    primary: "#3A3A3C",
    primaryLight: "#5A5A5C",
    accent: "#C9A89A",
    accentLight: "#F0E6E0",
    accentDeep: "#9E7B6E",
    bg: "#2C2C2E",
    card: "#3A3A3C",
    text: "#FAF5F0",
    textSecondary: "#C9A89A",
    success: "#6B8E5E",
    warning: "#C4956A",
    danger: "#C97B6B",
    info: "#6B8BA4",
  },
  "classic-royal": {
    primary: "#122055",
    primaryLight: "#1A2D6D",
    accent: "#D4AF37",
    accentLight: "#E8D48B",
    accentDeep: "#B8962F",
    bg: "#0A0F1F",
    card: "#12183A",
    text: "#E0E0E0",
    textSecondary: "#9E9E9E",
    success: "#2E7D32",
    warning: "#E65100",
    danger: "#C62828",
    info: "#1565C0",
  },
};

// ─── Context ─────────────────────────────────────────────────────

interface ThemeContextValue {
  theme: ThemeId;
  setTheme: (theme: ThemeId) => void;
  config: ThemeConfig;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "summit",
  setTheme: () => {},
  config: THEMES["summit"],
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

/** Returns hex color strings for the active theme — use in charts / SVG props */
export function useThemeColors(): ThemeColors {
  const { theme } = useTheme();
  return THEME_COLORS[theme];
}

// ─── Provider ────────────────────────────────────────────────────

const STORAGE_KEY = "kairos-theme";

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("summit");
  const [mounted, setMounted] = useState(false);

  // Load saved theme on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      if (saved && THEMES[saved]) {
        setThemeState(saved);
      }
    } catch {
      // localStorage unavailable
    }
    setMounted(true);
  }, []);

  // Apply theme class to <html>
  useEffect(() => {
    if (!mounted) return;
    const html = document.documentElement;
    html.classList.remove("theme-summit", "theme-warm-slate", "theme-classic-royal");
    html.classList.add(`theme-${theme}`);

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      const colors: Record<ThemeId, string> = {
        summit: "#0A1628",
        "warm-slate": "#2C2C2E",
        "classic-royal": "#122055",
      };
      meta.setAttribute("content", colors[theme]);
    }
  }, [theme, mounted]);

  const setTheme = (newTheme: ThemeId) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(STORAGE_KEY, newTheme);
    } catch {
      // localStorage unavailable
    }
  };

  return (
    <ThemeContext.Provider
      value={{ theme, setTheme, config: THEMES[theme] }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
