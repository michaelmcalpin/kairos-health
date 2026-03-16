// ─── File Parsers ───────────────────────────────────────────────
// CSV and JSON parsing with error tolerance

export interface ParseResult {
  headers: string[];
  rows: string[][];
  errors: string[];
}

// ─── CSV Parser ─────────────────────────────────────────────────

export function parseCSV(content: string, delimiter: string = ","): ParseResult {
  const errors: string[] = [];
  const lines = splitCSVLines(content);

  if (lines.length === 0) {
    return { headers: [], rows: [], errors: ["File is empty"] };
  }

  const headers = parseCSVRow(lines[0], delimiter);
  if (headers.length === 0) {
    return { headers: [], rows: [], errors: ["No headers found in first row"] };
  }

  const rows: string[][] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (line === "") continue; // skip blank lines

    const row = parseCSVRow(line, delimiter);

    // Pad or trim to match header count
    if (row.length < headers.length) {
      while (row.length < headers.length) row.push("");
      errors.push(`Row ${i + 1}: fewer columns than headers, padded with empty values`);
    } else if (row.length > headers.length) {
      errors.push(`Row ${i + 1}: more columns than headers (${row.length} vs ${headers.length}), extra columns ignored`);
    }

    rows.push(row.slice(0, headers.length));
  }

  return { headers, rows, errors };
}

function splitCSVLines(content: string): string[] {
  const lines: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];

    if (ch === '"') {
      if (inQuote && i + 1 < content.length && content[i + 1] === '"') {
        // Escaped quote — pass both through, parseCSVRow will handle unescaping
        current += '""';
        i++;
      } else {
        inQuote = !inQuote;
        current += ch;
      }
    } else if ((ch === "\n" || ch === "\r") && !inQuote) {
      if (ch === "\r" && i + 1 < content.length && content[i + 1] === "\n") {
        i++;
      }
      lines.push(current);
      current = "";
    } else {
      current += ch;
    }
  }

  if (current.trim() !== "") {
    lines.push(current);
  }

  return lines;
}

function parseCSVRow(line: string, delimiter: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuote = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (ch === '"') {
      if (inQuote && i + 1 < line.length && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuote = !inQuote;
      }
    } else if (ch === delimiter && !inQuote) {
      fields.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}

// ─── JSON Parser ────────────────────────────────────────────────

export function parseJSON(content: string): ParseResult {
  const errors: string[] = [];

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch (e) {
    return { headers: [], rows: [], errors: [`Invalid JSON: ${(e as Error).message}`] };
  }

  // Support both array of objects and { data: [...] } wrapper
  let records: Record<string, unknown>[];

  if (Array.isArray(parsed)) {
    records = parsed as Record<string, unknown>[];
  } else if (
    parsed &&
    typeof parsed === "object" &&
    "data" in (parsed as Record<string, unknown>) &&
    Array.isArray((parsed as Record<string, unknown>).data)
  ) {
    records = (parsed as Record<string, unknown>).data as Record<string, unknown>[];
  } else {
    return { headers: [], rows: [], errors: ["JSON must be an array or { data: [...] }"] };
  }

  if (records.length === 0) {
    return { headers: [], rows: [], errors: ["No records found in JSON"] };
  }

  // Extract headers from all records (union of all keys)
  const headerSet = new Set<string>();
  for (const record of records) {
    if (record && typeof record === "object") {
      for (const key of Object.keys(record)) {
        headerSet.add(key);
      }
    }
  }
  const headers = Array.from(headerSet);

  // Convert to rows
  const rows: string[][] = [];
  for (let i = 0; i < records.length; i++) {
    const record = records[i];
    if (!record || typeof record !== "object") {
      errors.push(`Record ${i + 1}: not an object, skipped`);
      continue;
    }

    const row = headers.map((h) => {
      const val = (record as Record<string, unknown>)[h];
      if (val === null || val === undefined) return "";
      if (typeof val === "object") return JSON.stringify(val);
      return String(val);
    });

    rows.push(row);
  }

  return { headers, rows, errors };
}

// ─── Auto-detect Format ─────────────────────────────────────────

export function detectFormat(content: string): "csv" | "json" {
  const trimmed = content.trim();
  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
    return "json";
  }
  return "csv";
}

export function detectDelimiter(content: string): string {
  const firstLine = content.split("\n")[0] || "";
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;
  const semicolons = (firstLine.match(/;/g) || []).length;

  if (tabs > commas && tabs > semicolons) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}
