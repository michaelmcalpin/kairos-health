"use client";

import { useServiceWorker } from "@/hooks/useServiceWorker";

/**
 * Shows a banner when a new version of the app is available.
 * Clicking "Update" applies the service worker update and reloads.
 */
export function UpdateBanner() {
  const { isUpdateAvailable, applyUpdate } = useServiceWorker();

  if (!isUpdateAvailable) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[100] bg-[#122055] px-4 py-2.5 safe-area-top">
      <div className="flex items-center justify-between max-w-lg mx-auto">
        <div className="flex items-center gap-2 text-white">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-kairos-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="text-sm font-medium">A new version is available</span>
        </div>
        <button
          onClick={applyUpdate}
          className="rounded-lg bg-kairos-gold px-3 py-1 text-xs font-semibold text-kairos-royal-dark hover:bg-kairos-gold-light transition-colors"
        >
          Update
        </button>
      </div>
    </div>
  );
}
