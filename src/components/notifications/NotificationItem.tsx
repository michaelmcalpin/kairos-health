"use client";

import type { Notification } from "@/lib/notifications/types";

const categoryIcons: Record<string, string> = {
  health_alert: "⚠",
  insight: "💡",
  weekly_report: "📊",
  coach_message: "💬",
  appointment: "📅",
  lab_result: "🔬",
  supplement: "💊",
  fasting: "⏱",
  streak: "🔥",
  billing: "💳",
  system: "📢",
  onboarding: "🚀",
};

const priorityStyles = {
  urgent: "border-l-red-500 bg-red-500/5",
  high: "border-l-amber-500 bg-amber-500/5",
  normal: "border-l-kairos-border bg-transparent",
  low: "border-l-kairos-border bg-transparent",
};

interface NotificationItemProps {
  notification: Notification;
  onRead?: (id: string) => void;
  onArchive?: (id: string) => void;
  onAction?: (url: string) => void;
}

export function NotificationItem({
  notification,
  onRead,
  onArchive,
  onAction,
}: NotificationItemProps) {
  const icon = categoryIcons[notification.category] ?? "📌";
  const priorityClass = priorityStyles[notification.priority] ?? priorityStyles.normal;
  const isUnread = !notification.read;

  const timeAgo = getTimeAgo(notification.createdAt);

  return (
    <div
      className={`border-l-2 rounded-r-lg px-4 py-3 transition-all ${priorityClass} ${
        isUnread ? "opacity-100" : "opacity-70"
      }`}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <span className="text-lg mt-0.5">{icon}</span>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h4
              className={`text-sm truncate ${
                isUnread ? "font-semibold text-white" : "font-medium text-kairos-silver"
              }`}
            >
              {notification.title}
            </h4>
            {isUnread && (
              <span className="inline-block h-2 w-2 rounded-full bg-kairos-gold shrink-0" />
            )}
          </div>

          <p className="text-xs text-kairos-silver-dark leading-relaxed line-clamp-2">
            {notification.body}
          </p>

          <div className="flex items-center gap-3 mt-2">
            <span className="text-[10px] text-kairos-silver-dark">
              {timeAgo}
            </span>

            {notification.actionUrl && notification.actionLabel && (
              <button
                onClick={() => onAction?.(notification.actionUrl!)}
                className="text-[11px] font-medium text-kairos-gold hover:text-kairos-gold-light transition-colors"
              >
                {notification.actionLabel}
              </button>
            )}

            {isUnread && onRead && (
              <button
                onClick={() => onRead(notification.id)}
                className="text-[11px] text-kairos-silver-dark hover:text-kairos-silver transition-colors"
              >
                Mark read
              </button>
            )}

            {onArchive && (
              <button
                onClick={() => onArchive(notification.id)}
                className="text-[11px] text-kairos-silver-dark hover:text-red-400 transition-colors"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(isoDate: string): string {
  const now = Date.now();
  const then = new Date(isoDate).getTime();
  const diff = now - then;

  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;

  return new Date(isoDate).toLocaleDateString();
}
