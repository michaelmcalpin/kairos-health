"use client";

import { useState, useRef } from "react";
import type { ImportCategory } from "@/lib/import/types";
import { IMPORT_CATEGORIES } from "@/lib/import/types";

interface FileUploadZoneProps {
  onFileSelect: (file: File, category: ImportCategory) => void;
}

export function FileUploadZone({ onFileSelect }: FileUploadZoneProps) {
  const [category, setCategory] = useState<ImportCategory>("glucose");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const catMeta = IMPORT_CATEGORIES.find((c) => c.id === category);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) onFileSelect(file, category);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) onFileSelect(file, category);
  }

  return (
    <div className="max-w-2xl mx-auto">
      {/* Category Selector */}
      <div className="mb-6">
        <label className="block text-sm text-gray-400 mb-2">Data Type</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {IMPORT_CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => setCategory(cat.id)}
              className={`px-3 py-2 rounded-lg text-xs font-medium transition border text-left ${
                category === cat.id
                  ? "border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]"
                  : "border-gray-700 bg-gray-800 text-gray-400 hover:border-gray-500"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* Category Info */}
      {catMeta && (
        <div className="kairos-card p-4 mb-6">
          <p className="text-gray-400 text-sm mb-2">{catMeta.description}</p>
          <div className="flex flex-wrap gap-2">
            {catMeta.requiredFields.map((f) => (
              <span key={f} className="px-2 py-0.5 rounded text-xs bg-red-900/20 text-red-400 border border-red-800/30">
                {f} *
              </span>
            ))}
            {catMeta.optionalFields.map((f) => (
              <span key={f} className="px-2 py-0.5 rounded text-xs bg-gray-800 text-gray-500">
                {f}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Drop Zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl p-12 text-center cursor-pointer transition-all ${
          dragOver
            ? "border-[#D4AF37] bg-[#D4AF37]/5"
            : "border-gray-700 hover:border-gray-500 bg-gray-800/30"
        }`}
      >
        <svg className="w-12 h-12 mx-auto mb-4 text-gray-500" viewBox="0 0 48 48" fill="none">
          <path d="M24 32V16M24 16L18 22M24 16L30 22" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M40 32V36C40 38.2 38.2 40 36 40H12C9.8 40 8 38.2 8 36V32" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <p className="text-white font-semibold mb-1">
          Drop your file here or click to browse
        </p>
        <p className="text-gray-500 text-sm">
          Supports CSV, TSV, and JSON files (up to 10MB)
        </p>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.tsv,.json,.txt"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
