"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import type { UserRole } from "@/lib/company-ops/types";
import { ROLE_LABELS } from "@/lib/company-ops/types";

interface RoleGuardProps {
  allowedRole: UserRole;
  children: React.ReactNode;
}

const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  company_admin: "/company/dashboard",
  trainer: "/trainer/dashboard",
  client: "/dashboard",
};

/**
 * Hierarchy check — can `currentRole` access the `targetRole` portal?
 *
 * - super_admin → everything
 * - company_admin → company_admin, trainer, client
 * - trainer → trainer, client
 * - client → client only
 */
const ROLE_HIERARCHY: Record<UserRole, UserRole[]> = {
  super_admin: ["super_admin", "company_admin", "trainer", "client"],
  company_admin: ["company_admin", "trainer", "client"],
  trainer: ["trainer", "client"],
  client: ["client"],
};

function canAccess(currentRole: UserRole, targetPortal: UserRole): boolean {
  return (ROLE_HIERARCHY[currentRole] ?? []).includes(targetPortal);
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");
  const [currentRole, setCurrentRole] = useState<UserRole | null>(null);

  useEffect(() => {
    const savedRole = localStorage.getItem("kairos-role") as UserRole | null;

    if (!savedRole) {
      router.replace("/select-role");
      return;
    }

    setCurrentRole(savedRole);

    if (canAccess(savedRole, allowedRole)) {
      setStatus("allowed");
    } else {
      setStatus("denied");
    }
  }, [allowedRole, router]);

  if (status === "loading") {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "denied" && currentRole) {
    const yourHome = ROLE_HOME[currentRole] ?? "/dashboard";
    const yourLabel = ROLE_LABELS[currentRole] ?? currentRole;
    const portalLabel = ROLE_LABELS[allowedRole] ?? allowedRole;

    // Only show "Switch Role" if user has multiple accessible roles
    const hasMultipleRoles = (ROLE_HIERARCHY[currentRole] ?? []).length > 1;

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
                  localStorage.removeItem("kairos-role");
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
