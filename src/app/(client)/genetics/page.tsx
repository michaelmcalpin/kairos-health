"use client";

import { useState } from "react";
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

// Demo data based on the Genetics_Master_Database.xlsx structure
const DEMO_MARKERS: GeneMarker[] = [
  {
    id: "1",
    section: "Methylation",
    gene: "MTHFR",
    rsId: "rs1801133",
    pathway: "Folate Cycle",
    function: "Converts folic acid to active methylfolate (5-MTHF)",
    mutation: "Reduced methylfolate production → elevated homocysteine, impaired DNA methylation",
    symptoms: "Fatigue, brain fog, mood changes, elevated homocysteine, neural tube defect risk",
    supplementProtocol: "Methylfolate (L-5-MTHF) 1–5mg, Methyl-B12 1000–5000mcg, TMG 500–1000mg",
    peptideSupport: "BPC-157 for gut healing, Thymosin Alpha-1 for immune modulation",
    dietStrategy: "Leafy greens, avoid folic acid fortified foods, emphasize natural folates",
    lifestyleStrategy: "Reduce toxic exposures, support liver detox, manage stress",
    labTests: "Homocysteine, RBC Folate, Methylmalonic acid, B12 serum",
    clinicalPriority: "high",
  },
  {
    id: "2",
    section: "Methylation",
    gene: "COMT",
    rsId: "rs4680",
    pathway: "Catechol Metabolism",
    function: "Breaks down catecholamines (dopamine, norepinephrine, epinephrine) and estrogens",
    mutation: "Slow COMT: excess catecholamines, anxiety, estrogen dominance; Fast COMT: low dopamine, poor focus",
    symptoms: "Anxiety/worry (slow), low motivation (fast), estrogen-related issues, pain sensitivity",
    supplementProtocol: "Slow: Magnesium, SAMe 200mg, DIM 100mg; Fast: Tyrosine 500mg, Mucuna 100mg",
    peptideSupport: "Selank for anxiety (slow COMT), Semax for focus (fast COMT)",
    dietStrategy: "Slow: reduce high-dopamine foods, moderate caffeine; Fast: protein-rich meals",
    lifestyleStrategy: "Slow: meditation, limit stimulants; Fast: regular exercise for dopamine boost",
    labTests: "Urinary catecholamines, Estrogen metabolites (2:16 ratio), DUTCH test",
    clinicalPriority: "high",
  },
  {
    id: "3",
    section: "Detoxification",
    gene: "CYP1A2",
    rsId: "rs762551",
    pathway: "Phase I Liver Detox",
    function: "Metabolizes caffeine, estrogens, and environmental toxins",
    mutation: "Slow metabolizer: caffeine sensitivity, impaired estrogen clearance",
    symptoms: "Caffeine jitters/insomnia, hormonal imbalances, chemical sensitivity",
    supplementProtocol: "DIM 100–200mg, Calcium D-Glucarate 500mg, NAC 600mg",
    peptideSupport: "BPC-157 for liver support, Glutathione IV/liposomal",
    dietStrategy: "Cruciferous vegetables, limit caffeine, increase fiber for estrogen binding",
    lifestyleStrategy: "Reduce environmental toxin exposure, sauna for detox, filtered water",
    labTests: "Comprehensive metabolic panel, Estrogen metabolites, Liver enzymes",
    clinicalPriority: "medium",
  },
  {
    id: "4",
    section: "Detoxification",
    gene: "GST (GSTM1/GSTT1)",
    rsId: "multiple",
    pathway: "Phase II Glutathione Conjugation",
    function: "Conjugates toxins with glutathione for elimination",
    mutation: "Null/deletion: severely impaired glutathione-dependent detox",
    symptoms: "Chemical sensitivity, oxidative stress, increased cancer risk, poor recovery",
    supplementProtocol: "Liposomal Glutathione 500mg, NAC 1200mg, Alpha Lipoic Acid 300mg, Selenium 200mcg",
    peptideSupport: "Glutathione IV push, BPC-157",
    dietStrategy: "Sulfur-rich foods (garlic, onions, cruciferous), whey protein for cysteine",
    lifestyleStrategy: "Infrared sauna 3x/week, avoid pesticides, use air purifiers",
    labTests: "Glutathione (reduced), 8-OHdG, Lipid peroxides, Organic acids",
    clinicalPriority: "high",
  },
  {
    id: "5",
    section: "Inflammation",
    gene: "TNF-alpha",
    rsId: "rs1800629",
    pathway: "Inflammatory Signaling",
    function: "Pro-inflammatory cytokine production and signaling",
    mutation: "Increased TNF-alpha production → chronic inflammation, autoimmune risk",
    symptoms: "Chronic inflammation, joint pain, fatigue, autoimmune tendencies",
    supplementProtocol: "Omega-3 (EPA 2g+), Curcumin 1000mg, Resveratrol 200mg, SPMs",
    peptideSupport: "Thymosin Alpha-1, BPC-157, KPV peptide",
    dietStrategy: "Anti-inflammatory diet, eliminate seed oils, emphasize omega-3 rich fish",
    lifestyleStrategy: "Zone 2 cardio, cold exposure, stress management, adequate sleep",
    labTests: "hs-CRP, ESR, TNF-alpha, IL-6, Omega-3 Index",
    clinicalPriority: "high",
  },
  {
    id: "6",
    section: "Cardiovascular",
    gene: "APOE",
    rsId: "rs429358/rs7412",
    pathway: "Lipid Metabolism",
    function: "Cholesterol transport and metabolism, brain lipid homeostasis",
    mutation: "E4 allele: increased LDL, Alzheimer risk; E2: triglyceride issues",
    symptoms: "Elevated LDL/ApoB, cardiovascular risk, cognitive decline risk (E4)",
    supplementProtocol: "Omega-3 DHA 2g, Berberine 500mg, Plant sterols, CoQ10 200mg",
    peptideSupport: "Dihexa for neuroprotection (E4), Cerebrolysin",
    dietStrategy: "E4: low saturated fat, Mediterranean; E2: moderate fat, limit refined carbs",
    lifestyleStrategy: "Regular aerobic exercise, cognitive training, limit alcohol",
    labTests: "ApoB, Lp(a), Advanced lipid panel, Coronary calcium score",
    clinicalPriority: "high",
  },
];

