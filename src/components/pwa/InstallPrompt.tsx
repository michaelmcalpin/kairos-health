"use client";

import { useState, useEffect } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * PWA install prompt banner.
 * Intercepts the browser's beforeinstallprompt event and shows
 * a styled banner matching the KAIROS design system.
 */
export function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    // Check if already dismissed this session
    if (typeof sessionStorage !== "undefined" && sessionStorage.getItem("kairos-install-dismissed")) {
      setDismissed(true);
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setDismissed(true);
    setDeferredPrompt(null);
    if (typeof sessionStorage !== "undefined") {
      sessionStorage.setItem("kairos-install-dismissed", "1");
    }
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="fixed bottom-16 left-4 right-4 z-50 md:bottom-4 md:left-auto md:right-4 md:w-80">
      <div className="rounded-xl border border-kairos-border bg-kairos-card p-4 shadow-2xl">
        <div className="flex items-start gap-3">
          {/* App icon */}
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-kairos-royal to-kairos-royal-dark border border-kairos-border">
            <span className="font-heading text-xl font-bold text-kairos-gold">K</span>
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-heading text-sm font-semibold text-white">
              Install KAIROS
            </h3>
            <p className="mt-0.5 text-xs text-kairos-silver-dark leading-relaxed">
              Add KAIROS to your home screen for quick access, offline support, and push notifications.
            </p>

            <div className="mt-3 flex items-center gap-2">
              <button
                onClick={handleInstall}
                className="kairos-btn-gold px-4 py-1.5 text-xs"
              >
                Install
              </button>
              <button
                onClick={handleDismiss}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-kairos-silver-dark hover:text-kairos-silver transition-colors"
              >
                Not now
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
