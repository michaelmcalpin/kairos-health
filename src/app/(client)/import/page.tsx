"use client";

import { ImportWizard } from "@/components/import/ImportWizard";

export default function ImportPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-heading font-bold text-white">Import Data</h1>
        <p className="text-gray-400 mt-1">
          Import health data from CSV, TSV, or JSON files into your KAIROS dashboard.
        </p>
      </div>

      <ImportWizard />
    </div>
  );
}
