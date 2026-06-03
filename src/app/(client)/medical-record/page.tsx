"use client";

import { useState, useRef } from "react";
import {
  FileHeart,
  Upload,
  Plus,
  X,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronRight,
  Activity,
  Link2,
  FileText,
  Stethoscope,
  Pill,
  Syringe,
  AlertCircle,
  Heart,
  ClipboardList,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

/* ─── Record categories ───────────────────────────────────────── */
const RECORD_CATEGORIES = [
  { key: "all", label: "All Records" },
  { key: "visit_summary", label: "Visit Summaries" },
  { key: "lab_results", label: "Lab Results" },
  { key: "imaging", label: "Imaging / Radiology" },
  { key: "prescription", label: "Prescriptions" },
  { key: "immunization", label: "Immunizations" },
  { key: "procedure", label: "Procedures" },
  { key: "other", label: "Other" },
] as const;

/* ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function MedicalRecordPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [expandedDoc, setExpandedDoc] = useState<string | null>(null);
  const [uploadMode, setUploadMode] = useState<"file" | "manual" | "epic">("file");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    title: "", providerName: "", reportDate: "", category: "other", notes: "",
  });

  // ── tRPC ────────────────────────────────────────────────────
  const { data: docs, isLoading } = trpc.clientPortal.clinicalDocs.list.useQuery({ docType: "medical_record" });
  const utils = trpc.useUtils();

  const createMutation = trpc.clientPortal.clinicalDocs.create.useMutation({
    onSuccess: () => {
      utils.clientPortal.clinicalDocs.list.invalidate();
      setShowUpload(false);
      setUploading(false);
      setForm({ title: "", providerName: "", reportDate: "", category: "other", notes: "" });
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
          docType: "medical_record",
          mimeType: file.type || "application/pdf",
        }),
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        createMutation.mutate({
          docType: "medical_record",
          title: file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
          sourceFileName: file.name,
          parsedData: { category: "other" },
        });
        setParseError("AI parsing failed — document saved for manual review.");
        return;
      }

      const parsed = result.data;
      createMutation.mutate({
        docType: "medical_record",
        title: parsed.title || file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
        sourceFileName: file.name,
        providerName: parsed.providerName || undefined,
        reportDate: parsed.reportDate || undefined,
        parsedData: parsed.parsedData as Record<string, unknown>,
      });
    } catch {
      createMutation.mutate({
        docType: "medical_record",
        title: file.name.replace(/\.(pdf|png|jpg|jpeg)$/i, ""),
        sourceFileName: file.name,
        parsedData: { category: "other" },
      });
      setParseError("Could not parse file — saved for manual review.");
    }
  }

  function handleManualSave() {
    createMutation.mutate({
      docType: "medical_record",
      title: form.title || `Medical Record — ${new Date().toLocaleDateString()}`,
      providerName: form.providerName || undefined,
      reportDate: form.reportDate ? new Date(form.reportDate).toISOString() : undefined,
      notes: form.notes || undefined,
      parsedData: { category: form.category },
    });
  }

  const hasData = docs && docs.length > 0;

  // Category icon mapping
  const categoryIcon = (cat: string) => {
    switch (cat) {
      case "visit_summary": return <Stethoscope size={16} className="text-blue-400" />;
      case "lab_results": return <Activity size={16} className="text-green-400" />;
      case "imaging": return <FileHeart size={16} className="text-purple-400" />;
      case "prescription": return <Pill size={16} className="text-cyan-400" />;
      case "immunization": return <Syringe size={16} className="text-orange-400" />;
      case "procedure": return <ClipboardList size={16} className="text-pink-400" />;
      default: return <FileText size={16} className="text-kairos-silver-dark" />;
    }
  };

  const filteredDocs = hasData
    ? categoryFilter === "all"
      ? docs
      : docs!.filter((d) => (d.parsedData as Record<string, unknown>)?.category === categoryFilter)
    : [];

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
          <h1 className="font-heading font-bold text-2xl text-white">Medical Record</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            Centralized health records — upload documents or connect to your EHR
          </p>
        </div>
        <button onClick={() => setShowUpload(!showUpload)}
          className="kairos-btn-gold flex items-center gap-2 px-4 py-2 rounded-kairos-sm font-heading font-semibold text-sm">
          <Plus size={16} /> Add Record
        </button>
      </div>

      {/* Upload Panel */}
      {showUpload && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Add Medical Record</h3>
            <button onClick={() => setShowUpload(false)} className="text-kairos-silver-dark hover:text-white"><X size={18} /></button>
          </div>

          <div className="flex gap-2 mb-4">
            {([
              { key: "file" as const, label: "Upload File", icon: <Upload size={14} /> },
              { key: "manual" as const, label: "Enter Details", icon: <FileText size={14} /> },
              { key: "epic" as const, label: "Connect EHR", icon: <Link2 size={14} /> },
            ]).map((tab) => (
              <button key={tab.key} onClick={() => setUploadMode(tab.key)}
                className={cn("px-4 py-2 rounded-kairos-sm text-sm border transition-all flex items-center gap-2",
                  uploadMode === tab.key ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold" : "border-kairos-border text-kairos-silver-dark")}>
                {tab.icon} {tab.label}
              </button>
            ))}
          </div>

          {/* File Upload */}
          {uploadMode === "file" && (
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
                  <p className="text-white font-heading font-semibold">Uploading medical record...</p>
                </div>
              ) : (
                <>
                  <FileHeart className="w-10 h-10 text-kairos-silver-dark mx-auto mb-3" />
                  <p className="text-white font-heading font-semibold mb-1">Drop your medical document here</p>
                  <p className="text-kairos-silver-dark text-sm font-body mb-3">
                    Upload visit summaries, lab results, imaging reports, prescriptions, or any health document
                  </p>
                  <span className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm inline-block">Browse Files</span>
                </>
              )}
              <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.doc,.docx" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); }} />
            </div>
          )}

          {/* Manual Entry */}
          {uploadMode === "manual" && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Record Title *</label>
                  <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g., Annual Physical 2025"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Provider</label>
                  <input type="text" value={form.providerName} onChange={(e) => setForm({ ...form, providerName: e.target.value })}
                    placeholder="e.g., Dr. Johnson"
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
                <div>
                  <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Date</label>
                  <input type="date" value={form.reportDate} onChange={(e) => setForm({ ...form, reportDate: e.target.value })}
                    className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Category</label>
                <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none">
                  {RECORD_CATEGORIES.filter((c) => c.key !== "all").map((c) => (
                    <option key={c.key} value={c.key}>{c.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-heading text-kairos-silver-dark mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  rows={3} placeholder="Key findings, diagnoses, follow-up instructions..."
                  className="w-full bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm focus:border-kairos-gold focus:outline-none" />
              </div>
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowUpload(false)} className="kairos-btn-outline px-4 py-2 rounded-kairos-sm text-sm">Cancel</button>
                <button onClick={handleManualSave} className="kairos-btn-gold px-4 py-2 rounded-kairos-sm text-sm font-heading font-semibold">Save Record</button>
              </div>
            </div>
          )}

          {/* EHR Connect */}
          {uploadMode === "epic" && (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-full bg-blue-500/10 flex items-center justify-center mx-auto mb-4">
                <Heart size={32} className="text-blue-400" />
              </div>
              <h3 className="font-heading font-semibold text-white mb-2">Connect to Epic MyChart</h3>
              <p className="text-sm font-body text-kairos-silver-dark max-w-md mx-auto mb-4">
                Securely connect to your Epic MyChart account to automatically import your medical records,
                lab results, medications, and visit history.
              </p>
              <div className="flex items-center justify-center gap-2 mb-4">
                <AlertCircle size={14} className="text-kairos-gold" />
                <p className="text-xs text-kairos-gold font-body">Epic integration coming soon</p>
              </div>
              <button disabled className="kairos-btn-outline px-6 py-2.5 rounded-kairos-sm text-sm opacity-50 cursor-not-allowed">
                Connect Epic MyChart
              </button>
            </div>
          )}
        </div>
      )}

      {/* Empty state */}
      {!hasData && !showUpload && (
        <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-5">
            <FileHeart size={40} className="text-kairos-gold" />
          </div>
          <h2 className="font-heading font-semibold text-xl text-white mb-2">No Medical Records Yet</h2>
          <p className="text-sm font-body text-kairos-silver-dark max-w-md mb-6">
            Upload medical documents, visit summaries, lab results, and prescriptions
            to build your centralized health record. Epic MyChart integration coming soon.
          </p>
          <button onClick={() => setShowUpload(true)}
            className="kairos-btn-gold flex items-center gap-2 px-6 py-3 rounded-kairos-sm font-heading font-semibold">
            <Upload size={18} /> Add Medical Record
          </button>
        </div>
      )}

      {/* Records with filter */}
      {hasData && (
        <>
          {/* Category filter */}
          <div className="flex gap-2 flex-wrap">
            {RECORD_CATEGORIES.map((cat) => (
              <button key={cat.key} onClick={() => setCategoryFilter(cat.key)}
                className={cn("px-3 py-1.5 rounded-kairos-sm text-xs font-body transition-all border",
                  categoryFilter === cat.key
                    ? "bg-kairos-gold/20 text-kairos-gold border-kairos-gold"
                    : "border-kairos-border text-kairos-silver-dark hover:text-white hover:border-kairos-gold/30")}>
                {cat.label}
              </button>
            ))}
          </div>

          {/* Summary stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Total Records</p>
              <p className="text-2xl font-heading font-bold text-kairos-gold">{docs!.length}</p>
            </div>
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Processed</p>
              <p className="text-2xl font-heading font-bold text-green-400">{docs!.filter((d) => d.status === "processed").length}</p>
            </div>
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Pending</p>
              <p className="text-2xl font-heading font-bold text-yellow-400">{docs!.filter((d) => d.status !== "processed").length}</p>
            </div>
            <div className="kairos-card p-5">
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-wider mb-1">Latest</p>
              <p className="text-sm font-heading font-semibold text-white">
                {new Date(docs![0].reportDate ?? docs![0].createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>

          {/* Record List */}
          <div className="space-y-2">
            {filteredDocs!.map((doc) => {
              const data = doc.parsedData as Record<string, unknown> | undefined;
              const isExpanded = expandedDoc === doc.id;
              const cat = (data?.category as string) ?? "other";

              return (
                <div key={doc.id} className="kairos-card border border-kairos-border hover:border-kairos-gold/20 transition-all">
                  <button
                    onClick={() => setExpandedDoc(isExpanded ? null : doc.id)}
                    className="w-full flex items-center justify-between"
                  >
                    <div className="flex items-center gap-3">
                      {categoryIcon(cat)}
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
                            {doc.status === "processed" ? "Processed" : "Uploaded"}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-kairos-silver-dark capitalize">{cat.replace("_", " ")}</span>
                      {isExpanded ? <ChevronDown size={16} className="text-kairos-silver-dark" /> : <ChevronRight size={16} className="text-kairos-silver-dark" />}
                    </div>
                  </button>

                  {isExpanded && (() => {
                    const pd = data as Record<string, unknown> | undefined;
                    const vitals = pd?.vitalSigns as Record<string, unknown> | undefined;
                    const diagnoses = pd?.diagnoses as string[] | undefined;
                    const medications = pd?.medications as Array<{ name: string; dosage?: string; frequency?: string; notes?: string }> | undefined;
                    const labResults = pd?.labResults as Array<{ name: string; value?: string; unit?: string; referenceRange?: string; status?: string }> | undefined;
                    const findings = pd?.findings as string[] | undefined;
                    const recommendations = pd?.recommendations as string[] | undefined;
                    const patientInfo = pd?.patientInfo as Record<string, unknown> | undefined;
                    const followUp = pd?.followUp as string | undefined;
                    const documentType = pd?.documentType as string | undefined;
                    const hasDetails = diagnoses?.length || medications?.length || labResults?.length || findings?.length || vitals || recommendations?.length;

                    return (
                      <div className="mt-4 pt-4 border-t border-kairos-border space-y-4">
                        {/* Document type & patient info */}
                        {(documentType || patientInfo) && (
                          <div className="flex flex-wrap gap-3 text-xs">
                            {documentType && <span className="px-2 py-1 rounded bg-kairos-gold/10 text-kairos-gold border border-kairos-gold/20 capitalize">{documentType.replace(/_/g, " ")}</span>}
                            {patientInfo?.age != null && <span className="text-kairos-silver-dark">Age: {String(patientInfo.age)}</span>}
                            {patientInfo?.sex != null && <span className="text-kairos-silver-dark">Sex: {String(patientInfo.sex)}</span>}
                            {patientInfo?.height != null && <span className="text-kairos-silver-dark">Height: {String(patientInfo.height)}</span>}
                            {patientInfo?.weight != null && <span className="text-kairos-silver-dark">Weight: {String(patientInfo.weight)}</span>}
                          </div>
                        )}

                        {/* Vital Signs */}
                        {vitals && Object.values(vitals).some(v => v != null) && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Heart size={12} /> Vital Signs</h4>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                              {vitals.bloodPressure != null && <div className="bg-kairos-royal-surface rounded-lg p-2.5 border border-kairos-border"><p className="text-[10px] text-kairos-silver-dark">Blood Pressure</p><p className="text-sm font-bold text-white">{String(vitals.bloodPressure)}</p></div>}
                              {vitals.heartRate != null && <div className="bg-kairos-royal-surface rounded-lg p-2.5 border border-kairos-border"><p className="text-[10px] text-kairos-silver-dark">Heart Rate</p><p className="text-sm font-bold text-white">{String(vitals.heartRate)} bpm</p></div>}
                              {vitals.temperature != null && <div className="bg-kairos-royal-surface rounded-lg p-2.5 border border-kairos-border"><p className="text-[10px] text-kairos-silver-dark">Temperature</p><p className="text-sm font-bold text-white">{String(vitals.temperature)}</p></div>}
                              {vitals.respiratoryRate != null && <div className="bg-kairos-royal-surface rounded-lg p-2.5 border border-kairos-border"><p className="text-[10px] text-kairos-silver-dark">Respiratory Rate</p><p className="text-sm font-bold text-white">{String(vitals.respiratoryRate)}</p></div>}
                              {vitals.oxygenSaturation != null && <div className="bg-kairos-royal-surface rounded-lg p-2.5 border border-kairos-border"><p className="text-[10px] text-kairos-silver-dark">O₂ Saturation</p><p className="text-sm font-bold text-white">{String(vitals.oxygenSaturation)}</p></div>}
                            </div>
                          </div>
                        )}

                        {/* Diagnoses */}
                        {diagnoses && diagnoses.length > 0 && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Stethoscope size={12} /> Diagnoses</h4>
                            <div className="space-y-1">{diagnoses.map((d, i) => <p key={i} className="text-sm text-white pl-3 border-l-2 border-kairos-gold/30">{d}</p>)}</div>
                          </div>
                        )}

                        {/* Medications */}
                        {medications && medications.length > 0 && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2 flex items-center gap-1.5"><Pill size={12} /> Medications</h4>
                            <div className="space-y-1.5">
                              {medications.map((m, i) => (
                                <div key={i} className="flex items-center justify-between py-1.5 border-b border-kairos-border/30 last:border-0">
                                  <span className="text-sm font-semibold text-white">{m.name}</span>
                                  <span className="text-xs text-kairos-silver-dark">{[m.dosage, m.frequency].filter(Boolean).join(" — ")}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Lab Results */}
                        {labResults && labResults.length > 0 && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList size={12} /> Lab Results</h4>
                            <div className="overflow-x-auto">
                              <table className="w-full text-sm">
                                <thead><tr className="border-b border-kairos-border">
                                  <th className="text-left py-1.5 px-2 text-[10px] text-kairos-silver-dark uppercase">Test</th>
                                  <th className="text-right py-1.5 px-2 text-[10px] text-kairos-silver-dark uppercase">Value</th>
                                  <th className="text-right py-1.5 px-2 text-[10px] text-kairos-silver-dark uppercase">Reference</th>
                                  <th className="text-right py-1.5 px-2 text-[10px] text-kairos-silver-dark uppercase">Status</th>
                                </tr></thead>
                                <tbody>
                                  {labResults.map((lr, i) => (
                                    <tr key={i} className="border-b border-kairos-border/30">
                                      <td className="py-1.5 px-2 text-white">{lr.name}</td>
                                      <td className="py-1.5 px-2 text-right font-bold text-white">{lr.value} {lr.unit}</td>
                                      <td className="py-1.5 px-2 text-right text-kairos-silver-dark">{lr.referenceRange ?? "—"}</td>
                                      <td className="py-1.5 px-2 text-right">
                                        {lr.status && <span className={cn("text-[10px] px-1.5 py-0.5 rounded border font-bold uppercase",
                                          lr.status === "normal" || lr.status === "optimal" ? "bg-green-500/15 text-green-400 border-green-500/30" :
                                          lr.status === "high" || lr.status === "critical" ? "bg-red-500/15 text-red-400 border-red-500/30" :
                                          lr.status === "low" ? "bg-blue-500/15 text-blue-400 border-blue-500/30" :
                                          "bg-yellow-500/15 text-yellow-400 border-yellow-500/30"
                                        )}>{lr.status}</span>}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          </div>
                        )}

                        {/* Key Findings */}
                        {findings && findings.length > 0 && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2 flex items-center gap-1.5"><AlertCircle size={12} /> Key Findings</h4>
                            <div className="space-y-1">{findings.map((f, i) => <p key={i} className="text-sm text-kairos-silver pl-3 border-l-2 border-yellow-500/30">{f}</p>)}</div>
                          </div>
                        )}

                        {/* Recommendations */}
                        {recommendations && recommendations.length > 0 && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2 flex items-center gap-1.5"><ClipboardList size={12} /> Recommendations</h4>
                            <div className="space-y-1">{recommendations.map((r, i) => <p key={i} className="text-sm text-kairos-silver pl-3 border-l-2 border-green-500/30">{r}</p>)}</div>
                          </div>
                        )}

                        {/* Follow-up */}
                        {followUp && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-2">Follow-Up</h4>
                            <p className="text-sm text-kairos-silver">{followUp}</p>
                          </div>
                        )}

                        {/* Notes */}
                        {doc.notes && (
                          <div>
                            <h4 className="text-xs font-heading text-kairos-gold uppercase tracking-wider mb-1">Notes</h4>
                            <p className="text-sm font-body text-kairos-silver">{doc.notes}</p>
                          </div>
                        )}

                        {/* Fallback for unprocessed docs */}
                        {!hasDetails && !doc.notes && (
                          <p className="text-sm text-kairos-silver-dark text-center py-4">
                            {doc.sourceFileName
                              ? `Document uploaded: ${doc.sourceFileName}. No detailed data was extracted.`
                              : "No additional details available."}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              );
            })}

            {filteredDocs!.length === 0 && (
              <div className="kairos-card text-center py-8">
                <p className="text-kairos-silver-dark font-body">No records match this category filter.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
