/**
 * Turns raw genetic markers into a plain-language, ranked review: matches each
 * marker to the gene library, reads the genotype ("two copies / one copy / no
 * change"), and groups everything by body system.
 */

import { GENE_LIBRARY, GENE_SECTIONS, type GeneEntry, type GeneSectionKey } from "./gene-library";

export interface RawMarker {
  gene: string;
  rsId: string | null;
  section?: string | null;
  mutation: string | null;
  pathway: string | null;
  function: string | null;
  clinicalPriority: string | null;
  symptoms: string | null;
  supplementProtocol: string | null;
  peptideSupport?: string | null;
  dietStrategy: string | null;
  lifestyleStrategy: string | null;
  labTests?: string | null;
}

/** How strongly the gene is changed, from the genotype. */
export type Strength = "two" | "one" | "none" | "unknown";
export type Priority = "critical" | "high" | "medium" | "low";

export interface GeneView {
  id: string;
  gene: string;
  rsId: string | null;
  genotype: string | null;
  strength: Strength;
  priority: Priority;
  section: GeneSectionKey | "other";
  nickname: string | null;
  plain: string;
  changed: string | null;
  symptoms: string[];
  lifestyle: string[];
  supplements: string[];
  peptides: string[];
  meds: string[];
  labs: string[];
  technical: { function: string | null; effect: string | null };
  /** True when this gene deserves attention (changed, or high priority with unknown genotype). */
  needsAttention: boolean;
  inLibrary: boolean;
}

export const STRENGTH_LABEL: Record<Strength, { short: string; long: string }> = {
  two: { short: "Two copies", long: "Both copies of this gene are changed. These matter most." },
  one: { short: "One copy", long: "One copy is changed. It can matter, mostly when you are stressed." },
  none: { short: "No change", long: "Both copies are typical. Nothing to fix here." },
  unknown: { short: "Result not read", long: "We could not read the result, so check the original report." },
};

const norm = (s: string) => s.toUpperCase().replace(/[\s_\-()]/g, "");

const byRs = new Map<string, GeneEntry>();
const byName = new Map<string, GeneEntry>();
for (const g of GENE_LIBRARY) {
  if (g.rsId && /^rs\d+$/i.test(g.rsId)) byRs.set(g.rsId.toLowerCase(), g);
  byName.set(norm(g.gene), g);
  for (const a of g.aliases) byName.set(norm(a), g);
}

