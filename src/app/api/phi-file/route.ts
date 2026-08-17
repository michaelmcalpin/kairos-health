import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import {
  users,
  clinicalDocuments,
  labResults,
  progressPhotos,
  geneticProfiles,
} from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { getCoachAccess, hasCategoryAccess } from "@/lib/access/coach-access";

/**
 * Guard against SSRF: `realUrl` originates from DB columns that clients can
 * populate (lab importUrl/uploadPdf, progress photos, clinical doc fileUrl),
 * so only fetch inline data URLs or URLs hosted on our known storage backends.
 */
function isAllowedFileUrl(raw: string): boolean {
  if (raw.startsWith("data:")) return true; // inline (base64) — no network egress
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return false;
  }
  if (u.protocol !== "https:") return false;
  const host = u.hostname.toLowerCase();
  const allowedSuffixes = [
    ".blob.vercel-storage.com", // Vercel Blob
    ".blob.core.windows.net", // Azure Blob
  ];
  const extra = (process.env.PHI_ALLOWED_FILE_HOSTS ?? "")
    .split(",")
    .map((h) => h.trim().toLowerCase())
    .filter(Boolean);
  for (const base of [process.env.BLOB_STORE_BASE_URL]) {
    if (base) {
      try {
        extra.push(new URL(base).hostname.toLowerCase());
      } catch {
        /* ignore malformed env */
      }
    }
  }
  return (
    allowedSuffixes.some((s) => host.endsWith(s)) || extra.includes(host)
  );
}

/**
 * GET /api/phi-file
 *
 * Authorized proxy for PHI files (clinical documents, lab PDFs, progress
 * photos). The raw storage URLs are never sent to the browser — instead the
 * client links to this endpoint, which verifies the caller is allowed to see
 * the record's owner data before streaming the file back.
 *
 * Query params:
 *   type — "clinical" | "lab" | "photo"
 *   id   — record UUID
 *   i    — optional array index for photos (default 0)
 *
 * Access model (deny by default → 403):
 *   - the record owner (dbUser.id === record.clientId), OR
 *   - a super_admin, OR
 *   - a coach with read access to the relevant category
 *     ("labs" for clinical & lab, "healthData" for photo).
 */

type FileType = "clinical" | "lab" | "photo" | "genetics";

function sanitizeFilename(name: string): string {
  // Strip characters that could break the Content-Disposition header.
  return name.replace(/["\r\n]/g, "").trim() || "file";
}

export async function GET(req: NextRequest) {
  try {
    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!dbUser) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const type = req.nextUrl.searchParams.get("type") as FileType | null;
    const id = req.nextUrl.searchParams.get("id");
    const indexParam = req.nextUrl.searchParams.get("i");
    const index = indexParam ? parseInt(indexParam, 10) : 0;

    if (!type || !id || !["clinical", "lab", "photo", "genetics"].includes(type)) {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
    }

    // ── Load the record, resolve owner + real file URL + a category ──
    let ownerClientId: string | null = null;
    let realUrl: string | null = null;
    let category: "labs" | "healthData" = "labs";
    let safeName = "file";

    if (type === "clinical") {
      const doc = await db.query.clinicalDocuments.findFirst({
        where: eq(clinicalDocuments.id, id),
      });
      if (!doc) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      ownerClientId = doc.clientId;
      category = "labs";
      const parsed = doc.parsedData as Record<string, unknown> | null;
      const raw = parsed?.fileUrl ?? parsed?.url;
      realUrl = typeof raw === "string" ? raw : null;
      safeName = sanitizeFilename(doc.sourceFileName ?? doc.title ?? `document-${id}`);
    } else if (type === "lab") {
      const lab = await db.query.labResults.findFirst({
        where: eq(labResults.id, id),
      });
      if (!lab) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      ownerClientId = lab.clientId;
      category = "labs";
      realUrl = lab.pdfUrl ?? null;
      safeName = sanitizeFilename(`lab-result-${id}.pdf`);
    } else if (type === "genetics") {
      const gp = await db.query.geneticProfiles.findFirst({
        where: eq(geneticProfiles.id, id),
      });
      if (!gp) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      ownerClientId = gp.clientId;
      category = "labs";
      realUrl = gp.sourceUrl ?? null;
      safeName = sanitizeFilename(`genetics-${id}`);
    } else {
      // photo
      const photo = await db.query.progressPhotos.findFirst({
        where: eq(progressPhotos.id, id),
      });
      if (!photo) {
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      }
      ownerClientId = photo.clientId;
      category = "healthData";
      const urls = photo.photoUrls as string[] | null;
      realUrl = urls?.[index] ?? null;
      safeName = sanitizeFilename(`progress-photo-${id}-${index}`);
    }

    // ── Authorize (before revealing whether a file exists) ───────
    let authorized = false;
    if (ownerClientId && dbUser.id === ownerClientId) {
      authorized = true;
    } else if (dbUser.role === "super_admin") {
      authorized = true;
    } else if (ownerClientId) {
      const access = await getCoachAccess(db, dbUser.id, ownerClientId);
      authorized = hasCategoryAccess(access, category, "read");
    }

    if (!authorized) {
      return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 });
    }

    if (!realUrl || !isAllowedFileUrl(realUrl)) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    // ── Stream the file (no redirect following → SSRF hardening) ──
    const upstream = await fetch(realUrl, { redirect: "error" });
    if (!upstream.ok || !upstream.body) {
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }

    return new Response(upstream.body, {
      status: 200,
      headers: {
        "Content-Type":
          upstream.headers.get("content-type") ?? "application/octet-stream",
        "Content-Disposition": `inline; filename="${safeName}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return new Response(JSON.stringify({ error: "Internal server error" }), {
      status: 500,
    });
  }
}
