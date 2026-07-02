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

    // Validate file type
    if (!ALL_ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC, PDF, DOC, DOCX, CSV, XLS, XLSX, TXT" },
        { status: 400 }
      );
    }

    // Validate file size: images 10MB, documents 25MB
    const isImage = IMAGE_TYPES.includes(file.type);
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
      // Dev fallback: return base64 data URL (images only; docs return placeholder)
      if (isImage) {
        const buffer = await file.arrayBuffer();
        const base64 = Buffer.from(buffer).toString("base64");
        const dataUrl = `data:${file.type};base64,${base64}`;
        return NextResponse.json({ url: dataUrl, storage: "base64-fallback" });
      }
      return NextResponse.json({
        url: `placeholder://${file.name}`,
        storage: "base64-fallback",
        warning: "No cloud storage configured. Document not persisted.",
      });
    }

    // Upload to configured cloud storage
    const ext = file.name.split(".").pop() || (isImage ? "jpg" : "pdf");
    const folder = CATEGORY_PATHS[category] ?? CATEGORY_PATHS.document;
    const pathname = `${folder}/${clerkId}/${Date.now()}.${ext}`;

    const result = await uploadFile(file, pathname, {
      access: "public",
      contentType: file.type,
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
