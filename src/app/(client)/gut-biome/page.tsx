"use client";

import { useState, useRef, useMemo } from "react";
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
  BarChart3,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

/* ─── Parsed Gut Biome data shape ─────────────────────────────── */
interface HealthScore {
  name: string;
  status: "maintain" | "improve" | "attention";
  category?: "overall" | "pathway";
  description?: string;
}

interface ActiveMicrobe {
  name: string;
  type: "bacterium" | "virus" | "eukaryote" | "probiotic" | "archaeon";
  source?: "gut" | "oral" | null;
}

interface GutBiomeData {
  testType?: string;
  healthScores?: HealthScore[];
  activeMicrobes?: ActiveMicrobe[];
  diversityScore?: number;
  diversityRating?: "low" | "moderate" | "high";
  totalSpecies?: number;
  keyFindings?: string[] | Array<{ organism: string; level: string; notes?: string }>;
  dietaryRecommendations?: string[];
  supplementRecommendations?: string[];
  foodsToAvoid?: string[];
  foodsToEnjoy?: string[];
  // Legacy fields
  dysbiosis?: boolean;
  inflammationMarkers?: Array<{ marker: string; value: string; status: string }>;
  digestiveMarkers?: Array<{ marker: string; value: string; status: string }>;
  recommendations?: string[];
  pathogenicOrganisms?: Array<{ organism: string; detected: boolean }>;
}

