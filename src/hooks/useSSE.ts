/**
 * KAIROS SSE Hook — Client-side Server-Sent Events consumer
 *
 * Provides auto-reconnecting SSE subscription with event buffering.
 */

"use client";

import { useState, useEffect, useRef, useCallback } from "react";

export interface SSEMessage<T = unknown> {
  id?: string;
  type: string;
  data: T;
  receivedAt: number;
}

export interface UseSSEOptions {
  /** SSE endpoint URL */
  url: string;
  /** Whether to connect (set false to disable) */
  enabled?: boolean;
  /** Max messages to keep in buffer */
  maxBuffer?: number;
  /** Reconnect delay in ms (doubles on each retry, max 30s) */
  reconnectDelay?: number;
  /** Max reconnect attempts (0 = unlimited) */
  maxRetries?: number;
  /** Event types to listen for (default: all) */
  eventTypes?: string[];
}

export interface UseSSEReturn<T> {
  /** Array of received messages */
  messages: SSEMessage<T>[];
  /** Latest single message */
  latest: SSEMessage<T> | null;
  /** Connection state */
  status: "connecting" | "connected" | "disconnected" | "error";
  /** Error if any */
  error: string | null;
  /** Number of reconnect attempts */
  retryCount: number;
  /** Clear message buffer */
  clear: () => void;
  /** Manually reconnect */
  reconnect: () => void;
}

export function useSSE<T = unknown>(options: UseSSEOptions): UseSSEReturn<T> {
  const {
    url,
    enabled = true,
    maxBuffer = 50,
    reconnectDelay = 2000,
    maxRetries = 0,
    eventTypes,
  } = options;

  const [messages, setMessages] = useState<SSEMessage<T>[]>([]);
  const [latest, setLatest] = useState<SSEMessage<T> | null>(null);
  const [status, setStatus] = useState<UseSSEReturn<T>["status"]>("disconnected");
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  const eventSourceRef = useRef<EventSource | null>(null);
  const retryTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastEventIdRef = useRef<string | undefined>(undefined);

  const cleanup = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close();
      eventSourceRef.current = null;
    }
    if (retryTimerRef.current) {
      clearTimeout(retryTimerRef.current);
      retryTimerRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    cleanup();

    if (!enabled) {
      setStatus("disconnected");
      return;
    }

    setStatus("connecting");
    setError(null);

    const eventSource = new EventSource(url);
    eventSourceRef.current = eventSource;

    // Handle connection open
    eventSource.addEventListener("connected", () => {
      setStatus("connected");
      setRetryCount(0);
    });

    // Handle heartbeat (keep-alive)
    eventSource.addEventListener("heartbeat", () => {
      // No-op, just keeps connection alive
    });

    // Generic message handler
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data) as T;
        const message: SSEMessage<T> = {
          id: event.lastEventId || undefined,
          type: event.type,
          data,
          receivedAt: Date.now(),
        };

        if (event.lastEventId) {
          lastEventIdRef.current = event.lastEventId;
        }

        setLatest(message);
        setMessages((prev) => {
          const next = [...prev, message];
          return next.length > maxBuffer ? next.slice(-maxBuffer) : next;
        });
      } catch {
        // Ignore parse errors for non-JSON events
      }
    };

    // Subscribe to specific event types or use onmessage for all
    if (eventTypes && eventTypes.length > 0) {
      for (const type of eventTypes) {
        eventSource.addEventListener(type, handleMessage);
      }
    } else {
      eventSource.onmessage = handleMessage;
    }

    // Handle errors
    eventSource.onerror = () => {
      if (eventSource.readyState === EventSource.CLOSED) {
        setStatus("error");
        setError("Connection lost");

        // Auto-reconnect with exponential backoff
        if (maxRetries === 0 || retryCount < maxRetries) {
          const delay = Math.min(reconnectDelay * Math.pow(2, retryCount), 30000);
          retryTimerRef.current = setTimeout(() => {
            setRetryCount((c) => c + 1);
            connect();
          }, delay);
        } else {
          setStatus("disconnected");
        }
      }
    };
  }, [url, enabled, maxBuffer, reconnectDelay, maxRetries, eventTypes, retryCount, cleanup]);

  // Connect/disconnect on mount/unmount or option changes
  useEffect(() => {
    connect();
    return cleanup;
  }, [connect, cleanup]);

  const clear = useCallback(() => {
    setMessages([]);
    setLatest(null);
  }, []);

  const reconnect = useCallback(() => {
    setRetryCount(0);
    connect();
  }, [connect]);

  return { messages, latest, status, error, retryCount, clear, reconnect };
}
