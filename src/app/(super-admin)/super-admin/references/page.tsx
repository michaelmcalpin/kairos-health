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
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";

// ─── Local types & data (previously from @/lib/admin-references) ───

type ReferenceCategory = "Clinical Studies" | "Supplement Database" | "Lab Ranges" | "Protocol Templates" | "Dosage Guidelines";
type ReferenceSortBy = "date" | "relevance";

interface Reference {
  id: string;
  title: string;
  source: string;
  year: number;
  category: ReferenceCategory;
  relevanceTags: string[];
  summary: string;
  citationCount: number;
}

const REFERENCES: Reference[] = [
  { id: "1", title: "NMN Improves Muscle Insulin Sensitivity and Mitochondrial Oxidative Capacity", source: "Cell Metabolism", year: 2023, category: "Clinical Studies", relevanceTags: ["NAD+", "Aging", "Mitochondria"], summary: "Study demonstrates NMN's role in improving muscle metabolism and insulin sensitivity in aging mice.", citationCount: 165 },
  { id: "2", title: "Rapamycin as a Longevity Drug: From Yeast to Humans", source: "Nature Reviews Molecular Cell Biology", year: 2023, category: "Clinical Studies", relevanceTags: ["mTOR", "Lifespan", "Aging"], summary: "Comprehensive review of rapamycin's mechanisms and potential applications in human longevity research.", citationCount: 435 },
  { id: "3", title: "Sleep Architecture and Cognitive Decline in Aging", source: "Journal of Neuroscience", year: 2024, category: "Clinical Studies", relevanceTags: ["Sleep", "Brain Health", "Aging"], summary: "Research linking sleep architecture patterns to cognitive aging and neuroinflammation markers.", citationCount: 98 },
  { id: "4", title: "GLP-1 Receptor Agonists: Beyond Glucose Control", source: "The Lancet", year: 2024, category: "Clinical Studies", relevanceTags: ["GLP-1", "Metabolic Health", "Weight Management"], summary: "Evidence for GLP-1's cardiovascular and neuroprotective benefits independent of glucose lowering.", citationCount: 278 },
  { id: "5", title: "NMN & NR Supplementation Database", source: "Internal Knowledge Base", year: 2024, category: "Supplement Database", relevanceTags: ["NAD+", "Dosage", "Safety"], summary: "Compiled data on NMN and nicotinamide riboside efficacy, dosing recommendations, and safety profiles.", citationCount: 52 },
  { id: "6", title: "Fasting Metabolic Biomarkers: Reference Ranges", source: "Kairos Internal Lab Standards", year: 2024, category: "Lab Ranges", relevanceTags: ["Metabolic Health", "Biomarkers", "Assessment"], summary: "Comprehensive reference ranges for fasting glucose, insulin, lipids, and metabolic health markers.", citationCount: 142 },
  { id: "7", title: "16/8 Intermittent Fasting Protocol Template", source: "Kairos Protocol Library", year: 2024, category: "Protocol Templates", relevanceTags: ["Fasting", "Implementation", "Guidelines"], summary: "Structured protocol template for implementing intermittent fasting with safety guidelines and progression.", citationCount: 85 },
  { id: "8", title: "Resveratrol Dosage Guidelines and Safety", source: "Kairos Dosage Database", year: 2023, category: "Dosage Guidelines", relevanceTags: ["Polyphenols", "Dosing", "Drug Interactions"], summary: "Evidence-based dosage recommendations for resveratrol supplementation with interaction profiles.", citationCount: 63 },
  { id: "9", title: "Senolytics in Aging Research: Current State", source: "Aging Cell", year: 2023, category: "Clinical Studies", relevanceTags: ["Cellular Aging", "Senescence", "Longevity"], summary: "Review of senolytic compounds and their potential to remove senescent cells in aging organisms.", citationCount: 212 },
  { id: "10", title: "Circadian Rhythm Optimization Protocol", source: "Kairos Protocol Library", year: 2024, category: "Protocol Templates", relevanceTags: ["Sleep", "Light Exposure", "Circadian"], summary: "Complete protocol for optimizing circadian rhythm through light exposure and behavioral modifications.", citationCount: 51 },
];

const REFERENCE_CATEGORIES: Array<"All" | ReferenceCategory> = [
  "All", "Clinical Studies", "Supplement Database", "Lab Ranges", "Protocol Templates", "Dosage Guidelines",
];

const REF_STATS = { total: 156, recentlyAdded: 8, mostCitedCategory: "Clinical Studies" };

function filterReferences(refs: Reference[], query: string, category: "All" | ReferenceCategory): Reference[] {
  return refs.filter((ref) => {
    const matchesSearch = ref.title.toLowerCase().includes(query.toLowerCase()) || ref.source.toLowerCase().includes(query.toLowerCase());
    const matchesCategory = category === "All" || ref.category === category;
    return matchesSearch && matchesCategory;
  });
}

function sortReferences(refs: Reference[], sortBy: ReferenceSortBy): Reference[] {
  return [...refs].sort((a, b) => sortBy === "date" ? b.year - a.year : b.citationCount - a.citationCount);
}

// ─── Component ──────────────────────────────────────────────────────

const statItems = [
  { label: "Total References", value: String(REF_STATS.total), icon: BookOpen },
  { label: "Recently Added", value: String(REF_STATS.recentlyAdded), icon: Clock },
  { label: "Most Cited Category", value: REF_STATS.mostCitedCategory, icon: Award },
];

export default function ReferencesPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<"All" | ReferenceCategory>("All");
  const [sortBy, setSortBy] = useState<ReferenceSortBy>("date");

  const filtered = filterReferences(REFERENCES, searchQuery, selectedCategory);
  const sorted = sortReferences(filtered, sortBy);

  const getCategoryColor = (category: string) => {
    switch (category) {
      case "Clinical Studies": return "bg-blue-900/30 text-blue-300";
      case "Supplement Database": return "bg-purple-900/30 text-purple-300";
      case "Lab Ranges": return "bg-cyan-900/30 text-cyan-300";
      case "Protocol Templates": return "bg-emerald-900/30 text-emerald-300";
      case "Dosage Guidelines": return "bg-pink-900/30 text-pink-300";
      default: return "bg-gray-900/30 text-gray-300";
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
