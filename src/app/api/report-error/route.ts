import { NextResponse } from "next/server";
import { logger } from "@/lib/middleware/logger";
import { checkBodySize } from "@/lib/middleware/sanitize";
import { applyRateLimit, type RateLimitConfig } from "@/lib/middleware/rate-limit";

/** Tight limit: 20 reports per minute per IP to prevent log-spam abuse */
const ERROR_REPORT_LIMIT: RateLimitConfig = { maxRequests: 20, windowMs: 60_000 };

/**
 * Client-side error reporting endpoint.
 *
 * Accepts structured error payloads from the browser and logs them
 * via the structured logger.  Intentionally unauthenticated so error
 * reports are never lost due to expired sessions.
 */
export async function POST(req: Request) {
  const rl = await applyRateLimit(req, ERROR_REPORT_LIMIT);
  if (!rl.allowed && rl.response) return rl.response;

  const sizeErr = checkBodySize(req.headers.get("content-length"), 16_384); // 16 KB max
  if (sizeErr) {
    return NextResponse.json({ error: "Payload too large" }, { status: 413 });
  }

  try {
    const body = await req.json();

    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "unknown";
    const serverUserAgent = req.headers.get("user-agent") || "unknown";

    logger.error("client", "Client-side error", {
      message: typeof body.message === "string" ? body.message.slice(0, 500) : "unknown",
      url: typeof body.url === "string" ? body.url.slice(0, 500) : "unknown",
      portal: typeof body.portal === "string" ? body.portal.slice(0, 50) : undefined,
      userAgent: serverUserAgent.slice(0, 300),
      ip: ip.split(",")[0].trim(), // first IP from X-Forwarded-For chain
      timestamp: body.timestamp,
    });

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
