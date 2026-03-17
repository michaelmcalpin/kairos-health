"use client";

import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

// ─── Theme Definitions ──────────────────────────────────────────

export type ThemeId = "warm-slate" | "classic-royal";

export interface ThemeConfig {
  id: ThemeId;
  name: string;
  description: string;
}

export const THEMES: Record<ThemeId, ThemeConfig> = {
  "warm-slate": {
    id: "warm-slate",
    name: "Warm Slate",
    description: "Soft cream & dusty rose — the default KAIROS aesthetic",
  },
  "classic-royal": {
    id: "classic-royal",
    name: "Classic Royal",
    description: "Deep royal blue & champagne gold — the original KAIROS look",
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
  theme: "warm-slate",
  setTheme: () => {},
  config: THEMES["warm-slate"],
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
  const [theme, setThemeState] = useState<ThemeId>("warm-slate");
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
    html.classList.remove("theme-warm-slate", "theme-classic-royal");
    html.classList.add(`theme-${theme}`);

    // Update meta theme-color
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) {
      meta.setAttribute(
        "content",
        theme === "warm-slate" ? "#2C2C2E" : "#122055"
      );
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
