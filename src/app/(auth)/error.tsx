"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, RefreshCw, Home } from "lucide-react";
import { reportError } from "@/lib/error-reporting";

export default function AuthError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    reportError(error, { portal: "auth" });
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-kairos-royal">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h2 className="font-heading font-bold text-xl text-white mb-2">Authentication Error</h2>
        <p className="font-body text-sm text-kairos-silver-dark mb-2">
          Something went wrong during sign-in. Please try again.
        </p>
        {error.digest && (
          <p className="font-body text-xs text-kairos-silver-dark mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <div className="flex items-center justify-center gap-3 mt-6">
          <button
            onClick={reset}
            className="kairos-btn-gold text-sm px-6 py-3 inline-flex items-center gap-2"
          >
            <RefreshCw size={16} /> Try Again
          </button>
          <Link href="/" className="kairos-btn-outline text-sm px-6 py-3 inline-flex items-center gap-2">
            <Home size={16} /> Home
          </Link>
        </div>
      </div>
    </div>
  );
}