/* ─── Status badge ────────────────────────────────────────────── */
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    maintain: "bg-green-500/15 text-green-400 border-green-500/30",
    normal: "bg-green-500/15 text-green-400 border-green-500/30",
    improve: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    elevated: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
    attention: "bg-red-500/15 text-red-400 border-red-500/30",
    high: "bg-red-500/15 text-red-400 border-red-500/30",
    low: "bg-blue-500/15 text-blue-400 border-blue-500/30",
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

  const [parseError, setParseError] = useState<string | null>(null);

  async function handleFileUpload(file: File) {
    setUploading(true);
    setParseError(null);

    try {
      const base64 = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const result = reader.result as string;
          resolve(result.split(",")[1]);
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });

      const response = await fetch("/api/clinical/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: file.name,
          docType: "gut_biome",
          mimeType: file.type || "application/pdf",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        createMutation.mutate({
          docType: "gut_biome",
          title: `Gut Biome Analysis — ${file.name}`,
          sourceFileName: file.name,
        });
        setParseError("AI parsing failed — document saved for manual review.");
        return;
      }

      const parsed = result.data;
      createMutation.mutate({
        docType: "gut_biome",
        title: parsed.title || `Gut Biome Analysis — ${file.name}`,
        sourceFileName: file.name,
        providerName: parsed.providerName || undefined,
        reportDate: parsed.reportDate || undefined,
        parsedData: parsed.parsedData as Record<string, unknown>,
      });
    } catch {
      createMutation.mutate({
        docType: "gut_biome",
        title: `Gut Biome Analysis — ${file.name}`,
        sourceFileName: file.name,
      });
      setParseError("Could not parse file — saved for manual review.");
    }
  }

  function handleManualSave() {
    createMutation.mutate({
      docType: "gut_biome",
      title: form.title || `Gut Biome — ${new Date().toLocaleDateString()}`,
      providerName: form.providerName || undefined,
      reportDate: form.reportDate ? new Date(form.reportDate).toISOString() : undefined,
    });
  }

  // ── Trend state ─────────────────────────────────────────────
  const [showTrend, setShowTrend] = useState(false);
  const [aiTrendAnalysis, setAiTrendAnalysis] = useState<string | null>(null);
  const [aiTrendLoading, setAiTrendLoading] = useState(false);

  const hasData = docs && docs.length > 0;
  const latest = hasData ? docs[0] : null;

  // Normalize parsed data — handle case differences and nested structures from AI
  const latestData = useMemo((): GutBiomeData | undefined => {
    if (!latest?.parsedData) return undefined;
    const raw = latest.parsedData as Record<string, unknown>;

    // Normalize health scores — fix capitalization
    let healthScores = (raw.healthScores as HealthScore[] | undefined);
    if (healthScores) {
      healthScores = healthScores.map((s) => ({
        ...s,
        status: s.status?.toLowerCase() as HealthScore["status"],
        category: (s.category?.toLowerCase() ?? "pathway") as HealthScore["category"],
      }));
    }

    // Normalize active microbes — fix capitalization
    let activeMicrobes = (raw.activeMicrobes as ActiveMicrobe[] | undefined);
    if (activeMicrobes) {
      activeMicrobes = activeMicrobes.map((m) => ({
        ...m,
        type: m.type?.toLowerCase() as ActiveMicrobe["type"],
      }));
    }

    return {
      ...raw,
      healthScores,
      activeMicrobes,
      testType: raw.testType as string | undefined,
      diversityScore: raw.diversityScore as number | undefined,
      diversityRating: raw.diversityRating as GutBiomeData["diversityRating"],
      totalSpecies: raw.totalSpecies as number | undefined,
      keyFindings: raw.keyFindings as GutBiomeData["keyFindings"],
      dietaryRecommendations: raw.dietaryRecommendations as string[] | undefined,
      supplementRecommendations: raw.supplementRecommendations as string[] | undefined,
      foodsToAvoid: raw.foodsToAvoid as string[] | undefined,
      foodsToEnjoy: raw.foodsToEnjoy as string[] | undefined,
    };
  }, [latest]);

  // Build diversity score trend from all gut biome reports
  const diversityTrend = useMemo(() => {
    if (!docs || docs.length < 1) return [];
    return [...docs].reverse()
      .filter((d) => (d.parsedData as GutBiomeData | undefined)?.diversityScore != null)
      .map((d) => ({
        value: (d.parsedData as GutBiomeData).diversityScore!,
        date: new Date(d.reportDate ?? d.createdAt).toISOString(),
      }));
  }, [docs]);

  async function fetchGutAiTrend() {
    if (diversityTrend.length < 2) return;
    setAiTrendLoading(true);
    setAiTrendAnalysis(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze this gut microbiome diversity trend:\n\n${diversityTrend.map(p => `${new Date(p.date).toLocaleDateString()}: Diversity Score ${p.value}/100`).join("\n")}\n\nProvide a concise 2-3 sentence analysis of the trend, whether gut health is improving or declining, and one actionable dietary recommendation.`,
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

      {/* Diversity Score Trend */}
      {showTrend && (
        <div className="kairos-card border border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <button onClick={() => { setShowTrend(false); setAiTrendAnalysis(null); }} className="text-kairos-silver-dark hover:text-white"><ArrowLeft size={18} /></button>
              <div>
                <h2 className="font-heading font-bold text-lg text-white">Diversity Score Trend</h2>
                <p className="text-xs text-kairos-silver-dark">{diversityTrend.length} reports</p>
              </div>
            </div>
            {diversityTrend.length >= 2 && (
              <button onClick={fetchGutAiTrend} disabled={aiTrendLoading}
                className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-1.5">
                {aiTrendLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} AI Analysis
              </button>
            )}
          </div>
          {diversityTrend.length < 2 ? (
            <p className="text-sm text-kairos-silver-dark text-center py-8">Need at least 2 gut biome reports to show a trend.</p>
          ) : (
            <>
              <div className="h-48 relative mb-4">
                <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                  <rect x="0" y={110 - 70} width="400" height={70 - 30} fill="rgba(74,222,128,0.08)" />
                  {(() => {
                    const pts = diversityTrend.map((p, i) => `${(i / (diversityTrend.length - 1)) * 380 + 10},${110 - (p.value / 100) * 100}`);
                    return (
                      <>
                        <polyline points={pts.join(" ")} fill="none" stroke="#D4AF37" strokeWidth="2.5" strokeLinejoin="round" />
                        {diversityTrend.map((p, i) => (
                          <circle key={i} cx={(i / (diversityTrend.length - 1)) * 380 + 10} cy={110 - (p.value / 100) * 100} r="4" fill="#D4AF37" stroke="#1a1a2e" strokeWidth="2" />
                        ))}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-kairos-silver-dark px-2 mb-4">
                {diversityTrend.map((p, i) => (
                  <div key={i} className="text-center">
                    <p className="font-bold text-white text-sm">{p.value}</p>
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
      )}

      {/* Latest data summary */}
      {hasData && latestData && !showTrend && (() => {
        const overallScores = (latestData.healthScores ?? []).filter((s) => s.category === "overall");
        const pathwayScores = (latestData.healthScores ?? []).filter((s) => s.category !== "overall");
        const maintainCount = (latestData.healthScores ?? []).filter((s) => s.status === "maintain").length;
        const improveCount = (latestData.healthScores ?? []).filter((s) => s.status === "improve").length;
        const attentionCount = (latestData.healthScores ?? []).filter((s) => s.status === "attention").length;
        const hasViomeData = (latestData.healthScores?.length ?? 0) > 0;
        const microbes = latestData.activeMicrobes ?? [];
        const bacteriaCount = microbes.filter((m) => m.type === "bacterium").length;
        const virusCount = microbes.filter((m) => m.type === "virus").length;
        const eukaryoteCount = microbes.filter((m) => m.type === "eukaryote").length;
        const probioticCount = microbes.filter((m) => m.type === "probiotic").length;

        return (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {hasViomeData ? (
                <>
                  <div className="kairos-card p-5">
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Health Scores</p>
                    <p className="text-2xl font-heading font-bold text-white">{latestData.healthScores!.length}</p>
                    <p className="text-xs text-kairos-silver-dark mt-1">pathways analyzed</p>
                  </div>
                  <div className="kairos-card p-5">
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Maintain</p>
                    <p className="text-2xl font-heading font-bold text-green-400">{maintainCount}</p>
                    <p className="text-xs text-kairos-silver-dark mt-1">on track</p>
                  </div>
                  <div className="kairos-card p-5">
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Improve</p>
                    <p className="text-2xl font-heading font-bold text-yellow-400">{improveCount}</p>
                    <p className="text-xs text-kairos-silver-dark mt-1">room to optimize</p>
                  </div>
                  <div className="kairos-card p-5">
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Attention</p>
                    <p className="text-2xl font-heading font-bold text-red-400">{attentionCount}</p>
                    <p className="text-xs text-kairos-silver-dark mt-1">needs focus</p>
                  </div>
                </>
              ) : (
                <>
                  <div className="kairos-card p-5 cursor-pointer hover:border-kairos-gold/30 border border-transparent transition-all"
                    onClick={() => { setShowTrend(true); setAiTrendAnalysis(null); }}>
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Diversity Score</p>
                    <p className={cn("text-2xl font-heading font-bold",
                      latestData.diversityRating === "high" ? "text-green-400"
                        : latestData.diversityRating === "moderate" ? "text-yellow-400" : "text-red-400")}>
                      {latestData.diversityScore ?? "—"}
                    </p>
                  </div>
                  <div className="kairos-card p-5">
                    <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Active Microbes</p>
                    <p className="text-2xl font-heading font-bold text-white">{microbes.length || "—"}</p>
                  </div>
                </>
              )}
            </div>

            {/* Overall Health Scores */}
            {overallScores.length > 0 && (
              <div className="kairos-card">
                <h3 className="font-heading font-bold text-kairos-gold text-sm uppercase tracking-wider mb-4">Overall Health Scores</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {overallScores.map((score, idx) => (
                    <div key={idx} className="bg-kairos-royal-surface rounded-xl p-4 border border-kairos-border">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-heading font-semibold text-white text-sm">{score.name}</h4>
                        <StatusBadge status={score.status} />
                      </div>
                      {score.description && <p className="text-xs text-kairos-silver-dark leading-relaxed line-clamp-2">{score.description}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Pathway Scores */}
            {pathwayScores.length > 0 && (
              <div className="kairos-card">
                <h3 className="font-heading font-bold text-kairos-gold text-sm uppercase tracking-wider mb-4">Pathway Analysis ({pathwayScores.length})</h3>
                <div className="space-y-1">
                  {pathwayScores.map((score, idx) => (
                    <div key={idx} className="flex items-center justify-between py-2.5 border-b border-kairos-border/50 last:border-0">
                      <div className="flex-1 min-w-0 mr-3">
                        <p className="text-sm font-heading text-white">{score.name}</p>
                        {score.description && <p className="text-xs text-kairos-silver-dark mt-0.5 line-clamp-1">{score.description}</p>}
                      </div>
                      <StatusBadge status={score.status} />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Active Microbes */}
            {microbes.length > 0 && (
              <div className="kairos-card">
                <h3 className="font-heading font-bold text-kairos-gold text-sm uppercase tracking-wider mb-2">
                  Active Microbes ({microbes.length})
                </h3>
                <div className="flex gap-3 flex-wrap mb-4 text-xs">
                  {bacteriaCount > 0 && <span className="px-2 py-1 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20">Bacteria: {bacteriaCount}</span>}
                  {probioticCount > 0 && <span className="px-2 py-1 rounded bg-green-500/10 text-green-400 border border-green-500/20">Probiotics: {probioticCount}</span>}
                  {virusCount > 0 && <span className="px-2 py-1 rounded bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">Viruses: {virusCount}</span>}
                  {eukaryoteCount > 0 && <span className="px-2 py-1 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Eukaryotes: {eukaryoteCount}</span>}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-4 gap-y-1">
                  {microbes.map((m, idx) => (
                    <div key={idx} className="flex items-center gap-2 py-1.5 border-b border-kairos-border/30">
                      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0",
                        m.type === "probiotic" ? "bg-green-400" :
                        m.type === "virus" ? "bg-yellow-400" :
                        m.type === "eukaryote" ? "bg-purple-400" :
                        m.type === "archaeon" ? "bg-cyan-400" : "bg-blue-400"
                      )} />
                      <span className="text-xs text-kairos-silver truncate italic">{m.name}</span>
                      <span className="text-[9px] text-kairos-silver-dark ml-auto flex-shrink-0 capitalize">{m.type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Food recommendations */}
            {(latestData.foodsToEnjoy?.length ?? 0) + (latestData.foodsToAvoid?.length ?? 0) > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {latestData.foodsToEnjoy && latestData.foodsToEnjoy.length > 0 && (
                  <div className="kairos-card">
                    <h3 className="font-heading font-bold text-green-400 text-sm uppercase tracking-wider mb-3">Foods to Enjoy</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {latestData.foodsToEnjoy.map((food, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded bg-green-500/10 text-green-300 border border-green-500/20">{food}</span>
                      ))}
                    </div>
                  </div>
                )}
                {latestData.foodsToAvoid && latestData.foodsToAvoid.length > 0 && (
                  <div className="kairos-card">
                    <h3 className="font-heading font-bold text-red-400 text-sm uppercase tracking-wider mb-3">Foods to Minimize</h3>
                    <div className="flex flex-wrap gap-1.5">
                      {latestData.foodsToAvoid.map((food, idx) => (
                        <span key={idx} className="text-xs px-2 py-1 rounded bg-red-500/10 text-red-300 border border-red-500/20">{food}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Legacy: key findings for non-Viome reports */}
            {!hasViomeData && latestData.keyFindings && latestData.keyFindings.length > 0 && (
              <div className="kairos-card">
                <h3 className="font-heading font-semibold text-white mb-3">Key Findings</h3>
                <div className="space-y-2">
                  {latestData.keyFindings.map((finding, idx) => (
                    <div key={idx} className="py-2 border-b border-kairos-border/50 last:border-0">
                      <p className="text-sm text-white">{typeof finding === "string" ? finding : (finding as { organism: string }).organism}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        );
      })()}

      {/* Report History */}
      {hasData && !showTrend && (
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
