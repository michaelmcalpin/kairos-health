"use client";

/**
 * Notification Bell — client in-app notification indicator + dropdown.
 *
 * Backed by the persisted notifications feed (`clientPortal.notifications`),
 * so it surfaces every in-app notification the server has dispatched —
 * including coach `protocol_update` alerts — not just live socket events.
 * Styled to match the dark kairos TopBar it lives in.
 */

import React, { useState, useRef, useEffect } from "react";
import { Bell } from "lucide-react";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc";

/** Per-category label + icon. `protocol_update` gets a kairos-gold accent. */
const CATEGORY_META: Record<string, { label: string; icon: string; accent?: boolean }> = {
  health_alert: { label: "Health alert", icon: "💪" },
  insight: { label: "Insight", icon: "🧠" },
  weekly_report: { label: "Weekly report", icon: "📊" },
  coach_message: { label: "Coach message", icon: "👨‍⚕️" },
  appointment: { label: "Appointment", icon: "📅" },
  lab_result: { label: "Lab result", icon: "🧪" },
  supplement: { label: "Supplement", icon: "💊" },
  fasting: { label: "Fasting", icon: "⏳" },
  streak: { label: "Streak", icon: "🏆" },
  billing: { label: "Billing", icon: "💳" },
  system: { label: "System", icon: "⚙️" },
  onboarding: { label: "Onboarding", icon: "✨" },
  protocol_update: { label: "Protocol update", icon: "📋", accent: true },
};

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "";
  const diffMin = Math.floor((Date.now() - then) / 60_000);
  if (diffMin < 1) return "just now";
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHrs = Math.floor(diffMin / 60);
  if (diffHrs < 24) return `${diffHrs}h ago`;
  const diffDays = Math.floor(diffHrs / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationBell() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const utils = trpc.useUtils();

  const { data: unreadData } = trpc.clientPortal.notifications.unreadCount.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
  });

  const { data: notifications } = trpc.clientPortal.notifications.list.useQuery(
    { limit: 20 },
    { staleTime: 30_000, refetchOnWindowFocus: true, retry: 1 }
  );

  const invalidate = () => {
    utils.clientPortal.notifications.list.invalidate();
    utils.clientPortal.notifications.unreadCount.invalidate();
  };

  const markRead = trpc.clientPortal.notifications.markRead.useMutation({ onSuccess: invalidate });
  const markAllRead = trpc.clientPortal.notifications.markAllRead.useMutation({ onSuccess: invalidate });

  const unreadCount = unreadData?.count ?? 0;
  const items = notifications ?? [];

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

  function openItem(n: (typeof items)[number]) {
    if (!n.read) markRead.mutate({ notificationId: n.id });
    if (n.actionUrl) {
      setIsOpen(false);
      router.push(n.actionUrl);
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="relative text-kairos-silver-dark hover:text-white transition-colors p-2"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[9px] font-heading font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-kairos-card rounded-kairos border border-kairos-border shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-kairos-border">
            <span className="text-sm font-heading font-semibold text-white">Notifications</span>
            {unreadCount > 0 && (
              <button
                onClick={() => markAllRead.mutate()}
                className="text-xs font-heading text-kairos-gold hover:text-kairos-gold-dim transition-colors"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-80 overflow-y-auto">
            {items.length > 0 ? (
              items.map((n) => {
                const meta = CATEGORY_META[n.category] ?? { label: "Notification", icon: "🔔" };
                return (
                  <button
                    key={n.id}
                    onClick={() => openItem(n)}
                    className={`w-full text-left px-4 py-3 border-b border-kairos-border last:border-0 hover:bg-kairos-royal-dark/40 transition-colors ${
                      !n.read ? "bg-kairos-gold/5" : ""
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      <span
                        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-sm ${
                          meta.accent ? "bg-kairos-gold/15" : "bg-kairos-royal-dark"
                        }`}
                      >
                        {meta.icon}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-heading font-bold px-1.5 py-0.5 rounded-full ${
                              meta.accent
                                ? "bg-kairos-gold/15 text-kairos-gold"
                                : "bg-kairos-royal-dark text-kairos-silver-dark"
                            }`}
                          >
                            {meta.label}
                          </span>
                          {!n.read && <span className="w-2 h-2 rounded-full bg-kairos-gold flex-shrink-0" />}
                        </div>
                        <p className={`text-sm mt-1 ${!n.read ? "font-semibold text-white" : "font-medium text-kairos-silver"}`}>
                          {n.title}
                        </p>
                        <p className="text-xs text-kairos-silver-dark mt-0.5 line-clamp-2">{n.body}</p>
                        <p className="text-[10px] text-kairos-silver-dark mt-1">{relativeTime(n.createdAt)}</p>
                      </div>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="text-center text-kairos-silver-dark text-sm py-8">No notifications yet</div>
            )}
          </div>

          <div className="border-t border-kairos-border">
            <button
              onClick={() => {
                setIsOpen(false);
                router.push("/alerts");
              }}
              className="w-full text-center py-2.5 text-xs font-heading text-kairos-gold hover:text-kairos-gold-dim transition-colors"
            >
              View all
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
