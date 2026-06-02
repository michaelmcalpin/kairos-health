"use client";

import { useState, useRef, useMemo } from "react";
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
  BarChart3,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

/* ─── Parsed DEXA data shape ──────────────────────────────────── */
interface DexaData {
  totalBodyFatPct?: number;
  totalMassLbs?: number;
  leanMassLbs?: number;
  fatMassLbs?: number;
  boneMineralContent?: number;
  boneDensityTScore?: number;
  visceralFatLbs?: number;
  visceralFatArea?: number; // legacy field — some reports use cm²
  androidFatPct?: number;
  gynoidFatPct?: number;
  agRatio?: number;
  androidFatMass?: number;
  restingMetabolicRate?: number;
  bmi?: number;
  regions?: Record<string, { fatPct?: number; fatLbs?: number; leanLbs?: number; leanMassLbs?: number; totalLbs?: number }>;
}

/* ─── Helper: get numeric value from DexaData ────────────────── */
function dv(data: DexaData | undefined, key: string): number | null {
  if (!data) return null;
  const val = (data as Record<string, unknown>)[key];
  return typeof val === "number" ? val : null;
}

/* ─── Change indicator ───────────────────────────────────────── */
function ChangeIndicator({ current, previous, inverse }: { current: number | null; previous: number | null; inverse?: boolean }) {
  if (current == null || previous == null) return null;
  const diff = current - previous;
  if (Math.abs(diff) < 0.05) return <span className="text-[10px] text-kairos-silver-dark">—</span>;
  const isGood = inverse ? diff < 0 : diff > 0;
  return (
    <span className={cn("text-xs font-heading font-bold flex items-center gap-0.5", isGood ? "text-green-400" : "text-red-400")}>
      {diff > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {diff > 0 ? "+" : ""}{diff.toFixed(1)}
    </span>
  );
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

  const [parseError, setParseError] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setParseError(null);

    try {
      // Read file as base64
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]); // strip data:...;base64, prefix
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      // Send to AI parsing API
      const response = await fetch("/api/clinical/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
          docType: "dexa_scan",
          mimeType: file.type || "application/pdf",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        // Fallback: save without parsed data
        createMutation.mutate({
          docType: "dexa_scan",
          title: `DEXA Scan — ${file.name}`,
          sourceFileName: file.name,
        });
        setParseError("AI parsing failed — document saved for manual review.");
        return;
      }

      const parsed = result.data;
      createMutation.mutate({
        docType: "dexa_scan",
        title: parsed.title || `DEXA Scan — ${file.name}`,
        sourceFileName: file.name,
        providerName: parsed.providerName || undefined,
        reportDate: parsed.reportDate || undefined,
        parsedData: parsed.parsedData as Record<string, unknown>,
      });
    } catch {
      // Fallback: save without parsed data
      createMutation.mutate({
        docType: "dexa_scan",
        title: `DEXA Scan — ${file.name}`,
        sourceFileName: file.name,
      });
      setParseError("Could not parse file — saved for manual review.");
    }
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

  // ── Trend state ─────────────────────────────────────────────
  const [trendMetric, setTrendMetric] = useState<string | null>(null);
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [aiTrendAnalysis, setAiTrendAnalysis] = useState<string | null>(null);
  const [aiTrendLoading, setAiTrendLoading] = useState(false);

  const hasData = docs && docs.length > 0;
  const latest = hasData ? docs[0] : null;
  const latestData = latest?.parsedData as DexaData | undefined;

  // Build trend data from all scans
  const DEXA_METRICS = [
    { key: "totalBodyFatPct", label: "Body Fat %", unit: "%", color: "text-kairos-gold", decimals: 1, inverse: true },
    { key: "totalMassLbs", label: "Total Mass", unit: "lbs", color: "text-white", decimals: 1, inverse: false },
    { key: "fatMassLbs", label: "Fat Mass", unit: "lbs", color: "text-yellow-400", decimals: 1, inverse: true },
    { key: "leanMassLbs", label: "Lean Mass", unit: "lbs", color: "text-green-400", decimals: 1, inverse: false },
    { key: "boneMineralContent", label: "BMC", unit: "lbs", color: "text-blue-400", decimals: 1, inverse: false },
    { key: "visceralFatLbs", label: "Visceral Fat", unit: "lbs", color: "text-red-400", decimals: 2, inverse: true },
    { key: "androidFatPct", label: "Android Fat %", unit: "%", color: "text-orange-400", decimals: 1, inverse: true },
    { key: "gynoidFatPct", label: "Gynoid Fat %", unit: "%", color: "text-pink-400", decimals: 1, inverse: true },
    { key: "agRatio", label: "A/G Ratio", unit: "", color: "text-violet-400", decimals: 2, inverse: true },
    { key: "restingMetabolicRate", label: "RMR", unit: "kcal", color: "text-cyan-400", decimals: 0, inverse: false },
  ];

  const trendData = useMemo(() => {
    if (!docs || docs.length < 1) return {};
    const result: Record<string, Array<{ value: number; date: string }>> = {};
    // Iterate oldest to newest
    const sorted = [...docs].reverse();
    for (const doc of sorted) {
      const data = doc.parsedData as DexaData | undefined;
      if (!data) continue;
      const date = doc.reportDate ?? doc.createdAt;
      const dateStr = typeof date === "string" ? date : new Date(date).toISOString();
      for (const m of DEXA_METRICS) {
        const val = (data as Record<string, unknown>)[m.key];
        if (val != null && typeof val === "number") {
          if (!result[m.key]) result[m.key] = [];
          result[m.key].push({ value: val, date: dateStr });
        }
      }
    }
    return result;
  }, [docs]);

  async function fetchDexaAiTrend(metricLabel: string, points: Array<{ value: number; date: string }>) {
    setAiTrendLoading(true);
    setAiTrendAnalysis(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze this DEXA scan trend for ${metricLabel}:\n\n${points.map(p => `${new Date(p.date).toLocaleDateString()}: ${p.value}`).join("\n")}\n\nProvide a concise 2-3 sentence analysis of the trend, whether it's positive or concerning for body composition goals, and one actionable recommendation.`,
          }],
        }),
      });
      const data = await res.json();
      setAiTrendAnalysis(data.reply || data.content || "Unable to generate analysis.");
    } catch {
      setAiTrendAnalysis("Could not generate AI analysis at this time.");
    } finally {
      setAiTrendLoading(false);
    }
  }

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
                  <p className="text-white font-heading font-semibold">AI is scanning your DEXA report...</p>
                  <p className="text-kairos-silver-dark text-xs">Extracting body composition data</p>
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

      {/* Parse error notification */}
      {parseError && (
        <div className="p-3 bg-yellow-500/10 border border-yellow-500/30 rounded-kairos-sm flex items-center justify-between">
          <p className="text-sm text-yellow-400">{parseError}</p>
          <button onClick={() => setParseError(null)} className="text-yellow-400 hover:text-yellow-300"><X size={14} /></button>
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

      {/* Single Metric Trend */}
      {trendMetric && !showAllTrends && (() => {
        const metric = DEXA_METRICS.find(m => m.key === trendMetric);
        const points = trendData[trendMetric] ?? [];
        return (
          <div className="kairos-card border border-kairos-gold/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { setTrendMetric(null); setAiTrendAnalysis(null); }} className="text-kairos-silver-dark hover:text-white"><ArrowLeft size={18} /></button>
                <div>
                  <h2 className="font-heading font-bold text-lg text-white">{metric?.label ?? trendMetric} Trend</h2>
                  <p className="text-xs text-kairos-silver-dark">{points.length} scans</p>
                </div>
              </div>
              {points.length >= 2 && (
                <button onClick={() => fetchDexaAiTrend(metric?.label ?? trendMetric, points)} disabled={aiTrendLoading}
                  className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-1.5">
                  {aiTrendLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Analysis
                </button>
              )}
            </div>
            {points.length < 2 ? (
              <p className="text-sm text-kairos-silver-dark text-center py-8">Need at least 2 scans to show a trend.</p>
            ) : (
              <>
                <div className="h-48 relative mb-4">
                  <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                    {(() => {
                      const vals = points.map(p => p.value);
                      const minV = Math.min(...vals) * 0.9; const maxV = Math.max(...vals) * 1.1;
                      const range = maxV - minV || 1;
                      const pts = points.map((p, i) => `${(i / (points.length - 1)) * 380 + 10},${110 - ((p.value - minV) / range) * 100}`);
                      return (
                        <>
                          <polyline points={pts.join(" ")} fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinejoin="round" />
                          {points.map((p, i) => {
                            const x = (i / (points.length - 1)) * 380 + 10;
                            const y = 110 - ((p.value - minV) / range) * 100;
                            return <circle key={i} cx={x} cy={y} r="4" fill="#D4AF37" stroke="#1a1a2e" strokeWidth="2" />;
                          })}
                        </>
                      );
                    })()}
                  </svg>
                </div>
                <div className="flex justify-between text-[10px] text-kairos-silver-dark px-2 mb-4">
                  {points.map((p, i) => (
                    <div key={i} className="text-center">
                      <p className="font-bold text-white text-sm">{p.value.toFixed(1)}</p>
                      <p>{new Date(p.date).toLocaleDateString("en-US", { month: "short", year: "2-digit" })}</p>
                    </div>
                  ))}
                </div>
              </>
            )}
            {aiTrendAnalysis && (
              <div className="p-3 bg-kairos-gold/5 border border-kairos-gold/20 rounded-xl mt-2">
                <div className="flex items-center gap-2 mb-1.5"><Sparkles size={14} className="text-kairos-gold" /><p className="text-xs font-heading text-kairos-gold uppercase">AI Analysis</p></div>
                <p className="text-sm text-white leading-relaxed">{aiTrendAnalysis}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* All Trends View */}
      {showAllTrends && (
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <button onClick={() => setShowAllTrends(false)} className="text-kairos-silver-dark hover:text-white"><ArrowLeft size={18} /></button>
            <h2 className="font-heading font-bold text-lg text-white">All DEXA Trends</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {DEXA_METRICS.filter(m => (trendData[m.key]?.length ?? 0) >= 2).map((metric) => {
              const points = trendData[metric.key]!;
              return (
                <div key={metric.key} className="kairos-card border border-kairos-border hover:border-kairos-gold/30 cursor-pointer transition-all"
                  onClick={() => { setTrendMetric(metric.key); setShowAllTrends(false); setAiTrendAnalysis(null); }}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-bold text-sm text-white">{metric.label}</h3>
                    <span className="text-[10px] text-kairos-silver-dark">{points.length} scans</span>
                  </div>
                  <div className="h-16">
                    <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
                      {(() => {
                        const vals = points.map(p => p.value);
                        const minV = Math.min(...vals) * 0.9; const maxV = Math.max(...vals) * 1.1;
                        const range = maxV - minV || 1;
                        const pts = points.map((p, i) => `${(i / (points.length - 1)) * 190 + 5},${45 - ((p.value - minV) / range) * 40}`);
                        return <polyline points={pts.join(" ")} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" />;
                      })()}
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] text-kairos-silver-dark mt-1">
                    <span>{points[0]?.value.toFixed(1)} {metric.unit}</span>
                    <span>{points[points.length - 1]?.value.toFixed(1)} {metric.unit}</span>
                  </div>
                </div>
              );
            })}
            {DEXA_METRICS.filter(m => (trendData[m.key]?.length ?? 0) >= 2).length === 0 && (
              <div className="col-span-full kairos-card text-center py-10"><p className="text-sm text-kairos-silver-dark">Need at least 2 scans to show trends.</p></div>
            )}
          </div>
        </div>
      )}

      {/* Latest scan summary + comparison */}
      {hasData && latestData && !trendMetric && !showAllTrends && (() => {
        const prevDoc = docs && docs.length >= 2 ? docs[1] : null;
        const prevData = prevDoc?.parsedData as DexaData | undefined;
        const latestDate = latest?.reportDate ?? latest?.createdAt;
        const prevDate = prevDoc?.reportDate ?? prevDoc?.createdAt;
        return (
          <>
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="font-heading font-bold text-sm text-kairos-silver-dark uppercase tracking-wider">
                  Body Composition — {latestDate ? new Date(latestDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Latest"}
                </h2>
                {prevData && <p className="text-[10px] text-kairos-silver-dark mt-0.5">vs {prevDate ? new Date(prevDate).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Previous"}</p>}
              </div>
              {docs && docs.length >= 2 && (
                <button onClick={() => setShowAllTrends(true)} className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-2 text-kairos-gold border-kairos-gold/30 hover:bg-kairos-gold/10">
                  <BarChart3 size={14} /> All Trends
                </button>
              )}
            </div>

            {/* Comparison Table */}
            <div className="kairos-card overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-kairos-border">
                    <th className="text-left py-2.5 px-3 text-[10px] text-kairos-silver-dark uppercase font-heading tracking-wider">Metric</th>
                    <th className="text-right py-2.5 px-3 text-[10px] text-kairos-silver-dark uppercase font-heading tracking-wider">Current</th>
                    {prevData && <th className="text-right py-2.5 px-3 text-[10px] text-kairos-silver-dark uppercase font-heading tracking-wider">Previous</th>}
                    {prevData && <th className="text-right py-2.5 px-3 text-[10px] text-kairos-silver-dark uppercase font-heading tracking-wider">Change</th>}
                    <th className="w-8"></th>
                  </tr>
                </thead>
                <tbody>
                  {DEXA_METRICS.map((metric) => {
                    const curVal = dv(latestData, metric.key);
                    const prevVal = prevData ? dv(prevData, metric.key) : null;
                    if (curVal == null) return null;
                    return (
                      <tr key={metric.key}
                        className="border-b border-kairos-border/50 hover:bg-kairos-card-hover/30 cursor-pointer transition-all"
                        onClick={() => { setTrendMetric(metric.key); setAiTrendAnalysis(null); }}>
                        <td className="py-2.5 px-3">
                          <span className="font-heading font-semibold text-white">{metric.label}</span>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          <span className={cn("font-heading font-bold", metric.color)}>{curVal.toFixed(metric.decimals)}</span>
                          {metric.unit && <span className="text-kairos-silver-dark text-xs ml-1">{metric.unit}</span>}
                        </td>
                        {prevData && (
                          <td className="py-2.5 px-3 text-right text-kairos-silver-dark">
                            {prevVal != null ? `${prevVal.toFixed(metric.decimals)}` : "—"}
                          </td>
                        )}
                        {prevData && (
                          <td className="py-2.5 px-3 text-right">
                            <ChangeIndicator current={curVal} previous={prevVal} inverse={metric.inverse} />
                          </td>
                        )}
                        <td className="py-2.5 px-1 text-right">
                          <BarChart3 size={14} className="text-kairos-silver-dark" />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Regional Body Composition */}
            {latestData.regions && Object.keys(latestData.regions).length > 0 && (
              <div className="kairos-card">
                <h3 className="font-heading font-bold text-sm text-kairos-gold uppercase tracking-wider mb-3">Regional Composition</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {["arms", "legs", "trunk"].map((region) => {
                    const r = latestData.regions?.[region];
                    const prevR = prevData?.regions?.[region];
                    if (!r) return null;
                    return (
                      <div key={region} className="bg-kairos-royal-surface rounded-xl p-4 border border-kairos-border">
                        <p className="text-xs font-heading text-kairos-silver-dark uppercase tracking-wider mb-2 capitalize">{region}</p>
                        <div className="space-y-1.5">
                          {r.fatPct != null && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-kairos-silver-dark">Fat %</span>
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-yellow-400">{r.fatPct.toFixed(1)}%</span>
                                {prevR?.fatPct != null && <ChangeIndicator current={r.fatPct} previous={prevR.fatPct} inverse />}
                              </div>
                            </div>
                          )}
                          {(r.leanLbs ?? r.leanMassLbs) != null && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-kairos-silver-dark">Lean</span>
                              <span className="text-sm font-bold text-green-400">{((r.leanLbs ?? r.leanMassLbs) as number).toFixed(1)} lbs</span>
                            </div>
                          )}
                          {r.fatLbs != null && (
                            <div className="flex justify-between items-center">
                              <span className="text-xs text-kairos-silver-dark">Fat</span>
                              <span className="text-sm font-bold text-kairos-silver">{r.fatLbs.toFixed(1)} lbs</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Scan History */}
      {hasData && !trendMetric && !showAllTrends && (
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
