// ─── Admin References Engine ──────────────────────────────────────
// Deterministic reference library data for the admin references page.

import type {
  Reference,
  ReferenceCategory,
  ReferenceStats,
  ReferenceSortBy,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

// ─── Seed Data ────────────────────────────────────────────────────

interface ReferenceSeed {
  title: string;
  source: string;
  year: number;
  category: ReferenceCategory;
  tags: string[];
  summary: string;
  baseCitations: number;
}

const REFERENCE_SEEDS: ReferenceSeed[] = [
  {
    title: "NMN Improves Muscle Insulin Sensitivity and Mitochondrial Oxidative Capacity",
    source: "Cell Metabolism",
    year: 2023,
    category: "Clinical Studies",
    tags: ["NAD+", "Aging", "Mitochondria"],
    summary: "Study demonstrates NMN's role in improving muscle metabolism and insulin sensitivity in aging mice.",
    baseCitations: 156,
  },
  {
    title: "Rapamycin as a Longevity Drug: From Yeast to Humans",
    source: "Nature Reviews Molecular Cell Biology",
    year: 2023,
    category: "Clinical Studies",
    tags: ["mTOR", "Lifespan", "Aging"],
    summary: "Comprehensive review of rapamycin's mechanisms and potential applications in human longevity research.",
    baseCitations: 423,
  },
  {
    title: "Sleep Architecture and Cognitive Decline in Aging",
    source: "Journal of Neuroscience",
    year: 2024,
    category: "Clinical Studies",
    tags: ["Sleep", "Brain Health", "Aging"],
    summary: "Research linking sleep architecture patterns to cognitive aging and neuroinflammation markers.",
    baseCitations: 89,
  },
  {
    title: "GLP-1 Receptor Agonists: Beyond Glucose Control",
    source: "The Lancet",
    year: 2024,
    category: "Clinical Studies",
    tags: ["GLP-1", "Metabolic Health", "Weight Management"],
    summary: "Evidence for GLP-1's cardiovascular and neuroprotective benefits independent of glucose lowering.",
    baseCitations: 267,
  },
  {
    title: "NMN & NR Supplementation Database",
    source: "Internal Knowledge Base",
    year: 2024,
    category: "Supplement Database",
    tags: ["NAD+", "Dosage", "Safety"],
    summary: "Compiled data on NMN and nicotinamide riboside efficacy, dosing recommendations, and safety profiles.",
    baseCitations: 42,
  },
  {
    title: "Fasting Metabolic Biomarkers: Reference Ranges",
    source: "Kairos Internal Lab Standards",
    year: 2024,
    category: "Lab Ranges",
    tags: ["Metabolic Health", "Biomarkers", "Assessment"],
    summary: "Comprehensive reference ranges for fasting glucose, insulin, lipids, and metabolic health markers.",
    baseCitations: 134,
  },
  {
    title: "16/8 Intermittent Fasting Protocol Template",
    source: "Kairos Protocol Library",
    year: 2024,
    category: "Protocol Templates",
    tags: ["Fasting", "Implementation", "Guidelines"],
    summary: "Structured protocol template for implementing intermittent fasting with safety guidelines and progression.",
    baseCitations: 78,
  },
  {
    title: "Resveratrol Dosage Guidelines and Safety",
    source: "Kairos Dosage Database",
    year: 2023,
    category: "Dosage Guidelines",
    tags: ["Polyphenols", "Dosing", "Drug Interactions"],
    summary: "Evidence-based dosage recommendations for resveratrol supplementation with interaction profiles.",
    baseCitations: 56,
  },
  {
    title: "Senolytics in Aging Research: Current State",
    source: "Aging Cell",
    year: 2023,
    category: "Clinical Studies",
    tags: ["Cellular Aging", "Senescence", "Longevity"],
    summary: "Review of senolytic compounds and their potential to remove senescent cells in aging organisms.",
    baseCitations: 201,
  },
  {
    title: "Circadian Rhythm Optimization Protocol",
    source: "Kairos Protocol Library",
    year: 2024,
    category: "Protocol Templates",
    tags: ["Sleep", "Light Exposure", "Circadian"],
    summary: "Complete protocol for optimizing circadian rhythm through light exposure and behavioral modifications.",
    baseCitations: 45,
  },
];

// ─── Engine Functions ─────────────────────────────────────────────

export function getReferences(seed = 1): Reference[] {
  return REFERENCE_SEEDS.map((s, i) => ({
    id: String(i + 1),
    title: s.title,
    source: s.source,
    year: s.year,
    category: s.category,
    relevanceTags: s.tags,
    summary: s.summary,
    citationCount: s.baseCitations + Math.round(seededRandom(seed + i) * 20),
  }));
}

export function getReferenceStats(): ReferenceStats {
  return {
    total: 156,
    recentlyAdded: 8,
    mostCitedCategory: "Clinical Studies",
  };
}

export function filterReferences(
  refs: Reference[],
  query: string,
  category: "All" | ReferenceCategory,
): Reference[] {
  return refs.filter((ref) => {
    const matchesSearch =
      ref.title.toLowerCase().includes(query.toLowerCase()) ||
      ref.source.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || ref.category === category;
    return matchesSearch && matchesCategory;
  });
}

export function sortReferences(refs: Reference[], sortBy: ReferenceSortBy): Reference[] {
  return [...refs].sort((a, b) =>
    sortBy === "date" ? b.year - a.year : b.citationCount - a.citationCount,
  );
}

export const REFERENCE_CATEGORIES: Array<"All" | ReferenceCategory> = [
  "All",
  "Clinical Studies",
  "Supplement Database",
  "Lab Ranges",
  "Protocol Templates",
  "Dosage Guidelines",
];
