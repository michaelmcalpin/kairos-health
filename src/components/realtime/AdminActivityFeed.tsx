"use client";

/**
 * Admin Activity Feed — Real-time platform activity stream
 *
 * Connects to /api/realtime/feed and displays platform-wide
 * audit events, system actions, and user activity.
 */

import React from "react";
import { useSSE, type SSEMessage } from "@/hooks/useSSE";

interface AuditData {
  entryId: string;
  action: string;
  actor: string;
  resource: string;
  details?: string;
}

const ACTION_ICONS: Record<string, string> = {
  "user.login": "\ud83d\udd11",
  "user.registered": "\ud83d\udc64",
  "glucose.reading": "\ud83d\udcc8",
  "coach.review": "\ud83d\udc68\u200d\u2695\ufe0f",
  "coach.assigned": "\ud83e\udd1d",
  "alert.resolved": "\u2705",
  "subscription.renewed": "\ud83d\udcb3",
  "lab.uploaded": "\ud83e\uddea",
  "checkin.completed": "\ud83d\udcdd",
  "report.generated": "\ud83d\udcca",
};

function AuditItem({ message }: { message: SSEMessage<AuditData> }) {
  const entry = message.data;
  const icon = ACTION_ICONS[entry.action] || "\u26a1";
  const timeStr = new Date(message.receivedAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

  return (
    <div className="flex items-start gap-3 py-2 border-b border-gray-100 last:border-0">
      <span className="text-lg flex-shrink-0 mt-0.5">{icon}</span>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm font-medium text-gray-800">{entry.actor}</span>
          <span className="text-xs text-gray-400 flex-shrink-0 tabular-nums">{timeStr}</span>
        </div>
        <p className="text-xs text-gray-500 mt-0.5">
          <span className="font-mono text-[10px] bg-gray-100 rounded px-1 py-0.5">
            {entry.action}
          </span>{" "}
          {entry.details}
        </p>
      </div>
    </div>
  );
}

export function AdminActivityFeed({ demo = false, maxItems = 20 }: { demo?: boolean; maxItems?: number }) {
  const { messages, status, clear } = useSSE<AuditData>({
    url: `/api/realtime/feed${demo ? "?demo=true" : ""}`,
    eventTypes: ["admin:audit"],
    maxBuffer: maxItems,
  });

  const sortedMessages = [...messages].reverse();

  return (
    <div className="kairos-card p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading text-sm font-semibold text-kairos-royal uppercase tracking-wider">
          Platform Activity
        </h3>
        <div className="flex items-center gap-3">
          <span className="text-xs text-gray-400">{messages.length} events</span>
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

      <div className="max-h-[500px] overflow-y-auto">
        {sortedMessages.length > 0 ? (
          sortedMessages.map((msg, i) => <AuditItem key={msg.id || i} message={msg} />)
        ) : (
          <div className="text-center text-gray-400 text-sm py-8">
            {status === "connected"
              ? "Listening for platform activity..."
              : "Connecting to activity feed..."}
          </div>
        )}
      </div>
    </div>
  );
}
