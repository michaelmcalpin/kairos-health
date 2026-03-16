"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";

interface RoleGuardProps {
  allowedRole: "client" | "coach";
  children: React.ReactNode;
}

export function RoleGuard({ allowedRole, children }: RoleGuardProps) {
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "allowed" | "denied">("loading");

  useEffect(() => {
    const savedRole = localStorage.getItem("kairos-role");

    if (!savedRole) {
      // No role selected yet — send to role selection
      router.replace("/select-role");
      return;
    }

    if (savedRole !== allowedRole) {
      setStatus("denied");
    } else {
      setStatus("allowed");
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

  if (status === "denied") {
    const correctPortal = allowedRole === "coach" ? "/dashboard" : "/coach/dashboard";
    const portalName = allowedRole === "coach" ? "Coach" : "Client";
    const yourPortal = allowedRole === "coach" ? "Client" : "Coach";

    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md">
          <div className="w-16 h-16 rounded-full bg-red-500/15 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert size={32} className="text-red-400" />
          </div>
          <h2 className="font-heading font-bold text-xl text-white mb-2">Access Restricted</h2>
          <p className="font-body text-sm text-kairos-silver-dark mb-6">
            You&apos;re signed in as a <span className="text-kairos-gold font-semibold">{yourPortal}</span>.
            The {portalName} Portal is not available with your current role.
          </p>
          <button
            onClick={() => router.push(correctPortal)}
            className="kairos-btn-gold text-sm px-6 py-3"
          >
            Go to {yourPortal} Portal
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
