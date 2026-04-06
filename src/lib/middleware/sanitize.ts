/**
 * Input sanitization and request validation utilities.
 *
 * These helpers strip dangerous content from user input before it reaches
 * business logic.  They are intentionally conservative — they remove
 * potential attack vectors while preserving legitimate data.
 */

/** Maximum allowed request body size (1 MB) */
export const MAX_BODY_BYTES = 1_048_576;

/** Maximum allowed webhook body size (5 MB — Stripe can send large payloads) */
export const MAX_WEBHOOK_BODY_BYTES = 5_242_880;

/**
 * Strip common XSS vectors from a plain-text string.
 * Removes `<script>` tags, `javascript:` protocols, `on*=` event handlers,
 * and `data:text/html` URIs.  The result is safe for insertion into text
 * contexts but NOT for direct rendering as raw HTML.
 */
export function sanitizeText(input: string): string {
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/javascript\s*:/gi, "")
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, "")
    .replace(/data\s*:\s*text\/html/gi, "");
}

/**
 * Recursively sanitize all string values in a plain object or array.
 * Returns a new object (the original is not mutated).
 */
export function sanitizeDeep<T>(value: T): T {
  if (typeof value === "string") return sanitizeText(value) as unknown as T;
  if (Array.isArray(value)) return value.map(sanitizeDeep) as unknown as T;
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = sanitizeDeep(v);
    }
    return out as T;
  }
  return value;
}

/**
 * Validate that a Content-Length header (or measured body size) is within
 * the allowed limit.  Returns an error message or null if OK.
 */
export function checkBodySize(
  contentLength: string | null,
  limit: number = MAX_BODY_BYTES,
): string | null {
  if (!contentLength) return null; // unknown length — will be caught when body is read
  const bytes = parseInt(contentLength, 10);
  if (Number.isNaN(bytes)) return null;
  if (bytes > limit) {
    return `Request body too large (${bytes} bytes exceeds ${limit} byte limit)`;
  }
  return null;
}

/**
 * Verify that a mutation request originates from our own app.
 *
 * Compares the `Origin` header (falling back to `Referer`) against
 * NEXT_PUBLIC_APP_URL.  Returns null if the check passes, or a
 * descriptive error string if the origin is foreign.
 *
 * Webhook routes should NOT use this — they come from external services.
 */
export function checkOrigin(req: Request): string | null {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) return null; // skip in dev when URL isn't configured

  const origin = req.headers.get("origin");
  const referer = req.headers.get("referer");
  const source = origin || (referer ? new URL(referer).origin : null);

  if (!source) {
    // Browsers always send Origin on POST; missing header is suspicious
    return "Missing Origin header";
  }

  if (source !== new URL(appUrl).origin) {
    return `Origin mismatch: ${source}`;
  }

  return null;
}
