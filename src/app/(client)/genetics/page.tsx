"use client";

import { useState, useMemo } from "react";
import {
  Dna,
  Upload,
  Link,
  FileText,
  X,
  Plus,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  CheckCircle,
  Search,
  Pill,
  Beaker,
  ShieldAlert,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// Types for genetic data display
interface GeneMarker {
  id: string;
  section: string;
  gene: string;
  rsId: string;
  pathway: string;
  function: string;
  mutation: string;
  symptoms: string;
  supplementProtocol: string;
  peptideSupport: string;
  dietStrategy: string;
  lifestyleStrategy: string;
  labTests: string;
  clinicalPriority: "high" | "medium" | "low";
}

interface PathwayScore {
  pathway: string;
  genesInPathway: string;
  genesAffected: number;
  homozygous: number;
  heterozygous: number;
  priorityLevel: "high" | "medium" | "low";
}

const SECTIONS = ["All", "Methylation", "Detoxification", "Inflammation", "Cardiovascular", "Neurotransmitter", "Oxidative Stress", "Hormone"];

export default function GeneticsPage() {
  const [activeSection, setActiveSection] = useState("All");
  const [activeView, setActiveView] = useState<"markers" | "pathways">("markers");
  const [expandedGene, setExpandedGene] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<"pdf" | "url" | "manual">("pdf");
  const [urlInput, setUrlInput] = useState("");

  // ── tRPC queries ────────────────────────────────────────────
  const { data: profileData } = trpc.clientPortal.genetics.getProfile.useQuery();
  const { data: pathwayData } = trpc.clientPortal.genetics.getPathwayScores.useQuery();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.clientPortal.genetics.uploadProfile.useMutation({
    onSuccess: () => {
      utils.clientPortal.genetics.getProfile.invalidate();
      utils.clientPortal.genetics.getPathwayScores.invalidate();
      setShowUpload(false);
    },
  });

  const addMarkerMutation = trpc.clientPortal.genetics.addMarker.useMutation({
    onSuccess: () => {
      utils.clientPortal.genetics.getProfile.invalidate();
    },
  });

  // Use DB data if available, otherwise fall back to demo data
  const markers: GeneMarker[] = useMemo(() => {
    if (profileData?.markers && profileData.markers.length > 0) {
      return profileData.markers.map((m) => ({
        id: m.id,
        section: m.section ?? "Other",
        gene: m.gene,
        rsId: m.rsId ?? "",
        pathway: m.pathway ?? "",
        function: m.function ?? "",
        mutation: m.mutation ?? "",
        symptoms: m.symptoms ?? "",
        supplementProtocol: m.supplementProtocol ?? "",
        peptideSupport: m.peptideSupport ?? "",
        dietStrategy: m.dietStrategy ?? "",
        lifestyleStrategy: m.lifestyleStrategy ?? "",
        labTests: m.labTests ?? "",
        clinicalPriority: (m.clinicalPriority as "high" | "medium" | "low") ?? "medium",
      }));
    }
    return [];
  }, [profileData]);

  const pathwayScores: PathwayScore[] = useMemo(() => {
    if (pathwayData && pathwayData.length > 0) {
      return pathwayData.map((p) => ({
        pathway: p.pathway,
        genesInPathway: p.genesInPathway ?? "",
        genesAffected: p.genesAffected ?? 0,
        homozygous: p.homozygousCount ?? 0,
        heterozygous: p.heterozygousCount ?? 0,
        priorityLevel: (p.priorityLevel as "high" | "medium" | "low") ?? "medium",
      }));
    }
    return [];
  }, [pathwayData]);

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    gene: "",
    rsId: "",
    section: "Methylation",
    pathway: "",
    mutation: "",
    clinicalPriority: "medium" as "high" | "medium" | "low",
  });

  const filteredMarkers = markers.filter((m) => {
    const matchesSection = activeSection === "All" || m.section === activeSection;
    const matchesSearch =
      !searchQuery ||
      m.gene.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.rsId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.pathway.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSection && matchesSearch;
  });

  const priorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "bg-red-500/15 text-red-400 border-red-500/30";
      case "medium":
        return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
      case "low":
        return "bg-green-500/15 text-green-400 border-green-500/30";
      default:
        return "bg-kairos-silver/10 text-kairos-silver border-kairos-border";
    }
  };

  const handleSaveManual = () => {
    if (!manualForm.gene) return;
    if (profileData?.id) {
      addMarkerMutation.mutate({
        profileId: profileData.id,
        gene: manualForm.gene,
        rsId: manualForm.rsId || undefined,
        section: manualForm.section,
        pathway: manualForm.pathway || undefined,
        mutation: manualForm.mutation || undefined,
        clinicalPriority: manualForm.clinicalPriority,
      });
    } else {
      // Create a profile first, then add marker
      uploadMutation.mutate(
        { uploadType: "manual" },
        {
          onSuccess: (newProfile) => {
            addMarkerMutation.mutate({
              profileId: newProfile.id,
              gene: manualForm.gene,
              rsId: manualForm.rsId || undefined,
              section: manualForm.section,
              pathway: manualForm.pathway || undefined,
              mutation: manualForm.mutation || undefined,
              clinicalPriority: manualForm.clinicalPriority,
            });
          },
        }
      );
    }
    setManualForm({ gene: "", rsId: "", section: "Methylation", pathway: "", mutation: "", clinicalPriority: "medium" });
    setShowUpload(false);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Genetic Profile</h1>
          <p className="text-kairos-silver-dark font-body">
            Gene variants, pathway scoring &amp; personalized protocols
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-heading font-semibold text-sm"
        >
          <Plus size={16} />
          Add Genetic Data
        </button>
      </div>

      {/* Upload / Import Section */}
      {showUpload && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Import Genetic Data</h3>
            <button onClick={() => setShowUpload(false)} className="text-kairos-silver-dark hover:text-white">
              <X size={18} />
            </button>
          </div>

          {/* Upload Tabs */}
          <div className="flex gap-2 mb-4">
            {[
              { key: "pdf" as const, label: "Upload PDF", icon: <Upload size={14} /> },
              { key: "url" as const, label: "Enter URL", icon: <Link size={14} /> },
              { key: "manual" as const, label: "Manual Entry", icon: <FileText size={14} /> },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setUploadTab(tab.key)}
                className={`flex items-center gap-2 px-4 py-2 rounded-kairos-sm text-sm font-body transition-all ${
                  uploadTab === tab.key
                    ? "bg-kairos-gold/20 text-kairos-gold border border-kairos-gold"
                    : "text-kairos-silver-dark border border-kairos-border hover:text-white hover:border-kairos-gold/30"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Upload PDF */}
          {uploadTab === "pdf" && (
            <div className="border-2 border-dashed border-kairos-border rounded-kairos-sm p-8 text-center hover:border-kairos-gold/50 transition-colors cursor-pointer">
              <Upload className="w-10 h-10 text-kairos-silver-dark mx-auto mb-3" />
              <p className="text-white font-heading font-semibold mb-1">Drop your genetic report PDF here</p>
              <p className="text-kairos-silver-dark text-sm font-body mb-3">
                Supports 23andMe, AncestryDNA, Promethease, and other genetic testing formats
              </p>
              <label className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm font-body cursor-pointer inline-block">
                Browse Files
                <input type="file" accept=".pdf" className="hidden" onChange={() => {}} />
              </label>
            </div>
          )}

          {/* Enter URL */}
          {uploadTab === "url" && (
            <div className="space-y-3">
              <p className="text-sm text-kairos-silver-dark font-body">
                Enter a URL to your genetic testing results page
              </p>
              <div className="flex gap-3">
                <input
                  type="url"
                  value={urlInput}
                  onChange={(e) => setUrlInput(e.target.value)}
                  placeholder="https://my.23andme.com/results/..."
                  className="flex-1 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
                <button className="kairos-btn-gold px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold">
                  Import
                </button>
              </div>
            </div>
          )}

          {/* Manual Entry */}
          {uploadTab === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Gene Name *</label>
                  <input
                    type="text"
                    value={manualForm.gene}
                    onChange={(e) => setManualForm({ ...manualForm, gene: e.target.value })}
                    placeholder="e.g., MTHFR"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">rsID</label>
                  <input
                    type="text"
                    value={manualForm.rsId}
                    onChange={(e) => setManualForm({ ...manualForm, rsId: e.target.value })}
                    placeholder="e.g., rs1801133"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Section</label>
                  <select
                    value={manualForm.section}
                    onChange={(e) => setManualForm({ ...manualForm, section: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  >
                    {SECTIONS.filter((s) => s !== "All").map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Pathway</label>
                  <input
                    type="text"
                    value={manualForm.pathway}
                    onChange={(e) => setManualForm({ ...manualForm, pathway: e.target.value })}
                    placeholder="e.g., Folate Cycle"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Clinical Priority</label>
                  <select
                    value={manualForm.clinicalPriority}
                    onChange={(e) => setManualForm({ ...manualForm, clinicalPriority: e.target.value as "high" | "medium" | "low" })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  >
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Mutation Details</label>
                <textarea
                  value={manualForm.mutation}
                  onChange={(e) => setManualForm({ ...manualForm, mutation: e.target.value })}
                  rows={2}
                  placeholder="Describe what happens when this gene is mutated..."
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowUpload(false)} className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm font-body">
                  Cancel
                </button>
                <button onClick={handleSaveManual} className="kairos-btn-gold px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold">
                  Save Gene Entry
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <Dna className="w-5 h-5 text-kairos-gold" />
            <p className="text-kairos-silver-dark text-sm font-body">Total Genes</p>
          </div>
          <p className="text-2xl font-bold text-white font-heading">{markers.length}</p>
          <p className="text-xs text-kairos-silver-dark mt-1">Analyzed</p>
        </div>
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <p className="text-kairos-silver-dark text-sm font-body">High Priority</p>
          </div>
          <p className="text-2xl font-bold text-red-400 font-heading">
            {markers.filter((m) => m.clinicalPriority === "high").length}
          </p>
          <p className="text-xs text-kairos-silver-dark mt-1">Requires attention</p>
        </div>
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-kairos-silver-dark text-sm font-body">Pathways Affected</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400 font-heading">
            {pathwayScores.filter((p) => p.genesAffected > 0).length}
          </p>
          <p className="text-xs text-kairos-silver-dark mt-1">of {pathwayScores.length} total</p>
        </div>
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-kairos-silver-dark text-sm font-body">Low Risk</p>
          </div>
          <p className="text-2xl font-bold text-green-400 font-heading">
            {pathwayScores.filter((p) => p.priorityLevel === "low").length}
          </p>
          <p className="text-xs text-kairos-silver-dark mt-1">Pathways stable</p>
        </div>
      </div>

      {/* View Toggle */}
      <div className="flex gap-2">
        <button
          onClick={() => setActiveView("markers")}
          className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-medium transition-all ${
            activeView === "markers"
              ? "kairos-btn-gold text-black"
              : "kairos-btn-outline text-kairos-silver-dark hover:text-white"
          }`}
        >
          Gene Markers
        </button>
        <button
          onClick={() => setActiveView("pathways")}
          className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-medium transition-all ${
            activeView === "pathways"
              ? "kairos-btn-gold text-black"
              : "kairos-btn-outline text-kairos-silver-dark hover:text-white"
          }`}
        >
          Pathway Scoring
        </button>
      </div>

      {/* Gene Markers View */}
      {activeView === "markers" && (
        <>
          {/* Search + Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-kairos-silver-dark" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search genes, rsIDs, pathways..."
                className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm pl-10 pr-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {SECTIONS.map((section) => (
                <button
                  key={section}
                  onClick={() => setActiveSection(section)}
                  className={`px-3 py-1.5 rounded-kairos-sm text-xs font-body transition-all ${
                    activeSection === section
                      ? "bg-kairos-gold/20 text-kairos-gold border border-kairos-gold"
                      : "border border-kairos-border text-kairos-silver-dark hover:text-white hover:border-kairos-gold/30"
                  }`}
                >
                  {section}
                </button>
              ))}
            </div>
          </div>

          {/* Gene Cards */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 mb-2">
              <Dna className="w-5 h-5 text-kairos-gold" />
              <h2 className="font-heading font-bold text-xl text-white">
                {activeSection === "All" ? "All Gene Variants" : `${activeSection} Genes`}
              </h2>
              <span className="text-kairos-silver-dark text-sm">({filteredMarkers.length})</span>
            </div>

            {filteredMarkers.map((marker) => (
              <div
                key={marker.id}
                className="kairos-card border border-kairos-border hover:border-kairos-gold/30 transition-all"
              >
                {/* Collapsed Header */}
                <button
                  onClick={() => setExpandedGene(expandedGene === marker.id ? null : marker.id)}
                  className="w-full flex items-center justify-between"
                >
                  <div className="flex items-center gap-4">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-heading font-bold text-white text-lg">{marker.gene}</h3>
                        <span className="text-xs font-body text-kairos-silver-dark">{marker.rsId}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-body border ${priorityColor(marker.clinicalPriority)}`}>
                          {marker.clinicalPriority}
                        </span>
                      </div>
                      <p className="text-sm text-kairos-silver-dark font-body text-left mt-1">
                        {marker.pathway} — {marker.section}
                      </p>
                    </div>
                  </div>
                  {expandedGene === marker.id ? (
                    <ChevronDown className="w-5 h-5 text-kairos-silver-dark flex-shrink-0" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-kairos-silver-dark flex-shrink-0" />
                  )}
                </button>

                {/* Expanded Details */}
                {expandedGene === marker.id && (
                  <div className="mt-4 pt-4 border-t border-kairos-border space-y-4">
                    <div>
                      <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Function</p>
                      <p className="text-sm font-body text-white">{marker.function}</p>
                    </div>
                    <div>
                      <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">When Mutated</p>
                      <p className="text-sm font-body text-kairos-silver">{marker.mutation}</p>
                    </div>
                    <div>
                      <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Symptoms to Watch</p>
                      <p className="text-sm font-body text-kairos-silver">{marker.symptoms}</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="bg-kairos-royal-surface rounded-kairos-sm p-3 border border-kairos-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Pill className="w-4 h-4 text-kairos-gold" />
                          <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider">Supplement Protocol</p>
                        </div>
                        <p className="text-sm font-body text-white">{marker.supplementProtocol}</p>
                      </div>
                      <div className="bg-kairos-royal-surface rounded-kairos-sm p-3 border border-kairos-border">
                        <div className="flex items-center gap-2 mb-2">
                          <Beaker className="w-4 h-4 text-kairos-gold" />
                          <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider">Peptide Support</p>
                        </div>
                        <p className="text-sm font-body text-white">{marker.peptideSupport}</p>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Diet Strategy</p>
                        <p className="text-sm font-body text-kairos-silver">{marker.dietStrategy}</p>
                      </div>
                      <div>
                        <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Lifestyle Strategy</p>
                        <p className="text-sm font-body text-kairos-silver">{marker.lifestyleStrategy}</p>
                      </div>
                    </div>

                    <div>
                      <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Recommended Lab Tests</p>
                      <p className="text-sm font-body text-kairos-silver">{marker.labTests}</p>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Pathway Scoring View */}
      {activeView === "pathways" && (
        <div className="space-y-4">
          <div className="flex items-center gap-2 mb-2">
            <Dna className="w-5 h-5 text-kairos-gold" />
            <h2 className="font-heading font-bold text-xl text-white">Pathway Scoring</h2>
          </div>

          {pathwayScores.map((pathway, idx) => {
            const totalGenes = pathway.genesInPathway.split(",").length;
            const affectedPct = totalGenes > 0 ? (pathway.genesAffected / totalGenes) * 100 : 0;
            return (
              <div key={idx} className="kairos-card border border-kairos-border">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="font-heading font-semibold text-white">{pathway.pathway}</h3>
                    <p className="text-xs text-kairos-silver-dark font-body mt-1">
                      Genes: {pathway.genesInPathway}
                    </p>
                  </div>
                  <span className={`inline-flex items-center px-3 py-1 rounded-kairos-sm text-xs font-body border ${priorityColor(pathway.priorityLevel)}`}>
                    {pathway.priorityLevel} priority
                  </span>
                </div>

                {/* Progress bar */}
                <div className="h-2 bg-kairos-royal-surface rounded-full overflow-hidden mb-3">
                  <div
                    className={`h-full rounded-full transition-all ${
                      pathway.priorityLevel === "high" ? "bg-red-500/60" : pathway.priorityLevel === "medium" ? "bg-yellow-500/60" : "bg-green-500/60"
                    }`}
                    style={{ width: `${affectedPct}%` }}
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Genes Affected</p>
                    <p className="text-lg font-heading font-bold text-white">
                      {pathway.genesAffected} <span className="text-xs text-kairos-silver-dark font-body">/ {totalGenes}</span>
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Homozygous</p>
                    <p className="text-lg font-heading font-bold text-red-400">{pathway.homozygous}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Heterozygous</p>
                    <p className="text-lg font-heading font-bold text-yellow-400">{pathway.heterozygous}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
