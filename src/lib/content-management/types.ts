// ─── Content Management Types ─────────────────────────────────────
// Platform content library items, categories, and stats.

export type ContentCategory = "Protocols" | "Articles" | "Videos" | "Guides";
export type ContentStatus = "Published" | "Draft" | "Review";

export interface ContentItem {
  id: string;
  title: string;
  category: ContentCategory;
  author: string;
  publishDate: string;
  status: ContentStatus;
  viewCount: number;
  thumbnail: string;
}

export interface ContentStats {
  total: number;
  published: number;
  drafts: number;
  inReview: number;
}

export interface ContentLibrary {
  items: ContentItem[];
  stats: ContentStats;
}
