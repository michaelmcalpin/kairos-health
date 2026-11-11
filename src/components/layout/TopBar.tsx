"use client";

import { usePathname, useRouter } from "next/navigation";
import { useClerk, UserButton } from "@clerk/nextjs";
import { Bell, Search, LogOut, AlertTriangle, ArrowLeftRight } from "lucide-react";
import { cn } from "@/utils/cn";
import { trpc } from "@/lib/trpc";
import { NotificationBell } from "@/components/realtime";
import { FeedbackButton } from "@/components/feedback/FeedbackButton";
import { clientAccountLinks, clientNavIcon } from "@/components/layout/Sidebar";

interface TopBarProps {
  title: string;
  subtitle?: string;
  alertCount?: number;
  showSearch?: boolean;
  className?: string;
  /** White-label: company brand color for title accent */
  brandColor?: string;
}

export function TopBar({ title, subtitle, alertCount, showSearch = true, className, brandColor }: TopBarProps) {
  const router = useRouter();
  const pathname = usePathname() ?? "";
  const { signOut } = useClerk();

  // Infer which portal we're rendered in from the route.
  const portal: "trainer" | "admin" | "client" = pathname.startsWith("/trainer")
    ? "trainer"
    : pathname.startsWith("/admin") || pathname.startsWith("/super-admin") || pathname.startsWith("/company")
      ? "admin"
      : "client";

  // Client portal: unread alert count (clientProcedure — 403s for other roles,
  // so only enabled on the client portal)
  const { data: unreadData } = trpc.clientPortal.alerts.unreadCount.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: portal === "client",
  });

  // Trainer portal: open Inbox items (same list and count as /trainer/inbox)
  const { data: coachActiveData } = trpc.coach.inbox.openCount.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: portal === "trainer",
  });

  const badgeCount =
    alertCount ??
    (portal === "trainer" ? coachActiveData?.count : portal === "client" ? unreadData?.count : 0) ??
    0;
  const alertsHref = portal === "trainer" ? "/trainer/inbox" : "/alerts";

  // Coaches, company admins and super admins can use more than one portal.
  const { data: me } = trpc.auth.me.useQuery(undefined, { staleTime: 5 * 60_000, retry: false });
  const multiPortal = !!me?.role && me.role !== "client";

  function handleSwitchPortal() {
    // Forget the remembered portal so /select-role shows the choices again.
    localStorage.removeItem("kairos-role");
    router.push("/select-role");
  }

  function handleSignOut() {
    // Clear saved role on sign-out
    localStorage.removeItem("kairos-role");
    signOut({ redirectUrl: "/" });
  }

  return (
    <header
      className={cn(
        // Extra left padding below lg leaves room for the sidebar hamburger.
        "sticky top-0 z-30 bg-kairos-royal-dark/80 backdrop-blur-md border-b border-kairos-border pl-16 lg:pl-6 pr-6 py-3 flex items-center justify-between",
        className
      )}
    >
      {/* Left: Title */}
      <div>
        <h1 className="font-heading font-bold text-lg text-white">
          {brandColor ? (
            <span style={{ color: brandColor }}>{title}</span>
          ) : (
            title
          )}
        </h1>
        {subtitle && (
          <p className="text-xs font-body text-kairos-silver-dark">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {/* Search is hidden on the trainer portal — there is no search feature there,
            so rendering the control would be a dead affordance. */}
        {showSearch && portal !== "trainer" && (
          <button className="text-kairos-silver-dark hover:text-white transition-colors p-2" aria-label="Search">
            <Search size={18} />
          </button>
        )}

        {/* Send-feedback (bug/feature/redesign) — lives in the top bar so it
            never covers the client quick-chat launcher in the bottom corner. */}
        <FeedbackButton />

        {/* In-app notifications feed (protocol updates, coach messages, etc.).
            clientPortal.notifications is a clientProcedure, so only mount it for
            the client portal — other roles would 403. */}
        {portal === "client" && <NotificationBell />}

        {/* Alert Bell — hidden on admin/company portals (no alerts feed there) */}
        {portal !== "admin" && (
          <button
            onClick={() => router.push(alertsHref)}
            className="relative text-kairos-silver-dark hover:text-white transition-colors p-2"
            aria-label={`${portal === "client" ? "Health alerts" : "Notifications"}${badgeCount > 0 ? ` (${badgeCount} unread)` : ""}`}
            title={portal === "client" ? "Health alerts" : "Notifications"}
          >
            {/* The client portal already has the notifications bell above; use a
                distinct icon for health alerts so there aren't two bells. */}
            {portal === "client" ? <AlertTriangle size={18} /> : <Bell size={18} />}
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-xs font-heading font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>
        )}

        {/* Sign Out */}
        {multiPortal && (
          <button
            onClick={handleSwitchPortal}
            className="text-kairos-silver-dark hover:text-white transition-colors p-2"
            title="Switch portal"
            aria-label="Switch portal"
          >
            <ArrowLeftRight size={18} />
          </button>
        )}

        <button
          onClick={handleSignOut}
          className="text-kairos-silver-dark hover:text-white transition-colors p-2"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>

        {/* Clerk User Button */}
        {portal === "client" ? (
          // Client profile menu: Devices, Settings, Payments, Import (audit
          // H3 — these left the sidebar).
          <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }}>
            <UserButton.MenuItems>
              {clientAccountLinks.map((l) => (
                <UserButton.Link key={l.href} label={l.label} href={l.href} labelIcon={clientNavIcon(l.icon, 16)} />
              ))}
            </UserButton.MenuItems>
          </UserButton>
        ) : (
          <UserButton
            appearance={{
              elements: {
                avatarBox: "w-8 h-8",
              },
            }}
          />
        )}
      </div>
    </header>
  );
}
