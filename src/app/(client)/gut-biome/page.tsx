"use client";

import { useState, useRef } from "react";
import {
  Bug,
  Upload,
  Plus,
  X,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Activity,
  ShieldAlert,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

/* ─── Parsed Gut Biome data shape ─────────────────────────────── */
interface GutBiomeData {
  diversityScore?: number;
  diversityRating?: "low" | "moderate" | "high";
  dysbiosis?: boolean;
  keyFindings?: Array<{
    organism: string;
    level: "low" | "normal" | "elevated" | "high";
    notes?: string;
  }>;
  inflammationMarkers?: Array<{
    marker: string;
    value: string;
    status: "normal" | "elevated" | "high";
  }>;
  digestiveMarkers?: Array<{
    marker: string;
    value: string;
    status: "normal" | "low" | "elevated";
  }>;
  recommendations?: string[];
  pathogenicOrganisms?: Array<{
    organism: string;
    detected: boolean;
  }>;
}

/* ─── Status badge ────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    normal: "bg-green-500/15 text-green-400 border-green-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    elevated: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    high: "bg-red-500/15 text-red-400 border-red-500/30",
  };
  return (
    <span className={cn("inline-flex px-2 py-0.5 rounded text-[10px] font-heading font-bold border uppercase", styles[status] || styles.normal)}>
      {status}
    </span>
  );
}

/* ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function GutBiomePage() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({ title: "", providerName: "", reportDate: "" });

  // ── tRPC ────────────────────────────────────────────────────
  const { data: docs, isLoading } = trpc.clientPortal.clinicalDocs.list.useQuery({ docType: "gut_biome" });
  const utils = trpc.useUtils();

  const createMutation = trpc.clientPortal.clinicalDocs.create.useMutation({
    onSuccess: () => {
      utils.clientPortal.clinicalDocs.list.invalidate();
      setShowUpload(false);
      setUploading(false);
      setForm({ title: "", providerName: "", reportDate: "" });
    },
    onError: () => setUploading(false),
  });

  function handleFileUpload(file: File) {
    setUploading(true);
    createMutation.mutate({
      docType: "gut_biome",
      title: `Gut Biome Analysis — ${file.name}`,
      sourceFileName: file.name,
    });
  }

  function handleManualSave() {
    createMutation.mutate({
      docType: "gut_biome",
      title: form.title || `Gut Biome — ${new Date().toLocaleDateString()}`,
      providerName: form.providerName || undefined,
      reportDate: form.reportDate ? new Date(form.reportDate).toISOString() : undefined,
    });
  }

  const hasData = docs && docs.length > 0;
  const latest = hasData ? docs[0] : null;
  const latestData = latest?.parsedData as GutBiomeData | undefined;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-kairos-gold" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Gut Biome</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            Microbiome analysis, diversity scoring, and pathogen detection
          </p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-heading font-semibold text-sm">
          <Plus size={16} />
          Add Report
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Add Gut Biome Report</h3>
            <button onClick={() => { setShowUpload(false); setManualMode(false); }} className="text-kairos-silver-dark hover:text-white"><X size={18} /></button>
          </div>

          <div className="flex gap-2 mb-4">
            <button onClick={() => setManualMode(false)}
              className={cn("px-4 py-2 rounded-kairos-sm text-sm border transition-all flex items-center gap-2",
                !manualMode ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold" : "border-kairos-border text-kairos-silver-dark")}>
              <Upload size={14} /> Upload PDF
            </button>
            <button onClick={() => setManualMode(true)}
              className={cn("px-4 py-2 rounded-kairos-sm text-sm border transition-all flex items-center gap-2",
                manualMode ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold" : "border-kairos-border text-kairos-silver-dark")}>
              <Activity size={14} /> Enter Details
            </button>
          </div>

          {!manualMode ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); const f = e.dataTransfer.files[0]; if (f) handleFileUpload(f); }}
              onClick={() => fileInputRef.current?.click()}
              className={cn("border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all",
                dragOver ? "border-kairos-gold bg-kairos-gold/5" : "border-kairos-border hover:border-kairos-gold/50")}
            >
              {uploading ? (
                <div className="space-y-3">
                  <Loader2 className="w-10 h-10 text-kairos-gold animate-spin mx-auto" />
                  <p className="text-white font-heading font-semibold">Processing gut biome report...</p>
                </div>
              ) : (
                <>
                  <Bug className="w-10 h-10 text-kairos-silver-dark mx-auto mb-3" />
                  <p className="text-white font-heading font-semibold mb-1">Drop your microbiome test report here</p>
                  <p className="text-kairos-silver-dark text-sm font-body mb-3">
                    Supports GI-MAP, Viome, Thorne Gut Health, uBiome, and other formats
                  </p>
                  <span className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm inline-block">Browse Files</span>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Report Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., GI-MAP Results Q1 2025"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Provider / Lab</label>
                  <input type="text" value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                    placeholder="e.g., Diagnostic Solutions"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Test Date</label>
                  <input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowUpload(false); setManualMode(false); }} className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm">Cancel</button>
                <button onClick={handleManualSave} className="kairos-btn-gold px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold">Save Report</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasData && !showUpload && (
        <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-5">
            <Bug size={40} className="text-kairos-gold" />
          </div>
          <h2 className="font-heading font-semibold text-xl text-white mb-2">No Gut Biome Reports Yet</h2>
          <p className="text-sm font-body text-kairos-silver-dark max-w-md mb-6">
            Upload your GI-MAP, Viome, or other microbiome test results to track microbial diversity,
            detect pathogens, and receive personalized gut health recommendations.
          </p>
          <button onClick={() => setShowUpload(true)}
            className="kairos-btn-gold flex items-center gap-2 px-6 py-3 rounded-kairos-sm font-heading font-semibold">
            <Upload size={18} /> Add Gut Biome Report
          </button>
        </div>
      )}

      {/* Latest data summary */}
      {hasData && latestData && (
        <>
          {/* Quick stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Diversity Score</p>
              <p className={cn("text-2xl font-heading font-bold",
                latestData.diversityRating === "high" ? "text-green-400"
                  : latestData.diversityRating === "moderate" ? "text-yellow-400" : "text-red-400")}>
                {latestData.diversityScore ?? "—"}
              </p>
              <p className="text-xs text-kairos-silver-dark mt-1 capitalize">{latestData.diversityRating ?? "pending"}</p>
            </div>
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Dysbiosis</p>
              <p className={cn("text-2xl font-heading font-bold", latestData.dysbiosis ? "text-red-400" : "text-green-400")}>
                {latestData.dysbiosis ? "Detected" : "None"}
              </p>
            </div>
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Key Findings</p>
              <p className="text-2xl font-heading font-bold text-kairos-gold">{latestData.keyFindings?.length ?? 0}</p>
              <p className="text-xs text-kairos-silver-dark mt-1">organisms flagged</p>
            </div>
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Pathogens</p>
              <p className={cn("text-2xl font-heading font-bold",
                latestData.pathogenicOrganisms?.some((p) => p.detected) ? "text-red-400" : "text-green-400")}>
                {latestData.pathogenicOrganisms?.filter((p) => p.detected).length ?? 0}
              </p>
              <p className="text-xs text-kairos-silver-dark mt-1">detected</p>
            </div>
          </div>

          {/* Key findings table */}
          {latestData.keyFindings && latestData.keyFindings.length > 0 && (
            <div className="kairos-card">
              <h3 className="font-heading font-semibold text-white mb-3">Key Findings</h3>
              <div className="space-y-2">
                {latestData.keyFindings.map((finding, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-kairos-border/50 last:border-0">
                    <div>
                      <p className="text-sm font-heading text-white">{finding.organism}</p>
                      {finding.notes && <p className="text-xs text-kairos-silver-dark mt-0.5">{finding.notes}</p>}
                    </div>
                    <StatusBadge status={finding.level} />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inflammation markers */}
          {latestData.inflammationMarkers && latestData.inflammationMarkers.length > 0 && (
            <div className="kairos-card">
              <h3 className="font-heading font-semibold text-white mb-3">Inflammation Markers</h3>
              <div className="space-y-2">
                {latestData.inflammationMarkers.map((marker, idx) => (
                  <div key={idx} className="flex items-center justify-between py-2 border-b border-kairos-border/50 last:border-0">
                    <span className="text-sm font-body text-kairos-silver">{marker.marker}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-heading font-semibold text-white">{marker.value}</span>
                      <StatusBadge status={marker.status} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Report History */}
      {hasData && (
        <div>
          <h2 className="font-heading font-bold text-lg text-white mb-3">Report History</h2>
          <div className="space-y-2">
            {docs!.map((doc) => {
              const data = doc.parsedData as GutBiomeData | undefined;
              const isExpanded = expandedDoc === doc.id;
              return (
                <div key={doc.id} className="kairos-card border border-kairos-border">
                  <button
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Bug size={18} className="text-kairos-gold flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-heading font-semibold text-white text-sm">{doc.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-kairos-silver-dark flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(doc.reportDate ?? doc.createdAt).toLocaleDateString()}
                          </span>
                          {doc.providerName && <span className="text-xs text-kairos-silver-dark">{doc.providerName}</span>}
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border",
                            doc.status === "processed" ? "bg-green-500/10 text-green-400 border-green-500/30"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30")}>
                            {doc.status === "processed" ? "Processed" : "Pending Review"}
                          </span>
                        </div>
                      </div>
                    </div>
                    {isExpanded ? <ChevronDown size={16} className="text-kairos-silver-dark" /> : <ChevronRight size={16} className="text-kairos-silver-dark" />}
                  </button>

                  {isExpanded && (
                    <div className="mt-4 pt-4 border-t border-kairos-border">
                      {data ? (
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-center">
                          <div>
                            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase">Diversity</p>
                            <p className="text-lg font-heading font-bold text-white">{data.diversityScore ?? "—"}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase">Dysbiosis</p>
                            <p className={cn("text-lg font-heading font-bold", data.dysbiosis ? "text-red-400" : "text-green-400")}>
                              {data.dysbiosis ? "Yes" : "No"}
                            </p>
                          </div>
                          <div>
                            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase">Findings</p>
                            <p className="text-lg font-heading font-bold text-yellow-400">{data.keyFindings?.length ?? 0}</p>
                          </div>
                          <div>
                            <p className="text-[10px] font-heading text-kairos-silver-dark uppercase">Pathogens</p>
                            <p className="text-lg font-heading font-bold text-red-400">{data.pathogenicOrganisms?.filter((p) => p.detected).length ?? 0}</p>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-kairos-silver-dark text-center py-4">
                          Report pending data extraction. Results will appear here once processed.
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
