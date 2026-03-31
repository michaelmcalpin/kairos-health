"use client";

import { useState } from "react";
import { trpc } from "@/lib/trpc";
import {
  Search,
  Filter,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react";

type ReferenceCategory = "clinical_studies" | "supplement_database" | "lab_ranges" | "protocol_templates" | "dosage_guidelines";
type ReferenceSortBy = "date" | "relevance";

const CATEGORY_LABELS: Record<string, string> = {
  clinical_studies: "Clinical Studies",
  supplement_database: "Supplement Database",
  lab_ranges: "Lab Ranges",
  protocol_templates: "Protocol Templates",
  dosage_guidelines: "Dosage Guidelines",
};

const REFERENCE_CATEGORIES: ReferenceCategory[] = [
  "clinical_studies",
  "supplement_database",
  "lab_ranges",
  "protocol_templates",
  "dosage_guidelines",
];

export default function ReferencesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ReferenceCategory>("All");
  const [sortBy, setSortBy] = useState<ReferenceSortBy>("date");

  const { data: stats } = trpc.admin.references.getStats.useQuery({});
  const { data: items = [], isLoading } = trpc.admin.references.list.useQuery({
    category: selectedCategory === "All" ? undefined : selectedCategory,
    search: searchQuery || undefined,
    sortBy,
  });

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "clinical_studies": return "bg-blue-900/30 text-blue-300";
      case "supplement_database": return "bg-purple-900/30 text-purple-300";
      case "lab_ranges": return "bg-cyan-900/30 text-cyan-300";
      case "protocol_templates": return "bg-emerald-900/30 text-emerald-300";
      case "dosage_guidelines": return "bg-pink-900/30 text-pink-300";
      default: return "bg-gray-900/30 text-gray-300";
    }
  };

  const statItems = [
    { label: "Total References", value: String(stats?.total ?? 0), icon: BookOpen },
    { label: "Recently Added", value: String(stats?.recentlyAdded ?? 0), icon: Clock },
    { label: "Most Cited Category", value: stats?.mostCitedCategory ? CATEGORY_LABELS[stats.mostCitedCategory] ?? stats.mostCitedCategory : "—", icon: Award },
  ];

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">
          References &amp; Knowledge Base
        </h1>
        <p className="font-body text-kairos-silver-dark">
          Searchable library of clinical resources and longevity science
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {statItems.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="kairos-card bg-kairos-card border border-kairos-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-kairos-silver-dark text-sm mb-1">{stat.label}</p>
                  <p className="font-heading font-bold text-2xl text-kairos-gold">{stat.value}</p>
                </div>
                <Icon className="w-8 h-8 text-kairos-gold/50" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="mb-8 space-y-4">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search references, journals, authors..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-12 pr-4 py-3 text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 items-center flex-1">
            <Filter className="w-5 h-5 text-kairos-silver-dark" />
            <div className="flex flex-wrap gap-2">
              {REFERENCE_CATEGORIES.map((category) => (
                <button
                  key={category}
                  onClick={() => setSelectedCategory(category)}
                  className={`px-3 py-2 rounded-kairos-sm font-body text-sm transition-all whitespace-nowrap ${
                    selectedCategory === category
                      ? "bg-kairos-gold text-kairos-card font-semibold"
                      : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:border-kairos-gold/50"
                  }`}
                >
                  {CATEGORY_LABELS[category]}
                </button>
              ))}
            </div>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as ReferenceSortBy)}
            className="bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2 text-kairos-silver-dark font-body text-sm focus:outline-none focus:border-kairos-gold/50"
          >
            <option value="date">Sort by: Newest</option>
            <option value="relevance">Sort by: Most Cited</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center py-12">
          <p className="font-body text-kairos-silver-dark">Loading references...</p>
        </div>
      ) : (
        <div className="space-y-4">
          {items.length > 0 ? (
            items.map((ref) => (
              <div
                key={ref.id}
                className="kairos-card bg-kairos-card border border-kairos-border hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all duration-300 p-6"
              >
                <div className="flex items-start justify-between mb-3">
                  <span className={`px-3 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(ref.category)}`}>
                    {CATEGORY_LABELS[ref.category]}
                  </span>
                  <span className="font-body text-sm text-kairos-silver-dark">{ref.year}</span>
                </div>
                <h3 className="font-heading font-bold text-white mb-2 text-lg leading-snug">{ref.title}</h3>
                <div className="mb-4 space-y-2">
                  <p className="font-body text-sm text-kairos-gold">{ref.source}</p>
                  <p className="font-body text-sm text-kairos-silver-dark leading-relaxed">{ref.summary ?? ""}</p>
                </div>
                <div className="flex flex-wrap items-center justify-between pt-4 border-t border-kairos-border">
                  <div className="flex flex-wrap gap-2 mb-3 sm:mb-0">
                    {((ref.relevanceTags as string[]) ?? []).map((tag: string) => (
                      <span key={tag} className="px-2 py-1 bg-kairos-card border border-kairos-border rounded-kairos-sm font-body text-xs text-kairos-silver-dark">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 text-kairos-gold">
                    <TrendingUp className="w-4 h-4" />
                    <span className="font-body text-sm font-semibold">{(ref.citationCount ?? 0)} citations</span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12">
              <p className="font-body text-kairos-silver-dark">No references found matching your search</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
