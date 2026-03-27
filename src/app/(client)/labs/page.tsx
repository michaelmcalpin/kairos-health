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
import { getClientLabs, filterLabMarkers } from "@/lib/client-ops/engine";
import { LAB_CATEGORIES } from "@/lib/client-ops/types";

const CLIENT_ID = "demo-client";

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

  const { orders, stats: statusCounts } = getClientLabs(CLIENT_ID);
  const filteredMarkers = filterLabMarkers(CLIENT_ID, activeCategory);

  const getStatusColor = (status: string): string => {
    switch (status) {
      case "optimal":
        return "bg-green-900/20 text-green-400 border-green-700/50";
      case "normal":
        return "bg-blue-900/20 text-blue-400 border-blue-700/50";
      case "borderline":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      case "out-of-range":
        return "bg-red-900/20 text-red-400 border-red-700/50";
      default:
        return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
    }
  };

  const getStatusLabel = (status: string): string => {
    return status.charAt(0).toUpperCase() + status.slice(1).replace("-", " ");
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case "up":
        return <TrendingUp className="w-4 h-4" />;
      case "down":
        return <TrendingDown className="w-4 h-4" />;
      case "flat":
        return <Minus className="w-4 h-4" />;
      default:
        return null;
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
      setManualForm({
        ...manualForm,
        tests: [...manualForm.tests, newTest],
      });
      setCurrentTest({
        testName: "",
        resultValue: "",
        resultStatus: "normal",
        referenceRange: "",
      });
    }
  };

  const handleRemoveTest = (testId: string) => {
    setManualForm({
      ...manualForm,
      tests: manualForm.tests.filter((t) => t.id !== testId),
    });
  };

  const handleSaveResults = () => {
    setShowAddResults(false);
    setManualForm({
      labName: "",
      requestingDoctor: "",
      date: new Date().toISOString().split("T")[0],
      tests: [],
      notes: "",
    });
    setCurrentTest({
      testName: "",
      resultValue: "",
      resultStatus: "normal",
      referenceRange: "",
    });
    setUrlInput("");
  };

  const handleCancel = () => {
    setShowAddResults(false);
    setManualForm({
      labName: "",
      requestingDoctor: "",
      date: new Date().toISOString().split("T")[0],
      tests: [],
      notes: "",
    });
    setCurrentTest({
      testName: "",
      resultValue: "",
      resultStatus: "normal",
      referenceRange: "",
    });
    setUrlInput("");
  };

  const getOrderStatusColor = (status: string): string => {
    switch (status) {
      case "results-ready":
        return "bg-green-900/20 text-green-400 border-green-700/50";
      case "pending":
        return "bg-yellow-900/20 text-yellow-400 border-yellow-700/50";
      case "scheduled":
        return "bg-blue-900/20 text-blue-400 border-blue-700/50";
      default:
        return "bg-kairos-card border-kairos-border text-kairos-silver-dark";
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
          <button
            onClick={() => setShowAddResults(true)}
            className="kairos-btn-gold text-black px-4 py-2 rounded-kairos-sm font-body text-sm font-medium flex items-center gap-2 hover:bg-kairos-gold/90 transition-all"
          >
            <Plus className="w-4 h-4" />
            Add Lab Results
          </button>
          <div className="flex items-center gap-2 bg-kairos-gold/20 text-kairos-gold px-4 py-2 rounded-kairos-sm">
            <Calendar className="w-4 h-4" />
            <span className="text-sm font-heading font-semibold">Next Draw: April 1, 2026</span>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Total Markers</p>
          <p className="text-2xl font-bold text-white font-heading">{statusCounts.total}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Tracked</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">In Range</p>
          <p className="text-2xl font-bold text-green-400 font-heading">{statusCounts.inRange}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">{Math.round((statusCounts.inRange / statusCounts.total) * 100)}%</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Out of Range</p>
          <p className="text-2xl font-bold text-red-400 font-heading">{statusCounts.outOfRange}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Needs attention</p>
        </div>
        <div className="kairos-card p-6 rounded-kairos-sm">
          <p className="text-kairos-silver-dark text-sm font-body mb-2">Improved</p>
          <p className="text-2xl font-bold text-blue-400 font-heading">{statusCounts.improved}</p>
          <p className="text-xs text-kairos-silver-dark mt-2">Since last draw</p>
        </div>
      </div>

      {/* Add Lab Results Modal */}
      {showAddResults && (
        <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border space-y-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-bold text-xl text-white">Add Lab Results</h3>
            <button
              onClick={handleCancel}
              className="text-kairos-silver-dark hover:text-white transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b border-kairos-border">
            <button
              onClick={() => setActiveTab("pdf")}
              className={`px-4 py-2 font-body text-sm font-medium transition-all ${
                activeTab === "pdf"
                  ? "text-kairos-gold border-b-2 border-kairos-gold"
                  : "text-kairos-silver-dark hover:text-white"
              }`}
            >
              <Upload className="w-4 h-4 inline mr-2" />
              Upload PDF
            </button>
            <button
              onClick={() => setActiveTab("url")}
              className={`px-4 py-2 font-body text-sm font-medium transition-all ${
                activeTab === "url"
                  ? "text-kairos-gold border-b-2 border-kairos-gold"
                  : "text-kairos-silver-dark hover:text-white"
              }`}
            >
              <Link className="w-4 h-4 inline mr-2" />
              Enter URL
            </button>
            <button
              onClick={() => setActiveTab("manual")}
              className={`px-4 py-2 font-body text-sm font-medium transition-all ${
                activeTab === "manual"
                  ? "text-kairos-gold border-b-2 border-kairos-gold"
                  : "text-kairos-silver-dark hover:text-white"
              }`}
            >
              <FileText className="w-4 h-4 inline mr-2" />
              Manual Entry
            </button>
          </div>

          {/* Tab Content */}
          <div className="mt-6">
            {/* PDF Upload Tab */}
            {activeTab === "pdf" && (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-kairos-border rounded-kairos-sm p-12 text-center hover:border-kairos-gold/50 transition-all cursor-pointer">
                  <Upload className="w-12 h-12 text-kairos-silver-dark mx-auto mb-4" />
                  <p className="text-white font-body mb-2">Drag and drop your PDF here</p>
                  <p className="text-kairos-silver-dark text-sm font-body">or click to select a file</p>
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    className="kairos-btn-outline text-kairos-silver-dark px-6 py-2 rounded-kairos-sm font-body text-sm font-medium hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveResults}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium hover:bg-kairos-gold/90 transition-all"
                  >
                    Import
                  </button>
                </div>
              </div>
            )}

            {/* URL Entry Tab */}
            {activeTab === "url" && (
              <div className="space-y-4">
                <div>
                  <label className="block text-white font-body text-sm font-medium mb-2">Lab Results URL</label>
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder="https://example.com/lab-results"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  />
                </div>
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    className="kairos-btn-outline text-kairos-silver-dark px-6 py-2 rounded-kairos-sm font-body text-sm font-medium hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveResults}
                    disabled={!urlInput}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium hover:bg-kairos-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Import
                  </button>
                </div>
              </div>
            )}

            {/* Manual Entry Tab */}
            {activeTab === "manual" && (
              <div className="space-y-4">
                {/* Lab Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-white font-body text-sm font-medium mb-2">Lab Name</label>
                    <input
                      type="text"
                      value={manualForm.labName}
                      onChange={(e) => setManualForm({ ...manualForm, labName: e.target.value })}
                      placeholder="e.g., Quest Diagnostics, LabCorp"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-white font-body text-sm font-medium mb-2">Requesting Doctor</label>
                    <input
                      type="text"
                      value={manualForm.requestingDoctor}
                      onChange={(e) => setManualForm({ ...manualForm, requestingDoctor: e.target.value })}
                      placeholder="Doctor's name"
                      className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-white font-body text-sm font-medium mb-2">Test Date</label>
                  <input
                    type="date"
                    value={manualForm.date}
                    onChange={(e) => setManualForm({ ...manualForm, date: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  />
                </div>

                {/* Add Test Fields */}
                <div className="bg-kairos-royal-surface/50 p-4 rounded-kairos-sm border border-kairos-border">
                  <h4 className="text-white font-heading font-bold text-sm mb-4">Add Test Result</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Test Name</label>
                      <input
                        type="text"
                        value={currentTest.testName || ""}
                        onChange={(e) => setCurrentTest({ ...currentTest, testName: e.target.value })}
                        placeholder="e.g., Glucose, Cholesterol"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Result Value</label>
                      <input
                        type="text"
                        value={currentTest.resultValue || ""}
                        onChange={(e) => setCurrentTest({ ...currentTest, resultValue: e.target.value })}
                        placeholder="e.g., 95 mg/dL"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Result Status</label>
                      <select
                        value={currentTest.resultStatus || "normal"}
                        onChange={(e) => setCurrentTest({ ...currentTest, resultStatus: e.target.value as TestEntry["resultStatus"] })}
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                      >
                        <option value="optimal">Optimal</option>
                        <option value="normal">Normal</option>
                        <option value="borderline">Borderline</option>
                        <option value="out-of-range">Out of Range</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-white font-body text-sm font-medium mb-2">Reference Range</label>
                      <input
                        type="text"
                        value={currentTest.referenceRange || ""}
                        onChange={(e) => setCurrentTest({ ...currentTest, referenceRange: e.target.value })}
                        placeholder="e.g., 70-100 mg/dL"
                        className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <button
                    onClick={handleAddTest}
                    disabled={!currentTest.testName || !currentTest.resultValue || !currentTest.referenceRange}
                    className="w-full kairos-btn-outline text-kairos-silver-dark px-4 py-2 rounded-kairos-sm font-body text-sm font-medium hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" />
                    Add Another Test
                  </button>
                </div>

                {/* Tests List */}
                {manualForm.tests.length > 0 && (
                  <div className="space-y-2">
                    <h4 className="text-white font-heading font-bold text-sm">Added Tests ({manualForm.tests.length})</h4>
                    {manualForm.tests.map((test) => (
                      <div key={test.id} className="bg-kairos-royal-surface/30 p-3 rounded-kairos-sm border border-kairos-border flex items-center justify-between">
                        <div>
                          <p className="text-white font-body text-sm font-medium">{test.testName}</p>
                          <p className="text-kairos-silver-dark text-xs">
                            {test.resultValue} ({test.resultStatus}) • Ref: {test.referenceRange}
                          </p>
                        </div>
                        <button
                          onClick={() => handleRemoveTest(test.id)}
                          className="text-kairos-silver-dark hover:text-red-400 transition-all"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Notes */}
                <div>
                  <label className="block text-white font-body text-sm font-medium mb-2">Notes (Optional)</label>
                  <textarea
                    value={manualForm.notes}
                    onChange={(e) => setManualForm({ ...manualForm, notes: e.target.value })}
                    placeholder="Any additional information about these results..."
                    rows={3}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                  />
                </div>

                {/* Buttons */}
                <div className="flex gap-3 justify-end">
                  <button
                    onClick={handleCancel}
                    className="kairos-btn-outline text-kairos-silver-dark px-6 py-2 rounded-kairos-sm font-body text-sm font-medium hover:text-white transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveResults}
                    disabled={!manualForm.labName || !manualForm.date || manualForm.tests.length === 0}
                    className="kairos-btn-gold text-black px-6 py-2 rounded-kairos-sm font-body text-sm font-medium hover:bg-kairos-gold/90 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Save Results
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
            <div key={marker.id} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-all">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
                <div>
                  <h3 className="font-heading font-bold text-white mb-1">{marker.name}</h3>
                  <p className="text-xs text-kairos-silver-dark">Ref: {marker.referenceRange}</p>
                </div>
                <div className="space-y-2">
                  <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-bold text-white">{marker.currentValue}</span>
                    <span className="text-sm text-kairos-silver-dark">{marker.unit}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-body ${getStatusColor(marker.status)}`}>
                      {marker.status === "optimal" && <CheckCircle className="w-3 h-3" />}
                      {marker.status === "out-of-range" && <AlertTriangle className="w-3 h-3" />}
                      {getStatusLabel(marker.status)}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-body bg-slate-900/50 text-kairos-silver-dark">
                      {getTrendIcon(marker.trend)}
                      <span>
                        {marker.previousValue}
                        {marker.trend === "up" && " ↗"}
                        {marker.trend === "down" && " ↘"}
                        {marker.trend === "flat" && " →"}
                      </span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs text-kairos-gold font-body mb-1">Optimal: {marker.optimalRange}</p>
                  <p className="text-xs text-kairos-silver-dark">Drawn: {new Date(marker.lastDrawDate).toLocaleDateString()}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Lab Orders */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-kairos-gold" />
          <h2 className="font-heading font-bold text-xl text-white">Recent Lab Orders</h2>
        </div>
        <div className="space-y-3">
          {orders.map((order) => (
            <div key={order.id} className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-center">
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Order Date</p>
                  <p className="font-heading font-bold text-white">{new Date(order.date).toLocaleDateString()}</p>
                </div>
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Lab Name</p>
                  <p className="font-heading font-bold text-white">{order.labName}</p>
                </div>
                <div>
                  <p className="text-sm font-body text-kairos-silver-dark">Panel Type</p>
                  <p className="font-heading font-bold text-white">{order.panelType}</p>
                </div>
                <div className="md:text-right">
                  <span className={`inline-flex items-center px-3 py-1 rounded-kairos-sm text-xs font-body font-medium border ${getOrderStatusColor(order.status)}`}>
                    {order.status === "results-ready" && <CheckCircle className="w-3 h-3 mr-1" />}
                    {order.status === "pending" && <Minus className="w-3 h-3 mr-1" />}
                    {order.status === "scheduled" && <Calendar className="w-3 h-3 mr-1" />}
                    {order.status === "results-ready" && "Results Ready"}
                    {order.status === "pending" && "Pending"}
                    {order.status === "scheduled" && "Scheduled"}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
