"use client";

import { useClerk, UserButton } from "@clerk/nextjs";
import { Bell, Search, LogOut } from "lucide-react";
import { cn } from "@/utils/cn";

interface TopBarProps {
  title: string;
  subtitle?: string;
  alertCount?: number;
  showSearch?: boolean;
  className?: string;
}

export function TopBar({ title, subtitle, alertCount = 0, showSearch = true, className }: TopBarProps) {
  const { signOut } = useClerk();

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
        <h1 className="font-heading font-bold text-lg text-white">{title}</h1>
        {subtitle && (
          <p className="text-xs font-body text-kairos-silver-dark">{subtitle}</p>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-4">
        {showSearch && (
          <button className="text-kairos-silver-dark hover:text-white transition-colors p-2">
            <Search size={18} />
          </button>
        )}

        {/* Alert Bell */}
        <button className="relative text-kairos-silver-dark hover:text-white transition-colors p-2">
          <Bell size={18} />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 bg-danger text-white text-[9px] font-heading font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-0.5">
              {alertCount > 99 ? "99+" : alertCount}
            </span>
          )}
        </button>

        {/* Sign Out */}
        <button
          onClick={handleSignOut}
          className="text-kairos-silver-dark hover:text-white transition-colors p-2"
          title="Sign out"
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
