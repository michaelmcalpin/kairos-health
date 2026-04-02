import { NextResponse } from "next/server";
import { logger } from "@/lib/middleware/logger";
import { checkBodySize } from "@/lib/middleware/sanitize";

/**
 * Client-side error reporting endpoint.
 *
 * Accepts structured error payloads from the browser and logs them
 * via the structured logger.  Intentionally unauthenticated so error
 * reports are never lost due to expired sessions.
 */
export async function POST(req: Request) {
  const sizeErr = checkBodySize(req.headers.get("content-length"), 16_384); // 16 KB max
  if (sizeErr) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await req.json();

    logger.error("client", "Client-side error", {
      message: typeof body.message === "string" ? body.message.slice(0, 500) : "unknown",
      url: typeof body.url === "string" ? body.url.slice(0, 500) : "unknown",
      portal: typeof body.portal === "string" ? body.portal.slice(0, 50) : undefined,
      userAgent: typeof body.userAgent === "string" ? body.userAgent.slice(0, 300) : undefined,
      timestamp: body.timestamp,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
