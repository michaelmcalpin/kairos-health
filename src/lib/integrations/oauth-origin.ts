/**
 * Derive the app's base URL from the incoming request (works behind the Vercel
 * proxy via x-forwarded-* headers). Using the real request host — instead of a
 * possibly-misconfigured NEXT_PUBLIC_APP_URL — guarantees the OAuth redirect_uri
 * matches the domain the coach is actually on (avoids redirect_uri_mismatch).
 * Falls back to NEXT_PUBLIC_APP_URL, then localhost, when no host header exists.
 */
export function getRequestBaseUrl(req: Request): string {
  const h = req.headers;
  const proto = h.get("x-forwarded-proto") ?? "https";
  const host = h.get("x-forwarded-host") ?? h.get("host");
  const raw = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
  return raw.replace(/\/+$/, ""); // strip any trailing slash
}
