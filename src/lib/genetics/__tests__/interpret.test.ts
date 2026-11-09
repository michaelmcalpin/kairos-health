import { describe, it, expect } from "vitest";

import { GENE_LIBRARY } from "../gene-library";
import { findGene, parseStrength, parsePriority, interpretMarkers, groupBySection, startHere, type RawMarker } from "../interpret";

const m = (gene: string, rsId: string | null, mutation: string | null, extra: Partial<RawMarker> = {}): RawMarker => ({
  gene, rsId, mutation, pathway: null, function: null, clinicalPriority: null, symptoms: null,
  supplementProtocol: null, dietStrategy: null, lifestyleStrategy: null, ...extra,
});

describe("gene library", () => {
  it("covers the full master database with plain-language text for every gene", () => {
    expect(GENE_LIBRARY.length).toBe(61);
    for (const g of GENE_LIBRARY) {
      expect(g.plain.length).toBeGreaterThan(10);
      expect(g.changed.length).toBeGreaterThan(10);
      expect(g.meds.length).toBeGreaterThan(0);
    }
  });

  it("keeps prescriptions out of the supplement list", () => {
    for (const g of GENE_LIBRARY) {
      for (const s of g.supplements) expect(s).not.toMatch(/\bLDN\b|prescription|ketamine|ivermectin/i);
    }
  });

  it("doses methylfolate in mg, not grams", () => {
    const mthfr = GENE_LIBRARY.find((g) => g.gene === "MTHFR C677T")!;
    expect(mthfr.supplements.join(" ")).toMatch(/1-3 mg/);
    expect(mthfr.supplements.join(" ")).not.toMatch(/\d\s?g\b/);
  });
});

describe("matching + genotype", () => {
  it("matches by rsID first, then by name or alias", () => {
    expect(findGene("MTHFR", "rs1801133")?.gene).toBe("MTHFR C677T");
    expect(findGene("MTHFR", "rs1801131")?.gene).toBe("MTHFR A1298C");
    expect(findGene("TNF", null)?.gene).toBe("TNF-alpha");
    expect(findGene("NRF2", null)?.gene).toBe("NFE2L2 (Nrf2)");
    expect(findGene("ZZZ9", null)).toBeNull();
  });

  it("reads genotype strength", () => {
    expect(parseStrength("G/G (+/+)")).toBe("two");
    expect(parseStrength("T/C (+/-)")).toBe("one");
    expect(parseStrength("G/G (-/-)")).toBe("none");
    expect(parseStrength("deletion", "GSTT1")).toBe("two");
    expect(parseStrength("")).toBe("unknown");
  });

  it("normalizes priority labels from the database", () => {
    expect(parsePriority("CRITICAL — Most impactful")).toBe("critical");
    expect(parsePriority("MODERATE-HIGH")).toBe("high");
    expect(parsePriority("LOW")).toBe("low");
  });
});

describe("interpretMarkers", () => {
  const genes = interpretMarkers([
    m("VDR", "rs2228570", "A/G (+/-)"),
    m("COMT", "rs4680", "A/A (+/+)"),
    m("CYP1A2", "rs762551", "A/A (-/-)"),
    m("MYSTERY1", null, "C/T (+/-)", { function: "Unknown gene", supplementProtocol: "Zinc, Magnesium", pathway: "Detoxification" }),
  ]);

  it("ranks two-copy changes first and typical genes last", () => {
    expect(genes[0].gene).toBe("COMT");
    expect(genes[genes.length - 1].gene).toBe("CYP1A2");
  });

  it("flags only changed genes as needing attention", () => {
    expect(genes.find((g) => g.gene === "CYP1A2")!.needsAttention).toBe(false);
    expect(genes.find((g) => g.gene === "VDR")!.needsAttention).toBe(true);
  });

  it("falls back to the report's own notes for genes not in the library", () => {
    const x = genes.find((g) => g.gene === "MYSTERY1")!;
    expect(x.inLibrary).toBe(false);
    expect(x.supplements).toEqual(["Zinc", "Magnesium"]);
    expect(x.section).toBe("detox");
  });

  it("groups into body-system sections and picks a start-here list", () => {
    const sections = groupBySection(genes).map((s) => s.key);
    expect(sections).toContain("brain");
    expect(sections).toContain("gut"); // VDR is filed under gut in the master DB
    expect(startHere(genes).map((g) => g.gene)).toEqual(["COMT", "VDR", "MYSTERY1"]);
  });
});
