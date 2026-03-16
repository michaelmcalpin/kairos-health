"use client";

/**
 * KAIROS Offline Fallback Page
 *
 * Displayed when the user is offline and the requested page
 * isn't available in the service worker cache.
 */

export default function OfflinePage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-kairos-royal-dark p-6">
      <div className="max-w-md text-center">
        {/* Icon */}
        <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-kairos-card border border-kairos-border">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-10 w-10 text-kairos-gold"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18.364 5.636a9 9 0 010 12.728M5.636 18.364a9 9 0 010-12.728M8.464 15.536a5 5 0 010-7.072M15.536 8.464a5 5 0 010 7.072M12 12h.01"
            />
          </svg>
        </div>

        <h1 className="font-heading text-2xl font-bold text-white mb-3">
          You&apos;re Offline
        </h1>

        <p className="text-kairos-silver mb-6 leading-relaxed">
          It looks like you&apos;ve lost your internet connection.
          Don&apos;t worry — your health data is safe. Some features
          will be available once you reconnect.
        </p>

        <div className="space-y-3">
          <div className="kairos-card text-left">
            <h3 className="text-sm font-semibold text-kairos-gold mb-1">
              Available Offline
            </h3>
            <p className="text-xs text-kairos-silver-dark">
              Recently viewed dashboards, cached insights, and your last weekly report
              may still be accessible.
            </p>
          </div>

          <div className="kairos-card text-left">
            <h3 className="text-sm font-semibold text-kairos-gold mb-1">
              Pending Sync
            </h3>
            <p className="text-xs text-kairos-silver-dark">
              Any check-ins or logs you submit while offline will automatically sync
              when your connection is restored.
            </p>
          </div>
        </div>

        <button
          onClick={() => window.location.reload()}
          className="kairos-btn-gold mt-6 w-full"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
