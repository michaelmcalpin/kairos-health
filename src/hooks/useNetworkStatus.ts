"use client";

import { useState, useEffect, useCallback } from "react";

export interface NetworkStatus {
  isOnline: boolean;
  wasOffline: boolean;
  effectiveType?: string;
  downlink?: number;
  rtt?: number;
}

/**
 * Monitors network connectivity status.
 * Tracks online/offline state and provides network quality info.
 */
export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    wasOffline: false,
  });

  const updateNetworkInfo = useCallback(() => {
    const connection = (navigator as unknown as Record<string, unknown>).connection as
      | { effectiveType?: string; downlink?: number; rtt?: number }
      | undefined;

    setStatus((prev) => ({
      ...prev,
      isOnline: navigator.onLine,
      effectiveType: connection?.effectiveType,
      downlink: connection?.downlink,
      rtt: connection?.rtt,
    }));
  }, []);

  useEffect(() => {
    const handleOnline = () => {
      setStatus((prev) => ({ ...prev, isOnline: true }));
    };

    const handleOffline = () => {
      setStatus((prev) => ({ ...prev, isOnline: false, wasOffline: true }));
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    // Network information API (Chrome)
    const connection = (navigator as unknown as Record<string, unknown>).connection as
      | EventTarget
      | undefined;
    if (connection) {
      connection.addEventListener("change", updateNetworkInfo);
    }

    updateNetworkInfo();

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      if (connection) {
        connection.removeEventListener("change", updateNetworkInfo);
      }
    };
  }, [updateNetworkInfo]);

  return status;
}
