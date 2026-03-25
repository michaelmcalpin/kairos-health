"use client";

import { useEffect } from "react";

/**
 * Global error boundary — catches errors in the root layout itself.
 * This is the last line of defense for unhandled errors.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[KAIROS] Global error:", error);
  }, [error]);

  return (
    <html lang="en" className="dark">
      <body style={{ margin: 0, backgroundColor: "#0A0F1F", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: "24px" }}>
          <div style={{ textAlign: "center", maxWidth: "400px" }}>
            <div style={{ width: 64, height: 64, borderRadius: "50%", backgroundColor: "rgba(239,68,68,0.15)", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 24px" }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f87171" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
                <path d="M12 9v4" />
                <path d="M12 17h.01" />
              </svg>
            </div>
            <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 8 }}>Something Went Wrong</h1>
            <p style={{ fontSize: 14, color: "#9CA3AF", marginBottom: 8 }}>
              KAIROS encountered an unexpected error. Please try refreshing the page.
            </p>
            {error.digest && (
              <p style={{ fontSize: 12, color: "#6B7280", marginBottom: 24 }}>
                Error ID: {error.digest}
              </p>
            )}
            <button
              onClick={reset}
              style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "12px 24px", borderRadius: 8,
                backgroundColor: "#D4AF37", color: "#0A0F1F",
                border: "none", cursor: "pointer", fontWeight: 600, fontSize: 14,
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
                <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
                <path d="M16 21h5v-5" />
              </svg>
              Try Again
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
