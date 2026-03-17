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
