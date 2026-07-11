/**
 * useNotifications — Custom hooks for the Notification Center.
 *
 * Tries to fetch notifications from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - notifications.list          -> all notifications with optional filter
 *   - notifications.unreadCount   -> count of unread
 *   - notifications.markAsRead    -> mark single notification read
 *   - notifications.markAllRead   -> mark all notifications read
 *   - notifications.dismiss       -> dismiss / delete a notification
 */

import { trpc, DEFAULT_QUERY_OPTIONS, REALTIME_QUERY_OPTIONS } from "@/lib/api";
import { isDevFallbackMode } from "@/lib/api";
import {
  SAMPLE_NOTIFICATIONS,
  type Notification,
  type FilterTab,
} from "@/components/notifications/notification-data";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useNotifications — list with optional filter
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useNotifications(filter: FilterTab = "all") {
  const query = trpc.clientPortal.notifications.list.useQuery(
    {},
    DEFAULT_QUERY_OPTIONS,
  );

  const allNotifications: Notification[] = query.data
    ? (query.data as any[]).map(mapApiNotification)
    : SAMPLE_NOTIFICATIONS;

  // Apply client-side filter on sample data (backend would filter server-side)
  const notifications = isDevFallbackMode()
    ? filterNotifications(allNotifications, filter)
    : allNotifications;

  return {
    notifications,
    total: notifications.length,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useUnreadCount — badge count for notification icon
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useUnreadCount() {
  const query = trpc.clientPortal.notifications.list.useQuery(
    {},
    REALTIME_QUERY_OPTIONS,
  );

  const allNotifications: Notification[] = query.data
    ? (query.data as any[]).map(mapApiNotification)
    : SAMPLE_NOTIFICATIONS;

  const count = allNotifications.filter((n) => !n.read).length;

  return {
    count,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useMarkAsRead — mutation to mark a single notification read
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useMarkAsRead() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.notifications.markRead.useMutation({
    onSuccess: () => {
      utils.clientPortal.notifications.list.invalidate();
    },
  });

  const markAsRead = (notificationId: string) => {
    mutation.mutate({ notificationId });
  };

  return {
    markAsRead,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useMarkAllRead — mutation to mark all notifications read
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useMarkAllRead() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.notifications.markAllRead.useMutation({
    onSuccess: () => {
      utils.clientPortal.notifications.list.invalidate();
    },
  });

  const markAllRead = () => {
    mutation.mutate({});
  };

  return {
    markAllRead,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useDismissNotification — mutation to dismiss a notification
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useDismissNotification() {
  const utils = trpc.useUtils();
  const mutation = trpc.clientPortal.notifications.archive.useMutation({
    onSuccess: () => {
      utils.clientPortal.notifications.list.invalidate();
    },
  });

  const dismiss = (notificationId: string) => {
    mutation.mutate({ notificationId });
  };

  return {
    dismiss,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapApiNotification(raw: any): Notification {
  return {
    id: raw.id,
    type: raw.type ?? "report",
    priority: raw.priority ?? "info",
    title: raw.title ?? "",
    message: raw.message ?? "",
    detail: raw.detail ?? raw.message ?? "",
    timestamp: raw.createdAt ?? raw.timestamp ?? "",
    timeAgo: raw.timeAgo ?? formatRelativeTime(new Date(raw.createdAt)),
    read: raw.read ?? false,
    relatedData: raw.relatedData ?? undefined,
    actionLabel: raw.actionLabel ?? undefined,
  };
}

function filterNotifications(
  notifications: Notification[],
  filter: FilterTab,
): Notification[] {
  if (filter === "all") return notifications;
  if (filter === "action_required") {
    return notifications.filter(
      (n) => n.priority === "urgent" || n.priority === "action",
    );
  }
  if (filter === "info") {
    return notifications.filter((n) => n.priority === "info");
  }
  if (filter === "resolved") {
    return notifications.filter((n) => n.priority === "resolved");
  }
  return notifications;
}

function formatRelativeTime(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  const diffWeeks = Math.floor(diffDays / 7);
  return `${diffWeeks}w ago`;
}