export function findGene(gene: string, rsId: string | null): GeneEntry | null {
  if (rsId) {
    const hit = byRs.get(rsId.trim().toLowerCase());
    if (hit) return hit;
  }
  return byName.get(norm(gene)) ?? byName.get(norm(gene.split(/[\s(]/)[0])) ?? null;
}

export function parseStrength(genotype: string | null, gene?: string): Strength {
  const g = (genotype ?? "").toLowerCase();
  if (!g.trim()) return "unknown";
  if (g.includes("+/+") || g.includes("homozyg")) return "two";
  if (g.includes("+/-") || g.includes("-/+") || g.includes("heterozyg")) return "one";
  if (g.includes("-/-") || g.includes("normal") || g.includes("wild")) return "none";
  // A deleted detox gene (e.g. GSTT1 "deletion" / "null") means no enzyme at all.
  if (/(delet|null|absent)/.test(g) && /GST/i.test(gene ?? "")) return "two";
  return "unknown";
}

export function parsePriority(p: string | null): Priority {
  const s = (p ?? "").toLowerCase();
  if (s.startsWith("critical")) return "critical";
  if (s.startsWith("high") || s.includes("moderate-high")) return "high";
  if (s.startsWith("moderate") || s.startsWith("medium")) return "medium";
  if (s.startsWith("low")) return "low";
  return "medium";
}

const SECTION_KEYWORDS: Array<[RegExp, GeneSectionKey]> = [
  [/folate/i, "folate"], [/b12|cobalamin/i, "b12"], [/homocyst|remethyl|transsulf/i, "homocysteine"],
  [/methyl/i, "folate"], [/detox|glutathione|acetyl/i, "detox"], [/neuro|dopamine|mood|brain/i, "brain"],
  [/mito|longev|energy|aging/i, "energy"], [/autophag|cleanup/i, "cleanup"],
  [/cardio|blood|clot|lipid|cholesterol|pressure/i, "heart"], [/thyroid|endocr|hormon|estrogen/i, "hormones"],
  [/histamine|gut|food|allerg|external/i, "gut"], [/immun|inflamm/i, "immune"],
];

export function sectionFor(text: string | null | undefined): GeneSectionKey | "other" {
  if (!text) return "other";
  for (const [re, key] of SECTION_KEYWORDS) if (re.test(text)) return key;
  return "other";
}

/** Report text can carry HTML entities ("&bull;") from the parser; decode the common ones. */
const ENT: Record<string, string> = { amp: "&", bull: "•", middot: "·", nbsp: " ", ndash: "–", mdash: "—", quot: "\"", apos: "'", rsquo: "’", lt: "<", gt: ">" };
export const decodeText = (v: string | null | undefined): string | null =>
  v == null ? null : v.replace(/&(#\d+|[a-z]+);/gi, (m, e: string) =>
    e[0] === "#" ? String.fromCodePoint(parseInt(e.slice(1), 10) || 32) : ENT[e.toLowerCase()] ?? m);

const splitList = (v: string | null | undefined) =>
  (decodeText(v) ?? "")
    .split(/,\s*(?![^()]*\))|\.\s+|;\s*/)
    .map((s) => s.trim().replace(/\.$/, ""))
    .filter((s) => s && !/^n\/?a\b/i.test(s));

const PRIORITY_RANK: Record<Priority, number> = { critical: 0, high: 1, medium: 2, low: 3 };
const STRENGTH_RANK: Record<Strength, number> = { two: 0, one: 1, unknown: 2, none: 3 };

export function interpretMarkers(markers: RawMarker[]): GeneView[] {
  return markers
    .map((m, i): GeneView => {
      const lib = findGene(m.gene, m.rsId);
      const strength = parseStrength(m.mutation, m.gene);
      const priority = parsePriority(lib?.priority ?? m.clinicalPriority);
      const section = lib?.section ?? sectionFor(m.section ?? m.pathway);
      const needsAttention =
        strength === "two" || strength === "one" ||
        (strength === "unknown" && (priority === "critical" || priority === "high"));
      return {
        id: `${m.gene}-${m.rsId ?? i}`,
        gene: lib?.gene ?? m.gene,
        rsId: m.rsId ?? lib?.rsId ?? null,
        genotype: decodeText(m.mutation),
        strength,
        priority,
        section,
        nickname: lib?.nickname ?? null,
        plain: lib?.plain ?? decodeText(m.function) ?? "This gene is part of your report.",
        changed: lib?.changed ?? null,
        symptoms: lib?.symptoms.length ? lib.symptoms : splitList(m.symptoms),
        lifestyle: lib?.lifestyle.length ? lib.lifestyle : [...splitList(m.dietStrategy), ...splitList(m.lifestyleStrategy)],
        supplements: lib?.supplements.length ? lib.supplements : splitList(m.supplementProtocol),
        peptides: lib?.peptides.length ? lib.peptides : splitList(m.peptideSupport),
        meds: lib?.meds ?? [],
        labs: lib?.labs.length ? lib.labs : splitList(m.labTests),
        technical: lib?.technical ?? { function: decodeText(m.function), effect: null },
        needsAttention,
        inLibrary: !!lib,
      };
    })
    .sort((a, b) =>
      STRENGTH_RANK[a.strength] - STRENGTH_RANK[b.strength] ||
      PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] ||
      Number(b.inLibrary) - Number(a.inLibrary) ||
      a.gene.localeCompare(b.gene),
    );
}

export interface SectionView {
  key: GeneSectionKey | "other";
  title: string;
  blurb: string;
  genes: GeneView[];
}

export function groupBySection(genes: GeneView[]): SectionView[] {
  const sections: SectionView[] = GENE_SECTIONS.map((s) => ({ ...s, genes: [] as GeneView[] }));
  const other: SectionView = { key: "other", title: "Other Genes", blurb: "Genes from the report that are not in our library yet.", genes: [] };
  for (const g of genes) (sections.find((s) => s.key === g.section) ?? other).genes.push(g);
  return [...sections, other].filter((s) => s.genes.length > 0);
}

/** The top genes to focus on first: changed and highest priority. */
export function startHere(genes: GeneView[], n = 3): GeneView[] {
  return genes.filter((g) => g.strength === "two" || g.strength === "one").slice(0, n);
}
