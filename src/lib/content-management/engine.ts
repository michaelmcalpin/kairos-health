// ─── Content Management Engine ────────────────────────────────────
// Deterministic content library data for the admin content page.

import type {
  ContentItem,
  ContentStats,
  ContentCategory,
  ContentStatus,
  ContentLibrary,
} from "./types";

// ─── Helpers ──────────────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function uid(seed: number): string {
  return `cnt_${seed.toString(36)}`;
}

// ─── Seed Data ────────────────────────────────────────────────────

interface ContentSeed {
  title: string;
  category: ContentCategory;
  author: string;
  status: ContentStatus;
  thumbnail: string;
  daysAgo: number;
}

const CONTENT_SEEDS: ContentSeed[] = [
  { title: "Intermittent Fasting Protocol: 16/8 Method", category: "Protocols", author: "Dr. Sarah Chen", status: "Published", thumbnail: "protocol-fasting", daysAgo: 30 },
  { title: "Sleep Optimization: Architecture & Circadian Rhythms", category: "Guides", author: "Dr. Marcus Webb", status: "Published", thumbnail: "guide-sleep", daysAgo: 35 },
  { title: "NMN & NAD+ Supplementation Guide", category: "Articles", author: "Dr. Emily Rodriguez", status: "Published", thumbnail: "article-nmn", daysAgo: 37 },
  { title: "Metabolic Health Markers: Complete Assessment", category: "Guides", author: "Dr. James Liu", status: "Review", thumbnail: "guide-metabolic", daysAgo: 40 },
  { title: "Advanced Supplement Stacking Protocols", category: "Protocols", author: "Dr. Sarah Chen", status: "Draft", thumbnail: "protocol-stack", daysAgo: 44 },
  { title: "Longevity Interventions: Latest Research", category: "Articles", author: "Dr. Michael Foster", status: "Published", thumbnail: "article-research", daysAgo: 48 },
  { title: "Video Series: Biohacking Basics", category: "Videos", author: "Dr. Jessica Park", status: "Published", thumbnail: "video-biohack", daysAgo: 51 },
  { title: "Mitochondrial Health Protocol", category: "Protocols", author: "Dr. Sarah Chen", status: "Draft", thumbnail: "protocol-mito", daysAgo: 56 },
];

// ─── Engine Functions ─────────────────────────────────────────────

export function getContentItems(seed = 1): ContentItem[] {
  const baseDate = new Date(2026, 2, 17); // Mar 17 2026
  return CONTENT_SEEDS.map((s, i) => {
    const pubDate = new Date(baseDate);
    pubDate.setDate(pubDate.getDate() - s.daysAgo);
    const views = s.status === "Published"
      ? Math.round(1200 + seededRandom(seed + i) * 4500)
      : 0;
    return {
      id: uid(i + 1),
      title: s.title,
      category: s.category,
      author: s.author,
      publishDate: pubDate.toISOString().split("T")[0],
      status: s.status,
      viewCount: views,
      thumbnail: s.thumbnail,
    };
  });
}

export function getContentStats(items: ContentItem[]): ContentStats {
  return {
    total: items.length + 16, // account for "all" content beyond this page
    published: items.filter(i => i.status === "Published").length + 13,
    drafts: items.filter(i => i.status === "Draft").length + 2,
    inReview: items.filter(i => i.status === "Review").length + 1,
  };
}

export function filterContent(
  items: ContentItem[],
  query: string,
  category: "All" | ContentCategory
): ContentItem[] {
  return items.filter((item) => {
    const matchesSearch = item.title.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || item.category === category;
    return matchesSearch && matchesCategory;
  });
}

export function getContentLibrary(seed = 1): ContentLibrary {
  const items = getContentItems(seed);
  return {
    items,
    stats: getContentStats(items),
  };
}
