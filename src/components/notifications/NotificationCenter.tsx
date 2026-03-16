"use client";

import { useState, useMemo } from "react";
import type { Notification, NotificationCategory } from "@/lib/notifications/types";
import { NotificationItem } from "./NotificationItem";

interface NotificationCenterProps {
  notifications: Notification[];
  onMarkRead?: (id: string) => void;
  onMarkAllRead?: () => void;
  onArchive?: (id: string) => void;
  onAction?: (url: string) => void;
}

const CATEGORY_FILTERS: { value: NotificationCategory | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "health_alert", label: "Health" },
  { value: "insight", label: "Insights" },
  { value: "coach_message", label: "Coach" },
  { value: "appointment", label: "Appointments" },
  { value: "billing", label: "Billing" },
  { value: "system", label: "System" },
];

export function NotificationCenter({
  notifications,
  onMarkRead,
  onMarkAllRead,
  onArchive,
  onAction,
}: NotificationCenterProps) {
  const [filter, setFilter] = useState<NotificationCategory | "all">("all");
  const [showUnreadOnly, setShowUnreadOnly] = useState(false);

  const filtered = useMemo(() => {
    let result = notifications.filter((n) => !n.archived);
    if (filter !== "all") {
      result = result.filter((n) => n.category === filter);
    }
    if (showUnreadOnly) {
      result = result.filter((n) => !n.read);
    }
    return result;
  }, [notifications, filter, showUnreadOnly]);

  const unreadCount = notifications.filter((n) => !n.read && !n.archived).length;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-kairos-border p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="font-heading text-base font-semibold text-white">
              Notifications
            </h2>
            {unreadCount > 0 && (
              <span className="inline-flex items-center justify-center h-5 min-w-[20px] rounded-full bg-kairos-gold px-1.5 text-[10px] font-bold text-kairos-royal-dark">
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUnreadOnly(!showUnreadOnly)}
              className={`text-xs font-medium px-2 py-1 rounded-md transition-colors ${
                showUnreadOnly
                  ? "bg-kairos-gold/20 text-kairos-gold"
                  : "text-kairos-silver-dark hover:text-kairos-silver"
              }`}
            >
              Unread only
            </button>
            {unreadCount > 0 && onMarkAllRead && (
              <button
                onClick={onMarkAllRead}
                className="text-xs font-medium text-kairos-silver-dark hover:text-kairos-gold transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>
        </div>

        {/* Category filters */}
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
          {CATEGORY_FILTERS.map((cat) => (
            <button
              key={cat.value}
              onClick={() => setFilter(cat.value)}
              className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
                filter === cat.value
                  ? "bg-kairos-gold text-kairos-royal-dark"
                  : "bg-kairos-royal-dark text-kairos-silver-dark hover:text-kairos-silver"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <span className="text-3xl mb-2">🔔</span>
            <p className="text-sm text-kairos-silver-dark">
              {showUnreadOnly ? "No unread notifications" : "No notifications yet"}
            </p>
          </div>
        ) : (
          <div className="divide-y divide-kairos-border/50">
            {filtered.map((notification) => (
              <NotificationItem
                key={notification.id}
                notification={notification}
                onRead={onMarkRead}
                onArchive={onArchive}
                onAction={onAction}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
