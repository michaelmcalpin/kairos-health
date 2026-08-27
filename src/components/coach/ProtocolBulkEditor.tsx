"use client";

import { useEffect, useRef, useState } from "react";
import {
  Plus,
  Trash2,
  ClipboardPaste,
  Upload,
  Download,
  Sparkles,
  Eraser,
  Eye,
  Send,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ──────────────────────────────────────────────────
type ProtocolType = "diet" | "supplements" | "peptides" | "workouts";
type Column = { key: string; label: string; type: "text" | "number" };
type GridRow = Record<string, string | number | null>;
/** Internal editable rows keep everything as strings for simple controlled inputs. */
type EditRow = Record<string, string>;

type Props = {
  clientId: string;
  type: ProtocolType;
  columns: Column[];
  initialRows: GridRow[];
  onPublished?: () => void;
};

// Primary field(s) that make a row meaningful (and are required by the backend).
const PRIMARY_FIELDS: Record<ProtocolType, string[]> = {
  supplements: ["name"],
  peptides: ["name"],
  diet: ["meal"],
  workouts: ["day", "exercise"],
};

// One filled example row per type, keyed by column key — shows the coach the
// expected format inside the downloadable CSV template.
const SAMPLE_ROWS: Record<ProtocolType, Record<string, string>> = {
  supplements: {
    name: "Vitamin D3",
    dosage: "5000",
    unit: "IU",
    frequency: "daily",
    timeOfDay: "AM with food",
    notes: "Take with a fat source",
  },
  peptides: {
    name: "BPC-157",
    dosage: "250",
    unit: "mcg",
    frequency: "daily",
    route: "Subcutaneous",
    notes: "5 days on, 2 days off",
  },
  diet: {
    meal: "Breakfast",
    items: "3 eggs, oats, blueberries",
    calories: "450",
    protein: "30",
    carbs: "40",
    fat: "15",
  },
  workouts: {
    day: "Monday",
    exercise: "Back Squat",
    muscleGroup: "Legs",
    sets: "4",
    reps: "8-10",
    rest: "90",
    notes: "Warm up thoroughly first",
  },
};

// ─── Helpers ────────────────────────────────────────────────
/** Quote a CSV field when it contains a comma, quote, or newline. */
function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

/** Coerce AI/JSON rows (mixed string|number|null) into the grid's string cells. */
function typedRowsToEditRows(columns: Column[], rows: GridRow[]): EditRow[] {
  return rows.map((row) => {
    const r: EditRow = emptyRow(columns);
    for (const c of columns) {
      const v = row?.[c.key];
      r[c.key] = v === null || v === undefined ? "" : String(v);
    }
    return r;
  });
}

function emptyRow(columns: Column[]): EditRow {
  const r: EditRow = {};
  for (const c of columns) r[c.key] = "";
  return r;
}

/** Seed editable string rows from the (typed) grid rows the backend returned. */
function seedRows(columns: Column[], rows: GridRow[]): EditRow[] {
  const mapped = rows.map((row) => {
    const r: EditRow = {};
    for (const c of columns) {
      const v = row[c.key];
      r[c.key] = v === null || v === undefined ? "" : String(v);
    }
    return r;
  });
  return mapped.length > 0 ? mapped : [emptyRow(columns)];
}

/** Always keep at least one (empty) row available to type into. */
function ensureRows(columns: Column[], rows: EditRow[]): EditRow[] {
  return rows.length > 0 ? rows : [emptyRow(columns)];
}

/**
 * Coerce the editable string rows into the payload the backend expects:
 *  - number columns → number | null
 *  - text columns   → trimmed string | null
 *  - drop rows missing their required primary field(s)
 * Keys are emitted in `columns` order to keep the server-side diff stable.
 */
function buildPayload(type: ProtocolType, columns: Column[], rows: EditRow[]): GridRow[] {
  const primary = PRIMARY_FIELDS[type];
  const out: GridRow[] = [];
  for (const row of rows) {
    const hasPrimary = primary.every((k) => (row[k] ?? "").trim().length > 0);
    if (!hasPrimary) continue;
    const obj: GridRow = {};
    for (const c of columns) {
      const raw = (row[c.key] ?? "").trim();
      if (c.type === "number") {
        if (raw === "") obj[c.key] = null;
        else {
          const n = Number(raw);
          obj[c.key] = Number.isFinite(n) ? n : raw;
        }
      } else {
        obj[c.key] = raw === "" ? null : raw;
      }
    }
    out.push(obj);
  }
  return out;
}

/** Split a pasted block into a matrix by newline (rows) and TAB (columns). */
function parseTsvMatrix(text: string): string[][] {
  const normalized = text.replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  // Trim a single trailing empty line (spreadsheets add one).
  if (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.map((line) => line.split("\t"));
}

/** RFC-ish CSV parser: handles quoted fields, embedded commas, and "" escapes. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let field = "";
  let row: string[] = [];
  let inQuotes = false;
  const src = text.replace(/\r\n?/g, "\n");
  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (inQuotes) {
      if (ch === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  // Flush the last field/row.
  row.push(field);
  rows.push(row);
  // Drop a trailing all-empty row.
  if (rows.length > 1) {
    const last = rows[rows.length - 1];
    if (last.length === 1 && last[0] === "") rows.pop();
  }
  return rows;
}

/** Map a TSV/positional matrix onto column keys, in column order. */
function matrixToRows(columns: Column[], matrix: string[][]): EditRow[] {
  return matrix.map((cells) => {
    const r: EditRow = {};
    columns.forEach((c, j) => {
      r[c.key] = (cells[j] ?? "").trim();
    });
    return r;
  });
}

/**
 * Map a CSV matrix (with a header row) onto column keys by case-insensitive
 * matching against each column's key or label. Unknown headers are ignored.
 */
function csvToRows(columns: Column[], matrix: string[][]): EditRow[] {
  if (matrix.length === 0) return [];
  const header = matrix[0].map((h) => h.trim().toLowerCase());
  // headerIndex[columnKey] = matrix column index (or -1)
  const colForIndex: (string | null)[] = header.map((h) => {
    const match = columns.find((c) => c.key.toLowerCase() === h || c.label.toLowerCase() === h);
    return match ? match.key : null;
  });
  const hasAnyMatch = colForIndex.some((k) => k !== null);
  // If no header matched a known column, treat it as headerless positional data.
  if (!hasAnyMatch) return matrixToRows(columns, matrix);

  return matrix.slice(1).map((cells) => {
    const r: EditRow = emptyRow(columns);
    colForIndex.forEach((key, j) => {
      if (key) r[key] = (cells[j] ?? "").trim();
    });
    return r;
  });
}

// ─── Component ──────────────────────────────────────────────
export default function ProtocolBulkEditor({
  clientId,
  type,
  columns,
  initialRows,
  onPublished,
}: Props) {
  const [rows, setRows] = useState<EditRow[]>(() => seedRows(columns, initialRows));
  const [activeCell, setActiveCell] = useState<{ r: number; c: number } | null>(null);

  const [showPasteBox, setShowPasteBox] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [pendingImport, setPendingImport] = useState<{ rows: EditRow[]; label: string } | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [aiNotice, setAiNotice] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [showPublishConfirm, setShowPublishConfirm] = useState(false);

  const [preview, setPreview] = useState<string[] | null>(null);
  const [published, setPublished] = useState<{ summary: string; bullets: string[]; itemCount: number } | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const aiInputRef = useRef<HTMLInputElement | null>(null);

  // Re-seed whenever the incoming rows identity changes (e.g. after a publish refetch).
  useEffect(() => {
    setRows(seedRows(columns, initialRows));
    setActiveCell(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialRows, type]);

  const previewMutation = trpc.coach.protocolBulk.previewDiff.useMutation({
    onSuccess: (res) => {
      setPreview(res.bullets);
      setPublished(null);
    },
  });
  const publishMutation = trpc.coach.protocolBulk.publish.useMutation({
    onSuccess: (res) => {
      setPublished(res);
      setPreview(null);
      onPublished?.();
    },
  });

  // ── Row mutators ──
  const setCell = (ri: number, key: string, value: string) =>
    setRows((prev) => prev.map((row, i) => (i === ri ? { ...row, [key]: value } : row)));

  const addRow = () => setRows((prev) => [...prev, emptyRow(columns)]);

  const deleteRow = (ri: number) =>
    setRows((prev) => ensureRows(columns, prev.filter((_, i) => i !== ri)));

  const clearAll = () => {
    setRows([emptyRow(columns)]);
    setShowClearConfirm(false);
    setPreview(null);
    setPublished(null);
  };

  // ── Paste directly into the grid (fills from the focused cell) ──
  const handleCellPaste = (ri: number, ci: number, e: React.ClipboardEvent<HTMLInputElement>) => {
    const text = e.clipboardData.getData("text");
    if (!text || (!text.includes("\t") && !text.includes("\n"))) return; // plain single-cell paste
    e.preventDefault();
    const matrix = parseTsvMatrix(text);
    setRows((prev) => {
      const next = prev.map((row) => ({ ...row }));
      matrix.forEach((cells, dr) => {
        const targetR = ri + dr;
        while (next.length <= targetR) next.push(emptyRow(columns));
        cells.forEach((cell, dc) => {
          const col = columns[ci + dc];
          if (col) next[targetR][col.key] = cell.trim();
        });
      });
      return next;
    });
  };

  // ── Import from a paste box (whole-grid, positional) ──
  const loadPasteBox = () => {
    setImportError(null);
    const trimmed = pasteText.trim();
    if (!trimmed) {
      setImportError("Nothing to import — paste rows copied from your spreadsheet first.");
      return;
    }
    const parsed = matrixToRows(columns, parseTsvMatrix(pasteText));
    if (parsed.length === 0) {
      setImportError("Could not read any rows from the pasted text.");
      return;
    }
    setPendingImport({ rows: parsed, label: `pasted rows` });
  };

  // ── Import from a CSV file ──
  const handleCsvFile = async (file: File) => {
    setImportError(null);
    try {
      const text = await file.text();
      const matrix = parseCsv(text).filter((r) => !(r.length === 1 && r[0].trim() === ""));
      if (matrix.length === 0) {
        setImportError("That CSV appears to be empty.");
        return;
      }
      const parsed = csvToRows(columns, matrix);
      if (parsed.length === 0) {
        setImportError("No data rows found in that CSV.");
        return;
      }
      setPendingImport({ rows: parsed, label: file.name });
    } catch {
      setImportError("Could not read that file. Make sure it's a valid .csv export.");
    }
  };

  // ── Download a CSV template (header keys + one sample row) ──
  const downloadTemplate = () => {
    const header = columns.map((c) => csvEscape(c.key)).join(",");
    const sample = SAMPLE_ROWS[type] ?? {};
    const example = columns.map((c) => csvEscape(sample[c.key] ?? "")).join(",");
    const csv = `${header}\n${example}\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${type}-template.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // ── Import with AI (Word / PDF / Excel / CSV → parsed rows) ──
  const handleAiFile = async (file: File) => {
    setImportError(null);
    setAiNotice(null);
    setAiLoading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("type", type);
      const res = await fetch("/api/protocol-import", { method: "POST", body: form });
      if (!res.ok) {
        setImportError("Import failed. Supported: Word, PDF, Excel, CSV.");
        return;
      }
      const data = (await res.json()) as { rows?: GridRow[]; warnings?: string[] };
      const aiRows = Array.isArray(data?.rows) ? data.rows : [];
      const warnings = Array.isArray(data?.warnings) ? data.warnings.filter(Boolean) : [];
      if (aiRows.length === 0) {
        // Surface the real reason (missing API key, parse failure, truncation,
        // or genuinely empty) instead of a generic "couldn't find rows".
        setImportError(
          warnings.length > 0
            ? warnings.join(" ")
            : "AI couldn't find matching rows in that document — try a different file or enter manually.",
        );
        return;
      }
      if (warnings.length > 0) setAiNotice(warnings.join(" "));
      setPendingImport({ rows: typedRowsToEditRows(columns, aiRows), label: `${file.name} (AI)` });
    } catch {
      setImportError("Import failed. Supported: Word, PDF, Excel, CSV.");
    } finally {
      setAiLoading(false);
    }
  };

  const applyImport = (mode: "replace" | "append") => {
    if (!pendingImport) return;
    setRows((prev) =>
      ensureRows(
        columns,
        mode === "replace"
          ? pendingImport.rows
          : [...prev.filter((r) => columns.some((c) => (r[c.key] ?? "").trim() !== "")), ...pendingImport.rows],
      ),
    );
    setPendingImport(null);
    setPasteText("");
    setShowPasteBox(false);
    setPreview(null);
    setPublished(null);
  };

  // ── Preview / Publish ──
  const handlePreview = () => {
    setPublished(null);
    previewMutation.mutate({ clientId, type, rows: buildPayload(type, columns, rows) });
  };
  const handlePublish = () => {
    setShowPublishConfirm(false);
    publishMutation.mutate({ clientId, type, rows: buildPayload(type, columns, rows) });
  };

  const payloadCount = buildPayload(type, columns, rows).length;
  // Rows the coach typed into that will NOT publish because they're missing a
  // required field (e.g. a supplement with no Name) — surfaced so nothing is
  // silently dropped.
  const primaryLabels = PRIMARY_FIELDS[type]
    .map((k) => columns.find((c) => c.key === k)?.label ?? k)
    .join(" + ");
  const nonEmptyRowCount = rows.filter((r) =>
    columns.some((c) => (r[c.key] ?? "").trim() !== ""),
  ).length;
  const skippedCount = Math.max(0, nonEmptyRowCount - payloadCount);
  const busy = previewMutation.isPending || publishMutation.isPending;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={addRow}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/25 transition-colors"
        >
          <Plus size={13} /> Add row
        </button>
        <button
          onClick={() => {
            setShowPasteBox((v) => !v);
            setImportError(null);
          }}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors"
        >
          <ClipboardPaste size={13} /> Paste rows
        </button>
        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
        >
          <Upload size={13} /> Import CSV
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleCsvFile(f);
            e.target.value = ""; // allow re-importing the same file
          }}
        />
        <button
          onClick={downloadTemplate}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
          title={`Download a ${type}-template.csv to fill in Excel or Google Sheets`}
        >
          <Download size={13} /> Download CSV template
        </button>
        <button
          onClick={() => aiInputRef.current?.click()}
          disabled={aiLoading}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/25 transition-colors disabled:opacity-60"
        >
          {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
          {aiLoading ? "Reading your document with AI…" : "Import with AI"}
        </button>
        <input
          ref={aiInputRef}
          type="file"
          accept=".docx,.pdf,.xlsx,.xls,.csv,.txt"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleAiFile(f);
            e.target.value = ""; // allow re-selecting the same file
          }}
        />
        <div className="flex-1" />
        <span className="text-[11px] text-kairos-silver-dark">
          {payloadCount} row{payloadCount === 1 ? "" : "s"} ready
        </span>
        <button
          onClick={() => setShowClearConfirm(true)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-red-400 hover:border-red-500/40 transition-colors"
        >
          <Eraser size={13} /> Clear all
        </button>
      </div>

      {/* AI import helper */}
      <p className="text-[11px] text-kairos-silver-dark flex items-center gap-1.5">
        <Sparkles size={12} className="text-kairos-gold/70 shrink-0" />
        Upload a Word, PDF, Excel, or CSV file — AI reads it and fills the grid for you to review before publishing.
      </p>

      {/* AI note (non-blocking) */}
      {aiNotice && (
        <div className="px-3 py-2 rounded-lg text-xs bg-kairos-gold/10 border border-kairos-gold/25 text-kairos-gold flex items-start gap-2">
          <Sparkles size={13} className="mt-0.5 shrink-0" /> <span>AI note: {aiNotice}</span>
        </div>
      )}

      {/* Paste box */}
      {showPasteBox && (
        <div className="rounded-xl border border-gray-700 bg-gray-800/40 p-3 space-y-2">
          <p className="text-xs text-kairos-silver-dark">
            Copy rows from Google Sheets or Excel and paste below (tab-separated). Column order should match the grid:{" "}
            <span className="text-kairos-silver">{columns.map((c) => c.label).join(" · ")}</span>
          </p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            placeholder={`Paste tab-separated rows here…`}
            className="kairos-input w-full h-24 resize-y text-xs font-mono"
          />
          <div className="flex items-center gap-2">
            <button
              onClick={loadPasteBox}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/25 transition-colors"
            >
              <ClipboardPaste size={13} /> Load pasted rows
            </button>
            <button
              onClick={() => {
                setShowPasteBox(false);
                setPasteText("");
                setImportError(null);
              }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Import error */}
      {importError && (
        <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertCircle size={13} /> {importError}
        </div>
      )}

      {/* Pending import — replace vs append */}
      {pendingImport && (
        <div className="px-3 py-2.5 rounded-lg bg-kairos-gold/5 border border-kairos-gold/20 flex flex-wrap items-center gap-2">
          <span className="text-xs text-gray-300">
            Parsed <span className="text-kairos-gold font-medium">{pendingImport.rows.length}</span> row
            {pendingImport.rows.length === 1 ? "" : "s"} from {pendingImport.label}. Apply how?
          </span>
          <div className="flex-1" />
          <button
            onClick={() => applyImport("replace")}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-kairos-gold text-kairos-royal-dark border border-kairos-gold hover:bg-kairos-gold-light transition-colors"
          >
            Replace grid
          </button>
          <button
            onClick={() => applyImport("append")}
            className="px-3 py-1 rounded-lg text-xs font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
          >
            Append
          </button>
          <button
            onClick={() => setPendingImport(null)}
            className="p-1 rounded-lg text-gray-500 hover:text-white transition-colors"
            title="Cancel import"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Editable grid */}
      <div className="overflow-x-auto rounded-xl border border-gray-700">
        <table className="w-full text-sm border-collapse">
          <thead>
            <tr className="bg-gray-800/60 border-b border-gray-700">
              <th className="w-9 py-2 px-2 text-[10px] text-gray-500 uppercase font-medium text-center">#</th>
              {columns.map((c) => (
                <th key={c.key} className="text-left py-2 px-2 text-[10px] text-gray-500 uppercase font-medium whitespace-nowrap">
                  {c.label}
                </th>
              ))}
              <th className="w-9" />
            </tr>
          </thead>
          <tbody>
            {rows.map((row, ri) => (
              <tr key={ri} className="border-b border-gray-800/50 hover:bg-gray-800/20">
                <td className="py-1 px-2 text-center text-[11px] text-gray-600 align-middle">{ri + 1}</td>
                {columns.map((c, ci) => (
                  <td key={c.key} className="py-1 px-1.5">
                    <input
                      type={c.type === "number" ? "number" : "text"}
                      value={row[c.key] ?? ""}
                      onChange={(e) => setCell(ri, c.key, e.target.value)}
                      onFocus={() => setActiveCell({ r: ri, c: ci })}
                      onPaste={(e) => handleCellPaste(ri, ci, e)}
                      placeholder={c.label}
                      className={`w-full min-w-[7rem] px-2 py-1 rounded-md bg-gray-900/60 border text-xs text-white placeholder-gray-600 focus:outline-none transition-colors ${
                        activeCell?.r === ri && activeCell?.c === ci
                          ? "border-kairos-gold/60"
                          : "border-gray-700 hover:border-gray-600 focus:border-kairos-gold/50"
                      }`}
                    />
                  </td>
                ))}
                <td className="py-1 px-2 text-center">
                  <button
                    onClick={() => deleteRow(ri)}
                    className="p-1 rounded-md text-gray-600 hover:text-red-400 transition-colors"
                    title="Delete row"
                  >
                    <Trash2 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <p className="text-[11px] text-kairos-silver-dark">
        Tip: click a cell and paste a block copied from Google Sheets / Excel to fill multiple cells at once. Empty rows are
        ignored on publish.
      </p>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2 pt-1">
        <button
          onClick={handlePreview}
          disabled={busy}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors disabled:opacity-50"
        >
          {previewMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Eye size={14} />}
          Preview changes
        </button>
        <button
          onClick={() => setShowPublishConfirm(true)}
          disabled={busy || payloadCount === 0}
          title={payloadCount === 0 ? "Add at least one complete row before publishing" : undefined}
          className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-medium bg-kairos-gold text-kairos-royal-dark border border-kairos-gold hover:bg-kairos-gold-light transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {publishMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
          Publish &amp; notify client
        </button>
        <span className="text-[11px] text-kairos-silver-dark">
          {payloadCount} row{payloadCount === 1 ? "" : "s"} ready
        </span>
      </div>

      {/* Missing-required-field warning — rows the coach typed but that won't
          publish because a required field (e.g. Name) is blank. */}
      {skippedCount > 0 && (
        <div className="px-3 py-2 rounded-lg text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 flex items-center gap-2">
          <AlertCircle size={13} />
          {skippedCount} row{skippedCount === 1 ? "" : "s"} won&apos;t be published — missing required {primaryLabels}. Fill {skippedCount === 1 ? "it" : "them"} in or delete the row.
        </div>
      )}

      {/* Errors from preview/publish */}
      {previewMutation.isError && (
        <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertCircle size={13} /> {previewMutation.error.message}
        </div>
      )}
      {publishMutation.isError && (
        <div className="px-3 py-2 rounded-lg text-xs bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
          <AlertCircle size={13} /> {publishMutation.error.message}
        </div>
      )}

      {/* Preview panel */}
      {preview && (
        <div className="rounded-xl border border-kairos-gold/25 bg-kairos-gold/5 p-4">
          <h3 className="text-sm font-heading font-semibold text-kairos-gold mb-2 flex items-center gap-2">
            <Eye size={14} /> These changes will be applied:
          </h3>
          {preview.length === 0 ? (
            <p className="text-xs text-gray-400">No changes detected.</p>
          ) : (
            <ul className="space-y-1.5">
              {preview.map((b, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="text-kairos-gold mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Published panel */}
      {published && (
        <div className="rounded-xl border border-green-500/30 bg-green-500/5 p-4">
          <h3 className="text-sm font-heading font-semibold text-green-400 mb-2 flex items-center gap-2">
            <CheckCircle2 size={14} /> Client notified:
          </h3>
          <p className="text-sm text-gray-200 mb-2">{published.summary}</p>
          {published.bullets.length > 0 && (
            <ul className="space-y-1.5 mb-2">
              {published.bullets.map((b, i) => (
                <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                  <span className="text-green-400 mt-0.5">•</span>
                  <span>{b}</span>
                </li>
              ))}
            </ul>
          )}
          <p className="text-[11px] text-kairos-silver-dark">
            {published.itemCount} item{published.itemCount === 1 ? "" : "s"} now saved. The client has been alerted.
          </p>
        </div>
      )}

      {/* Publish confirm — destructive (replaces the client's live protocol) and
          notifies the client, so require explicit confirmation. */}
      {showPublishConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowPublishConfirm(false)}
        >
          <div
            className="w-full max-w-sm kairos-card border border-gray-700 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-kairos-gold/10 border border-kairos-gold/30 flex items-center justify-center">
                <Send size={18} className="text-kairos-gold" />
              </div>
              <h2 className="text-lg font-heading font-bold text-white">Publish &amp; notify client?</h2>
            </div>
            <p className="text-sm text-gray-400 mb-2">
              This replaces the client&apos;s current {type} protocol with {payloadCount} row{payloadCount === 1 ? "" : "s"} and alerts them (in-app, email, and push/text per their settings).
            </p>
            {skippedCount > 0 && (
              <p className="text-xs text-amber-300 mb-4">
                {skippedCount} incomplete row{skippedCount === 1 ? "" : "s"} will be skipped.
              </p>
            )}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => setShowPublishConfirm(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-kairos-gold text-kairos-royal-dark hover:bg-kairos-gold-light transition-colors"
              >
                Publish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Clear-all confirm */}
      {showClearConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setShowClearConfirm(false)}
        >
          <div
            className="w-full max-w-sm kairos-card border border-gray-700 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Eraser size={18} className="text-red-400" />
              </div>
              <h2 className="text-lg font-heading font-bold text-white">Clear all rows?</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              This empties the grid you&apos;re editing. It will not change the client&apos;s saved protocol until you publish.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={clearAll}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/90 hover:bg-red-500 text-white transition-colors"
              >
                Clear all
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
