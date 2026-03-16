// ─── Import Processor ───────────────────────────────────────────
// Orchestrates the full import pipeline: parse → map → validate → resolve conflicts → import

import type {
  ImportSession,
  ImportCategory,
  ImportSummary,
  ImportRow,
  ConflictStrategy,
  ColumnMapping,
} from "./types";
import { createImportSession, IMPORT_CATEGORIES } from "./types";
import { parseCSV, parseJSON, detectFormat, detectDelimiter } from "./parser";
import { autoMapColumns, validateRows, computePreviewStats } from "./validator";

// ─── Pipeline Steps ─────────────────────────────────────────────

export function startImport(
  category: ImportCategory,
  fileName: string,
  fileSize: number,
  content: string,
): ImportSession {
  const session = createImportSession(category, fileName, fileSize);

  // Step 1: Parse
  session.status = "parsing";
  const format = detectFormat(content);
  session.format = format;

  const parseResult =
    format === "json"
      ? parseJSON(content)
      : parseCSV(content, detectDelimiter(content));

  if (parseResult.rows.length === 0) {
    session.status = "error";
    return session;
  }

  session.headers = parseResult.headers;
  session.rawData = parseResult.rows;

  // Step 2: Auto-map columns
  session.status = "mapping";
  session.mappings = autoMapColumns(parseResult.headers, category);

  // Step 3: Validate
  session.status = "validating";
  session.rows = validateRows(
    parseResult.rows,
    parseResult.headers,
    session.mappings,
    category,
  );

  session.status = "previewing";
  session.updatedAt = new Date().toISOString();

  return session;
}

export function updateMappings(
  session: ImportSession,
  mappings: ColumnMapping[],
): ImportSession {
  session.mappings = mappings;

  // Re-validate with new mappings
  session.rows = validateRows(
    session.rawData,
    session.headers,
    mappings,
    session.category,
  );

  session.updatedAt = new Date().toISOString();
  return { ...session };
}

export function setConflictStrategy(
  session: ImportSession,
  strategy: ConflictStrategy,
): ImportSession {
  session.conflictStrategy = strategy;

  // Apply strategy to all conflicts
  for (const conflict of session.conflicts) {
    switch (strategy) {
      case "skip_all":
        conflict.resolution = "skip";
        break;
      case "overwrite_all":
        conflict.resolution = "overwrite";
        break;
      case "keep_both_all":
        conflict.resolution = "keep_both";
        break;
      default:
        break;
    }
  }

  session.updatedAt = new Date().toISOString();
  return { ...session };
}

export function toggleRowSkip(
  session: ImportSession,
  rowIndex: number,
): ImportSession {
  const row = session.rows.find((r) => r.rowIndex === rowIndex);
  if (row) {
    row.skip = !row.skip;
  }
  session.updatedAt = new Date().toISOString();
  return { ...session };
}

// ─── Execute Import ─────────────────────────────────────────────

export function executeImport(session: ImportSession): ImportSession {
  const startTime = Date.now();
  session.status = "importing";

  const rowsToImport = session.rows.filter(
    (r) => !r.skip && !r.errors.some((e) => e.severity === "error"),
  );

  // In production, this would batch-insert into the database
  // For now, we simulate the import and build summary stats
  const importedCount = rowsToImport.length;

  const preview = computePreviewStats(session.rows);

  const summary: ImportSummary = {
    totalRows: session.rows.length,
    validRows: preview.validCount,
    errorRows: preview.errorCount,
    warningRows: preview.warningCount,
    skippedRows: preview.skipCount,
    conflicts: session.conflicts.length,
    importedRows: importedCount,
    duration: Date.now() - startTime,
  };

  session.summary = summary;
  session.status = "complete";
  session.updatedAt = new Date().toISOString();

  return { ...session };
}

// ─── Template Generation ────────────────────────────────────────

export function generateTemplate(category: ImportCategory): string {
  const catMeta = IMPORT_CATEGORIES.find((c) => c.id === category);
  if (!catMeta) return "";

  const headers = [...catMeta.requiredFields, ...catMeta.optionalFields];
  const sampleValues = headers.map((h) => catMeta.sampleRow[h] ?? "");

  const headerLine = headers.join(",");
  const sampleLine = sampleValues.map((v) =>
    v.includes(",") ? `"${v}"` : v
  ).join(",");

  return `${headerLine}\n${sampleLine}\n`;
}

// ─── Import History (in-memory store) ───────────────────────────

const importHistory = new Map<string, ImportSession>();

export function saveToHistory(session: ImportSession): void {
  importHistory.set(session.id, session);
}

export function getHistory(userId?: string): ImportSession[] {
  // In production, filter by userId from database
  void userId;
  return Array.from(importHistory.values()).sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
}

export function getSession(id: string): ImportSession | null {
  return importHistory.get(id) ?? null;
}

// ─── Utility ────────────────────────────────────────────────────

export function getMissingRequiredMappings(session: ImportSession): string[] {
  const catMeta = IMPORT_CATEGORIES.find((c) => c.id === session.category);
  if (!catMeta) return [];

  const mappedTargets = new Set(
    session.mappings
      .filter((m) => m.targetField !== null)
      .map((m) => m.targetField),
  );

  return catMeta.requiredFields.filter((f) => !mappedTargets.has(f));
}

export function getImportPreview(session: ImportSession, limit: number = 5): ImportRow[] {
  return session.rows.slice(0, limit);
}
