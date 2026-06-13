import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { uploadFile } from "@/lib/storage";

/**
 * POST /api/upload
 *
 * Accepts a file upload (multipart/form-data) and stores it in the configured
 * cloud storage provider (Vercel Blob or Azure Blob Storage).
 * Returns the public URL. Used for progress photos and any future media uploads.
 *
 * Set STORAGE_PROVIDER env var to "vercel" (default) or "azure".
 * Vercel requires BLOB_READ_WRITE_TOKEN.
 * Azure requires AZURE_STORAGE_CONNECTION_STRING.
 *
 * Falls back to base64 data URL if no storage is configured (dev mode).
 */
export async function POST(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/heic"];
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json(
        { error: "Invalid file type. Allowed: JPEG, PNG, WebP, HEIC" },
        { status: 400 }
      );
    }

    // Validate file size (max 10MB)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      return NextResponse.json(
        { error: "File too large. Maximum size is 10MB." },
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
      // Dev fallback: return base64 data URL
      const buffer = await file.arrayBuffer();
      const base64 = Buffer.from(buffer).toString("base64");
      const dataUrl = `data:${file.type};base64,${base64}`;
      return NextResponse.json({ url: dataUrl, storage: "base64-fallback" });
    }

    // Upload to configured cloud storage
    const ext = file.name.split(".").pop() || "jpg";
    const pathname = `progress-photos/${clerkId}/${Date.now()}.${ext}`;

    const result = await uploadFile(file, pathname, {
      access: "public",
      contentType: file.type,
    });

    return NextResponse.json({
      url: result.url,
      storage: provider === "azure" ? "azure-blob" : "vercel-blob",
    });
  } catch (err) {
    console.error("[Upload Error]", err);
    return NextResponse.json(
      { error: "Upload failed" },
      { status: 500 }
    );
  }
}
