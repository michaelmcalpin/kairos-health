"use client";

import { useEffect } from "react";
import { reportError } from "@/lib/error-reporting";

/**
 * Installs global `error` and `unhandledrejection` listeners so that
 * uncaught exceptions and forgotten-await rejections are funnelled
 * through the structured error-reporting pipeline.
 *
 * Mount once in the root layout — renders nothing.
 */
export function GlobalErrorCatcher() {
  useEffect(() => {
    function onError(event: ErrorEvent) {
      if (event.error instanceof Error) {
        reportError(event.error, { portal: "global" });
      }
    }

    function onRejection(event: PromiseRejectionEvent) {
      const err =
        event.reason instanceof Error
          ? event.reason
          : new Error(String(event.reason ?? "Unhandled promise rejection"));
      reportError(err, { portal: "global:unhandledrejection" });
    }

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
