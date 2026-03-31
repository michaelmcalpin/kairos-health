"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Edit2,
  Eye,
  Archive,
  Filter,
  BarChart3,
  Plus,
} from "lucide-react";

type ContentCategory = "protocols" | "articles" | "videos" | "guides";
type ContentStatus = "published" | "draft" | "review" | "archived";

const CATEGORY_LABELS: Record<string, string> = {
  protocols: "Protocols",
  articles: "Articles",
  videos: "Videos",
  guides: "Guides",
};

export default function ContentPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ContentCategory>("All");

  const { data: stats } = trpc.admin.content.getStats.useQuery({});
  const { data: items = [], isLoading } = trpc.admin.content.list.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
  });

  const utils = trpc.useUtils();

  const archiveMutation = trpc.admin.content.archive.useMutation({
    onSuccess: () => {
      utils.admin.content.list.invalidate();
      utils.admin.content.getStats.invalidate();
    },
  });

  const categories: Array<"All" | ContentCategory> = ["All", "protocols", "articles", "videos", "guides"];

  const filteredContent = items.filter((item) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      item.title.toLowerCase().includes(q) ||
      (item.authorName ?? "").toLowerCase().includes(q)
    );
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "published": return "bg-green-900/30 text-green-300";
      case "draft": return "bg-amber-900/30 text-amber-300";
      case "review": return "bg-blue-900/30 text-blue-300";
      case "archived": return "bg-gray-900/30 text-gray-300";
      default: return "bg-gray-900/30 text-gray-300";
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "protocols": return "bg-purple-900/30 text-purple-300";
      case "articles": return "bg-cyan-900/30 text-cyan-300";
      case "videos": return "bg-pink-900/30 text-pink-300";
      case "guides": return "bg-emerald-900/30 text-emerald-300";
      default: return "bg-gray-900/30 text-gray-300";
    }
  };

  const statCards = [
    { label: "Total Content", value: String(stats?.total ?? 0) },
    { label: "Published", value: String(stats?.published ?? 0) },
    { label: "Drafts", value: String(stats?.draft ?? 0) },
    { label: "In Review", value: String(stats?.review ?? 0) },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">
            Content Management
          </h1>
          <p className="font-body text-kairos-silver-dark">
            Manage and organize your longevity content library
          </p>
        </div>
      </div>

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
              {category === "All" ? "All" : CATEGORY_LABELS[category]}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-body text-kairos-silver-dark">Loading content...</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredContent.length > 0 ? (
            filteredContent.map((item) => (
              <div
                key={item.id}
                className="kairos-card bg-kairos-card border border-kairos-border hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all duration-300"
              >
                <div className="w-full h-40 bg-gradient-to-br from-kairos-card to-kairos-card border border-kairos-border rounded-kairos-sm mb-4 flex items-center justify-center text-kairos-silver-dark">
                  <div className="text-center">
                    <div className="text-sm font-body text-kairos-silver-dark">{item.thumbnail ?? CATEGORY_LABELS[item.category]}</div>
                  </div>
                </div>
                <div className="space-y-3 mb-4">
                  <div className="flex gap-2 flex-wrap">
                    <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(item.category)}`}>
                      {CATEGORY_LABELS[item.category]}
                    </span>
                    <span className={`px-2 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getStatusColor(item.status)}`}>
                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                    </span>
                  </div>
                  <h3 className="font-heading font-bold text-white line-clamp-2">{item.title}</h3>
                  <div className="space-y-1">
                    <p className="font-body text-sm text-kairos-silver-dark">{item.authorName ?? "Unknown"}</p>
                    <p className="font-body text-xs text-kairos-silver-dark">
                      {item.publishDate ? new Date(item.publishDate).toLocaleDateString() : "Not published"} • {(item.viewCount ?? 0).toLocaleString()} views
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
                  <button
                    onClick={() => archiveMutation.mutate({ id: item.id })}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:text-red-400 hover:bg-kairos-card-hover transition-all rounded-kairos-sm font-body text-sm font-semibold"
                  >
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
      )}
    </div>
  );
}
