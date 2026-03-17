"use client";

import type { ColumnMapping, ImportCategory } from "@/lib/import/types";
import { IMPORT_CATEGORIES } from "@/lib/import/types";

interface ColumnMapperProps {
  category: ImportCategory;
  mappings: ColumnMapping[];
  onUpdate: (mappings: ColumnMapping[]) => void;
  onContinue: () => void;
  onBack: () => void;
  missingRequired: string[];
}

export function ColumnMapper({
  category,
  mappings,
  onUpdate,
  onContinue,
  onBack,
  missingRequired,
}: ColumnMapperProps) {
  const catMeta = IMPORT_CATEGORIES.find((c) => c.id === category);
  if (!catMeta) return null;

  const allTargetFields = [...catMeta.requiredFields, ...catMeta.optionalFields];

  function handleFieldChange(index: number, targetField: string | null) {
    const updated = [...mappings];
    updated[index] = { ...updated[index], targetField };
    onUpdate(updated);
  }

  function handleTransformChange(index: number, transform: ColumnMapping["transform"]) {
    const updated = [...mappings];
    updated[index] = { ...updated[index], transform };
    onUpdate(updated);
  }

  const canContinue = missingRequired.length === 0;

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-lg font-heading font-bold text-white mb-2">Column Mapping</h3>
      <p className="text-gray-400 text-sm mb-4">
        Map your file columns to KAIROS data fields. Required fields are marked with *.
      </p>

      {missingRequired.length > 0 && (
        <div className="p-3 rounded-lg bg-red-900/20 border border-red-800/30 mb-4">
          <p className="text-red-400 text-sm font-semibold mb-1">Missing required fields:</p>
          <div className="flex flex-wrap gap-1">
            {missingRequired.map((f) => (
              <span key={f} className="px-2 py-0.5 rounded text-xs bg-red-900/30 text-red-300">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        {mappings.map((mapping, idx) => {
          const isRequired = mapping.targetField
            ? catMeta.requiredFields.includes(mapping.targetField)
            : false;

          return (
            <div
              key={mapping.sourceColumn}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-800/50 border border-gray-700"
            >
              {/* Source column */}
              <div className="flex-1 min-w-0">
                <div className="text-sm text-white font-mono truncate">
                  {mapping.sourceColumn}
                </div>
              </div>

              {/* Arrow */}
              <svg className="w-5 h-5 text-gray-500 flex-shrink-0" viewBox="0 0 20 20" fill="none">
                <path d="M4 10H16M16 10L12 6M16 10L12 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>

              {/* Target field select */}
              <select
                value={mapping.targetField ?? ""}
                onChange={(e) => handleFieldChange(idx, e.target.value || null)}
                className={`flex-1 px-2 py-1.5 rounded bg-gray-900 border text-sm ${
                  isRequired
                    ? "border-kairos-gold/50 text-kairos-gold"
                    : mapping.targetField
                      ? "border-emerald-700/50 text-emerald-400"
                      : "border-gray-600 text-gray-500"
                }`}
              >
                <option value="">-- Skip --</option>
                {allTargetFields.map((field) => (
                  <option key={field} value={field}>
                    {field}{catMeta.requiredFields.includes(field) ? " *" : ""}
                  </option>
                ))}
              </select>

              {/* Transform */}
              <select
                value={mapping.transform ?? "none"}
                onChange={(e) => handleTransformChange(idx, e.target.value as ColumnMapping["transform"])}
                className="w-28 px-2 py-1.5 rounded bg-gray-900 border border-gray-700 text-gray-400 text-xs"
              >
                <option value="none">No transform</option>
                <option value="date_parse">Parse date</option>
                <option value="number_parse">Parse number</option>
                <option value="lowercase">Lowercase</option>
                <option value="uppercase">Uppercase</option>
              </select>
            </div>
          );
        })}
      </div>

      <div className="flex justify-between mt-6">
        <button onClick={onBack} className="px-6 py-2 rounded-lg text-gray-400 hover:text-white transition">
          Back
        </button>
        <button
          onClick={onContinue}
          disabled={!canContinue}
          className={`px-8 py-2 rounded-lg font-semibold transition ${
            canContinue ? "kairos-btn-gold hover:scale-105" : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          Preview Import
        </button>
      </div>
    </div>
  );
}
