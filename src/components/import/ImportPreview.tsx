"use client";

import type { ImportSession } from "@/lib/import/types";
import { computePreviewStats } from "@/lib/import/validator";

interface ImportPreviewProps {
  session: ImportSession;
  onToggleRow: (rowIndex: number) => void;
  onExecute: () => void;
  onBack: () => void;
}

export function ImportPreview({ session, onToggleRow, onExecute, onBack }: ImportPreviewProps) {
  const stats = computePreviewStats(session.rows);
  const previewRows = session.rows.slice(0, 50);

  // Collect all mapped field names for table headers
  const mappedFields = session.mappings
    .filter((m) => m.targetField !== null)
    .map((m) => m.targetField!);

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-lg font-heading font-bold text-white mb-2">Import Preview</h3>
      <p className="text-gray-400 text-sm mb-4">
        Review your data before importing. Toggle rows to skip problematic entries.
      </p>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total Rows" value={stats.total} color="#D4AF37" />
        <StatCard label="Valid" value={stats.validCount} color="#10B981" />
        <StatCard label="Warnings" value={stats.warningCount} color="#F59E0B" />
        <StatCard label="Errors" value={stats.errorCount} color="#EF4444" />
        <StatCard label="Skipped" value={stats.skipCount} color="#6B7280" />
      </div>

      {/* Data Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-800">
              <th className="px-3 py-2 text-left text-gray-500 text-xs w-12">#</th>
              <th className="px-3 py-2 text-left text-gray-500 text-xs w-16">Status</th>
              {mappedFields.map((field) => (
                <th key={field} className="px-3 py-2 text-left text-gray-500 text-xs whitespace-nowrap">
                  {field}
                </th>
              ))}
              <th className="px-3 py-2 text-left text-gray-500 text-xs w-16">Skip</th>
            </tr>
          </thead>
          <tbody>
            {previewRows.map((row) => {
              const hasError = row.errors.some((e) => e.severity === "error");
              const hasWarning = row.errors.some((e) => e.severity === "warning");

              return (
                <tr
                  key={row.rowIndex}
                  className={`border-t border-gray-800 ${
                    row.skip
                      ? "opacity-40"
                      : hasError
                        ? "bg-red-900/10"
                        : hasWarning
                          ? "bg-amber-900/10"
                          : ""
                  }`}
                >
                  <td className="px-3 py-2 text-gray-600 text-xs">{row.rowIndex + 1}</td>
                  <td className="px-3 py-2">
                    {row.skip ? (
                      <span className="text-gray-500 text-xs">Skipped</span>
                    ) : hasError ? (
                      <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title={row.errors.map((e) => e.message).join("; ")} />
                    ) : hasWarning ? (
                      <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" title={row.errors.map((e) => e.message).join("; ")} />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                    )}
                  </td>
                  {mappedFields.map((field) => (
                    <td key={field} className="px-3 py-2 text-gray-300 text-xs whitespace-nowrap max-w-[150px] truncate">
                      {row.data[field] || <span className="text-gray-700">—</span>}
                    </td>
                  ))}
                  <td className="px-3 py-2">
                    <button
                      type="button"
                      onClick={() => onToggleRow(row.rowIndex)}
                      className={`w-8 h-5 rounded-full transition-colors relative ${
                        row.skip ? "bg-gray-700" : "bg-emerald-600"
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                          row.skip ? "left-0.5" : "left-3.5"
                        }`}
                      />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {session.rows.length > 50 && (
        <p className="text-gray-600 text-xs mt-2 text-center">
          Showing first 50 of {session.rows.length} rows
        </p>
      )}

      {/* Error Summary */}
      {stats.errorCount > 0 && (
        <div className="mt-4 p-3 rounded-lg bg-red-900/20 border border-red-800/30">
          <p className="text-red-400 text-sm font-semibold mb-2">
            {stats.errorCount} row{stats.errorCount > 1 ? "s" : ""} with errors (will be skipped):
          </p>
          <div className="space-y-1 max-h-32 overflow-y-auto">
            {session.rows
              .filter((r) => r.errors.some((e) => e.severity === "error"))
              .slice(0, 10)
              .map((r) => (
                <p key={r.rowIndex} className="text-red-300 text-xs">
                  Row {r.rowIndex + 1}: {r.errors.map((e) => e.message).join(", ")}
                </p>
              ))}
          </div>
        </div>
      )}

      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition">
          Back to Mapping
        </button>
        <button
          onClick={onExecute}
          className="kairos-btn-gold px-8 py-2 rounded-lg font-semibold transition hover:scale-105"
        >
          Import {stats.validCount + stats.warningCount} Rows
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="kairos-card p-3 text-center">
      <div className="text-2xl font-bold" style={{ color }}>{value}</div>
      <div className="text-gray-500 text-xs mt-1">{label}</div>
    </div>
  );
}
