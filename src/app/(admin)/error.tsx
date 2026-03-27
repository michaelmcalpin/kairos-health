"use client";

import { AlertTriangle, RefreshCw } from "lucide-react";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center max-w-md">
        <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6">
          <AlertTriangle size={32} className="text-red-400" />
        </div>
        <h2 className="font-heading font-bold text-xl text-white mb-2">Something Went Wrong</h2>
        <p className="font-body text-sm text-kairos-silver-dark mb-2">
          An unexpected error occurred in the Admin Portal.
        </p>
        {error.digest && (
          <p className="font-body text-xs text-kairos-silver-dark mb-6">
            Error ID: {error.digest}
          </p>
        )}
        <button
          onClick={reset}
          className="kairos-btn-gold text-sm px-6 py-3 inline-flex items-center gap-2"
        >
          <RefreshCw size={16} /> Try Again
        </button>
      </div>
    </div>
  );
}
