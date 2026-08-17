import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadFile } from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Accepts a file upload (multipart/form-data) and stores it in the configured
 * cloud storage provider (Vercel Blob or Azure Blob Storage).
 * Returns the public URL.
 *
 * Supports images (progress photos) and documents (PDFs, lab files, clinical docs).
 * Use the `category` form field to control the storage path:
 *   - "photo" (default): progress-photos/{userId}/{timestamp}.{ext}
 *   - "clinical": clinical-docs/{userId}/{timestamp}.{ext}
 *   - "lab": lab-results/{userId}/{timestamp}.{ext}
 *   - "document": documents/{userId}/{timestamp}.{ext}
 *
 * Set STORAGE_PROVIDER env var to "vercel" (default) or "azure".
 * Vercel requires BLOB_READ_WRITE_TOKEN.
 * Azure requires AZURE_STORAGE_CONNECTION_STRING.
 *
 * Falls back to base64 data URL if no storage is configured (dev mode).
 */

// Allowed MIME types by category
const IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp", "image/heic"];
const DOCUMENT_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
];
const ALL_ALLOWED_TYPES = [...IMAGE_TYPES, ...DOCUMENT_TYPES];

// Extension fallback — browsers/OSes sometimes report an empty or generic
// ("application/octet-stream") MIME type for .doc/.docx/.pdf files, which would
// otherwise be wrongly rejected. We accept by extension in that case.
const IMAGE_EXTS = ["jpg", "jpeg", "png", "webp", "heic"];
const DOCUMENT_EXTS = ["pdf", "doc", "docx", "csv", "xls", "xlsx", "txt"];
const ALL_ALLOWED_EXTS = [...IMAGE_EXTS, ...DOCUMENT_EXTS];

function extOf(name: string): string {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
}

const CATEGORY_PATHS: Record<string, string> = {
  photo: "progress-photos",
  clinical: "clinical-docs",
  lab: "lab-results",
  document: "documents",
};

export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) ?? "photo";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type — accept by MIME, or by extension when the browser
    // reports an empty / generic MIME (common for .doc/.docx and some PDFs).
    const ext = extOf(file.name);
    const mimeOk = ALL_ALLOWED_TYPES.includes(file.type);
    const extOk = ALL_ALLOWED_EXTS.includes(ext);
    if (!mimeOk && !extOk) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC, PDF, DOC, DOCX, CSV, XLS, XLSX, TXT" },
        { status: 400 }
      );
    }

    // Validate file size: images 10MB, documents 25MB
    const isImage = IMAGE_TYPES.includes(file.type) || (!file.type && IMAGE_EXTS.includes(ext));
    const maxSize = isImage ? 10 * 1024 * 1024 : 25 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${isImage ? "10MB" : "25MB"}.` },
        { status: 400 }
      );
    }

    // Dev fallback: no storage configured
    const provider = process.env.STORAGE_PROVIDER ?? "vercel";
    const hasVercelToken = !!process.env.BLOB_READ_WRITE_TOKEN;
    const hasAzureConn = !!process.env.AZURE_STORAGE_CONNECTION_STRING;

    if (
      (provider === "vercel" && !hasVercelToken) ||
      (provider === "azure" && !hasAzureConn)
    ) {
      // Dev fallback: images can be inlined as base64 data URLs. Documents
      // (PDF/Word/etc.) cannot be persisted without a storage backend, so fail
      // loudly with an actionable message instead of returning a fake URL.
      if (isImage) {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:${file.type || "image/jpeg"};base64,${base64}`;
        return NextResponse.json({ url: dataUrl, storage: "base64-fallback" });
      }
      return NextResponse.json(
        {
          error:
            "Document uploads are not configured on the server. Set BLOB_READ_WRITE_TOKEN (Vercel Blob) or AZURE_STORAGE_CONNECTION_STRING to enable PDF/Word uploads.",
        },
        { status: 503 }
      );
    }

    // Upload to configured cloud storage
    const uploadExt = ext || (isImage ? "jpg" : "pdf");
    const folder = CATEGORY_PATHS[category] ?? CATEGORY_PATHS.document;
    const pathname = `${folder}/${clerkId}/${Date.now()}.${uploadExt}`;

    const EXT_MIME: Record<string, string> = {
      pdf: "application/pdf",
      doc: "application/msword",
      docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      csv: "text/csv",
      xls: "application/vnd.ms-excel",
      xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      txt: "text/plain",
      jpg: "image/jpeg",
      jpeg: "image/jpeg",
      png: "image/png",
      webp: "image/webp",
      heic: "image/heic",
    };
    const result = await uploadFile(file, pathname, {
      access: "public",
      contentType: file.type || EXT_MIME[ext] || "application/octet-stream",
    });

    return NextResponse.json({
      url: result.url,
      storage: provider === "azure" ? "azure-blob" : "vercel-blob",
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
  } catch (err) {
    console.error("[Upload Error]", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
