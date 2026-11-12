import { describe, it, expect } from "vitest";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

import {
  activeItem,
  activeSection,
  groupBySection,
  hrefPath,
  initialSectionState,
  matchesPath,
  openActiveSection,
  parseSectionState,
  sectionStateKey,
} from "../sidebar-groups";
import { CLIENT_NAV, CLIENT_ACCOUNT_LINKS, CLIENT_DESTINATIONS, CLIENT_ROUTES_ELSEWHERE } from "../client-nav";

const items = [
  { href: "/trainer/dashboard", section: "Overview" },
  { href: "/trainer/clients", section: "Clients" },
  { href: "/trainer/clients/new", section: "Clients" },
  { href: "/trainer/settings?tab=billing", section: "Business" },
];

describe("path matching", () => {
  it("ignores query strings and matches sub-pages", () => {
    expect(hrefPath("/settings?tab=integrations")).toBe("/settings");
    expect(matchesPath("/settings?tab=x", "/settings")).toBe(true);
    expect(matchesPath("/trainer/clients", "/trainer/clients/abc")).toBe(true);
    expect(matchesPath("/trainer/clients", "/trainer/clientsx")).toBe(false);
  });

  it("highlights only the longest matching item", () => {
    expect(activeItem(items, "/trainer/clients/new")?.href).toBe("/trainer/clients/new");
    expect(activeItem(items, "/trainer/clients/123")?.href).toBe("/trainer/clients");
    expect(activeItem(items, "/elsewhere")).toBeNull();
    expect(activeSection(items, "/trainer/settings")).toBe("Business");
  });
});

describe("section open state", () => {
  it("groups in first-seen order", () => {
    expect(groupBySection(items).map((g) => g.name)).toEqual(["Overview", "Clients", "Business"]);
    expect(groupBySection([{ href: "/a" }])[0].name).toBe("Main");
  });

  it("opens the section of a page in another group and keeps the rest", () => {
    const prev = { Overview: true, Clients: false };
    const next = openActiveSection(prev, items, "/trainer/clients/42");
    expect(next).toEqual({ Overview: true, Clients: true });
    // Already open → same object (no re-render).
    expect(openActiveSection(next, items, "/trainer/clients")).toBe(next);
    // User-closed sections stay closed when navigating elsewhere.
    expect(openActiveSection({ Overview: false, Clients: true }, items, "/trainer/clients")).toEqual({ Overview: false, Clients: true });
  });

  it("merges saved state with defaults and the active section", () => {
    const s = initialSectionState(items, "/trainer/settings", { Overview: false, Clients: true }, ["Overview"]);
    expect(s).toEqual({ Overview: false, Clients: true, Business: true });
    expect(initialSectionState(items, "/x", null, ["Overview"])).toEqual({ Overview: true });
  });

  it("parses stored state defensively", () => {
    expect(parseSectionState('{"A":true,"B":"x"}')).toEqual({ A: true });
    expect(parseSectionState("not json")).toBeNull();
    expect(parseSectionState("[1]")).toBeNull();
    expect(parseSectionState(null)).toBeNull();
  });

  it("keys storage per portal", () => {
    expect(sectionStateKey(items)).toBe("everist.sidebar.trainer");
    expect(sectionStateKey([{ href: "/dashboard" }])).toBe("everist.sidebar.client");
    expect(sectionStateKey([{ href: "/super-admin/dashboard" }])).toBe("everist.sidebar.super-admin");
  });
});

describe("client nav model", () => {
  it("has the four destinations plus Settings, in order", () => {
    expect(groupBySection(CLIENT_NAV).map((g) => g.name)).toEqual([...CLIENT_DESTINATIONS]);
    const today = CLIENT_NAV.filter((e) => e.section === "Today");
    expect(today).toHaveLength(1);
    expect(today[0]).toMatchObject({ label: "Today", href: "/dashboard" });
  });

  it("has no duplicate routes or labels", () => {
    const all = [...CLIENT_NAV, ...CLIENT_ACCOUNT_LINKS].map((e) => e.href);
    expect(new Set(all).size).toBe(all.length);
    const labels = CLIENT_NAV.map((e) => e.label);
    expect(new Set(labels).size).toBe(labels.length);
    expect(labels).not.toContain("Insight Sherpa");
  });

  it("keeps the feature-toggled Cycle Tracker route the layout filters on", () => {
    expect(CLIENT_NAV.some((e) => e.href === "/cycle-tracker")).toBe(true);
  });

  it("Settings is a single plain link in the sidebar", () => {
    const settings = CLIENT_NAV.filter((e) => e.section === "Settings");
    expect(settings).toEqual([expect.objectContaining({ label: "Settings", href: "/settings" })]);
  });

  it("places every client page: nav, profile menu, or a documented other entry point", () => {
    const dir = join(__dirname, "../../../app/(client)");
    const routes = readdirSync(dir, { withFileTypes: true })
      .filter((d) => d.isDirectory() && existsSync(join(dir, d.name, "page.tsx")))
      .map((d) => "/" + d.name);
    const placed = new Set([
      ...CLIENT_NAV.map((e) => hrefPath(e.href)),
      ...CLIENT_ACCOUNT_LINKS.map((e) => hrefPath(e.href)),
      ...Object.keys(CLIENT_ROUTES_ELSEWHERE),
    ]);
    const unplaced = routes.filter((r) => !placed.has(r));
    expect(unplaced).toEqual([]);
    // And nothing in the nav points at a page that doesn't exist.
    for (const e of [...CLIENT_NAV, ...CLIENT_ACCOUNT_LINKS]) {
      expect(routes).toContain(hrefPath(e.href));
    }
  });
});
