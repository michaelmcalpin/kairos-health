import { describe, it, expect, afterEach } from "vitest";
import { createElement, act } from "react";
import { createRoot, type Root } from "react-dom/client";

import { GeneticsReview } from "../GeneticsReview";
import type { RawMarker } from "@/lib/genetics/interpret";

// React 18+/19: tell React this is a test environment so act() works.
(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const m = (gene: string, rsId: string, mutation: string): RawMarker => ({
  gene, rsId, mutation, pathway: null, function: null, clinicalPriority: null, symptoms: null,
  supplementProtocol: null, dietStrategy: null, lifestyleStrategy: null,
});

const markers = [
  m("MTHFR", "rs1801133", "A/A (+/+)"),
  m("COMT", "rs4680", "A/G (+/-)"),
  m("F5", "rs6025", "G/G (-/-)"),
];

let root: Root | null = null;
let host: HTMLDivElement | null = null;

function mount() {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root!.render(createElement(GeneticsReview, { markers })));
  return host;
}
const text = () => host!.textContent ?? "";
const button = (re: RegExp) => {
  const b = Array.from(host!.querySelectorAll("button")).find((el) => re.test(el.textContent ?? ""));
  if (!b) throw new Error(`No button matching ${re}`);
  return b;
};
const click = (el: Element) => act(() => { (el as HTMLElement).click(); });

afterEach(() => {
  act(() => root?.unmount());
  host?.remove();
  root = null; host = null;
});

describe("GeneticsReview", () => {
  it("shows the summary, sections and plain-language gene rows", () => {
    mount();
    expect(text()).toContain("Genetics Review");
    expect(text()).toContain("Two copies changed");
    expect(text()).toContain("Folate (Vitamin B9)");
    expect(text()).toContain("Brain, Mood & Sleep");
    expect(text()).toContain("Main folate switch");
    // The typical F5 result is hidden under "Needs attention" by default.
    expect(text()).not.toContain("Heart, Blood & Blood Pressure");
  });

  it("expands a gene to its action plan when clicked", () => {
    mount();
    expect(text()).not.toContain("Medications to discuss");
    click(button(/MTHFR C677T.*Main folate switch/));
    for (const h of ["What this change can mean", "Lifestyle & food", "Supplements", "Peptide options", "Medications to discuss", "Labs to check"]) {
      expect(text()).toContain(h);
    }
    expect(text()).toMatch(/Laughing gas \(nitrous oxide\)/);
    expect(text()).toContain("Methylfolate 1-3 mg");
  });

  it("shows typical genes under All genes with a good-news message", () => {
    mount();
    click(button(/All genes/));
    click(button(/F5.*Factor V Leiden/));
    expect(text()).toMatch(/this gene looks typical/);
  });
});
