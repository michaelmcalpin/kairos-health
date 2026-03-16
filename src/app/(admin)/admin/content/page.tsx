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

interface ContentItem {
  id: string;
  title: string;
  category: "Protocols" | "Articles" | "Videos" | "Guides";
  author: string;
  publishDate: string;
  status: "Published" | "Draft" | "Review";
  viewCount: number;
  thumbnail: string;
}

const mockContent: ContentItem[] = [
  {
    id: "1",
    title: "Intermittent Fasting Protocol: 16/8 Method",
    category: "Protocols",
    author: "Dr. Sarah Chen",
    publishDate: "2024-02-15",
    status: "Published",
    viewCount: 2847,
    thumbnail: "protocol-fasting",
  },
  {
    id: "2",
    title: "Sleep Optimization: Architecture & Circadian Rhythms",
    category: "Guides",
    author: "Dr. Marcus Webb",
    publishDate: "2024-02-10",
    status: "Published",
    viewCount: 1923,
    thumbnail: "guide-sleep",
  },
  {
    id: "3",
    title: "NMN & NAD+ Supplementation Guide",
    category: "Articles",
    author: "Dr. Emily Rodriguez",
    publishDate: "2024-02-08",
    status: "Published",
    viewCount: 3156,
    thumbnail: "article-nmn",
  },
  {
    id: "4",
    title: "Metabolic Health Markers: Complete Assessment",
    category: "Guides",
    author: "Dr. James Liu",
    publishDate: "2024-02-05",
    status: "Review",
    viewCount: 0,
    thumbnail: "guide-metabolic",
  },
  {
    id: "5",
    title: "Advanced Supplement Stacking Protocols",
    category: "Protocols",
    author: "Dr. Sarah Chen",
    publishDate: "2024-02-01",
    status: "Draft",
    viewCount: 0,
    thumbnail: "protocol-stack",
  },
  {
    id: "6",
    title: "Longevity Interventions: Latest Research",
    category: "Articles",
    author: "Dr. Michael Foster",
    publishDate: "2024-01-28",
    status: "Published",
    viewCount: 4521,
    thumbnail: "article-research",
  },
  {
    id: "7",
    title: "Video Series: Biohacking Basics",
    category: "Videos",
    author: "Dr. Jessica Park",
    publishDate: "2024-01-25",
    status: "Published",
    viewCount: 5634,
    thumbnail: "video-biohack",
  },
  {
    id: "8",
    title: "Mitochondrial Health Protocol",
    category: "Protocols",
    author: "Dr. Sarah Chen",
    publishDate: "2024-01-20",
    status: "Draft",
    viewCount: 0,
    thumbnail: "protocol-mito",
  },
];

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<
    "All" | "Protocols" | "Articles" | "Videos" | "Guides"
  >("All");

  const categories: Array<"All" | "Protocols" | "Articles" | "Videos" | "Guides"> = [
    "All",
    "Protocols",
    "Articles",
    "Videos",
    "Guides",
  ];

  const filteredContent = mockContent.filter((item) => {
    const matchesSearch = item.title
      .toLowerCase()
      .includes(searchQuery.toLowerCase());
    const matchesCategory =
      selectedCategory === "All" || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const stats = [
    { label: "Total Content", value: "24" },
    { label: "Published", value: "18" },
    { label: "Drafts", value: "4" },
    { label: "In Review", value: "2" },
  ];

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
        {stats.map((stat) => (
          <div
            key={stat.label}
            className="kairos-card bg-kairos-card border border-kairos-border"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="font-body text-kairos-silver-dark text-sm mb-1">
                  {stat.label}
                </p>
                <p className="font-heading font-bold text-2xl text-kairos-gold">
                  {stat.value}
                </p>
              </div>
              <BarChart3 className="w-8 h-8 text-kairos-gold/50" />
            </div>
          </div>
        ))}
      </div>

      {/* Search and Filter */}
      <div className="mb-8 space-y-4">
        {/* Search Bar */}
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

        {/* Category Filter */}
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
              {/* Thumbnail */}
              <div className="w-full h-40 bg-gradient-to-br from-kairos-card to-kairos-card border border-kairos-border rounded-kairos-sm mb-4 flex items-center justify-center text-kairos-silver-dark">
                <div className="text-center">
                  <div className="text-sm font-body text-kairos-silver-dark">
                    {item.thumbnail}
                  </div>
                </div>
              </div>

              {/* Content Info */}
              <div className="space-y-3 mb-4">
                {/* Category & Status Badges */}
                <div className="flex gap-2 flex-wrap">
                  <span
                    className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(item.category)}`}
                  >
                    {item.category}
                  </span>
                  <span
                    className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getStatusColor(item.status)}`}
                  >
                    {item.status}
                  </span>
                </div>

                {/* Title */}
                <h3 className="font-heading font-bold text-white line-clamp-2">
                  {item.title}
                </h3>

                {/* Meta Info */}
                <div className="space-y-1">
                  <p className="font-body text-sm text-kairos-silver-dark">
                    {item.author}
                  </p>
                  <p className="font-body text-xs text-kairos-silver-dark">
                    {new Date(item.publishDate).toLocaleDateString()} •{" "}
                    {item.viewCount.toLocaleString()} views
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
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
            <p className="font-body text-kairos-silver-dark">
              No content found matching your filters
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
