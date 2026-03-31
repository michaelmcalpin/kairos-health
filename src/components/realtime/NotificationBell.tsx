"use client";

/**
 * Notification Bell — Real-time notification indicator + dropdown
 *
 * Connects to /api/realtime/notifications SSE stream.
 * Shows unread count badge and dropdown with recent notifications.
 */

import React, { useState, useRef, useEffect } from "react";
import { useSSE } from "@/hooks/useSSE";

interface NotificationData {
  notificationId: string;
  title: string;
  body: string;
  category: "health" | "coaching" | "billing" | "system";
  actionUrl?: string;
  read: boolean;
}

const CATEGORY_ICONS: Record<string, string> = {
  health: "\ud83d\udcaa",
  coaching: "\ud83d\udc68\u200d\u2695\ufe0f",
  billing: "\ud83d\udcb3",
  system: "\u2699\ufe0f",
};

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const dropdownRef = useRef<HTMLDivElement>(null);

  const { messages, clear } = useSSE<NotificationData>({
    url: "/api/realtime/notifications",
    eventTypes: ["notification:new"],
    maxBuffer: 20,
  });

  const unreadCount = messages.filter((m) => !readIds.has(m.data.notificationId)).length;

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const markAllRead = () => {
    setReadIds(new Set(messages.map((m) => m.data.notificationId)));
  };

  const clearAll = () => {
    clear();
    setReadIds(new Set());
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <svg
          className="w-5 h-5 text-gray-600"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          <div className="flex items-center justify-between p-3 border-b border-gray-100">
            <span className="text-sm font-semibold text-kairos-royal">Notifications</span>
            <div className="flex gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-kairos-gold hover:text-kairos-gold-dim transition-colors"
                >
                  Mark all read
                </button>
              )}
              {messages.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          <div className="max-h-80 overflow-y-auto">
            {messages.length > 0 ? (
              [...messages].reverse().map((msg, i) => {
                const n = msg.data;
                const isRead = readIds.has(n.notificationId);
                return (
                  <div
                    key={msg.id || i}
                    className={`p-3 border-b border-gray-50 hover:bg-gray-50 transition-colors cursor-pointer ${
                      !isRead ? "bg-blue-50/50" : ""
                    }`}
                    onClick={() => {
                      setReadIds((prev) => { const next = new Set(Array.from(prev)); next.add(n.notificationId); return next; });
                      if (n.actionUrl) {
                        window.location.href = n.actionUrl;
                      }
                    }}
                  >
                    <div className="flex items-start gap-2">
                      <span className="text-sm flex-shrink-0">
                        {CATEGORY_ICONS[n.category] || "\ud83d\udd14"}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${!isRead ? "font-semibold" : "font-medium"} text-gray-800`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.body}</p>
                      </div>
                      {!isRead && (
                        <span className="w-2 h-2 rounded-full bg-blue-500 flex-shrink-0 mt-1.5" />
                      )}
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="text-center text-gray-400 text-sm py-8">
                No notifications yet
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
