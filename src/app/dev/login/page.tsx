"use client";

/**
 * DEV-ONLY: Quick role switcher for local testing.
 *
 * Navigate to /dev/login to instantly set a role and jump
 * into any portal without Clerk authentication.
 *
 * This page is only rendered in development (NODE_ENV !== "production").
 * In production, it redirects to the sign-in page.
 */

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Heart, Dumbbell, Building2, Shield, AlertTriangle } from "lucide-react";
import type { UserRole } from "@/lib/company-ops/types";

const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  company_admin: "/company/dashboard",
  trainer: "/trainer/dashboard",
  client: "/dashboard",
};

const DEV_ROLES: {
  role: UserRole;
  label: string;
  description: string;
  icon: typeof Shield;
  colorClass: string;
  credentials: { email: string; name: string };
}[] = [
  {
    role: "client",
    label: "Client",
    description: "Health dashboard, biometrics, messaging, scheduling",
    icon: Heart,
    colorClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    credentials: { email: "client@kairos-dev.com", name: "Sarah Chen" },
  },
  {
    role: "trainer",
    label: "Trainer",
    description: "Client management, alerts, protocols, revenue",
    icon: Dumbbell,
    colorClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    credentials: { email: "trainer@kairos-dev.com", name: "Dr. Sarah Mitchell" },
  },
  {
    role: "company_admin",
    label: "Company Admin",
    description: "Team oversight, branding, company settings",
    icon: Building2,
    colorClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    credentials: { email: "company@kairos-dev.com", name: "Maria Torres" },
  },
  {
    role: "super_admin",
    label: "Super Admin",
    description: "Platform administration, all companies, system config",
    icon: Shield,
    colorClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    credentials: { email: "admin@kairos-dev.com", name: "Platform Admin" },
  },
];

export default function DevLoginPage() {
  const router = useRouter();
  const [isProduction, setIsProduction] = useState(false);

  useEffect(() => {
    // Block in production
    if (process.env.NODE_ENV === "production") {
      setIsProduction(true);
      router.replace("/sign-in");
    }
  }, [router]);

  function enterAs(role: UserRole) {
    localStorage.setItem("kairos-role", role);
    router.push(ROLE_HOME[role]);
  }

  function clearRole() {
    localStorage.removeItem("kairos-role");
    router.push("/select-role");
  }

  if (isProduction) {
    return null;
  }

  const currentRole = typeof window !== "undefined"
    ? localStorage.getItem("kairos-role")
    : null;

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-8">
      <div className="max-w-3xl w-full">
        {/* Dev Warning Banner */}
        <div className="flex items-center gap-3 mb-8 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/30">
          <AlertTriangle size={20} className="text-yellow-400 flex-shrink-0" />
          <div>
            <p className="text-sm font-semibold text-yellow-400">Development Mode Only</p>
            <p className="text-xs text-yellow-400/70">
              This page bypasses Clerk authentication for local testing. It will not work in production.
            </p>
          </div>
        </div>

        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-3xl font-bold text-white mb-2">Dev Quick Login</h1>
          <p className="text-gray-400 text-sm">
            Pick a role to jump straight into that portal.
            {currentRole && (
              <>
                {" "}Currently signed in as <span className="text-kairos-gold font-semibold">{currentRole}</span>.
              </>
            )}
          </p>
        </div>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          {DEV_ROLES.map(({ role, label, description, icon: Icon, colorClass, credentials }) => (
            <button
              key={role}
              onClick={() => enterAs(role)}
              className={`p-6 rounded-xl border text-left transition-all hover:scale-[1.02] active:scale-[0.98] ${colorClass}`}
            >
              <div className="flex items-center gap-3 mb-3">
                <Icon size={24} />
                <div>
                  <h3 className="font-bold text-white text-lg">{label}</h3>
                  <p className="text-xs text-gray-400">{credentials.name} &lt;{credentials.email}&gt;</p>
                </div>
              </div>
              <p className="text-sm text-gray-300">{description}</p>
              <p className="text-xs text-gray-500 mt-3">
                → {ROLE_HOME[role]}
              </p>
            </button>
          ))}
        </div>

        {/* Actions */}
        <div className="flex justify-center gap-4">
          {currentRole && (
            <button
              onClick={clearRole}
              className="px-6 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white transition-colors"
            >
              Clear Saved Role
            </button>
          )}
          <button
            onClick={() => router.push("/")}
            className="px-6 py-2 rounded-lg text-sm text-gray-400 border border-gray-700 hover:border-gray-500 hover:text-white transition-colors"
          >
            Back to Landing
          </button>
        </div>

        {/* URL Cheat Sheet */}
        <div className="mt-12 p-5 rounded-xl bg-gray-900 border border-gray-800">
          <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Portal URLs</h4>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="text-gray-500">Client</div>
            <code className="text-gray-300">/dashboard</code>
            <div className="text-gray-500">Trainer</div>
            <code className="text-gray-300">/trainer/dashboard</code>
            <div className="text-gray-500">Company Admin</div>
            <code className="text-gray-300">/company/dashboard</code>
            <div className="text-gray-500">Super Admin</div>
            <code className="text-gray-300">/super-admin/dashboard</code>
            <div className="text-gray-500 col-span-2 mt-2 pt-2 border-t border-gray-800">
              <span className="text-yellow-400/70">Tip:</span>{" "}
              <span className="text-gray-400">These portals check <code className="text-gray-300">localStorage(kairos-role)</code> — the buttons above set it for you.</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
