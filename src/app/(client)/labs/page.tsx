"use client";

import { useState, useMemo } from "react";
import {
  TestTube2,
  TrendingUp,
  TrendingDown,
  Minus,
  CheckCircle,
  AlertTriangle,
  Calendar,
  FileText,
  Plus,
  X,
  Upload,
  Link,
  BarChart3,
  Loader2,
  Sparkles,
  ArrowLeft,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

const LAB_CATEGORIES = [
  { id: "all", label: "All Markers" },
  { id: "metabolic", label: "Metabolic" },
  { id: "cardiovascular", label: "Cardiovascular" },
  { id: "hormonal", label: "Hormonal" },
  { id: "inflammatory", label: "Inflammatory" },
  { id: "nutritional", label: "Nutritional" },
];

interface TestEntry {
  id: string;
  testName: string;
  resultValue: string;
  resultStatus: "optimal" | "normal" | "borderline" | "out-of-range";
  referenceRange: string;
}

interface ManualEntryForm {
  labName: string;
  requestingDoctor: string;
  date: string;
  tests: TestEntry[];
  notes: string;
}

export default function LabsPage() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [showAddResults, setShowAddResults] = useState(false);
  const [activeTab, setActiveTab] = useState<"pdf" | "url" | "manual">("pdf");
  const [urlInput, setUrlInput] = useState("");
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [manualForm, setManualForm] = useState<ManualEntryForm>({
    labName: "",
    requestingDoctor: "",
    date: new Date().toISOString().split("T")[0],
    tests: [],
    notes: "",
  });
  const [currentTest, setCurrentTest] = useState<Partial<TestEntry>>({
    testName: "",
    resultValue: "",
    resultStatus: "normal",
    referenceRange: "",
  });
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParseResult, setAiParseResult] = useState<Record<string, unknown> | null>(null);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [trendMarker, setTrendMarker] = useState<string | null>(null); // code of marker to trend
  const [showAllTrends, setShowAllTrends] = useState(false);
  const [aiTrendAnalysis, setAiTrendAnalysis] = useState<string | null>(null);
  const [aiTrendLoading, setAiTrendLoading] = useState(false);

  // tRPC queries
  const ordersQuery = trpc.clientPortal.labs.listOrders.useQuery({ limit: 10 }, { staleTime: 30_000 });
  const biomarkersQuery = trpc.clientPortal.labs.listBiomarkers.useQuery(undefined, { staleTime: 30_000 });
  const summaryQuery = trpc.clientPortal.labs.summary.useQuery(undefined, { staleTime: 30_000 });
  const { data: ordersData = [] } = ordersQuery;
  const { data: biomarkersData = [] } = biomarkersQuery;
  const { data: summaryData } = summaryQuery;
  const labsError = ordersQuery.isError || biomarkersQuery.isError || summaryQuery.isError;
  const labsRefetch = () => { ordersQuery.refetch(); biomarkersQuery.refetch(); summaryQuery.refetch(); };

  // Trend data queries
  const singleTrendQuery = trpc.clientPortal.labs.getBiomarkerHistory.useQuery(
    { code: trendMarker! },
    { enabled: !!trendMarker, staleTime: 60_000 }
  );
  const allTrendsQuery = trpc.clientPortal.labs.getAllBiomarkerHistory.useQuery(
    undefined,
    { enabled: showAllTrends, staleTime: 60_000 }
  );

  // tRPC mutations
  const utils = trpc.useUtils();
  const uploadPdfMutation = trpc.clientPortal.labs.uploadPdf.useMutation({
    onSuccess: () => { utils.clientPortal.labs.invalidate(); resetForm(); },
  });
  const importUrlMutation = trpc.clientPortal.labs.importUrl.useMutation({
    onSuccess: () => { utils.clientPortal.labs.invalidate(); resetForm(); },
  });
  const addManualResultsMutation = trpc.clientPortal.labs.addManualResults.useMutation({
    onSuccess: () => { utils.clientPortal.labs.invalidate(); resetForm(); },
  });

  // Filter biomarkers by category
  const filteredMarkers = activeCategory === "all"
    ? biomarkersData
    : biomarkersData.filter((m) => m.category === activeCategory);

  // Compute stats from real biomarker data
  const totalMarkers = biomarkersData.length;
  const inRange = biomarkersData.filter((m) => m.status === "normal" || m.status === "optimal").length;
  const outOfRange = biomarkersData.filter((m) => m.status === "high" || m.status === "low").length;

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "optimal": return "bg-green-900/20 text-green-400 border-green-700/50";
      case "normal": return "bg-blue-900/20 text-blue-400 border-blue-700/50";
      case "high": case "borderline": return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      case "low": case "out-of-range": return "bg-red-900/20 text-red-400 border-red-700/50";
      default: return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
    }
  };

  const handleAddTest = () => {
    if (currentTest.testName && currentTest.resultValue && currentTest.referenceRange) {
      const newTest: TestEntry = {
        id: Date.now().toString(),
        testName: currentTest.testName || "",
        resultValue: currentTest.resultValue || "",
        resultStatus: currentTest.resultStatus || "normal",
        referenceRange: currentTest.referenceRange || "",
      };
      setManualForm({ ...manualForm, tests: [...manualForm.tests, newTest] });
      setCurrentTest({ testName: "", resultValue: "", resultStatus: "normal", referenceRange: "" });
    }
  };

  const handleRemoveTest = (testId: string) => {
    setManualForm({ ...manualForm, tests: manualForm.tests.filter((t) => t.id !== testId) });
  };

  const handleAiParsePdf = async () => {
    if (!pdfFile) return;
    setAiParsing(true);
    setAiParseError(null);
    setAiParseResult(null);
    try {
      const buffer = await pdfFile.arrayBuffer();
      const base64 = btoa(
        new Uint8Array(buffer).reduce((data, byte) => data + String.fromCharCode(byte), "")
      );
      const res = await fetch("/api/clinical/parse", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fileBase64: base64,
          fileName: pdfFile.name,
          docType: "lab_result",
          mimeType: pdfFile.type || "application/pdf",
        }),
      });
      const result = await res.json();
      if (result.success && result.data?.parsedData) {
        setAiParseResult(result.data);
        // Auto-populate manual form with parsed data
        const parsed = result.data.parsedData as {
          panels?: Array<{
            name: string;
            markers?: Array<{
              name: string;
              valueText?: string;
              value?: number;
              unit?: string;
              referenceRange?: string;
              status?: string;
            }>;
          }>;
        };
        if (parsed.panels && parsed.panels.length > 0) {
          const tests: TestEntry[] = [];
          for (const panel of parsed.panels) {
            if (panel.markers) {
              for (const marker of panel.markers) {
                tests.push({
                  id: Date.now().toString() + Math.random(),
                  testName: marker.name,
                  resultValue: marker.valueText ?? String(marker.value ?? "") + (marker.unit ? ` ${marker.unit}` : ""),
                  resultStatus: (marker.status === "optimal" || marker.status === "normal")
                    ? "normal"
                    : (marker.status === "borderline" ? "borderline" : "out-of-range"),
                  referenceRange: marker.referenceRange ?? "",
                });
              }
            }
          }
          setManualForm({
            labName: result.data.providerName ?? result.data.title ?? "Lab Results",
            requestingDoctor: "",
            date: result.data.reportDate
              ? new Date(result.data.reportDate).toISOString().split("T")[0]
              : new Date().toISOString().split("T")[0],
            tests,
            notes: "",
          });
          // Switch to manual tab to review parsed results
          setActiveTab("manual");
        }
      } else {
        setAiParseError(result.error ?? "Failed to parse lab results");
      }
    } catch (err) {
      setAiParseError("Failed to send file for AI parsing");
    } finally {
      setAiParsing(false);
    }
  };

  const handleSaveResults = async () => {
    try {
      if (activeTab === "pdf") {
        if (!pdfFile) { alert("Please select a PDF file to upload"); return; }
        // Use AI parsing for PDFs
        await handleAiParsePdf();
        return; // Don't close form — switch to manual review
      } else if (activeTab === "url") {
        if (!urlInput.trim()) { alert("Please enter a valid URL"); return; }
        try { new URL(urlInput); } catch { alert("Please enter a valid URL (e.g. https://...)"); return; }
        await importUrlMutation.mutateAsync({ panelName: "Lab Results", provider: "unknown", sourceUrl: urlInput });
      } else if (activeTab === "manual") {
        if (!manualForm.labName || !manualForm.date || manualForm.tests.length === 0) {
          alert("Please fill in all required fields"); return;
        }
        const biomarkers = manualForm.tests.map((test) => {
          const valueMatch = test.resultValue.match(/^([\d.]+)/);
          const numericValue = valueMatch ? parseFloat(valueMatch[1]) : 0;
          return {
            code: test.testName.toUpperCase().replace(/\s+/g, "_"),
            name: test.testName,
            value: numericValue,
            unit: test.resultValue.replace(/^[\d.]+\s*/, ""),
          };
        });
        await addManualResultsMutation.mutateAsync({
          panelName: manualForm.labName,
          provider: manualForm.requestingDoctor || undefined,
          receivedDate: manualForm.date,
          biomarkers,
        });
      }
    } catch (error) {
      // Error is shown to user via alert
      alert("Failed to save lab results. Please try again.");
    }
  };

  const resetForm = () => {
    setShowAddResults(false);
    setManualForm({ labName: "", requestingDoctor: "", date: new Date().toISOString().split("T")[0], tests: [], notes: "" });
    setCurrentTest({ testName: "", resultValue: "", resultStatus: "normal", referenceRange: "" });
    setUrlInput("");
    setPdfFile(null);
    setAiParsing(false);
    setAiParseResult(null);
    setAiParseError(null);
  };

  const getOrderStatusColor = (status: string): string => {
    switch (status) {
      case "results_received": return "bg-green-900/20 text-green-400 border-green-700/50";
      case "pending": case "ordered": return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      default: return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
    }
  };

  // AI trend analysis
  async function fetchAiTrendAnalysis(markerName: string, points: Array<{ value: number; date: string; refLow?: number | null; refHigh?: number | null }>) {
    setAiTrendLoading(true);
    setAiTrendAnalysis(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze the trend for this biomarker: ${markerName}.\n\nData points (oldest to newest):\n${points.map(p => `${new Date(p.date).toLocaleDateString()}: ${p.value}${p.refLow != null ? ` (ref: ${p.refLow}-${p.refHigh})` : ""}`).join("\n")}\n\nProvide a concise 2-3 sentence analysis of the trend direction, whether it's concerning or positive, and any actionable insight. Be specific about the numbers.`,
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

  function openTrend(code: string) {
    setTrendMarker(code);
    setShowAllTrends(false);
    setAiTrendAnalysis(null);
  }

  if (labsError) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-sm space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/15 flex items-center justify-center mx-auto">
            <AlertTriangle size={24} className="text-red-400" />
          </div>
          <h3 className="font-heading font-semibold text-white">Unable to load lab results</h3>
          <p className="text-sm font-body text-kairos-silver-dark">
            We couldn&apos;t fetch your lab data. Please try again.
          </p>
          <button onClick={labsRefetch} className="kairos-btn-gold text-sm px-6 py-2">
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Lab Results</h1>
          <p className="text-kairos-silver-dark font-body">Track your biomarkers and health metrics over time</p>
        </div>
        <div className="flex items-center gap-3">
          <button onClick={() => setShowAddResults(true)}
            className="kairos-btn-gold text-black px-4 py-2 rounded-kairos-sm font-body text-sm font-medium flex items-center gap-2 hover:bg-kairos-gold/90 transition-all">
            <Plus className="w-4 h-4" /> Add Lab Results
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Total Markers</p>
          <p className="text-2xl font-bold text-white font-heading">{totalMarkers}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Tracked</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">In Range</p>
          <p className="text-2xl font-bold text-green-400 font-heading">{inRange}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">{totalMarkers > 0 ? Math.round((inRange / totalMarkers) * 100) : 0}%</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Out of Range</p>
          <p className="text-2xl font-bold text-red-400 font-heading">{outOfRange}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Needs attention</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Lab Orders</p>
          <p className="text-2xl font-bold text-blue-400 font-heading">{summaryData?.totalOrders ?? 0}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Total</p>
        </div>
      </div>

      {/* Add Lab Results Modal */}
      {showAddResults && (
        <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-xl text-white">Add Lab Results</h3>
            <button onClick={resetForm} className="text-kairos-silver-dark hover:text-white transition-all"><X className="w-5 h-5" /></button>
          </div>
          <div className="flex gap-2 border-b border-kairos-border">
            {([
              { key: "pdf" as const, icon: Upload, label: "Upload PDF" },
              { key: "url" as const, icon: Link, label: "Enter URL" },
              { key: "manual" as const, icon: FileText, label: "Manual Entry" },
            ]).map(({ key, icon: Icon, label }) => (
              <button key={key} onClick={() => setActiveTab(key)}
                className={`px-4 py-2 font-body text-sm font-medium transition-all ${activeTab === key ? "text-kairos-gold border-b-2 border-kairos-gold" : "text-kairos-silver-dark hover:text-white"}`}>
                <Icon className="w-4 h-4 inline mr-2" />{label}
              </button>
            ))}
          </div>
          <div className="mt-6">
            {activeTab === "pdf" && (
              <div className="space-y-4">
                <input type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={(e) => { setPdfFile(e.target.files?.[0] || null); setAiParseError(null); setAiParseResult(null); }} className="hidden" id="pdf-input" />
                <label htmlFor="pdf-input" className="border-2 border-dashed border-kairos-border rounded-kairos-sm p-12 text-center hover:border-kairos-gold/50 transition-all cursor-pointer block">
                  <Upload className="w-12 h-12 text-kairos-silver-dark mx-auto mb-4" />
                  <p className="text-white font-body mb-2">{pdfFile ? pdfFile.name : "Drop your lab results PDF or image here"}</p>
                  <p className="text-kairos-silver-dark text-sm font-body">AI will automatically extract all biomarkers</p>
                </label>
                {aiParseError && (
                  <div className="p-3 bg-red-900/20 border border-red-700/50 rounded-kairos-sm text-red-400 text-sm">
                    {aiParseError}
                  </div>
                )}
                {aiParseResult && (
                  <div className="p-3 bg-green-900/20 border border-green-700/50 rounded-kairos-sm text-green-400 text-sm">
                    AI parsed {(aiParseResult as { parsedData?: { panels?: Array<{ markers?: unknown[] }> } }).parsedData?.panels?.reduce(
                      (sum: number, p: { markers?: unknown[] }) => sum + (p.markers?.length ?? 0), 0
                    ) ?? 0} biomarkers. Review below and save.
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button onClick={resetForm} className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-body text-sm">Cancel</button>
                  <button onClick={handleSaveResults} disabled={!pdfFile || aiParsing}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2">
                    {aiParsing ? (
                      <><span className="animate-spin inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full" /> Parsing with AI...</>
                    ) : "Parse with AI"}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "url" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-body text-sm font-medium mb-2">Lab Results URL</label>
                  <input type="url" value={urlInput} onChange={(e) => setUrlInput(e.target.value)} placeholder="https://example.com/lab-results"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                </div>
                <div className="flex gap-3 justify-end">
                  <button onClick={resetForm} className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-body text-sm">Cancel</button>
                  <button onClick={handleSaveResults} disabled={!urlInput || importUrlMutation.isPending}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {importUrlMutation.isPending ? "Importing..." : "Import"}
                  </button>
                </div>
              </div>
            )}
            {activeTab === "manual" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-body text-sm font-medium mb-2">Lab Name</label>
                    <input type="text" maxLength={150} value={manualForm.labName} onChange={(e) => setManualForm({ ...manualForm, labName: e.target.value })} placeholder="e.g., Quest Diagnostics"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-white font-body text-sm font-medium mb-2">Requesting Doctor</label>
                    <input type="text" maxLength={150} value={manualForm.requestingDoctor} onChange={(e) => setManualForm({ ...manualForm, requestingDoctor: e.target.value })} placeholder="Doctor's name"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-white font-body text-sm font-medium mb-2">Test Date</label>
                  <input type="date" max={new Date().toISOString().split("T")[0]} value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                </div>
                <div className="bg-kairos-royal-surface/50 p-4 rounded-kairos-sm border border-kairos-border">
                  <h4 className="text-white font-heading font-bold text-sm mb-4">Add Test Result</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Test Name</label>
                      <input type="text" maxLength={100} value={currentTest.testName || ""} onChange={(e) => setCurrentTest({ ...currentTest, testName: e.target.value })} placeholder="e.g., Glucose"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Result Value</label>
                      <input type="text" maxLength={50} value={currentTest.resultValue || ""} onChange={(e) => setCurrentTest({ ...currentTest, resultValue: e.target.value })} placeholder="e.g., 95 mg/dL"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                    </div>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Status</label>
                      <select value={currentTest.resultStatus || "normal"} onChange={(e) => setCurrentTest({ ...currentTest, resultStatus: e.target.value as TestEntry["resultStatus"] })}
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none">
                        <option value="optimal">Optimal</option>
                        <option value="normal">Normal</option>
                        <option value="borderline">Borderline</option>
                        <option value="out-of-range">Out of Range</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Reference Range</label>
                      <input type="text" value={currentTest.referenceRange || ""} onChange={(e) => setCurrentTest({ ...currentTest, referenceRange: e.target.value })} placeholder="e.g., 70-100 mg/dL"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                    </div>
                  </div>
                  <button onClick={handleAddTest} disabled={!currentTest.testName || !currentTest.resultValue || !currentTest.referenceRange}
                    className="w-full kairos-btn-outline px-4 py-2 rounded-kairos-sm font-body text-sm flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                    <Plus className="w-4 h-4" /> Add Another Test
                  </button>
                </div>
                {manualForm.tests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-white font-heading font-bold text-sm">Added Tests ({manualForm.tests.length})</h4>
                    {manualForm.tests.map((test) => (
                      <div key={test.id} className="bg-kairos-royal-surface/30 p-3 rounded-kairos-sm border border-kairos-border flex items-center justify-between">
                        <div>
                          <p className="text-white font-body text-sm font-medium">{test.testName}</p>
                          <p className="text-kairos-silver-dark text-xs">{test.resultValue} ({test.resultStatus}) • Ref: {test.referenceRange}</p>
                        </div>
                        <button onClick={() => handleRemoveTest(test.id)} className="text-kairos-silver-dark hover:text-red-400"><X className="w-4 h-4" /></button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-3 justify-end">
                  <button onClick={resetForm} disabled={addManualResultsMutation.isPending} className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-body text-sm disabled:opacity-50">Cancel</button>
                  <button onClick={handleSaveResults} disabled={!manualForm.labName || !manualForm.date || manualForm.tests.length === 0 || addManualResultsMutation.isPending}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {addManualResultsMutation.isPending ? "Saving..." : "Save Results"}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Single Marker Trend View */}
      {trendMarker && !showAllTrends && (() => {
        const markerInfo = biomarkersData.find((m) => m.code === trendMarker);
        const points = singleTrendQuery.data ?? [];
        return (
          <div className="kairos-card border border-kairos-gold/30">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <button onClick={() => { setTrendMarker(null); setAiTrendAnalysis(null); }} className="text-kairos-silver-dark hover:text-white"><ArrowLeft size={18} /></button>
                <div>
                  <h2 className="font-heading font-bold text-lg text-white">{markerInfo?.name ?? trendMarker} Trend</h2>
                  <p className="text-xs text-kairos-silver-dark">{points.length} data points</p>
                </div>
              </div>
              {points.length >= 2 && (
                <button
                  onClick={() => fetchAiTrendAnalysis(markerInfo?.name ?? trendMarker, points)}
                  disabled={aiTrendLoading}
                  className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-1.5"
                >
                  {aiTrendLoading ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                  AI Analysis
                </button>
              )}
            </div>
            {singleTrendQuery.isLoading ? (
              <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-kairos-gold" /></div>
            ) : points.length < 2 ? (
              <p className="text-sm text-kairos-silver-dark text-center py-8">Need at least 2 results to show a trend. Upload more lab results.</p>
            ) : (
              <>
                <div className="h-48 relative mb-4">
                  <svg viewBox="0 0 400 120" className="w-full h-full" preserveAspectRatio="none">
                    {/* Reference range band */}
                    {points[0].refLow != null && points[0].refHigh != null && (() => {
                      const allVals = points.map(p => p.value);
                      const minV = Math.min(...allVals, points[0].refLow!);
                      const maxV = Math.max(...allVals, points[0].refHigh!);
                      const range = maxV - minV || 1;
                      const yLow = 110 - ((points[0].refLow! - minV) / range) * 100;
                      const yHigh = 110 - ((points[0].refHigh! - minV) / range) * 100;
                      return <rect x="0" y={yHigh} width="400" height={yLow - yHigh} fill="rgba(74,222,128,0.08)" />;
                    })()}
                    {/* Line */}
                    {(() => {
                      const allVals = points.map(p => p.value);
                      const minV = Math.min(...allVals) * 0.9;
                      const maxV = Math.max(...allVals) * 1.1;
                      const range = maxV - minV || 1;
                      const pts = points.map((p, i) => {
                        const x = (i / (points.length - 1)) * 380 + 10;
                        const y = 110 - ((p.value - minV) / range) * 100;
                        return `${x},${y}`;
                      });
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
        );
      })()}

      {/* All Trends View */}
      {showAllTrends && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button onClick={() => setShowAllTrends(false)} className="text-kairos-silver-dark hover:text-white"><ArrowLeft size={18} /></button>
              <h2 className="font-heading font-bold text-lg text-white">All Biomarker Trends</h2>
            </div>
          </div>
          {allTrendsQuery.isLoading ? (
            <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-kairos-gold" /></div>
          ) : (allTrendsQuery.data ?? []).length === 0 ? (
            <div className="kairos-card text-center py-10"><p className="text-sm text-kairos-silver-dark">Need at least 2 lab results to show trends.</p></div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(allTrendsQuery.data ?? []).map((marker) => (
                <div key={marker.code} className="kairos-card border border-kairos-border hover:border-kairos-gold/30 cursor-pointer transition-all"
                  onClick={() => openTrend(marker.code)}>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-heading font-bold text-sm text-white">{marker.name}</h3>
                    <span className="text-[10px] text-kairos-silver-dark">{marker.points.length} points</span>
                  </div>
                  <div className="h-16">
                    <svg viewBox="0 0 200 50" className="w-full h-full" preserveAspectRatio="none">
                      {(() => {
                        const vals = marker.points.map((p: { value: number }) => p.value);
                        const minV = Math.min(...vals) * 0.9;
                        const maxV = Math.max(...vals) * 1.1;
                        const range = maxV - minV || 1;
                        const pts = marker.points.map((p: { value: number }, i: number) => {
                          const x = (i / (marker.points.length - 1)) * 190 + 5;
                          const y = 45 - ((p.value - minV) / range) * 40;
                          return `${x},${y}`;
                        });
                        return <polyline points={pts.join(" ")} fill="none" stroke="#D4AF37" strokeWidth="2" strokeLinejoin="round" />;
                      })()}
                    </svg>
                  </div>
                  <div className="flex justify-between text-[10px] text-kairos-silver-dark mt-1">
                    <span>{marker.points[0]?.value}</span>
                    <span>{marker.points[marker.points.length - 1]?.value}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Category Filter Tabs + Trend Toggle */}
      {!trendMarker && !showAllTrends && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div className="flex gap-2 flex-wrap">
              {LAB_CATEGORIES.map((category) => (
                <button key={category.id} onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-medium transition-all ${activeCategory === category.id ? "kairos-btn-gold text-black" : "kairos-btn-outline text-kairos-silver-dark hover:text-white"}`}>
                  {category.label}
                </button>
              ))}
            </div>
            <button onClick={() => setShowAllTrends(true)}
              className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm flex items-center gap-2 text-kairos-gold border-kairos-gold/30 hover:bg-kairos-gold/10">
              <BarChart3 size={14} /> View All Trends
            </button>
          </div>

          {/* Lab Markers */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <TestTube2 className="w-5 h-5 text-kairos-gold" />
              <h2 className="font-heading font-bold text-xl text-white">
                {activeCategory === "all" ? "All Biomarkers" : LAB_CATEGORIES.find((c) => c.id === activeCategory)?.label} Markers
              </h2>
              <span className="text-kairos-silver-dark text-sm">({filteredMarkers.length})</span>
            </div>

            <div className="grid gap-3">
              {filteredMarkers.map((marker) => (
                <div key={marker.code} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-all cursor-pointer"
                  onClick={() => openTrend(marker.code)}>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                    <div>
                      <h3 className="font-heading font-bold text-white mb-1">{marker.name}</h3>
                      <p className="text-xs text-kairos-silver-dark">
                        Ref: {marker.refLow ?? "—"}–{marker.refHigh ?? "—"} {marker.unit ?? ""}
                      </p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-white">{marker.value}</span>
                        <span className="text-sm text-kairos-silver-dark">{marker.unit}</span>
                      </div>
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-body ${getStatusColor(marker.status ?? "")}`}>
                        {(marker.status === "normal" || marker.status === "optimal") && <CheckCircle className="w-3 h-3" />}
                        {(marker.status === "high" || marker.status === "low") && <AlertTriangle className="w-3 h-3" />}
                        {(marker.status ?? "unknown").charAt(0).toUpperCase() + (marker.status ?? "unknown").slice(1)}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-3">
                      <div className="text-right">
                        <p className="text-xs text-kairos-silver-dark">
                          Last: {marker.lastMeasured ? new Date(marker.lastMeasured).toLocaleDateString() : "—"}
                        </p>
                      </div>
                      <BarChart3 size={16} className="text-kairos-silver-dark" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {filteredMarkers.length === 0 && (
              <div className="kairos-card text-center py-10">
                <TestTube2 size={32} className="text-kairos-silver-dark mx-auto mb-3" />
                <p className="text-sm font-body text-kairos-silver-dark">No biomarker data available yet. Upload lab results to get started.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Recent Lab Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-bold text-xl text-white">Recent Lab Orders</h2>
        </div>
        <div className="space-y-3">
          {ordersData.map((order) => (
            <div key={order.id} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Test Date</p>
                  <p className="font-heading font-bold text-white">{order.testDate ? new Date(order.testDate).toLocaleDateString() : order.orderedAt ? new Date(order.orderedAt).toLocaleDateString() : "—"}</p>
                </div>
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Panel Type</p>
                  <p className="font-heading font-bold text-white">{order.panelName ?? "Lab Panel"}</p>
                </div>
                <div className="md:text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-kairos-sm text-xs font-body font-medium border ${getOrderStatusColor(order.status ?? "")}`}>
                    {order.status === "results_received" && <><CheckCircle className="w-3 h-3 mr-1" />Results Ready</>}
                    {order.status === "ordered" && <><Minus className="w-3 h-3 mr-1" />Ordered</>}
                    {!["results_received", "ordered"].includes(order.status ?? "") && (order.status ?? "Unknown")}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {ordersData.length === 0 && (
            <div className="kairos-card text-center py-6">
              <p className="text-sm font-body text-kairos-silver-dark">No lab orders yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
