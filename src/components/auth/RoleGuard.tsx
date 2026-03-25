"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { UserRole } from "@/lib/company-ops/types";
import { ROLE_LABELS } from "@/lib/company-ops/types";
import { useAuthRole, canAccess, ROLE_HOME } from "@/lib/hooks/useAuthRole";

interface RoleGuardProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

/**
 * RoleGuard — server-validated portal access gate.
 *
 * Uses the `useAuthRole` hook to verify the user's role from the
 * database (via tRPC auth.me), NOT just localStorage. If someone
 * tampers with localStorage, the DB check catches it and denies access.
 *
 * Flow:
 * 1. Show loading spinner while auth.me is in flight
 * 2. If no DB user → redirect to /select-role
 * 3. If DB role can't access this portal → show "Access Restricted"
 * 4. If authorized → render children
 */
export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const { dbRole, activeRole, isLoading, isAuthorized, clearRole } = useAuthRole();
  const [redirecting, setRedirecting] = useState(false);

  // Once DB role loads, check access
  useEffect(() => {
    if (isLoading || redirecting) return;

    // No DB role = not authenticated → go to role selection
    if (!dbRole) {
      setRedirecting(true);
      router.replace("/select-role");
      return;
    }

    // If no active portal role is set in localStorage, redirect to pick one
    if (!activeRole) {
      setRedirecting(true);
      router.replace("/select-role");
      return;
    }
  }, [dbRole, activeRole, isLoading, router, redirecting]);

  // Loading state — waiting for DB role check
  if (isLoading || redirecting) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Verifying access...</p>
        </div>
      </div>
    );
  }

  // If DB role is loaded but can't access this portal → denied
  if (dbRole && !isAuthorized(allowedRole)) {
    const yourHome = ROLE_HOME[dbRole] ?? "/dashboard";
    const yourLabel = ROLE_LABELS[dbRole] ?? dbRole;
    const portalLabel = ROLE_LABELS[allowedRole] ?? allowedRole;
    const hasMultipleRoles = canAccess(dbRole, "client") && dbRole !== "client";

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} className="text-red-400" />
          </div>
          <h2 className="font-heading font-bold text-xl text-white mb-2">Access Restricted</h2>
          <p className="font-body text-sm text-kairos-silver-dark mb-6">
            You&apos;re signed in as a <span className="text-kairos-gold font-semibold">{yourLabel}</span>.
            The {portalLabel} Portal is not available with your current role.
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => router.push(yourHome)}
              className="kairos-btn-gold text-sm px-6 py-3"
            >
              Go to {yourLabel} Portal
            </button>
            {hasMultipleRoles && (
              <button
                onClick={() => {
                  clearRole();
                  router.push("/select-role");
                }}
                className="kairos-btn-outline text-sm px-6 py-3"
              >
                Switch Portal
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
