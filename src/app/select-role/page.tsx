"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Dumbbell, Building2, Shield, ArrowRight } from "lucide-react";
import type { UserRole } from "@/lib/company-ops/types";
import { useCompanyBrand, useCompanyList, CompanyBrandProvider } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  company_admin: "/company/dashboard",
  trainer: "/trainer/dashboard",
  client: "/dashboard",
};

const ROLE_META: Record<
  UserRole,
  {
    label: string;
    subtitle: string;
    description: string;
    icon: typeof Shield;
    colorClass: string;
  }
> = {
  client: {
    label: "Client Portal",
    subtitle: "Health Dashboard",
    description: "Access your health dashboard, biometrics, protocols, and communicate with your trainer.",
    icon: Heart,
    colorClass: "text-kairos-gold bg-kairos-gold/15 group-hover:bg-kairos-gold/25",
  },
  trainer: {
    label: "Trainer Portal",
    subtitle: "Client Management",
    description: "Manage your clients, review alerts, track protocols, and grow your practice.",
    icon: Dumbbell,
    colorClass: "text-blue-400 bg-blue-500/15 group-hover:bg-blue-500/25",
  },
  company_admin: {
    label: "Company Portal",
    subtitle: "Team Management",
    description: "Oversee your trainers and clients, manage company branding and settings.",
    icon: Building2,
    colorClass: "text-emerald-400 bg-emerald-500/15 group-hover:bg-emerald-500/25",
  },
  super_admin: {
    label: "Super Admin",
    subtitle: "Platform Administration",
    description: "Kairos platform administration — manage companies, rules, and system configuration.",
    icon: Shield,
    colorClass: "text-purple-400 bg-purple-500/15 group-hover:bg-purple-500/25",
  },
};

/**
 * Returns the set of roles a user is allowed to see/access.
 *
 * - super_admin  → sees all 4 roles (can impersonate any tier)
 * - company_admin → sees company_admin, trainer, client
 * - trainer       → sees trainer, client
 * - client        → sees client only
 */
function getAllowedRoles(dbRole: UserRole): UserRole[] {
  switch (dbRole) {
    case "super_admin":
      return ["client", "trainer", "company_admin", "super_admin"];
    case "company_admin":
      return ["client", "trainer", "company_admin"];
    case "trainer":
      return ["client", "trainer"];
    case "client":
    default:
      return ["client"];
  }
}

