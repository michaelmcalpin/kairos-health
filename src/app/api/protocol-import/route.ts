import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import mammoth from "mammoth";
import * as XLSX from "xlsx";
import {
  extractProtocolRows,
  detectProtocolTypes,
  type ProtocolType,
  type ExtractInput,
} from "@/lib/ai/protocol-extract";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST /api/protocol-import
 *
 * AI-powered document import for the coach protocol bulk-editor.
 *
 * A coach uploads a messy Word / PDF / Excel / CSV / text document plus the
 * target protocol `type`. The server extracts the document's content (preserving
 * table structure where possible) and asks Claude to map it into the grid rows
 * for that protocol type (see src/lib/ai/protocol-extract.ts). The returned rows
 * match the bulk-edit grid columns exactly, so the coach can review and publish.
 *
 * Request (multipart/form-data):
 *   - file: File            (the uploaded document, max 15MB)
 *   - type: string          (one of: diet | supplements | peptides | workouts)
 *
 * Response 200:
 *   { rows: Array<Record<string, string|number|null>>, warnings: string[] }
 *
 * Auth: Clerk auth() — signed-in users only (401 otherwise). This route performs
 * its own auth, so it is listed in middleware.ts alongside /api/upload.
 */

// Node runtime — mammoth/xlsx and Buffer are not available on the edge runtime.
export const runtime = "nodejs";

const VALID_TYPES: ProtocolType[] = ["diet", "supplements", "peptides", "workouts"];

const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB

function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

/**
 * Turn an uploaded file buffer into the content payload the extractor accepts.
 * Returns a NextResponse (400) instead when the file type is unsupported.
 */
async function buildContent(
  file: File,
  ext: string,
): Promise<ExtractInput["content"] | NextResponse> {
  const buffer = Buffer.from(await file.arrayBuffer());
  const mime = file.type || "";

  const isDocx = ext === "docx" || mime === "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
  const isExcel =
    ext === "xlsx" ||
    ext === "xls" ||
    mime === "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
    mime === "application/vnd.ms-excel";
  const isCsvTxt = ext === "csv" || ext === "txt" || mime === "text/csv" || mime === "text/plain";
  const isPdf = ext === "pdf" || mime === "application/pdf";

  if (isDocx) {
    // Convert to HTML so the model sees table structure (schedule tables where
    // times of day are columns). Fall back to raw text if conversion fails.
    try {
      const result = await mammoth.convertToHtml({ buffer });
      return { kind: "text", text: result.value };
    } catch {
      const raw = await mammoth.extractRawText({ buffer });
      return { kind: "text", text: raw.value };
    }
  }

  if (isExcel) {
    const workbook = XLSX.read(buffer, { type: "buffer" });
    const parts: string[] = [];
    for (const sheetName of workbook.SheetNames) {
      const sheet = workbook.Sheets[sheetName];
      if (!sheet) continue;
      const csv = XLSX.utils.sheet_to_csv(sheet);
      parts.push(`### Sheet: ${sheetName}\n${csv}`);
    }
    return { kind: "text", text: parts.join("\n\n") };
  }

  if (isCsvTxt) {
    return { kind: "text", text: buffer.toString("utf8") };
  }

  if (isPdf) {
    return { kind: "pdf", base64: buffer.toString("base64") };
  }

  return NextResponse.json(
    { error: "Unsupported file type. Allowed: DOCX, XLSX, XLS, CSV, TXT, PDF." },
    { status: 400 },
  );
}

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Coach-only: this endpoint runs documents through the AI extractor (spends
    // tokens) and is only meant for the coach bulk-editor. Reject clients.
    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
      columns: { role: true },
    });
    if (dbUser?.role !== "trainer" && dbUser?.role !== "super_admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const type = formData.get("type") as string | null;
    // "detect" mode classifies which tab the document belongs in (no type needed).
    const detect = formData.get("detect") === "1";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }
    if (!detect && (!type || !VALID_TYPES.includes(type as ProtocolType))) {
      return NextResponse.json(
        { error: "Invalid or missing protocol type", validTypes: VALID_TYPES },
        { status: 400 },
      );
    }
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "File too large. Maximum size is 15MB." }, { status: 400 });
    }

    const ext = extOf(file.name);
    const content = await buildContent(file, ext);
    if (content instanceof NextResponse) {
      return content; // unsupported file type (400)
    }

    if (detect) {
      const { detected, warnings } = await detectProtocolTypes(content);
      return NextResponse.json({ detected, warnings }, { status: 200 });
    }

    const { rows, warnings, plan } = await extractProtocolRows({
      type: type as ProtocolType,
      content,
    });

    return NextResponse.json({ rows, warnings, plan: plan ?? null }, { status: 200 });
  } catch (err) {
    // Do not leak internals or log file contents.
    console.error("[Protocol Import Error]", err instanceof Error ? err.message : String(err));
    return NextResponse.json({ error: "Failed to import document" }, { status: 500 });
  }
}
