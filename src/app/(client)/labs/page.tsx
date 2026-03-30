"use client";

import { useState } from "react";
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

  // tRPC queries
  const { data: ordersData = [] } = trpc.clientPortal.labs.listOrders.useQuery({ limit: 10 }, { staleTime: 30_000 });
  const { data: biomarkersData = [] } = trpc.clientPortal.labs.listBiomarkers.useQuery(undefined, { staleTime: 30_000 });
  const { data: summaryData } = trpc.clientPortal.labs.summary.useQuery(undefined, { staleTime: 30_000 });

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

  const handleSaveResults = async () => {
    try {
      if (activeTab === "pdf") {
        if (!pdfFile) { alert("Please select a PDF file to upload"); return; }
        const pdfUrl = URL.createObjectURL(pdfFile);
        await uploadPdfMutation.mutateAsync({ panelName: "Lab Results", provider: "unknown", pdfUrl });
      } else if (activeTab === "url") {
        if (!urlInput.trim()) { alert("Please enter a valid URL"); return; }
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
      console.error("Error saving lab results:", error);
      alert("Failed to save lab results. Please try again.");
    }
  };

  const resetForm = () => {
    setShowAddResults(false);
    setManualForm({ labName: "", requestingDoctor: "", date: new Date().toISOString().split("T")[0], tests: [], notes: "" });
    setCurrentTest({ testName: "", resultValue: "", resultStatus: "normal", referenceRange: "" });
    setUrlInput("");
    setPdfFile(null);
  };

  const getOrderStatusColor = (status: string): string => {
    switch (status) {
      case "results_received": return "bg-green-900/20 text-green-400 border-green-700/50";
      case "pending": case "ordered": return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      default: return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
    }
  };

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
                <input type="file" accept=".pdf" onChange={(e) => setPdfFile(e.target.files?.[0] || null)} className="hidden" id="pdf-input" />
                <label htmlFor="pdf-input" className="border-2 border-dashed border-kairos-border rounded-kairos-sm p-12 text-center hover:border-kairos-gold/50 transition-all cursor-pointer block">
                  <Upload className="w-12 h-12 text-kairos-silver-dark mx-auto mb-4" />
                  <p className="text-white font-body mb-2">{pdfFile ? pdfFile.name : "Drag and drop your PDF here"}</p>
                  <p className="text-kairos-silver-dark text-sm font-body">or click to select a file</p>
                </label>
                <div className="flex gap-3 justify-end">
                  <button onClick={resetForm} className="kairos-btn-outline px-6 py-2 rounded-kairos-sm font-body text-sm">Cancel</button>
                  <button onClick={handleSaveResults} disabled={!pdfFile || uploadPdfMutation.isPending}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                    {uploadPdfMutation.isPending ? "Uploading..." : "Import"}
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
                    <input type="text" value={manualForm.labName} onChange={(e) => setManualForm({ ...manualForm, labName: e.target.value })} placeholder="e.g., Quest Diagnostics"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                  </div>
                  <div>
                    <label className="block text-white font-body text-sm font-medium mb-2">Requesting Doctor</label>
                    <input type="text" value={manualForm.requestingDoctor} onChange={(e) => setManualForm({ ...manualForm, requestingDoctor: e.target.value })} placeholder="Doctor's name"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                  </div>
                </div>
                <div>
                  <label className="block text-white font-body text-sm font-medium mb-2">Test Date</label>
                  <input type="date" value={manualForm.date} onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                </div>
                <div className="bg-kairos-royal-surface/50 p-4 rounded-kairos-sm border border-kairos-border">
                  <h4 className="text-white font-heading font-bold text-sm mb-4">Add Test Result</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Test Name</label>
                      <input type="text" value={currentTest.testName || ""} onChange={(e) => setCurrentTest({ ...currentTest, testName: e.target.value })} placeholder="e.g., Glucose"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none" />
                    </div>
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Result Value</label>
                      <input type="text" value={currentTest.resultValue || ""} onChange={(e) => setCurrentTest({ ...currentTest, resultValue: e.target.value })} placeholder="e.g., 95 mg/dL"
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

      {/* Category Filter Tabs */}
      <div className="flex gap-2 flex-wrap">
        {LAB_CATEGORIES.map((category) => (
          <button key={category.id} onClick={() => setActiveCategory(category.id)}
            className={`px-4 py-2 rounded-kairos-sm font-body text-sm font-medium transition-all ${activeCategory === category.id ? "kairos-btn-gold text-black" : "kairos-btn-outline text-kairos-silver-dark hover:text-white"}`}>
            {category.label}
          </button>
        ))}
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
            <div key={marker.code} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-all">
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
                <div className="text-right">
                  <p className="text-xs text-kairos-silver-dark">
                    Last: {marker.lastMeasured ? new Date(marker.lastMeasured).toLocaleDateString() : "—"}
                  </p>
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
                  <p className="text-sm font-body text-kairos-silver-dark">Order Date</p>
                  <p className="font-heading font-bold text-white">{order.orderedAt ? new Date(order.orderedAt).toLocaleDateString() : "—"}</p>
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