function SelectRoleContent() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);
  const { brand, setCompanyId } = useCompanyBrand();
  const companies = useCompanyList();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // Fetch the user's actual role from the database
  const { data: me, isLoading: meLoading } = trpc.auth.me.useQuery(undefined, {
    retry: false,
    staleTime: 60_000,
  });

  const dbRole: UserRole = (me?.role as UserRole) ?? "client";
  const allowedRoles = getAllowedRoles(dbRole);

  useEffect(() => {
    // Wait for the DB role query to resolve
    if (meLoading) return;

    const savedRole = localStorage.getItem("kairos-role") as UserRole | null;

    // If user has a saved role AND it's one they're actually allowed to use → go directly
    if (savedRole && allowedRoles.includes(savedRole) && ROLE_HOME[savedRole]) {
      router.replace(ROLE_HOME[savedRole]);
      return;
    }

    // If only one role is available (e.g. client-only), auto-redirect
    if (allowedRoles.length === 1) {
      const onlyRole = allowedRoles[0];
      localStorage.setItem("kairos-role", onlyRole);
      router.replace(ROLE_HOME[onlyRole]);
      return;
    }

    // If saved role is not allowed, clear it
    if (savedRole && !allowedRoles.includes(savedRole)) {
      localStorage.removeItem("kairos-role");
    }

    setChecking(false);
  }, [router, meLoading, allowedRoles]);

  function selectRole(role: UserRole) {
    localStorage.setItem("kairos-role", role);
    router.push(ROLE_HOME[role]);
  }

  if (checking || meLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-kairos-royal-dark to-kairos-royal flex items-center justify-center">
        <div className="text-center">
          {isWhiteLabel ? (
            <>
              <div
                className="w-12 h-12 rounded-kairos mx-auto mb-3 flex items-center justify-center text-white font-heading font-bold text-xl"
                style={{ backgroundColor: brand.brandColor }}
              >
                {brand.name.charAt(0)}
              </div>
              <h1 className="font-heading font-bold text-xl tracking-wide mb-2" style={{ color: accentColor }}>
                {brand.name}
              </h1>
            </>
          ) : (
            <h1 className="font-heading font-bold text-xl text-kairos-gold tracking-wide mb-2">KAIROS</h1>
          )}
          <p className="text-xs font-body text-kairos-silver-dark animate-pulse">Loading your portal...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-kairos-royal-dark flex flex-col items-center justify-center px-8">
      <div className="max-w-4xl w-full text-center">
        {/* Brand */}
        <div className="mb-12">
          {isWhiteLabel ? (
            <>
              <div
                className="w-14 h-14 rounded-kairos mx-auto mb-3 flex items-center justify-center text-white font-heading font-bold text-2xl"
                style={{ backgroundColor: brand.brandColor }}
              >
                {brand.name.charAt(0)}
              </div>
              <h1 className="font-heading font-bold text-2xl tracking-wide mb-1" style={{ color: accentColor }}>
                {brand.name}
              </h1>
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-widest">
                Health Platform &bull; Powered by KAIROS
              </p>
            </>
          ) : (
            <>
              <h1 className="font-heading font-bold text-2xl text-kairos-gold tracking-wide mb-1">KAIROS</h1>
              <p className="text-xs font-heading text-kairos-silver-dark uppercase tracking-widest">
                Private Health Management
              </p>
            </>
          )}
        </div>

        {/* Company Selector — only visible for super_admin */}
        {dbRole === "super_admin" && (
          <div className="flex flex-wrap items-center justify-center gap-2 mb-8">
            <button
              onClick={() => setCompanyId(null)}
              className={`px-3 py-1.5 rounded-full text-xs font-heading transition-all ${
                !isWhiteLabel
                  ? "bg-kairos-gold/20 text-kairos-gold"
                  : "bg-gray-800/50 text-gray-400 hover:text-white"
              }`}
            >
              KAIROS Default
            </button>
            {companies.map((c) => (
              <button
                key={c.id}
                onClick={() => setCompanyId(c.id)}
                className={`px-3 py-1.5 rounded-full text-xs font-heading transition-all flex items-center gap-1.5 ${
                  brand.id === c.id
                    ? "text-white"
                    : "bg-gray-800/50 text-gray-400 hover:text-white"
                }`}
                style={brand.id === c.id ? { backgroundColor: c.brandColor + "30", color: c.brandColor } : undefined}
              >
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.brandColor }} />
                {c.name.split(" ")[0]}
              </button>
            ))}
          </div>
        )}

        {/* Welcome */}
        <h2 className="font-heading font-bold text-3xl text-white mb-3">Welcome Back</h2>
        <p className="font-body text-kairos-silver-dark mb-12">
          {allowedRoles.length > 1
            ? "Choose which portal to enter."
            : "Redirecting to your portal..."}
        </p>

        {/* Role Cards — only roles the user is allowed to access */}
        <div className={`grid grid-cols-1 ${allowedRoles.length >= 3 ? "md:grid-cols-2" : allowedRoles.length === 2 ? "md:grid-cols-2 max-w-2xl mx-auto" : "max-w-md mx-auto"} gap-6 mb-12`}>
          {allowedRoles.map((role) => {
            const { label, description, icon: Icon, colorClass } = ROLE_META[role];
            // For white-labeled client/trainer/company roles, use company brand color
            const usesBrand = isWhiteLabel && role !== "super_admin";
            const cardAccent = usesBrand ? accentColor : undefined;

            return (
              <button
                key={role}
                onClick={() => selectRole(role)}
                className="kairos-card p-8 text-left group hover:border-kairos-gold/40 transition-all duration-300 cursor-pointer"
                style={usesBrand ? { borderColor: "transparent" } : undefined}
                onMouseEnter={(e) => {
                  if (cardAccent) (e.currentTarget.style.borderColor = cardAccent + "60");
                }}
                onMouseLeave={(e) => {
                  if (cardAccent) (e.currentTarget.style.borderColor = "transparent");
                }}
              >
                <div
                  className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-colors ${usesBrand ? "" : colorClass}`}
                  style={usesBrand ? { backgroundColor: cardAccent + "20", color: cardAccent } : undefined}
                >
                  <Icon size={28} />
                </div>
                <h3 className="font-heading font-bold text-xl text-white mb-2">{label}</h3>
                <p className="font-body text-sm text-kairos-silver-dark mb-6 leading-relaxed">
                  {description}
                </p>
                <div
                  className="flex items-center gap-2 text-sm font-heading font-semibold group-hover:gap-3 transition-all"
                  style={{ color: cardAccent || "rgb(var(--k-accent))" }}
                >
                  Enter <ArrowRight size={16} />
                </div>
              </button>
            );
          })}
        </div>

        <p className="text-xs font-body text-kairos-silver-dark">
          Your selection will be remembered for future sessions.
        </p>
      </div>
    </div>
  );
}

export default function SelectRolePage() {
  return (
    <CompanyBrandProvider>
      <SelectRoleContent />
    </CompanyBrandProvider>
  );
}
