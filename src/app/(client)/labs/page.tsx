"use client";

import { useState, useMemo } from "react";
import {
  TestTube2,
  AlertTriangle,
  FileText,
  Plus,
  X,
  Upload,
  Link,
  Loader2,
  Sparkles,
  Hourglass,
  MessageSquareText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { BiomarkerGroups } from "@/components/labs/BiomarkerGroups";
import type { MarkerTrend } from "@/lib/labs/trends";

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
  const [formError, setFormError] = useState<string | null>(null);
  const [aiParsing, setAiParsing] = useState(false);
  const [aiParseResult, setAiParseResult] = useState<Record<string, unknown> | null>(null);
  const [aiParseError, setAiParseError] = useState<string | null>(null);
  const [aiTrend, setAiTrend] = useState<{ code: string; text: string | null; loading: boolean } | null>(null);
  const [savedNotice, setSavedNotice] = useState<string | null>(null);

  // tRPC queries — one overview (released values only, pending panels without values) + orders.
  const overviewQuery = trpc.clientPortal.labs.overview.useQuery(undefined, { staleTime: 30_000 });
  const ordersQuery = trpc.clientPortal.labs.listOrders.useQuery({ limit: 20 }, { staleTime: 30_000 });
  const overview = overviewQuery.data;
  const labsError = overviewQuery.isError || ordersQuery.isError;
  const labsRefetch = () => { overviewQuery.refetch(); ordersQuery.refetch(); };
  // Orders with no result yet (e.g. ordered, awaiting the draw). Panels with a result show in the panel list.
  const panelOrderIds = new Set((overview?.panels ?? []).map((p) => p.orderId).filter(Boolean));
  const openOrders = (ordersQuery.data ?? []).filter((o) => !panelOrderIds.has(o.id) && !o.pdfUrl);

  // tRPC mutations
  const utils = trpc.useUtils();
  const uploadPdfMutation = trpc.clientPortal.labs.uploadPdf.useMutation({
    onSuccess: () => { utils.clientPortal.labs.invalidate(); resetForm(); },
  });
  const importUrlMutation = trpc.clientPortal.labs.importUrl.useMutation({
    onSuccess: () => { utils.clientPortal.labs.invalidate(); resetForm(); },
  });
  const addManualResultsMutation = trpc.clientPortal.labs.addManualResults.useMutation({
    onSuccess: (res) => {
      utils.clientPortal.labs.invalidate();
      resetForm();
      setSavedNotice(res.pendingReview
        ? "Sent to your care team. You'll see these results here once they've reviewed them."
        : "Results saved.");
    },
  });

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
    setFormError(null);
    try {
      if (activeTab === "pdf") {
        if (!pdfFile) { setFormError("Please select a PDF file to upload"); return; }
        // Use AI parsing for PDFs
        await handleAiParsePdf();
        return; // Don't close form — switch to manual review
      } else if (activeTab === "url") {
        if (!urlInput.trim()) { setFormError("Please enter a valid URL"); return; }
        try { new URL(urlInput); } catch { setFormError("Please enter a valid URL (e.g. https://...)"); return; }
        await importUrlMutation.mutateAsync({ panelName: "Lab Results", provider: "unknown", sourceUrl: urlInput });
      } else if (activeTab === "manual") {
        if (!manualForm.labName || !manualForm.date || manualForm.tests.length === 0) {
          setFormError("Please fill in all required fields"); return;
        }
        const biomarkers = manualForm.tests.map((test) => {
          const valueMatch = test.resultValue.match(/^([\d.]+)/);
          const numericValue = valueMatch ? parseFloat(valueMatch[1]) : 0;
          // Parse a reference range like "70-100", "70 – 100", "<200", ">40".
          let refLow: number | undefined;
          let refHigh: number | undefined;
          const range = (test.referenceRange ?? "").trim();
          const between = range.match(/([\d.]+)\s*[-–—to]+\s*([\d.]+)/i);
          if (between) {
            refLow = parseFloat(between[1]);
            refHigh = parseFloat(between[2]);
          } else {
            const lt = range.match(/[<≤]\s*([\d.]+)/);
            const gt = range.match(/[>≥]\s*([\d.]+)/);
            if (lt) refHigh = parseFloat(lt[1]);
            if (gt) refLow = parseFloat(gt[1]);
          }
          const status = (["normal", "low", "high", "critical"] as const).includes(
            test.resultStatus as "normal" | "low" | "high" | "critical",
          )
            ? (test.resultStatus as "normal" | "low" | "high" | "critical")
            : undefined;
          return {
            code: test.testName.toUpperCase().replace(/\s+/g, "_"),
            name: test.testName,
            value: numericValue,
            unit: test.resultValue.replace(/^[\d.]+\s*/, ""),
            refLow,
            refHigh,
            status,
          };
        });
        await addManualResultsMutation.mutateAsync({
          panelName: manualForm.labName,
          provider: manualForm.requestingDoctor || undefined,
          receivedDate: manualForm.date,
          // Values read from a file by AI wait for coach review; typed values show at once.
          parsed: !!aiParseResult,
          biomarkers,
        });
      }
    } catch (error) {
      setFormError("Failed to save lab results. Please try again.");
    }
  };

  const resetForm = () => {
    setShowAddResults(false);
    setFormError(null);
    setManualForm({ labName: "", requestingDoctor: "", date: new Date().toISOString().split("T")[0], tests: [], notes: "" });
    setCurrentTest({ testName: "", resultValue: "", resultStatus: "normal", referenceRange: "" });
    setUrlInput("");
    setPdfFile(null);
    setAiParsing(false);
    setAiParseResult(null);
    setAiParseError(null);
  };

  // Plain-words explanation of one marker's trend (released values only).
  async function explainTrend(m: MarkerTrend) {
    setAiTrend({ code: m.code, text: null, loading: true });
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: [{
            role: "user",
            content: `Analyze the trend for this biomarker: ${m.name}.\n\nData points (oldest to newest):\n${m.points.map((p) => `${new Date(p.date).toLocaleDateString()}: ${p.value}${p.unit ? ` ${p.unit}` : ""}${p.refLow != null || p.refHigh != null ? ` (ref: ${p.refLow ?? ""}-${p.refHigh ?? ""})` : ""}`).join("\n")}\n\nProvide a concise 2-3 sentence analysis of the trend direction, whether it's concerning or positive, and any actionable insight. Be specific about the numbers.`,
          }],
        }),
      });
      const data = await res.json();
      setAiTrend({ code: m.code, text: data.reply || data.content || "Unable to generate analysis.", loading: false });
    } catch {
      setAiTrend({ code: m.code, text: "Could not generate AI analysis at this time.", loading: false });
    }
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
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Lab Results</h1>
          <p className="text-kairos-silver-dark font-body">Your biomarkers, where each sits in its reference range, and how it&apos;s changing.</p>
        </div>
        <button onClick={() => { setShowAddResults(true); setSavedNotice(null); }}
          className="kairos-btn-outline px-4 py-2 rounded-kairos-sm font-body text-sm font-medium flex items-center gap-2">
          <Plus className="w-4 h-4" aria-hidden /> Add lab results
        </button>
      </div>

      {savedNotice && (
        <div className="p-3 rounded-kairos-sm border border-kairos-border bg-white/[0.03] text-sm text-white flex items-start justify-between gap-3" role="status">
          <span>{savedNotice}</span>
          <button onClick={() => setSavedNotice(null)} aria-label="Dismiss" className="text-kairos-silver-dark hover:text-white"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Under review */}
      {(overview?.pendingCount ?? 0) > 0 && (
        <div className="kairos-card flex items-start gap-3" role="status">
          <Hourglass className="w-5 h-5 text-kairos-silver mt-0.5 shrink-0" aria-hidden />
          <div>
            <p className="text-white font-medium">Your care team is reviewing these</p>
            <p className="text-sm text-kairos-silver-dark">
              {overview!.pendingCount === 1 ? "1 lab panel is" : `${overview!.pendingCount} lab panels are`} with your coach. Results appear here with their note once released.
            </p>
          </div>
        </div>
      )}

      {/* Summary */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Markers tracked", value: overview?.counts.total, hint: "Latest value of each" },
          { label: "In range", value: overview?.counts.inRange, hint: "Within the reference range" },
          { label: "Outside range", value: overview?.counts.outOfRange, hint: "Above or below range" },
          { label: "No range given", value: overview?.counts.noRange, hint: "Shown without a status" },
        ].map((t) => (
          <div key={t.label} className="kairos-card p-5 rounded-kairos-sm">
            <p className="text-kairos-silver-dark text-sm font-body mb-1">{t.label}</p>
            <p className="text-2xl font-bold text-white font-heading">{overviewQuery.isLoading || t.value == null ? "—" : t.value}</p>
            <p className="text-xs text-kairos-silver-dark mt-1">{t.hint}</p>
          </div>
        ))}
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
          {formError && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-3 text-red-400 text-sm">
              {formError}
            </div>
          )}
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

      {/* Biomarkers by category: range bar + trend across panels */}
      <section className="space-y-4" aria-labelledby="labs-markers-title">
        <div className="flex items-center gap-2">
          <TestTube2 className="w-5 h-5 text-kairos-silver" aria-hidden />
          <h2 id="labs-markers-title" className="font-heading font-bold text-xl text-white">Your biomarkers</h2>
        </div>
        {overviewQuery.isLoading ? (
          <div className="kairos-card flex items-center justify-center py-12"><Loader2 className="w-6 h-6 animate-spin text-kairos-silver-dark" aria-label="Loading" /></div>
        ) : (overview?.groups.length ?? 0) === 0 ? (
          <div className="kairos-card text-center py-10">
            <TestTube2 size={32} className="text-kairos-silver-dark mx-auto mb-3" aria-hidden />
            <p className="text-sm font-body text-kairos-silver-dark">
              {(overview?.pendingCount ?? 0) > 0
                ? "Your care team is reviewing your results. They'll appear here once released."
                : "No lab results yet. Add a lab report to see your biomarkers here."}
            </p>
          </div>
        ) : (
          <BiomarkerGroups
            groups={overview!.groups}
            detailExtra={(m) => m.points.length >= 2 ? (
              <div className="space-y-2">
                <button type="button" onClick={() => explainTrend(m)} disabled={aiTrend?.code === m.code && aiTrend.loading}
                  className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                  {aiTrend?.code === m.code && aiTrend.loading ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Sparkles size={12} aria-hidden />}
                  Explain this trend
                </button>
                {aiTrend?.code === m.code && aiTrend.text && (
                  <p className="text-sm text-white leading-relaxed p-3 rounded-kairos-sm border border-kairos-border bg-white/[0.03]">{aiTrend.text}</p>
                )}
              </div>
            ) : null}
          />
        )}
      </section>

      {/* Panels: one per report, with the coach's note once released */}
      <section className="space-y-3" aria-labelledby="labs-panels-title">
        <div className="flex items-center gap-2">
          <FileText className="w-5 h-5 text-kairos-silver" aria-hidden />
          <h2 id="labs-panels-title" className="font-heading font-bold text-xl text-white">Lab panels</h2>
        </div>
        {(overview?.panels ?? []).map((p) => (
          <div key={p.resultId} className="kairos-card p-5 rounded-kairos-sm space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-heading font-semibold text-white">{p.panelName}</p>
                <p className="text-xs text-kairos-silver-dark">
                  {new Date(p.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                  {p.provider && p.provider !== "unknown" ? ` · ${p.provider}` : ""}
                  {p.reviewState !== "pending_review" ? ` · ${p.markerCount} marker${p.markerCount === 1 ? "" : "s"}` : ""}
                </p>
              </div>
              <div className="flex items-center gap-3">
                {p.reviewState === "pending_review" ? (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs border border-kairos-border text-kairos-silver">
                    <Hourglass className="w-3 h-3" aria-hidden /> Your care team is reviewing these
                  </span>
                ) : p.reviewState === "released" ? (
                  <span className="text-xs text-kairos-silver-dark">Reviewed by your care team</span>
                ) : (
                  <span className="text-xs text-kairos-silver-dark">Entered by you</span>
                )}
                {p.fileUrl && (
                  <a href={p.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
                    <FileText className="w-3 h-3" aria-hidden /> View original
                  </a>
                )}
              </div>
            </div>
            {p.coachNote && (
              <div className="flex items-start gap-2 p-3 rounded-kairos-sm border border-kairos-border bg-white/[0.03]">
                <MessageSquareText className="w-4 h-4 text-kairos-silver mt-0.5 shrink-0" aria-hidden />
                <div>
                  <p className="text-xs text-kairos-silver-dark mb-0.5">Note from your care team</p>
                  <p className="text-sm text-white whitespace-pre-line">{p.coachNote}</p>
                </div>
              </div>
            )}
          </div>
        ))}
        {openOrders.map((o) => (
          <div key={o.id} className="kairos-card p-5 rounded-kairos-sm flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-heading font-semibold text-white">{o.panelName ?? "Lab panel"}</p>
              <p className="text-xs text-kairos-silver-dark">Ordered {o.orderedAt ? new Date(o.orderedAt).toLocaleDateString() : ""}</p>
            </div>
            <span className="text-xs text-kairos-silver">
              {o.status === "processing" ? "Your care team is reviewing these" : o.status === "ordered" || o.status === "pending" ? "Ordered — waiting for results" : "Waiting for results"}
            </span>
          </div>
        ))}
        {!overviewQuery.isLoading && (overview?.panels.length ?? 0) === 0 && openOrders.length === 0 && (
          <div className="kairos-card text-center py-6">
            <p className="text-sm font-body text-kairos-silver-dark">No lab panels yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
