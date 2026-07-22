"use client";

import { usePathname, useRouter } from "next/navigation";
import { useClerk, UserButton } from "@clerk/nextjs";
import { Bell, Search, LogOut } from "lucide-react";
import { cn } from "@/utils/cn";
import { trpc } from "@/lib/trpc";

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

  // Trainer portal: active alert count across the coach's roster
  const { data: coachActiveData } = trpc.coach.alerts.activeCount.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: true,
    retry: 1,
    enabled: portal === "trainer",
  });

  const badgeCount =
    alertCount ??
    (portal === "trainer" ? coachActiveData?.count : portal === "client" ? unreadData?.count : 0) ??
    0;
  const alertsHref = portal === "trainer" ? "/trainer/alerts" : "/alerts";

  function handleSignOut() {
    // Clear saved role on sign-out
    localStorage.removeItem("kairos-role");
    signOut({ redirectUrl: "/" });
  }

  return (
    <header
      className={cn(
        "sticky top-0 z-30 bg-kairos-royal-dark/80 backdrop-blur-md border-b border-kairos-border px-6 py-3 flex items-center justify-between",
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
        {showSearch && (
          <button className="text-kairos-silver-dark hover:text-white transition-colors p-2" aria-label="Search">
            <Search size={18} />
          </button>
        )}

        {/* Alert Bell — hidden on admin/company portals (no alerts feed there) */}
        {portal !== "admin" && (
          <button
            onClick={() => router.push(alertsHref)}
            className="relative text-kairos-silver-dark hover:text-white transition-colors p-2"
            aria-label={`Notifications${badgeCount > 0 ? ` (${badgeCount} unread)` : ""}`}
          >
            <Bell size={18} />
            {badgeCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[9px] font-heading font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
                {badgeCount > 99 ? "99+" : badgeCount}
              </span>
            )}
          </button>
        )}

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="text-kairos-silver-dark hover:text-white transition-colors p-2"
          title="Sign out"
          aria-label="Sign out"
        >
          <LogOut size={18} />
        </button>

        {/* Clerk User Button */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "w-8 h-8",
            },
          }}
        />
      </div>
    </header>
  );
}
