"use client";

import { useEffect, useState, useCallback } from "react";

export interface ServiceWorkerStatus {
  isSupported: boolean;
  isRegistered: boolean;
  isUpdateAvailable: boolean;
  registration: ServiceWorkerRegistration | null;
}

/**
 * Registers and manages the KAIROS service worker.
 * Detects updates and provides a method to apply them.
 */
export function useServiceWorker(): ServiceWorkerStatus & { applyUpdate: () => void } {
  const [status, setStatus] = useState<ServiceWorkerStatus>({
    isSupported: false,
    isRegistered: false,
    isUpdateAvailable: false,
    registration: null,
  });

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    setStatus((prev) => ({ ...prev, isSupported: true }));

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((registration) => {
        setStatus((prev) => ({
          ...prev,
          isRegistered: true,
          registration,
        }));

        // Check for updates
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener("statechange", () => {
            if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
              setStatus((prev) => ({ ...prev, isUpdateAvailable: true }));
            }
          });
        });
      })
      .catch((error) => {
        console.warn("[KAIROS] Service worker registration failed:", error);
      });
  }, []);

  const applyUpdate = useCallback(() => {
    if (status.registration?.waiting) {
      status.registration.waiting.postMessage({ type: "SKIP_WAITING" });
      window.location.reload();
    }
  }, [status.registration]);

  return { ...status, applyUpdate };
}
