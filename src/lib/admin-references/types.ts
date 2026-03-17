// ─── Admin References Types ───────────────────────────────────────
// Knowledge base, clinical references, and protocol documentation.

export type ReferenceCategory =
  | "Clinical Studies"
  | "Supplement Database"
  | "Lab Ranges"
  | "Protocol Templates"
  | "Dosage Guidelines";

export interface Reference {
  id: string;
  title: string;
  source: string;
  year: number;
  category: ReferenceCategory;
  relevanceTags: string[];
  summary: string;
  citationCount: number;
}

export interface ReferenceStats {
  total: number;
  recentlyAdded: number;
  mostCitedCategory: string;
}

export type ReferenceSortBy = "date" | "relevance";
