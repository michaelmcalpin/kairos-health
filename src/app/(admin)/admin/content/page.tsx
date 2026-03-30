"use client";

import { useState } from "react";
import {
  Search,
  Edit2,
  Eye,
  Archive,
  Filter,
  BarChart3,
} from "lucide-react";

// Type definitions
type ContentCategory = "Protocols" | "Articles" | "Videos" | "Guides";

interface ContentItem {
  id: string;
  title: string;
  category: ContentCategory;
  author: string;
  status: "Published" | "Draft" | "Review";
  thumbnail: string;
  viewCount: number;
  publishDate: string;
}

// Content items
const CONTENT_ITEMS: ContentItem[] = [
  {
    id: "1",
    title: "Intermittent Fasting Protocol: 16/8 Method",
    category: "Protocols",
    author: "Dr. Sarah Chen",
    status: "Published",
    thumbnail: "protocol-fasting",
    viewCount: 3200,
    publishDate: "2026-02-15",
  },
  {
    id: "2",
    title: "Sleep Optimization: Architecture & Circadian Rhythms",
    category: "Guides",
    author: "Dr. Marcus Webb",
    status: "Published",
    thumbnail: "guide-sleep",
    viewCount: 2800,
    publishDate: "2026-02-10",
  },
  {
    id: "3",
    title: "NMN & NAD+ Supplementation Guide",
    category: "Articles",
    author: "Dr. Emily Rodriguez",
    status: "Published",
    thumbnail: "article-nmn",
    viewCount: 4100,
    publishDate: "2026-02-08",
  },
  {
    id: "4",
    title: "Metabolic Health Markers: Complete Assessment",
    category: "Guides",
    author: "Dr. James Liu",
    status: "Review",
    thumbnail: "guide-metabolic",
    viewCount: 0,
    publishDate: "2026-02-05",
  },
  {
    id: "5",
    title: "Advanced Supplement Stacking Protocols",
    category: "Protocols",
    author: "Dr. Sarah Chen",
    status: "Draft",
    thumbnail: "protocol-stack",
    viewCount: 0,
    publishDate: "2026-02-01",
  },
  {
    id: "6",
    title: "Longevity Interventions: Latest Research",
    category: "Articles",
    author: "Dr. Michael Foster",
    status: "Published",
    thumbnail: "article-research",
    viewCount: 3600,
    publishDate: "2026-01-28",
  },
  {
    id: "7",
    title: "Video Series: Biohacking Basics",
    category: "Videos",
    author: "Dr. Jessica Park",
    status: "Published",
    thumbnail: "video-biohack",
    viewCount: 5200,
    publishDate: "2026-01-25",
  },
  {
    id: "8",
    title: "Mitochondrial Health Protocol",
    category: "Protocols",
    author: "Dr. Sarah Chen",
    status: "Draft",
    thumbnail: "protocol-mito",
    viewCount: 0,
    publishDate: "2026-01-20",
  },
];

// Stats
const STATS = {
  total: 24,
  published: 18,
  drafts: 4,
  inReview: 2,
};

// Filter function
function filterContent(
  items: ContentItem[],
  searchQuery: string,
  selectedCategory: "All" | ContentCategory
): ContentItem[] {
  return items.filter((item) => {
    const matchesSearch =
      searchQuery === "" ||
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.author.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });
}

const statCards = [
  { label: "Total Content", value: String(STATS.total) },
  { label: "Published", value: String(STATS.published) },
  { label: "Drafts", value: String(STATS.drafts) },
  { label: "In Review", value: String(STATS.inReview) },
];

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ContentCategory>("All");

  const categories: Array<"All" | ContentCategory> = ["All", "Protocols", "Articles", "Videos", "Guides"];

  const filteredContent = filterContent(CONTENT_ITEMS, searchQuery, selectedCategory);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Published":
        return "bg-green-900/30 text-green-300";
      case "Draft":
        return "bg-amber-900/30 text-amber-300";
      case "Review":
        return "bg-blue-900/30 text-blue-300";
      default:
        return "bg-gray-900/30 text-gray-300";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Protocols":
        return "bg-purple-900/30 text-purple-300";
      case "Articles":
        return "bg-cyan-900/30 text-cyan-300";
      case "Videos":
        return "bg-pink-900/30 text-pink-300";
      case "Guides":
        return "bg-emerald-900/30 text-emerald-300";
      default:
        return "bg-gray-900/30 text-gray-300";
    }
  };

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">
          Content Management
        </h1>
        <p className="font-body text-kairos-silver-dark">
          Manage and organize your longevity content library
        </p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        {statCards.map((stat) => (
          <div key={stat.label} className="kairos-card bg-kairos-card border border-kairos-border">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-kairos-silver-dark text-sm mb-1">{stat.label}</p>
                <p className="font-heading font-bold text-2xl text-kairos-gold">{stat.value}</p>
              </div>
              <BarChart3 className="w-8 h-8 text-kairos-gold/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-12 pr-4 py-3 text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <Filter className="w-5 h-5 text-kairos-silver-dark" />
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setSelectedCategory(category)}
              className={`px-4 py-2 rounded-kairos-sm font-body text-sm transition-all ${
                selectedCategory === category
                  ? "bg-kairos-gold text-kairos-card font-semibold"
                  : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:border-kairos-gold/50"
              }`}
            >
              {category}
            </button>
          ))}
        </div>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredContent.length > 0 ? (
          filteredContent.map((item) => (
            <div
              key={item.id}
              className="kairos-card bg-kairos-card border border-kairos-border hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all duration-300"
            >
              <div className="w-full h-40 bg-gradient-to-br from-kairos-card to-kairos-card border border-kairos-border rounded-kairos-sm mb-4 flex items-center justify-center text-kairos-silver-dark">
                <div className="text-center">
                  <div className="text-sm font-body text-kairos-silver-dark">{item.thumbnail}</div>
                </div>
              </div>
              <div className="space-y-3 mb-4">
                <div className="flex gap-2 flex-wrap">
                  <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(item.category)}`}>
                    {item.category}
                  </span>
                  <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getStatusColor(item.status)}`}>
                    {item.status}
                  </span>
                </div>
                <h3 className="font-heading font-bold text-white line-clamp-2">{item.title}</h3>
                <div className="space-y-1">
                  <p className="font-body text-sm text-kairos-silver-dark">{item.author}</p>
                  <p className="font-body text-xs text-kairos-silver-dark">
                    {new Date(item.publishDate).toLocaleDateString()} • {item.viewCount.toLocaleString()} views
                  </p>
                </div>
              </div>
              <div className="flex gap-2 pt-4 border-t border-kairos-border">
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-gold hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold">
                  <Edit2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Edit</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-gold hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold">
                  <Eye className="w-4 h-4" />
                  <span className="hidden sm:inline">Preview</span>
                </button>
                <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:text-red-400 hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold">
                  <Archive className="w-4 h-4" />
                  <span className="hidden sm:inline">Archive</span>
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <p className="font-body text-kairos-silver-dark">No content found matching your filters</p>
          </div>
        )}
      </div>
    </div>
  );
}
