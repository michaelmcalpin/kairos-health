"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import {
  LayoutDashboard,
  Bell,
  Brain,
  MessageSquare,
  Droplets,
  Moon,
  FlaskConical,
  Pill,
  Ruler,
  Dumbbell,
  Timer,
  UtensilsCrossed,
  CreditCard,
  Store,
  Users,
  BarChart3,
  Calendar,
  ClipboardList,
  TrendingUp,
  UserCircle,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  Settings,
  ClipboardCheck,
  Building2,
  BookOpen,
  Dna,
} from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: React.ReactNode;
  badge?: number;
  section?: string;
};

interface SidebarProps {
  items: NavItem[];
  userName?: string;
  userTier?: string;
  /** White-label: company name replaces "KAIROS" */
  companyName?: string;
  /** White-label: company logo URL (shown instead of text brand) */
  companyLogoUrl?: string | null;
  /** White-label: hex brand color for accent override */
  companyBrandColor?: string;
  /** Show "Powered by Kairos" in footer for white-label companies */
  showPoweredBy?: boolean;
}

export function Sidebar({ items, userName, userTier, companyName, companyLogoUrl, companyBrandColor, showPoweredBy }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);

  const displayName = companyName || "KAIROS";
  const displaySubtitle = companyName ? "Health Platform" : "Private Health";

  // Group items by section
  const sections: Record<string, NavItem[]> = {};
  items.forEach((item) => {
    const section = item.section ?? "Main";
    if (!sections[section]) sections[section] = [];
    sections[section].push(item);
  });

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-kairos-royal border-r border-kairos-border flex flex-col transition-all duration-200 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-kairos-border">
        {!collapsed && (
          <div className="flex items-center gap-3 min-w-0">
            {companyLogoUrl ? (
              <img
                src={companyLogoUrl}
                alt={displayName}
                className="h-8 w-8 rounded-kairos-sm object-contain flex-shrink-0"
              />
            ) : companyBrandColor ? (
              <div
                className="h-8 w-8 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: companyBrandColor }}
              >
                {displayName.charAt(0)}
              </div>
            ) : null}
            <div className="min-w-0">
              <h1
                className="font-heading font-bold text-lg tracking-wide truncate"
                style={{ color: companyBrandColor || undefined }}
              >
                {companyName ? displayName : <span className="text-kairos-gold">KAIROS</span>}
              </h1>
              <p className="text-[10px] font-heading text-kairos-silver-dark uppercase tracking-widest">
                {displaySubtitle}
              </p>
            </div>
          </div>
        )}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="text-kairos-silver-dark hover:text-white transition-colors p-1"
        >
          {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
        </button>
      </div>

      {/* User Info */}
      {!collapsed && userName && (
        <div className="px-4 py-3 border-b border-kairos-border">
          <p className="text-sm font-heading font-semibold text-white truncate">{userName}</p>
          {userTier && (
            <span className="kairos-badge-gold text-[10px] mt-1">{userTier}</span>
          )}
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-4">
        {Object.entries(sections).map(([sectionName, sectionItems]) => (
          <div key={sectionName}>
            {!collapsed && (
              <p className="kairos-label px-3 mb-1.5">{sectionName}</p>
            )}
            <ul className="space-y-0.5">
              {sectionItems.map((item) => {
                const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      className={cn(
                        "kairos-sidebar-item",
                        isActive && "active",
                        collapsed && "justify-center px-2"
                      )}
                      title={collapsed ? item.label : undefined}
                    >
                      {item.icon}
                      {!collapsed && (
                        <span className="flex-1">{item.label}</span>
                      )}
                      {!collapsed && item.badge !== undefined && item.badge > 0 && (
                        <span className="bg-danger text-white text-[10px] font-heading font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1">
                          {item.badge > 99 ? "99+" : item.badge}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-kairos-border">
          {showPoweredBy ? (
            <p className="text-[10px] text-kairos-silver-dark font-body">
              Powered by <span className="text-kairos-gold font-semibold">KAIROS</span>
            </p>
          ) : (
            <p className="text-[10px] text-kairos-silver-dark font-body">
              KAIROS v0.1.0
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

// ─── Client Nav ──────────────────────────────────────────────────
export const clientNavItems: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Alerts", href: "/alerts", icon: <Bell size={18} />, section: "Overview" },
  { label: "Insights", href: "/insights", icon: <Brain size={18} />, section: "Overview" },
  { label: "Chat", href: "/chat", icon: <MessageSquare size={18} />, section: "Overview" },
  { label: "Glucose", href: "/glucose", icon: <Droplets size={18} />, section: "Biometrics" },
  { label: "Sleep", href: "/sleep", icon: <Moon size={18} />, section: "Biometrics" },
  { label: "Labs", href: "/labs", icon: <FlaskConical size={18} />, section: "Biometrics" },
  { label: "Measurements", href: "/measurements", icon: <Ruler size={18} />, section: "Biometrics" },
  { label: "Genetics", href: "/genetics", icon: <Dna size={18} />, section: "Biometrics" },
  { label: "Supplements", href: "/supplements", icon: <Pill size={18} />, section: "Protocols" },
  { label: "Workouts", href: "/workouts", icon: <Dumbbell size={18} />, section: "Protocols" },
  { label: "Fasting", href: "/fasting", icon: <Timer size={18} />, section: "Protocols" },
  { label: "Nutrition", href: "/nutrition", icon: <UtensilsCrossed size={18} />, section: "Protocols" },
  { label: "Check-in", href: "/checkin", icon: <ClipboardCheck size={18} />, section: "Protocols" },
  { label: "Payments", href: "/payments", icon: <CreditCard size={18} />, section: "Account" },
  { label: "Marketplace", href: "/marketplace", icon: <Store size={18} />, section: "Account" },
  { label: "Settings", href: "/settings", icon: <Settings size={18} />, section: "Account" },
];

// ─── Trainer Nav ─────────────────────────────────────────────────
export const trainerNavItems: NavItem[] = [
  { label: "Dashboard", href: "/trainer/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Alerts", href: "/trainer/alerts", icon: <Bell size={18} />, section: "Overview" },
  { label: "Schedule", href: "/trainer/schedule", icon: <Calendar size={18} />, section: "Overview" },
  { label: "Follow-ups", href: "/trainer/followups", icon: <ClipboardList size={18} />, section: "Overview" },
  { label: "Clients", href: "/trainer/clients", icon: <Users size={18} />, section: "Clients" },
  { label: "Metrics", href: "/trainer/metrics", icon: <TrendingUp size={18} />, section: "Clients" },
  { label: "Profile", href: "/trainer/profile", icon: <UserCircle size={18} />, section: "Business" },
  { label: "Revenue", href: "/trainer/revenue", icon: <DollarSign size={18} />, section: "Business" },
  { label: "Marketplace", href: "/trainer/marketplace", icon: <Store size={18} />, section: "Business" },
  { label: "Settings", href: "/trainer/settings", icon: <Settings size={18} />, section: "Business" },
];

// ─── Company Admin Nav ───────────────────────────────────────────
export const companyAdminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/company/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Trainers", href: "/company/trainers", icon: <Dumbbell size={18} />, section: "People" },
  { label: "Clients", href: "/company/clients", icon: <Users size={18} />, section: "People" },
  { label: "Settings", href: "/company/settings", icon: <Settings size={18} />, section: "Manage" },
];

// ─── Super Admin Nav ─────────────────────────────────────────────
export const superAdminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Companies", href: "/super-admin/companies", icon: <Building2 size={18} />, section: "People" },
  { label: "Trainers", href: "/super-admin/trainers", icon: <Dumbbell size={18} />, section: "People" },
  { label: "Users", href: "/super-admin/users", icon: <Users size={18} />, section: "People" },
  { label: "Analytics", href: "/super-admin/analytics", icon: <BarChart3 size={18} />, section: "Data" },
  { label: "Revenue", href: "/super-admin/revenue", icon: <DollarSign size={18} />, section: "Data" },
  { label: "Content", href: "/super-admin/content", icon: <FileText size={18} />, section: "Manage" },
  { label: "References", href: "/super-admin/references", icon: <BookOpen size={18} />, section: "Manage" },
  { label: "Settings", href: "/super-admin/settings", icon: <Settings size={18} />, section: "Manage" },
];

// Legacy aliases for backward compatibility
export const coachNavItems = trainerNavItems;
export const adminNavItems = superAdminNavItems;
