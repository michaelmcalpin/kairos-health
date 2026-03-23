"use client";

import { useState } from "react";
import {
  Search,
  Filter,
  BookOpen,
  TrendingUp,
  Clock,
  Award,
} from "lucide-react";
import {
  getReferences,
  getReferenceStats,
  filterReferences,
  sortReferences,
  REFERENCE_CATEGORIES,
} from "@/lib/admin-references/engine";
import type { ReferenceCategory, ReferenceSortBy } from "@/lib/admin-references/types";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";

const allReferences = getReferences();
const refStats = getReferenceStats();

const statItems = [
  { label: "Total References", value: String(refStats.total), icon: BookOpen },
  { label: "Recently Added", value: String(refStats.recentlyAdded), icon: Clock },
  { label: "Most Cited Category", value: refStats.mostCitedCategory, icon: Award },
];

export default function ReferencesPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ReferenceCategory>("All");
  const [sortBy, setSortBy] = useState<ReferenceSortBy>("date");

  const filtered = filterReferences(allReferences, searchQuery, selectedCategory);
  const sorted = sortReferences(filtered, sortBy);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Clinical Studies":
        return "bg-blue-900/30 text-blue-300";
      case "Supplement Database":
        return "bg-purple-900/30 text-purple-300";
      case "Lab Ranges":
        return "bg-cyan-900/30 text-cyan-300";
      case "Protocol Templates":
        return "bg-emerald-900/30 text-emerald-300";
      case "Dosage Guidelines":
        return "bg-pink-900/30 text-pink-300";
      default:
        return "bg-gray-900/30 text-gray-300";
    }
  };

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">
            References &amp; Knowledge Base
          </h1>
          <p className="font-body text-kairos-silver-dark">
            {company ? `${company.name} — Clinical resources` : "Searchable library of clinical resources and longevity science"}
          </p>
        </div>
        <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
      </div>

      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border mb-6"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: company.brandColor }}>
            {company.name.charAt(0)}
          </div>
          <span className="font-heading font-semibold text-white text-sm">{company.name}</span>
          <span className="text-xs text-kairos-silver-dark ml-auto">Showing company-assigned references</span>
        </div>
      )}

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
                  {category}
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

      <div className="space-y-4">
        {sorted.length > 0 ? (
          sorted.map((ref) => (
            <div
              key={ref.id}
              className="kairos-card bg-kairos-card border border-kairos-border hover:bg-kairos-card-hover hover:border-kairos-gold/30 transition-all duration-300 p-6"
            >
              <div className="flex items-start justify-between mb-3">
                <span className={`px-3 py-1 rounded-kairos-sm text-xs font-body font-semibold ${getCategoryColor(ref.category)}`}>
                  {ref.category}
                </span>
                <span className="font-body text-sm text-kairos-silver-dark">{ref.year}</span>
              </div>
              <h3 className="font-heading font-bold text-white mb-2 text-lg leading-snug">{ref.title}</h3>
              <div className="mb-4 space-y-2">
                <p className="font-body text-sm text-kairos-gold">{ref.source}</p>
                <p className="font-body text-sm text-kairos-silver-dark leading-relaxed">{ref.summary}</p>
              </div>
              <div className="flex flex-wrap items-center justify-between pt-4 border-t border-kairos-border">
                <div className="flex flex-wrap gap-2 mb-3 sm:mb-0">
                  {ref.relevanceTags.map((tag) => (
                    <span key={tag} className="px-2 py-1 bg-kairos-card border border-kairos-border rounded-kairos-sm font-body text-xs text-kairos-silver-dark">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-kairos-gold">
                  <TrendingUp className="w-4 h-4" />
                  <span className="font-body text-sm font-semibold">{ref.citationCount} citations</span>
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
    </div>
  );
}
