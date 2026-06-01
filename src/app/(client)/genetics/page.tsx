"use client";

import { useState, useMemo, useRef, useCallback } from "react";
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
  Loader2,
  Eye,
  Clock,
  FlaskConical,
  Utensils,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

/* ─── Types ────────────────────────────────────────────────────── */
interface GeneVariant {
  id: string;
  section: string;
  gene: string;
  rsId: string;
  geneticResult: string; // e.g. "T/C (+/-)", "G/G (-/-)", "G/G (+/+)"
  riskLevel: "normal" | "medium" | "high";
  pathway: string;
  function: string;
  mutation: string;
  symptoms: string;
  supplementProtocol: string;
  therapeutics: string;
  providerRecommendations: string;
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

const SECTIONS = [
  "All",
  "Inflammatory",
  "External Inflammatory",
  "Autophagy",
  "Mitochondria",
  "Methylation",
  "Homocysteine",
  "Detoxification",
  "Neurotransmitter",
];

/* ─── Risk badge colors ────────────────────────────────────────── */
function riskBadge(risk: string) {
  switch (risk) {
    case "high":
      return "bg-red-500/20 text-red-400 border-red-500/40";
    case "medium":
      return "bg-yellow-500/20 text-yellow-400 border-yellow-500/40";
    case "normal":
      return "bg-green-500/20 text-green-400 border-green-500/40";
    default:
      return "bg-kairos-silver/10 text-kairos-silver border-kairos-border";
  }
}

function riskLabel(risk: string) {
  switch (risk) {
    case "high": return "+/+ High Risk";
    case "medium": return "+/- Medium Risk";
    case "normal": return "-/- Normal";
    default: return risk;
  }
}

function priorityColor(priority: string) {
  switch (priority) {
    case "high": return "bg-red-500/15 text-red-400 border-red-500/30";
    case "medium": return "bg-yellow-500/15 text-yellow-400 border-yellow-500/30";
    case "low": return "bg-green-500/15 text-green-400 border-green-500/30";
    default: return "bg-kairos-silver/10 text-kairos-silver border-kairos-border";
  }
}

/* ─── Genetic result parser ────────────────────────────────────── */
function parseGeneticResult(result: string): "normal" | "medium" | "high" {
  if (!result) return "normal";
  if (result.includes("(+/+)")) return "high";
  if (result.includes("(+/-)") || result.includes("(-/+)")) return "medium";
  return "normal";
}

/* ─── Detail row ───────────────────────────────────────────────── */
function DetailRow({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  if (!value || value === "N/A") return null;
  return (
    <div className="bg-kairos-royal-surface rounded-xl p-3 border border-kairos-border">
      <div className="flex items-center gap-2 mb-1.5">
        {icon}
        <p className="text-[10px] font-heading text-kairos-gold uppercase tracking-wider">{label}</p>
      </div>
      <p className="text-sm font-body text-white leading-relaxed">{value}</p>
    </div>
  );
}

/* ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function GeneticsPage() {
  const [activeSection, setActiveSection] = useState("All");
  const [activeView, setActiveView] = useState<"markers" | "pathways" | "report">("markers");
  const [expandedGene, setExpandedGene] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<"pdf" | "url" | "manual">("pdf");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [riskFilter, setRiskFilter] = useState<"all" | "high" | "medium">("all");

  // ── tRPC ────────────────────────────────────────────────────
  const { data: profileData, isLoading } = trpc.clientPortal.genetics.getProfile.useQuery();
  const { data: pathwayData } = trpc.clientPortal.genetics.getPathwayScores.useQuery();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.clientPortal.genetics.uploadProfile.useMutation();

  const addMarkerMutation = trpc.clientPortal.genetics.addMarker.useMutation({
    onSuccess: () => utils.clientPortal.genetics.getProfile.invalidate(),
  });

  // ── Derived markers ─────────────────────────────────────────
  const markers: GeneVariant[] = useMemo(() => {
    if (!profileData?.markers?.length) return [];
    return profileData.markers.map((m) => {
      const geneticResult = m.mutation ?? "";
      return {
        id: m.id,
        section: m.section ?? "Other",
        gene: m.gene,
        rsId: m.rsId ?? "",
        geneticResult,
        riskLevel: parseGeneticResult(geneticResult),
        pathway: m.pathway ?? "",
        function: m.function ?? "",
        mutation: m.mutation ?? "",
        symptoms: m.symptoms ?? "",
        supplementProtocol: m.supplementProtocol ?? "",
        therapeutics: "",
        providerRecommendations: "",
        peptideSupport: m.peptideSupport ?? "",
        dietStrategy: m.dietStrategy ?? "",
        lifestyleStrategy: m.lifestyleStrategy ?? "",
        labTests: m.labTests ?? "",
        clinicalPriority: (m.clinicalPriority as "high" | "medium" | "low") ?? "medium",
      };
    });
  }, [profileData]);

  const pathwayScores: PathwayScore[] = useMemo(() => {
    if (!pathwayData?.length) return [];
    return pathwayData.map((p) => ({
      pathway: p.pathway,
      genesInPathway: p.genesInPathway ?? "",
      genesAffected: p.genesAffected ?? 0,
      homozygous: p.homozygousCount ?? 0,
      heterozygous: p.heterozygousCount ?? 0,
      priorityLevel: (p.priorityLevel as "high" | "medium" | "low") ?? "medium",
    }));
  }, [pathwayData]);

  // ── Stats ───────────────────────────────────────────────────
  const highRiskCount = markers.filter((m) => m.riskLevel === "high").length;
  const medRiskCount = markers.filter((m) => m.riskLevel === "medium").length;
  const normalCount = markers.filter((m) => m.riskLevel === "normal").length;

  // ── Filtering ───────────────────────────────────────────────
  const filteredMarkers = markers.filter((m) => {
    const matchesSection = activeSection === "All" || m.section === activeSection;
    const matchesSearch =
      !searchQuery ||
      m.gene.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.rsId.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.pathway.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesRisk =
      riskFilter === "all" ||
      (riskFilter === "high" && m.riskLevel === "high") ||
      (riskFilter === "medium" && m.riskLevel === "medium");
    return matchesSection && matchesSearch && matchesRisk;
  });

  // Group by section for report view
  const groupedBySection = useMemo(() => {
    const groups: Record<string, GeneVariant[]> = {};
    const affectedOnly = markers.filter((m) => m.riskLevel !== "normal");
    affectedOnly.forEach((m) => {
      if (!groups[m.section]) groups[m.section] = [];
      groups[m.section].push(m);
    });
    return groups;
  }, [markers]);

  const [parseError, setParseError] = useState<string | null>(null);
  const [parseProgress, setParseProgress] = useState<string | null>(null);

  // ── File upload handler with AI parsing ────────────────────
  const handleFileUpload = useCallback(async (file: File) => {
    if (!file) return;
    setUploading(true);
    setParseError(null);
    setParseProgress("Reading file...");

    try {
      const MAX_DIRECT_SIZE = 3 * 1024 * 1024; // 3MB — safe limit for base64 in JSON under Vercel's 4.5MB body cap
      const isPdf = file.type === "application/pdf" || file.name.endsWith(".pdf");
      const isLargePdf = isPdf && file.size > MAX_DIRECT_SIZE;

      let requestBody: Record<string, unknown>;

      if (isLargePdf) {
        // Large PDF: render each page as a JPEG image using pdf.js
        setParseProgress("Rendering PDF pages...");
        const pdfjs = await import("pdfjs-dist");
        // Disable web worker to avoid CDN/version mismatch issues — fine for <20 pages
        pdfjs.GlobalWorkerOptions.workerSrc = "";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer), isEvalSupported: false, useWorkerFetch: false } as Parameters<typeof pdfjs.getDocument>[0]).promise;
        const totalPages = pdf.numPages;
        const pageImages: string[] = [];
        const SCALE = 1.5; // Good balance between quality and size

        for (let i = 1; i <= totalPages; i++) {
          setParseProgress(`Rendering page ${i} of ${totalPages}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale: SCALE });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
          // Convert to JPEG base64 (strip data URL prefix)
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          pageImages.push(dataUrl.split(",")[1]);
        }

        // Send pages in batches to stay under body limit (~4MB per batch)
        // Estimate: each page image is roughly 100-300KB as JPEG
        // We can fit ~10-15 pages per batch easily
        setParseProgress(`Sending ${totalPages} pages to AI for analysis...`);
        requestBody = {
          pageImages,
          fileName: file.name,
          docType: "genetics",
        };
      } else {
        // Small file: send as base64 directly
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(",")[1]);
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        requestBody = {
          fileBase64: base64,
          fileName: file.name,
          docType: "genetics",
          mimeType: file.type || "application/pdf",
        };
      }

      setParseProgress("Sending to AI for analysis...");

      // Send to AI parsing API
      const response = await fetch("/api/clinical/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errData = await response.json().catch(() => ({ error: "Server error" }));
        throw new Error(errData.error || `Upload failed (${response.status})`);
      }

      const result = await response.json();

      // Extract pathways from AI response — handle nested or flat structure
      const parsedData = result.data?.parsedData ?? result.data ?? {};
      const pathways = parsedData.pathways as Array<{
        name: string;
        riskLevel: string;
        genesAffected?: string;
        variants?: Array<{
          gene: string;
          rsid?: string;
          genotype?: string;
          impact?: string;
          description?: string;
        }>;
        recommendations?: string[];
      }> | undefined;

      if (!pathways || pathways.length === 0) {
        // No pathways — save profile for manual entry
        setParseProgress("Saving profile...");
        uploadMutation.mutate({
          uploadType: "pdf",
          sourceFileName: file.name,
          rawData: parsedData as Record<string, unknown>,
        });
        setParseError("AI could not extract gene variants from this document. You can add markers manually.");
        return;
      }

      // Count total variants for progress
      const totalVariants = pathways.reduce((sum, p) => sum + (p.variants?.length ?? 0), 0);
      setParseProgress(`Found ${pathways.length} pathways, ${totalVariants} variants. Saving...`);

      // Create the profile first
      const newProfile = await new Promise<{ id: string }>((resolve, reject) => {
        uploadMutation.mutate(
          {
            uploadType: "pdf",
            sourceFileName: file.name,
            rawData: parsedData as Record<string, unknown>,
          },
          {
            onSuccess: (p) => resolve(p),
            onError: (e) => reject(e),
          }
        );
      });

      // Add markers sequentially (avoids overwhelming the API)
      let addedCount = 0;
      for (const pathway of pathways) {
        if (!pathway.variants?.length) continue;
        for (const variant of pathway.variants) {
          setParseProgress(`Adding variant ${addedCount + 1}/${totalVariants}: ${variant.gene}...`);
          try {
            await new Promise<void>((resolve, reject) => {
              addMarkerMutation.mutate(
                {
                  profileId: newProfile.id,
                  gene: variant.gene,
                  rsId: variant.rsid || "",
                  section: pathway.name,
                  pathway: pathway.name,
                  mutation: variant.genotype || "",
                  function: variant.description || "",
                  clinicalPriority: (
                    variant.impact === "high" ? "high" :
                    variant.impact === "moderate" || variant.impact === "medium" ? "medium" :
                    "low"
                  ) as "high" | "medium" | "low",
                },
                {
                  onSuccess: () => resolve(),
                  onError: (e) => reject(e),
                }
              );
            });
            addedCount++;
          } catch {
            // Continue with remaining markers if one fails
            console.warn(`Failed to add marker ${variant.gene}`);
          }
        }
      }

      setParseProgress(null);
      utils.clientPortal.genetics.getProfile.invalidate();
      utils.clientPortal.genetics.getPathwayScores.invalidate();
      setShowUpload(false);

      if (addedCount < totalVariants) {
        setParseError(`Imported ${addedCount} of ${totalVariants} variants. Some could not be saved.`);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Could not parse file";
      setParseError(msg);
      setParseProgress(null);
      // Still save the profile shell if we haven't already
      if (!uploadMutation.isPending) {
        uploadMutation.mutate({
          uploadType: "pdf",
          sourceFileName: file.name,
        });
      }
    } finally {
      setUploading(false);
    }
  }, [uploadMutation, addMarkerMutation, utils]);

  // ── Manual entry ────────────────────────────────────────────
  const [manualForm, setManualForm] = useState({
    gene: "", rsId: "", section: "Methylation", pathway: "",
    mutation: "", clinicalPriority: "medium" as "high" | "medium" | "low",
  });

  const handleSaveManual = () => {
    if (!manualForm.gene) return;
    if (profileData?.id) {
      addMarkerMutation.mutate({ profileId: profileData.id, ...manualForm });
    } else {
      uploadMutation.mutate({ uploadType: "manual" }, {
        onSuccess: (newProfile) => {
          addMarkerMutation.mutate({ profileId: newProfile.id, ...manualForm });
        },
      });
    }
    setManualForm({ gene: "", rsId: "", section: "Methylation", pathway: "", mutation: "", clinicalPriority: "medium" });
    setShowUpload(false);
  };

  const hasData = markers.length > 0;

  // ── Loading ─────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-kairos-gold mx-auto" />
          <p className="text-sm font-body text-kairos-silver-dark">Loading genetic profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Genetic Profile</h1>
          <p className="text-sm text-kairos-silver-dark font-body mt-1">
            {hasData
              ? `Nutrigenomic report — ${markers.length} gene variants analyzed`
              : "Upload your genetic report to view personalized insights"}
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-heading font-semibold text-sm"
        >
          <Plus size={16} />
          {hasData ? "Update Report" : "Upload Report"}
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Import Genetic Data</h3>
            <button onClick={() => setShowUpload(false)} className="text-kairos-silver-dark hover:text-white">
              <X size={18} />
            </button>
          </div>

          <div className="flex gap-2 mb-4">
            {([
              { key: "pdf" as const, label: "Upload PDF", icon: <Upload size={14} /> },
              { key: "url" as const, label: "Enter URL", icon: <Link size={14} /> },
              { key: "manual" as const, label: "Manual Entry", icon: <FileText size={14} /> },
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setUploadTab(tab.key)}
                className={cn(
                  "flex items-center gap-2 px-4 py-2 rounded-kairos-sm text-sm font-body transition-all border",
                  uploadTab === tab.key
                    ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold"
                    : "text-kairos-silver-dark border-kairos-border hover:text-white hover:border-kairos-gold/30"
                )}
              >
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* PDF Upload */}
          {uploadTab === "pdf" && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) handleFileUpload(file);
              }}
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                dragOver
                  ? "border-kairos-gold bg-kairos-gold/5"
                  : "border-kairos-border hover:border-kairos-gold/50"
              )}
            >
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-kairos-gold animate-spin mx-auto" />
                  <p className="text-white font-heading font-semibold">Processing your genetic report...</p>
                  <p className="text-kairos-silver-dark text-sm font-body">
                    {parseProgress || "Extracting gene variants and pathway data"}
                  </p>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-kairos-silver-dark mx-auto mb-3" />
                  <p className="text-white font-heading font-semibold mb-1">
                    Drop your Fagron Pro7 report or other genetic PDF here
                  </p>
                  <p className="text-kairos-silver-dark text-sm font-body mb-3">
                    Supports Fagron Pro7, 23andMe, AncestryDNA, Promethease, and other nutrigenomic formats
                  </p>
                  <span className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm font-body inline-block">
                    Browse Files
                  </span>
                </>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload(file);
                }}
              />
            </div>
          )}

          {/* URL */}
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

          {/* Manual */}
          {uploadTab === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Gene Name *</label>
                  <input type="text" value={manualForm.gene}
                    onChange={(e) => setManualForm({ ...manualForm, gene: e.target.value })}
                    placeholder="e.g., MTHFR"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">rsID</label>
                  <input type="text" value={manualForm.rsId}
                    onChange={(e) => setManualForm({ ...manualForm, rsId: e.target.value })}
                    placeholder="e.g., rs1801133"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Section</label>
                  <select value={manualForm.section}
                    onChange={(e) => setManualForm({ ...manualForm, section: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none">
                    {SECTIONS.filter((s) => s !== "All").map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Genetic Result</label>
                  <input type="text" value={manualForm.mutation}
                    onChange={(e) => setManualForm({ ...manualForm, mutation: e.target.value })}
                    placeholder="e.g., T/C (+/-)"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Clinical Priority</label>
                  <select value={manualForm.clinicalPriority}
                    onChange={(e) => setManualForm({ ...manualForm, clinicalPriority: e.target.value as "high" | "medium" | "low" })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none">
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setShowUpload(false)} className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm font-body">Cancel</button>
                <button onClick={handleSaveManual} className="kairos-btn-gold px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold">Save Gene Entry</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Parse Error Banner */}
      {parseError && (
        <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30 flex items-start gap-3">
          <AlertTriangle size={18} className="text-yellow-400 mt-0.5 flex-shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-heading font-semibold text-yellow-400">Upload Notice</p>
            <p className="text-xs font-body text-kairos-silver-dark mt-1">{parseError}</p>
          </div>
          <button onClick={() => setParseError(null)} className="text-kairos-silver-dark hover:text-white">
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Empty state ─────────────────────────────────────────── */}
      {!hasData && !showUpload && (
        <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-5">
            <Dna size={40} className="text-kairos-gold" />
          </div>
          <h2 className="font-heading font-semibold text-xl text-white mb-2">No Genetic Data Yet</h2>
          <p className="text-sm font-body text-kairos-silver-dark max-w-md mb-6">
            Upload your Fagron Pro7 nutrigenomic report or other genetic testing results
            to see your gene variants, pathway scoring, and personalized supplement protocols.
          </p>
          <button
            onClick={() => setShowUpload(true)}
            className="kairos-btn-gold flex items-center gap-2 px-6 py-3 rounded-kairos-sm font-heading font-semibold"
          >
            <Upload size={18} />
            Upload Genetic Report
          </button>
        </div>
      )}

      {/* ── Data Views ──────────────────────────────────────────── */}
      {hasData && (
        <>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kairos-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <Dna className="w-5 h-5 text-kairos-gold" />
                <p className="text-kairos-silver-dark text-sm font-body">Total Variants</p>
              </div>
              <p className="text-2xl font-bold text-white font-heading">{markers.length}</p>
              <p className="text-xs text-kairos-silver-dark mt-1">genes analyzed</p>
            </div>
            <div className="kairos-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <ShieldAlert className="w-5 h-5 text-red-400" />
                <p className="text-kairos-silver-dark text-sm font-body">High Risk (+/+)</p>
              </div>
              <p className="text-2xl font-bold text-red-400 font-heading">{highRiskCount}</p>
              <p className="text-xs text-kairos-silver-dark mt-1">homozygous mutations</p>
            </div>
            <div className="kairos-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-5 h-5 text-yellow-400" />
                <p className="text-kairos-silver-dark text-sm font-body">Medium Risk (+/-)</p>
              </div>
              <p className="text-2xl font-bold text-yellow-400 font-heading">{medRiskCount}</p>
              <p className="text-xs text-kairos-silver-dark mt-1">heterozygous variants</p>
            </div>
            <div className="kairos-card p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-400" />
                <p className="text-kairos-silver-dark text-sm font-body">Normal (-/-)</p>
              </div>
              <p className="text-2xl font-bold text-green-400 font-heading">{normalCount}</p>
              <p className="text-xs text-kairos-silver-dark mt-1">no variants</p>
            </div>
          </div>

          {/* View Toggle */}
          <div className="flex gap-2 flex-wrap">
            {([
              { key: "markers" as const, label: "Gene Variants" },
              { key: "pathways" as const, label: "Pathway Scoring" },
              { key: "report" as const, label: "Clinical Report" },
            ]).map((v) => (
              <button
                key={v.key}
                onClick={() => setActiveView(v.key)}
                className={cn(
                  "px-4 py-2 rounded-kairos-sm font-body text-sm font-medium transition-all",
                  activeView === v.key
                    ? "kairos-btn-gold text-black"
                    : "kairos-btn-outline text-kairos-silver-dark hover:text-white"
                )}
              >
                {v.label}
              </button>
            ))}
          </div>

          {/* ── Gene Variants View ───────────────────────────────── */}
          {activeView === "markers" && (
            <>
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
                <div className="flex gap-2">
                  {(["all", "high", "medium"] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRiskFilter(r)}
                      className={cn(
                        "px-3 py-1.5 rounded-kairos-sm text-xs font-body transition-all border",
                        riskFilter === r
                          ? r === "high" ? "bg-red-500/20 text-red-400 border-red-500/40"
                            : r === "medium" ? "bg-yellow-500/20 text-yellow-400 border-yellow-500/40"
                            : "bg-kairos-gold/20 text-kairos-gold border-kairos-gold"
                          : "border-kairos-border text-kairos-silver-dark hover:text-white"
                      )}
                    >
                      {r === "all" ? "All Risks" : r === "high" ? "+/+ High" : "+/- Medium"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex gap-2 flex-wrap">
                {SECTIONS.map((section) => (
                  <button
                    key={section}
                    onClick={() => setActiveSection(section)}
                    className={cn(
                      "px-3 py-1.5 rounded-kairos-sm text-xs font-body transition-all border",
                      activeSection === section
                        ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold"
                        : "border-kairos-border text-kairos-silver-dark hover:text-white hover:border-kairos-gold/30"
                    )}
                  >
                    {section}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                {filteredMarkers.length === 0 ? (
                  <div className="kairos-card text-center py-8">
                    <p className="text-kairos-silver-dark font-body">No variants match your filters.</p>
                  </div>
                ) : (
                  filteredMarkers.map((marker) => (
                    <div key={marker.id} className="kairos-card border border-kairos-border hover:border-kairos-gold/30 transition-all">
                      <button
                        onClick={() => setExpandedGene(expandedGene === marker.id ? null : marker.id)}
                        className="w-full flex items-center justify-between"
                      >
                        <div className="flex items-center gap-4">
                          <div className="text-left">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-heading font-bold text-white text-lg">{marker.gene}</h3>
                              <span className="text-xs font-body text-kairos-silver-dark">{marker.rsId}</span>
                              {marker.geneticResult && (
                                <span className={cn(
                                  "inline-flex items-center px-2 py-0.5 rounded text-[10px] font-heading font-bold border",
                                  riskBadge(marker.riskLevel)
                                )}>
                                  {marker.geneticResult}
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-kairos-silver-dark font-body mt-1">{marker.section} — {marker.pathway}</p>
                          </div>
                        </div>
                        {expandedGene === marker.id
                          ? <ChevronDown className="w-5 h-5 text-kairos-silver-dark flex-shrink-0" />
                          : <ChevronRight className="w-5 h-5 text-kairos-silver-dark flex-shrink-0" />}
                      </button>

                      {expandedGene === marker.id && (
                        <div className="mt-4 pt-4 border-t border-kairos-border space-y-3">
                          {marker.function && (
                            <div>
                              <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Function</p>
                              <p className="text-sm font-body text-white">{marker.function}</p>
                            </div>
                          )}
                          {marker.symptoms && (
                            <div>
                              <p className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Symptoms to Watch</p>
                              <p className="text-sm font-body text-kairos-silver">{marker.symptoms}</p>
                            </div>
                          )}
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                            <DetailRow icon={<Pill className="w-4 h-4 text-cyan-400" />} label="Supplement Protocol" value={marker.supplementProtocol} />
                            <DetailRow icon={<Beaker className="w-4 h-4 text-violet-400" />} label="Peptide Support" value={marker.peptideSupport} />
                            <DetailRow icon={<Utensils className="w-4 h-4 text-orange-400" />} label="Diet Strategy" value={marker.dietStrategy} />
                            <DetailRow icon={<Activity className="w-4 h-4 text-green-400" />} label="Lifestyle Strategy" value={marker.lifestyleStrategy} />
                          </div>
                          {marker.labTests && (
                            <DetailRow icon={<FlaskConical className="w-4 h-4 text-amber-400" />} label="Recommended Lab Tests" value={marker.labTests} />
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </>
          )}

          {/* ── Pathway Scoring View ─────────────────────────────── */}
          {activeView === "pathways" && (
            <div className="space-y-4">
              {pathwayScores.length === 0 ? (
                <div className="kairos-card text-center py-8">
                  <p className="text-kairos-silver-dark font-body">Pathway scoring will be available after your genetic report is fully processed.</p>
                </div>
              ) : (
                pathwayScores.map((pathway, idx) => {
                  const totalGenes = pathway.genesInPathway ? pathway.genesInPathway.split(",").length : 1;
                  const affectedPct = (pathway.genesAffected / totalGenes) * 100;
                  return (
                    <div key={idx} className="kairos-card border border-kairos-border">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-heading font-semibold text-white">{pathway.pathway}</h3>
                          <p className="text-xs text-kairos-silver-dark font-body mt-1">
                            Genes: {pathway.genesInPathway}
                          </p>
                        </div>
                        <span className={cn("inline-flex items-center px-3 py-1 rounded-kairos-sm text-xs font-body border", priorityColor(pathway.priorityLevel))}>
                          {pathway.priorityLevel} priority
                        </span>
                      </div>
                      <div className="h-2 bg-kairos-royal-surface rounded-full overflow-hidden mb-3">
                        <div
                          className={cn("h-full rounded-full transition-all",
                            pathway.priorityLevel === "high" ? "bg-red-500/60"
                              : pathway.priorityLevel === "medium" ? "bg-yellow-500/60" : "bg-green-500/60"
                          )}
                          style={{ width: `${affectedPct}%` }}
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-4 text-center">
                        <div>
                          <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider">Affected</p>
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
                })
              )}
            </div>
          )}

          {/* ── Clinical Report View ─────────────────────────────── */}
          {activeView === "report" && (
            <div className="space-y-6">
              <div className="kairos-card border-kairos-gold/30">
                <div className="flex items-center gap-2 mb-3">
                  <Eye className="w-5 h-5 text-kairos-gold" />
                  <h2 className="font-heading font-bold text-lg text-white">Affected Genes Summary</h2>
                </div>
                <p className="text-sm font-body text-kairos-silver-dark mb-1">
                  Showing only genes with (+/-) or (+/+) results — {Object.values(groupedBySection).flat().length} of {markers.length} genes affected.
                </p>
                <div className="flex gap-3 mt-3">
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-red-500" />
                    <span className="text-xs text-kairos-silver-dark">+/+ High Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-yellow-500" />
                    <span className="text-xs text-kairos-silver-dark">+/- Medium Risk</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block w-3 h-3 rounded-full bg-green-500" />
                    <span className="text-xs text-kairos-silver-dark">-/- Normal</span>
                  </div>
                </div>
              </div>

              {Object.entries(groupedBySection).map(([section, genes]) => (
                <div key={section}>
                  <h3 className="font-heading font-bold text-sm text-kairos-gold uppercase tracking-wider mb-3">{section}</h3>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-kairos-border">
                          <th className="text-left py-2 px-3 text-xs font-heading text-kairos-silver-dark uppercase">rsID</th>
                          <th className="text-left py-2 px-3 text-xs font-heading text-kairos-silver-dark uppercase">Gene</th>
                          <th className="text-left py-2 px-3 text-xs font-heading text-kairos-silver-dark uppercase">Result</th>
                          <th className="text-left py-2 px-3 text-xs font-heading text-kairos-silver-dark uppercase">Protocol</th>
                          <th className="text-left py-2 px-3 text-xs font-heading text-kairos-silver-dark uppercase">Labs</th>
                        </tr>
                      </thead>
                      <tbody>
                        {genes.map((g) => (
                          <tr key={g.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover/30">
                            <td className="py-2.5 px-3 font-body text-kairos-silver-dark">{g.rsId}</td>
                            <td className="py-2.5 px-3 font-heading font-semibold text-white">{g.gene}</td>
                            <td className="py-2.5 px-3">
                              <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-bold border", riskBadge(g.riskLevel))}>
                                {g.geneticResult}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-body text-kairos-silver max-w-[200px] truncate">{g.supplementProtocol || "—"}</td>
                            <td className="py-2.5 px-3 font-body text-kairos-silver max-w-[200px] truncate">{g.labTests || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
