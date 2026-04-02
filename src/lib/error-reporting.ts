/**
 * Client-side error reporting.
 *
 * In production this sends structured error payloads to a `/api/report-error`
 * endpoint (fire-and-forget, never throws).  In development it logs to the
 * console with rich context.
 *
 * Integration point: swap the `sendToBackend` implementation for Sentry,
 * Datadog, LogRocket, or any other error tracking service.
 */

interface ErrorReport {
  message: string;
  stack?: string;
  componentStack?: string;
  url: string;
  timestamp: string;
  userAgent: string;
  /** Portal that the error occurred in */
  portal?: string;
}

const isProduction = typeof window !== "undefined" && window.location?.hostname !== "localhost";

/**
 * Fire-and-forget beacon to the backend.  Uses `navigator.sendBeacon`
 * for reliability (survives page unloads) with a `fetch` fallback.
 */
function sendToBackend(report: ErrorReport) {
  const payload = JSON.stringify(report);
  const url = "/api/report-error";

  try {
    if (typeof navigator !== "undefined" && navigator.sendBeacon) {
      navigator.sendBeacon(url, payload);
    } else {
      fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: payload,
        keepalive: true,
      }).catch(() => {
        // Swallow — error reporting must never crash the app
      });
    }
  } catch {
    // Swallow
  }
}

/**
 * Report an error from a React error boundary or global handler.
 */
export function reportError(
  error: Error,
  extra?: { componentStack?: string; portal?: string },
) {
  const report: ErrorReport = {
    message: error.message,
    stack: error.stack,
    componentStack: extra?.componentStack,
    url: typeof window !== "undefined" ? window.location.href : "unknown",
    timestamp: new Date().toISOString(),
    userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "unknown",
    portal: extra?.portal,
  };

  if (isProduction) {
    sendToBackend(report);
  }

  // Always log in dev; console.error is intentional here for error boundaries
  if (!isProduction) {
    console.error(`[KAIROS Error] ${report.portal ?? "global"}:`, error);
  }
}
