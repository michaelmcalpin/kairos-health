"use client";

import type { ImportSummary } from "@/lib/import/types";

interface ImportResultProps {
  summary: ImportSummary;
  category: string;
  fileName: string;
  onNewImport: () => void;
  onViewData: () => void;
}

export function ImportResult({ summary, category, fileName, onNewImport, onViewData }: ImportResultProps) {
  const successRate = summary.totalRows > 0
    ? Math.round((summary.importedRows / summary.totalRows) * 100)
    : 0;

  return (
    <div className="max-w-lg mx-auto text-center">
      {/* Success Icon */}
      <div
        className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6"
        style={{ background: successRate >= 80 ? "linear-gradient(135deg, #10B981, #059669)" : "linear-gradient(135deg, #F59E0B, #D97706)" }}
      >
        {successRate >= 80 ? (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M8 16L14 22L24 10" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        ) : (
          <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
            <path d="M16 10V18M16 22V22.01" stroke="white" strokeWidth="3" strokeLinecap="round" />
          </svg>
        )}
      </div>

      <h2 className="text-2xl font-heading font-bold text-white mb-2">Import Complete</h2>
      <p className="text-gray-400 mb-6">
        Successfully imported {summary.importedRows} of {summary.totalRows} rows
        from <span className="text-white">{fileName}</span>
      </p>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="kairos-card p-4">
          <div className="text-2xl font-bold text-emerald-400">{summary.importedRows}</div>
          <div className="text-gray-500 text-xs">Imported</div>
        </div>
        <div className="kairos-card p-4">
          <div className="text-2xl font-bold text-kairos-gold">{successRate}%</div>
          <div className="text-gray-500 text-xs">Success Rate</div>
        </div>
        <div className="kairos-card p-4">
          <div className="text-2xl font-bold text-amber-400">{summary.warningRows}</div>
          <div className="text-gray-500 text-xs">Warnings</div>
        </div>
        <div className="kairos-card p-4">
          <div className="text-2xl font-bold text-red-400">{summary.skippedRows}</div>
          <div className="text-gray-500 text-xs">Skipped</div>
        </div>
      </div>

      {/* Duration */}
      <p className="text-gray-600 text-xs mb-8">
        Completed in {summary.duration}ms
      </p>

      {/* Actions */}
      <div className="flex gap-3 justify-center">
        <button
          onClick={onViewData}
          className="px-6 py-2 rounded-lg border border-gray-600 text-gray-300 hover:border-gray-400 transition"
        >
          View {category} Data
        </button>
        <button
          onClick={onNewImport}
          className="kairos-btn-gold px-6 py-2 rounded-lg font-semibold transition hover:scale-105"
        >
          Import More Data
        </button>
      </div>
    </div>
  );
}
