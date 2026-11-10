"use client";

import { useState, useRef, useCallback } from "react";
import {
  Dna,
  Upload,
  Link,
  FileText,
  X,
  Plus,
  AlertTriangle,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";
import { GeneticsReview } from "@/components/genetics/GeneticsReview";

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

/* ━━━ Main Component ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
export default function GeneticsPage() {
  const [showUpload, setShowUpload] = useState(false);
  const [uploadTab, setUploadTab] = useState<"pdf" | "url" | "manual">("pdf");
  const [urlInput, setUrlInput] = useState("");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── tRPC ────────────────────────────────────────────────────
  const { data: profileData, isLoading } = trpc.clientPortal.genetics.getProfile.useQuery();
  const { data: pathwayData } = trpc.clientPortal.genetics.getPathwayScores.useQuery();
  const utils = trpc.useUtils();

  const uploadMutation = trpc.clientPortal.genetics.uploadProfile.useMutation();

  const addMarkerMutation = trpc.clientPortal.genetics.addMarker.useMutation({
    onSuccess: () => utils.clientPortal.genetics.getProfile.invalidate(),
  });

  const addMarkersMutation = trpc.clientPortal.genetics.addMarkers.useMutation();

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
        pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjs.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
        const totalPages = pdf.numPages;
        const pageImages: string[] = [];

        // Start with moderate quality, reduce if total gets too large
        let scale = 1.2;
        let quality = 0.65;

        for (let i = 1; i <= totalPages; i++) {
          setParseProgress(`Rendering page ${i} of ${totalPages}...`);
          const page = await pdf.getPage(i);
          const viewport = page.getViewport({ scale });
          const canvas = document.createElement("canvas");
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          const ctx = canvas.getContext("2d")!;
          await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
          const dataUrl = canvas.toDataURL("image/jpeg", quality);
          pageImages.push(dataUrl.split(",")[1]);
        }

        // Check total payload size — Vercel limit is 4.5MB
        const totalB64Size = pageImages.reduce((sum, img) => sum + img.length, 0);
        const estimatedPayload = totalB64Size + 500; // JSON overhead
        if (estimatedPayload > 3_500_000) {
          // Re-render at lower quality to fit
          setParseProgress("Optimizing images for upload...");
          pageImages.length = 0;
          scale = 1.0;
          quality = 0.5;
          for (let i = 1; i <= totalPages; i++) {
            const page = await pdf.getPage(i);
            const viewport = page.getViewport({ scale });
            const canvas = document.createElement("canvas");
            canvas.width = viewport.width;
            canvas.height = viewport.height;
            const ctx = canvas.getContext("2d")!;
            await page.render({ canvasContext: ctx, viewport, canvas } as Parameters<typeof page.render>[0]).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", quality);
            pageImages.push(dataUrl.split(",")[1]);
          }
        }

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
        const errText = await response.text().catch(() => "");
        let errMsg = `Upload failed (${response.status})`;
        try { const errJson = JSON.parse(errText); errMsg = errJson.error || errMsg; } catch { if (errText.length < 200) errMsg = errText || errMsg; }
        if (response.status === 413) errMsg = "File too large for server. Try a smaller PDF.";
        throw new Error(errMsg);
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

      // Add all markers in a single batched insert (avoids N serial requests)
      const markersToAdd = pathways.flatMap((pathway) =>
        (pathway.variants ?? []).map((variant) => ({
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
        }))
      );

      let addedCount = 0;
      if (markersToAdd.length > 0) {
        setParseProgress(`Adding ${markersToAdd.length} variants...`);
        try {
          const inserted = await new Promise<unknown[]>((resolve, reject) => {
            addMarkersMutation.mutate(
              { profileId: newProfile.id, markers: markersToAdd },
              {
                onSuccess: (rows) => resolve(rows),
                onError: (e) => reject(e),
              }
            );
          });
          addedCount = Array.isArray(inserted) ? inserted.length : markersToAdd.length;
        } catch {
          // Leave addedCount at 0 so the user is told nothing was imported
          console.warn("Failed to add markers batch");
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
  }, [uploadMutation, addMarkersMutation, utils]);

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

  const hasData = (profileData?.markers?.length ?? 0) > 0;

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
              ? "What your genes say, in plain words, and what you can do about it"
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
      {hasData && profileData && (
        <GeneticsReview
          audience="client"
          markers={profileData.markers}
          pathways={(pathwayData ?? []).map((p) => ({
            pathway: p.pathway,
            genesInPathway: p.genesInPathway,
            genesAffected: p.genesAffected ?? 0,
            homozygousCount: p.homozygousCount ?? 0,
            heterozygousCount: p.heterozygousCount ?? 0,
            priorityLevel: p.priorityLevel ?? null,
          }))}
          profile={{ status: profileData.status, uploadType: profileData.uploadType, createdAt: profileData.createdAt }}
        />
      )}
    </div>
  );
}
