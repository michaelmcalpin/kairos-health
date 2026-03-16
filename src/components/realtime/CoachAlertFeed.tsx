"use client";

/**
 * Coach Alert Feed — Real-time client alert stream
 *
 * Connects to /api/realtime/alerts and displays incoming
 * alerts from assigned clients with severity indicators.
 */

import React from "react";
import { useSSE, type SSEMessage } from "@/hooks/useSSE";

interface AlertData {
  alertId: string;
  type: string;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  message: string;
  clientId?: string;
  clientName?: string;
}

const SEVERITY_STYLES: Record<string, { bg: string; border: string; dot: string; text: string }> = {
  critical: { bg: "bg-red-50", border: "border-red-200", dot: "bg-red-500", text: "text-red-700" },
  high: { bg: "bg-orange-50", border: "border-orange-200", dot: "bg-orange-500", text: "text-orange-700" },
  medium: { bg: "bg-amber-50", border: "border-amber-200", dot: "bg-amber-500", text: "text-amber-700" },
  low: { bg: "bg-blue-50", border: "border-blue-200", dot: "bg-blue-500", text: "text-blue-700" },
};

function AlertItem({ message }: { message: SSEMessage<AlertData> }) {
  const alert = message.data;
  const styles = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.low;
  const timeAgo = getTimeAgo(message.receivedAt);

  return (
    <div className={`p-3 rounded-lg border ${styles.bg} ${styles.border} transition-all`}>
      <div className="flex items-start gap-2">
        <span className={`inline-block w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${styles.dot}`} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-sm font-semibold ${styles.text}`}>{alert.title}</span>
            <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
          </div>
          {alert.clientName && (
            <p className="text-xs text-gray-500 mt-0.5">{alert.clientName}</p>
          )}
          <p className={`text-xs mt-1 ${styles.text} opacity-80`}>{alert.message}</p>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  if (seconds < 10) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  return `${Math.floor(seconds / 3600)}h ago`;
}

export function CoachAlertFeed({ demo = false, maxItems = 10 }: { demo?: boolean; maxItems?: number }) {
  const { messages, status, clear } = useSSE<AlertData>({
    url: `/api/realtime/alerts${demo ? "?demo=true" : ""}`,
    eventTypes: ["alert:new"],
    maxBuffer: maxItems,
  });

  const sortedMessages = [...messages].reverse();

  // Count by severity
  const counts = messages.reduce(
    (acc, m) => {
      acc[m.data.severity] = (acc[m.data.severity] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return (
    <div className="kairos-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-semibold text-[#122055] uppercase tracking-wider">
          Live Alert Feed
        </h3>
        <div className="flex items-center gap-3">
          {counts.critical && (
            <span className="text-xs font-bold text-red-600">{counts.critical} Critical</span>
          )}
          {counts.high && (
            <span className="text-xs font-bold text-orange-600">{counts.high} High</span>
          )}
          <span
            className={`inline-block w-2 h-2 rounded-full ${
              status === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`}
          />
          {messages.length > 0 && (
            <button
              onClick={clear}
              className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="space-y-2 max-h-[400px] overflow-y-auto">
        {sortedMessages.length > 0 ? (
          sortedMessages.map((msg, i) => <AlertItem key={msg.id || i} message={msg} />)
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">
            {status === "connected"
              ? "No alerts yet — monitoring clients..."
              : "Connecting to alert stream..."}
          </div>
        )}
      </div>
    </div>
  );
}
