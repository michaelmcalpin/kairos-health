/**
 * Pure helpers for the shared portal sidebar: grouping nav items into
 * sections, working out which item / section is active for a route, and
 * keeping the open/closed state of each section across navigations and
 * reloads.
 *
 * Rules (audit Q7):
 *  - Navigating to a page opens the section that holds it. Other sections
 *    keep whatever open/closed state the user gave them.
 *  - The user's choices persist (sessionStorage in the component).
 *  - Only ONE item is active: the one whose href is the longest match for the
 *    current path, so "/trainer/clients" and "/trainer/clients/abc" never
 *    light up two items, and query strings in hrefs are ignored.
 */

export interface NavLike {
  href: string;
  section?: string;
}

export type SectionState = Record<string, boolean>;

export const DEFAULT_SECTION = "Main";

/** Path part of an href ("/settings?tab=x" → "/settings"). */
export function hrefPath(href: string): string {
  const i = href.search(/[?#]/);
  return i === -1 ? href : href.slice(0, i);
}

/** True when `pathname` is `href`'s page or one of its sub-pages. */
export function matchesPath(href: string, pathname: string): boolean {
  const p = hrefPath(href);
  return pathname === p || pathname.startsWith(p + "/");
}

/** Sections in first-seen order, each with its items in order. */
export function groupBySection<T extends NavLike>(items: T[]): Array<{ name: string; items: T[] }> {
  const order: string[] = [];
  const map = new Map<string, T[]>();
  for (const item of items) {
    const name = item.section ?? DEFAULT_SECTION;
    if (!map.has(name)) {
      map.set(name, []);
      order.push(name);
    }
    map.get(name)!.push(item);
  }
  return order.map((name) => ({ name, items: map.get(name)! }));
}

/** The single best-matching item for a path (longest href wins), or null. */
export function activeItem<T extends NavLike>(items: T[], pathname: string | null | undefined): T | null {
  if (!pathname) return null;
  let best: T | null = null;
  let bestLen = -1;
  for (const item of items) {
    if (!matchesPath(item.href, pathname)) continue;
    const len = hrefPath(item.href).length;
    if (len > bestLen) {
      best = item;
      bestLen = len;
    }
  }
  return best;
}

/** Name of the section holding the active item, or null. */
export function activeSection(items: NavLike[], pathname: string | null | undefined): string | null {
  const item = activeItem(items, pathname);
  return item ? item.section ?? DEFAULT_SECTION : null;
}

/**
 * State after a route change: the active section is forced open; everything
 * else keeps its previous value. Returns `prev` itself when nothing changes so
 * React can skip a re-render.
 */
export function openActiveSection(prev: SectionState, items: NavLike[], pathname: string | null | undefined): SectionState {
  const name = activeSection(items, pathname);
  if (!name || prev[name] === true) return prev;
  return { ...prev, [name]: true };
}

/**
 * Starting state: whatever was saved, plus `defaultOpen` sections the user
 * never touched, plus the active section.
 */
export function initialSectionState(
  items: NavLike[],
  pathname: string | null | undefined,
  saved: SectionState | null,
  defaultOpen: string[] = [],
): SectionState {
  const state: SectionState = {};
  for (const name of defaultOpen) state[name] = true;
  if (saved) Object.assign(state, saved);
  return openActiveSection(state, items, pathname);
}

/** Parse a stored state; anything malformed is ignored. */
export function parseSectionState(raw: string | null | undefined): SectionState | null {
  if (!raw) return null;
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) return null;
    const out: SectionState = {};
    for (const [k, b] of Object.entries(v as Record<string, unknown>)) {
      if (typeof b === "boolean") out[k] = b;
    }
    return out;
  } catch {
    return null;
  }
}

/** Storage key per portal, so the client and coach sidebars don't share state. */
export function sectionStateKey(items: NavLike[]): string {
  const first = items[0]?.href ?? "";
  const portal = first.split("/").filter(Boolean)[0] ?? "root";
  // Client hrefs are top-level ("/dashboard"), other portals are prefixed.
  const known = ["trainer", "company", "super-admin", "admin"];
  return `everist.sidebar.${known.includes(portal) ? portal : "client"}`;
}
