"use client";

import { useState, useRef } from "react";
import {
  Scan,
  Upload,
  Plus,
  X,
  Loader2,
  TrendingUp,
  TrendingDown,
  Calendar,
  Trash2,
  ChevronDown,
  ChevronRight,
  Activity,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

/* ─── Parsed DEXA data shape ──────────────────────────────────── */
interface DexaData {
  totalBodyFatPct?: number;
  leanMassLbs?: number;
  fatMassLbs?: number;
  boneDensityTScore?: number;
  visceralFatArea?: number;
  androidFatPct?: number;
  gynoidFatPct?: number;
  agRatio?: number;
  regions?: Record<string, { fatPct?: number; leanMassLbs?: number }>;
  restingMetabolicRate?: number;
}

/* ─── Metric card ─────────────────────────────────────────────── */
function MetricCard({
  label, value, unit, sub, color = "text-white",
}: {
  label: string; value: string | number; unit?: string; sub?: string; color?: string;
}) {
  return (
    <div className="bg-kairos-royal-surface rounded-xl p-4 border border-kairos-border">
      <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">{label}</p>
      <p className={cn("text-2xl font-heading font-bold", color)}>
        {value}
        {unit && <span className="text-sm text-kairos-silver-dark ml-1">{unit}</span>}
      </p>
      {sub && <p className="text-xs text-kairos-silver-dark mt-1">{sub}</p>}
    </div>
  );
}

/* ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function DexaScanPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [manualMode, setManualMode] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for manual entry
  const [form, setForm] = useState({
    title: "", providerName: "", reportDate: "",
    totalBodyFatPct: "", leanMassLbs: "", fatMassLbs: "",
    boneDensityTScore: "", visceralFatArea: "", restingMetabolicRate: "",
  });

  // ── tRPC ────────────────────────────────────────────────────
  const { data: docs, isLoading } = trpc.clientPortal.clinicalDocs.list.useQuery({ docType: "dexa_scan" });
  const utils = trpc.useUtils();

  const createMutation = trpc.clientPortal.clinicalDocs.create.useMutation({
    onSuccess: () => {
      utils.clientPortal.clinicalDocs.list.invalidate();
      setShowUpload(false);
      setUploading(false);
      resetForm();
    },
    onError: () => setUploading(false),
  });

  const deleteMutation = trpc.clientPortal.clinicalDocs.delete.useMutation({
    onSuccess: () => utils.clientPortal.clinicalDocs.list.invalidate(),
  });

  function resetForm() {
    setForm({ title: "", providerName: "", reportDate: "",
      totalBodyFatPct: "", leanMassLbs: "", fatMassLbs: "",
      boneDensityTScore: "", visceralFatArea: "", restingMetabolicRate: "" });
  }

  function handleFileUpload(file: File) {
    setUploading(true);
    createMutation.mutate({
      docType: "dexa_scan",
      title: `DEXA Scan — ${file.name}`,
      sourceFileName: file.name,
    });
  }

  function handleManualSave() {
    const parsedData: DexaData = {};
    if (form.totalBodyFatPct) parsedData.totalBodyFatPct = parseFloat(form.totalBodyFatPct);
    if (form.leanMassLbs) parsedData.leanMassLbs = parseFloat(form.leanMassLbs);
    if (form.fatMassLbs) parsedData.fatMassLbs = parseFloat(form.fatMassLbs);
    if (form.boneDensityTScore) parsedData.boneDensityTScore = parseFloat(form.boneDensityTScore);
    if (form.visceralFatArea) parsedData.visceralFatArea = parseFloat(form.visceralFatArea);
    if (form.restingMetabolicRate) parsedData.restingMetabolicRate = parseFloat(form.restingMetabolicRate);

    createMutation.mutate({
      docType: "dexa_scan",
      title: form.title || `DEXA Scan — ${new Date().toLocaleDateString()}`,
      providerName: form.providerName || undefined,
      reportDate: form.reportDate ? new Date(form.reportDate).toISOString() : undefined,
      parsedData: parsedData as Record<string, unknown>,
    });
  }

  const hasData = docs && docs.length > 0;
  const latest = hasData ? docs[0] : null;
  const latestData = latest?.parsedData as DexaData | undefined;

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
          <h1 className="font-heading font-bold text-2xl text-white">DexaScan</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            Body composition analysis via DEXA scanning
          </p>
        </div>
        <button
          onClick={() => setShowUpload(!showUpload)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-heading font-semibold text-sm"
        >
          <Plus size={16} />
          Add Scan
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Add DEXA Scan Results</h3>
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
              <Activity size={14} /> Enter Manually
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
                  <p className="text-white font-heading font-semibold">Processing DEXA scan...</p>
                </div>
              ) : (
                <>
                  <Scan className="w-10 h-10 text-kairos-silver-dark mx-auto mb-3" />
                  <p className="text-white font-heading font-semibold mb-1">Drop your DEXA scan report PDF here</p>
                  <p className="text-kairos-silver-dark text-sm font-body mb-3">Supports Hologic, Lunar, and other DEXA formats</p>
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
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Scan Title</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Annual DEXA 2025"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Provider</label>
                  <input type="text" value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                    placeholder="e.g., Dr. Smith"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Scan Date</label>
                  <input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {[
                  { key: "totalBodyFatPct", label: "Total Body Fat %", placeholder: "e.g., 18.5" },
                  { key: "leanMassLbs", label: "Lean Mass (lbs)", placeholder: "e.g., 145" },
                  { key: "fatMassLbs", label: "Fat Mass (lbs)", placeholder: "e.g., 32" },
                  { key: "boneDensityTScore", label: "Bone Density T-Score", placeholder: "e.g., 0.5" },
                  { key: "visceralFatArea", label: "Visceral Fat Area (cm²)", placeholder: "e.g., 85" },
                  { key: "restingMetabolicRate", label: "RMR (kcal/day)", placeholder: "e.g., 1800" },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-xs font-heading text-kairos-silver-dark mb-1">{field.label}</label>
                    <input type="number" step="0.1"
                      value={(form as Record<string, string>)[field.key]}
                      onChange={(e) => setForm({ ...form, [field.key]: e.target.value })}
                      placeholder={field.placeholder}
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                  </div>
                ))}
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => { setShowUpload(false); setManualMode(false); }} className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm">Cancel</button>
                <button onClick={handleManualSave} className="kairos-btn-gold px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold">Save Scan Results</button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasData && !showUpload && (
        <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-5">
            <Scan size={40} className="text-kairos-gold" />
          </div>
          <h2 className="font-heading font-semibold text-xl text-white mb-2">No DEXA Scans Yet</h2>
          <p className="text-sm font-body text-kairos-silver-dark max-w-md mb-6">
            Upload your DEXA scan results to track body composition, bone density, and fat distribution over time.
          </p>
          <button onClick={() => setShowUpload(true)}
            className="kairos-btn-gold flex items-center gap-2 px-6 py-3 rounded-kairos-sm font-heading font-semibold">
            <Upload size={18} /> Add DEXA Scan
          </button>
        </div>
      )}

      {/* Latest scan summary */}
      {hasData && latestData && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
            {latestData.totalBodyFatPct != null && (
              <MetricCard label="Body Fat" value={latestData.totalBodyFatPct.toFixed(1)} unit="%" color="text-kairos-gold" />
            )}
            {latestData.leanMassLbs != null && (
              <MetricCard label="Lean Mass" value={latestData.leanMassLbs.toFixed(1)} unit="lbs" color="text-green-400" />
            )}
            {latestData.fatMassLbs != null && (
              <MetricCard label="Fat Mass" value={latestData.fatMassLbs.toFixed(1)} unit="lbs" color="text-yellow-400" />
            )}
            {latestData.boneDensityTScore != null && (
              <MetricCard label="Bone T-Score" value={latestData.boneDensityTScore.toFixed(1)} color={latestData.boneDensityTScore >= -1 ? "text-green-400" : "text-red-400"} />
            )}
            {latestData.visceralFatArea != null && (
              <MetricCard label="Visceral Fat" value={latestData.visceralFatArea.toFixed(0)} unit="cm²" color={latestData.visceralFatArea < 100 ? "text-green-400" : "text-red-400"} />
            )}
            {latestData.restingMetabolicRate != null && (
              <MetricCard label="RMR" value={latestData.restingMetabolicRate.toFixed(0)} unit="kcal" color="text-blue-400" />
            )}
          </div>
        </>
      )}

      {/* Scan History */}
      {hasData && (
        <div>
          <h2 className="font-heading font-bold text-lg text-white mb-3">Scan History</h2>
          <div className="space-y-2">
            {docs!.map((doc) => {
              const data = doc.parsedData as DexaData | undefined;
              const isExpanded = expandedDoc === doc.id;
              return (
                <div key={doc.id} className="kairos-card border border-kairos-border">
                  <button
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      <Scan size={18} className="text-kairos-gold flex-shrink-0" />
                      <div className="text-left">
                        <p className="font-heading font-semibold text-white text-sm">{doc.title}</p>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-xs text-kairos-silver-dark flex items-center gap-1">
                            <Calendar size={10} />
                            {new Date(doc.reportDate ?? doc.createdAt).toLocaleDateString()}
                          </span>
                          {doc.providerName && (
                            <span className="text-xs text-kairos-silver-dark">{doc.providerName}</span>
                          )}
                          <span className={cn("text-[10px] px-2 py-0.5 rounded-full border",
                            doc.status === "processed" ? "bg-green-500/10 text-green-400 border-green-500/30"
                              : "bg-yellow-500/10 text-yellow-400 border-yellow-500/30")}>
                            {doc.status === "processed" ? "Processed" : "Pending Review"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {data?.totalBodyFatPct != null && (
                        <span className="text-sm font-heading font-bold text-kairos-gold">{data.totalBodyFatPct.toFixed(1)}%</span>
                      )}
                      {isExpanded ? <ChevronDown size={16} className="text-kairos-silver-dark" /> : <ChevronRight size={16} className="text-kairos-silver-dark" />}
                    </div>
                  </button>

                  {isExpanded && data && (
                    <div className="mt-4 pt-4 border-t border-kairos-border grid grid-cols-2 md:grid-cols-3 gap-3">
                      {data.totalBodyFatPct != null && <MetricCard label="Body Fat" value={data.totalBodyFatPct.toFixed(1)} unit="%" color="text-kairos-gold" />}
                      {data.leanMassLbs != null && <MetricCard label="Lean Mass" value={data.leanMassLbs.toFixed(1)} unit="lbs" color="text-green-400" />}
                      {data.fatMassLbs != null && <MetricCard label="Fat Mass" value={data.fatMassLbs.toFixed(1)} unit="lbs" color="text-yellow-400" />}
                      {data.boneDensityTScore != null && <MetricCard label="Bone T-Score" value={data.boneDensityTScore.toFixed(1)} />}
                      {data.visceralFatArea != null && <MetricCard label="Visceral Fat" value={data.visceralFatArea.toFixed(0)} unit="cm²" />}
                      {data.restingMetabolicRate != null && <MetricCard label="RMR" value={data.restingMetabolicRate.toFixed(0)} unit="kcal/day" />}
                    </div>
                  )}

                  {isExpanded && !data && (
                    <div className="mt-4 pt-4 border-t border-kairos-border">
                      <p className="text-sm text-kairos-silver-dark text-center py-4">
                        This scan is pending data extraction. Results will appear here once processed.
                      </p>
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