const DEMO_PATHWAY_SCORES: PathwayScore[] = [
  { pathway: "Methylation / Folate Cycle", genesInPathway: "MTHFR, MTR, MTRR, MAT, AHCY", genesAffected: 3, homozygous: 1, heterozygous: 2, priorityLevel: "high" },
  { pathway: "Detoxification Phase I", genesInPathway: "CYP1A2, CYP2D6, CYP3A4, CYP2C19", genesAffected: 2, homozygous: 0, heterozygous: 2, priorityLevel: "medium" },
  { pathway: "Detoxification Phase II", genesInPathway: "GSTM1, GSTT1, NAT2, UGT1A1", genesAffected: 2, homozygous: 1, heterozygous: 1, priorityLevel: "high" },
  { pathway: "Inflammatory Signaling", genesInPathway: "TNF-alpha, IL-6, IL-1B, NF-kB", genesAffected: 2, homozygous: 1, heterozygous: 1, priorityLevel: "high" },
  { pathway: "Cardiovascular / Lipid", genesInPathway: "APOE, MTHFR, FUT2, PCSK9", genesAffected: 2, homozygous: 0, heterozygous: 2, priorityLevel: "medium" },
  { pathway: "Neurotransmitter Metabolism", genesInPathway: "COMT, MAO-A, GAD1, BDNF", genesAffected: 2, homozygous: 1, heterozygous: 1, priorityLevel: "high" },
  { pathway: "Oxidative Stress Defense", genesInPathway: "SOD2, CAT, GPX1, NRF2", genesAffected: 1, homozygous: 0, heterozygous: 1, priorityLevel: "low" },
  { pathway: "Hormone Metabolism", genesInPathway: "CYP19A1, CYP1B1, SRD5A2, AR", genesAffected: 1, homozygous: 0, heterozygous: 1, priorityLevel: "low" },
];

const SECTIONS = ["All", "Methylation", "Detoxification", "Inflammation", "Cardiovascular", "Neurotransmitter", "Oxidative Stress", "Hormone"];

export default function GeneticsPage() {
  const [activeSection, setActiveSection] = useState("All");
  const [activeView, setActiveView] = useState<"markers" | "pathways">("markers");
  const [expandedGene, setExpandedGene] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<"pdf" | "url" | "manual">("pdf");
  const [urlInput, setUrlInput] = useState("");

  // Manual entry form state
  const [manualForm, setManualForm] = useState({
    gene: "",
    rsId: "",
    section: "Methylation",
    pathway: "",
    mutation: "",
    clinicalPriority: "medium" as "high" | "medium" | "low",
  });

  const filteredMarkers = DEMO_MARKERS.filter((m) => {
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
    console.log("Saving manual genetic entry:", manualForm);
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
                <input type="file" accept=".pdf" className="hidden" onChange={() => console.log("PDF selected")} />
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
          <p className="text-2xl font-bold text-white font-heading">{DEMO_MARKERS.length}</p>
          <p className="text-xs text-kairos-silver-dark mt-1">Analyzed</p>
        </div>
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <ShieldAlert className="w-5 h-5 text-red-400" />
            <p className="text-kairos-silver-dark text-sm font-body">High Priority</p>
          </div>
          <p className="text-2xl font-bold text-red-400 font-heading">
            {DEMO_MARKERS.filter((m) => m.clinicalPriority === "high").length}
          </p>
          <p className="text-xs text-kairos-silver-dark mt-1">Requires attention</p>
        </div>
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-5 h-5 text-yellow-400" />
            <p className="text-kairos-silver-dark text-sm font-body">Pathways Affected</p>
          </div>
          <p className="text-2xl font-bold text-yellow-400 font-heading">
            {DEMO_PATHWAY_SCORES.filter((p) => p.genesAffected > 0).length}
          </p>
          <p className="text-xs text-kairos-silver-dark mt-1">of {DEMO_PATHWAY_SCORES.length} total</p>
        </div>
        <div className="kairos-card p-5">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <p className="text-kairos-silver-dark text-sm font-body">Low Risk</p>
          </div>
          <p className="text-2xl font-bold text-green-400 font-heading">
            {DEMO_PATHWAY_SCORES.filter((p) => p.priorityLevel === "low").length}
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

          {DEMO_PATHWAY_SCORES.map((pathway, idx) => {
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
