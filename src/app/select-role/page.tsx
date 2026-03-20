"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Heart, Dumbbell, Building2, Shield, ArrowRight } from "lucide-react";
import type { UserRole } from "@/lib/company-ops/types";

const ROLE_HOME: Record<UserRole, string> = {
  super_admin: "/super-admin/dashboard",
  company_admin: "/company/dashboard",
  trainer: "/trainer/dashboard",
  client: "/dashboard",
};

const ROLES: {
  role: UserRole;
  label: string;
  subtitle: string;
  description: string;
  icon: typeof Shield;
  colorClass: string;
}[] = [
  {
    role: "client",
    label: "Client Portal",
    subtitle: "Health Dashboard",
    description: "Access your health dashboard, biometrics, protocols, and communicate with your trainer.",
    icon: Heart,
    colorClass: "text-kairos-gold bg-kairos-gold/15 group-hover:bg-kairos-gold/25",
  },
  {
    role: "trainer",
    label: "Trainer Portal",
    subtitle: "Client Management",
    description: "Manage your clients, review alerts, track protocols, and grow your practice.",
    icon: Dumbbell,
    colorClass: "text-blue-400 bg-blue-500/15 group-hover:bg-blue-500/25",
  },
  {
    role: "company_admin",
    label: "Company Portal",
    subtitle: "Team Management",
    description: "Oversee your trainers and clients, manage company branding and settings.",
    icon: Building2,
    colorClass: "text-emerald-400 bg-emerald-500/15 group-hover:bg-emerald-500/25",
  },
  {
    role: "super_admin",
    label: "Super Admin",
    subtitle: "Platform Administration",
    description: "Kairos platform administration — manage companies, rules, and system configuration.",
    icon: Shield,
    colorClass: "text-purple-400 bg-purple-500/15 group-hover:bg-purple-500/25",
  },
];

export default function SelectRolePage() {
  const router = useRouter();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const savedRole = localStorage.getItem("kairos-role") as UserRole | null;
    if (savedRole && ROLE_HOME[savedRole]) {
      router.replace(ROLE_HOME[savedRole]);
    } else {
      setChecking(false);
    }
  }, [router]);

  function selectRole(role: UserRole) {
    localStorage.setItem("kairos-role", role);
    router.push(ROLE_HOME[role]);
  }

  if (checking) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-kairos-royal-dark to-kairos-royal flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-heading font-bold text-xl text-kairos-gold tracking-wide mb-2">KAIROS</h1>
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
          <h1 className="font-heading font-bold text-2xl text-kairos-gold tracking-wide mb-1">KAIROS</h1>
          <p className="text-xs font-heading text-kairos-silver-dark uppercase tracking-widest">
            Private Health Management
          </p>
        </div>

        {/* Welcome */}
        <h2 className="font-heading font-bold text-3xl text-white mb-3">Welcome Back</h2>
        <p className="font-body text-kairos-silver-dark mb-12">
          How would you like to sign in today?
        </p>

        {/* Role Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {ROLES.map(({ role, label, description, icon: Icon, colorClass }) => (
            <button
              key={role}
              onClick={() => selectRole(role)}
              className="kairos-card p-8 text-left group hover:border-kairos-gold/40 transition-all duration-300 cursor-pointer"
            >
              <div className={`w-14 h-14 rounded-full flex items-center justify-center mb-6 transition-colors ${colorClass}`}>
                <Icon size={28} />
              </div>
              <h3 className="font-heading font-bold text-xl text-white mb-2">{label}</h3>
              <p className="font-body text-sm text-kairos-silver-dark mb-6 leading-relaxed">
                {description}
              </p>
              <div className="flex items-center gap-2 text-kairos-gold text-sm font-heading font-semibold group-hover:gap-3 transition-all">
                Enter <ArrowRight size={16} />
              </div>
            </button>
          ))}
        </div>

        <p className="text-xs font-body text-kairos-silver-dark">
          Your selection will be remembered for future sessions.
        </p>
      </div>
    </div>
  );
}
