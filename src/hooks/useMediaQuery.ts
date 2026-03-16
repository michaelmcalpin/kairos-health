"use client";

import { useState, useEffect } from "react";

/**
 * Responsive breakpoint hook.
 * Returns true when the media query matches.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const mql = window.matchMedia(query);
    setMatches(mql.matches);

    const handler = (e: MediaQueryListEvent) => setMatches(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return matches;
}

/** Tailwind breakpoint helpers */
export function useIsMobile(): boolean {
  return !useMediaQuery("(min-width: 768px)");
}

export function useIsTablet(): boolean {
  const isAboveMobile = useMediaQuery("(min-width: 768px)");
  const isAboveTablet = useMediaQuery("(min-width: 1024px)");
  return isAboveMobile && !isAboveTablet;
}

export function useIsDesktop(): boolean {
  return useMediaQuery("(min-width: 1024px)");
}
