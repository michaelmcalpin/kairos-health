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
import { getContentLibrary, filterContent } from "@/lib/content-management/engine";
import type { ContentCategory } from "@/lib/content-management/types";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";

const { items: allContent, stats } = getContentLibrary();

const statCards = [
  { label: "Total Content", value: String(stats.total) },
  { label: "Published", value: String(stats.published) },
  { label: "Drafts", value: String(stats.drafts) },
  { label: "In Review", value: String(stats.inReview) },
];

export default function ContentPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ContentCategory>("All");

  const categories: Array<"All" | ContentCategory> = ["All", "Protocols", "Articles", "Videos", "Guides"];

  const filteredContent = filterContent(allContent, searchQuery, selectedCategory);

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
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">
            Content Management
          </h1>
          <p className="font-body text-kairos-silver-dark">
            {company ? `${company.name} — Content library` : "Manage and organize your longevity content library"}
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
          <span className="text-xs text-kairos-silver-dark ml-auto">Showing company-specific content</span>
        </div>
      )}

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
