"use client";

import { useState } from "react";
import type { ImportSession, ImportCategory, ColumnMapping } from "@/lib/import/types";
import {
  startImport,
  updateMappings,
  toggleRowSkip,
  executeImport,
  getMissingRequiredMappings,
  generateTemplate,
} from "@/lib/import/processor";
import { FileUploadZone } from "./FileUploadZone";
import { ColumnMapper } from "./ColumnMapper";
import { ImportPreview } from "./ImportPreview";
import { ImportResult } from "./ImportResult";

type WizardStep = "upload" | "mapping" | "preview" | "result";

export function ImportWizard() {
  const [step, setStep] = useState<WizardStep>("upload");
  const [session, setSession] = useState<ImportSession | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleFileSelect(file: File, category: ImportCategory) {
    setError(null);

    // Size check
    if (file.size > 10 * 1024 * 1024) {
      setError("File exceeds 10MB limit");
      return;
    }

    try {
      const content = await file.text();
      const newSession = startImport(category, file.name, file.size, content);

      if (newSession.status === "error") {
        setError("Failed to parse file. Please check the format.");
        return;
      }

      setSession(newSession);
      setStep("mapping");
    } catch {
      setError("Failed to read file");
    }
  }

  function handleMappingsUpdate(mappings: ColumnMapping[]) {
    if (!session) return;
    setSession(updateMappings(session, mappings));
  }

  function handleToggleRow(rowIndex: number) {
    if (!session) return;
    setSession(toggleRowSkip(session, rowIndex));
  }

  function handleExecute() {
    if (!session) return;
    const result = executeImport(session);
    setSession(result);
    setStep("result");
  }

  function handleNewImport() {
    setSession(null);
    setStep("upload");
    setError(null);
  }

  function handleDownloadTemplate() {
    if (!session) return;
    const csv = generateTemplate(session.category);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kairos_${session.category}_template.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  const missingRequired = session ? getMissingRequiredMappings(session) : [];

  return (
    <div>
      {/* Step Indicator */}
      {step !== "upload" && step !== "result" && (
        <div className="max-w-2xl mx-auto mb-6">
          <div className="flex items-center gap-2 text-sm">
            {(["upload", "mapping", "preview"] as const).map((s, idx) => {
              const labels = ["Upload", "Map Columns", "Preview"];
              const isActive = s === step;
              const isPast =
                (s === "upload" && (step === "mapping" || step === "preview")) ||
                (s === "mapping" && step === "preview");

              return (
                <div key={s} className="flex items-center gap-2">
                  {idx > 0 && <div className="w-8 h-px bg-gray-700" />}
                  <span
                    className={`px-3 py-1 rounded-full text-xs ${
                      isActive
                        ? "bg-kairos-gold/20 text-kairos-gold font-semibold"
                        : isPast
                          ? "bg-emerald-900/20 text-emerald-500"
                          : "bg-gray-800 text-gray-600"
                    }`}
                  >
                    {labels[idx]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="max-w-2xl mx-auto mb-4 p-3 rounded-lg bg-red-900/20 border border-red-800/30">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      {/* File Info Bar */}
      {session && step !== "upload" && step !== "result" && (
        <div className="max-w-2xl mx-auto mb-4 flex items-center justify-between kairos-card p-3">
          <div className="flex items-center gap-3">
            <span className="text-gray-500 text-sm">File:</span>
            <span className="text-white text-sm font-mono">{session.fileName}</span>
            <span className="text-gray-600 text-xs">
              ({session.rows.length} rows)
            </span>
          </div>
          <button
            onClick={handleDownloadTemplate}
            className="text-kairos-gold text-xs hover:underline"
          >
            Download Template
          </button>
        </div>
      )}

      {/* Steps */}
      {step === "upload" && (
        <FileUploadZone onFileSelect={handleFileSelect} />
      )}

      {step === "mapping" && session && (
        <ColumnMapper
          category={session.category}
          mappings={session.mappings}
          onUpdate={handleMappingsUpdate}
          onContinue={() => setStep("preview")}
          onBack={handleNewImport}
          missingRequired={missingRequired}
        />
      )}

      {step === "preview" && session && (
        <ImportPreview
          session={session}
          onToggleRow={handleToggleRow}
          onExecute={handleExecute}
          onBack={() => setStep("mapping")}
        />
      )}

      {step === "result" && session && session.summary && (
        <ImportResult
          summary={session.summary}
          category={session.category}
          fileName={session.fileName}
          onNewImport={handleNewImport}
          onViewData={() => { window.location.href = `/${session.category}`; }}
        />
      )}
    </div>
  );
}
