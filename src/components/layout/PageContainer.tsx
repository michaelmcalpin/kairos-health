"use client";

import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";

/**
 * Routes that render edge-to-edge (no max width, legacy 24 px padding).
 * Use for full-height experiences whose height math assumes the old
 * padding, e.g. the client chat/messaging screen.
 * Matches the path itself and anything nested under it.
 */
export const FULL_BLEED_ROUTES: readonly string[] = ["/chat"];

export function isFullBleedRoute(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return FULL_BLEED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

interface PageContainerProps {
  children: React.ReactNode;
  /**
   * Force full-bleed (true) or the standard template (false).
   * When omitted, full-bleed is decided by FULL_BLEED_ROUTES.
   */
  bleed?: boolean;
  className?: string;
}

/**
 * The single page template (audit Q12): content max 1280 px, centered,
 * 16 px side gutters on mobile / 32 px at desktop, 24 / 32 px top & bottom.
 * Applied once per portal layout around {children} — pages should not add
 * their own outer padding.
 */
export function PageContainer({ children, bleed, className }: PageContainerProps) {
  const pathname = usePathname();
  const fullBleed = bleed ?? isFullBleedRoute(pathname);

  return (
    <div
      data-page-container={fullBleed ? "bleed" : "standard"}
      className={cn(
        fullBleed
          ? "w-full p-6"
          : "mx-auto w-full max-w-[1280px] px-4 py-6 lg:px-8 lg:py-8",
        className,
      )}
    >
      {children}
    </div>
  );
}
