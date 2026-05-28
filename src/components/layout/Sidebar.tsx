"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { SummitGlyph } from "@/components/brand/SummitGlyph";
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
  ChevronDown,
  Settings,
  ClipboardCheck,
  Building2,
  BookOpen,
  Dna,
  Activity,
  Footprints,
  Heart,
  Microscope,
  Scan,
  Bug,
  FileHeart,
  Tablets,
  Syringe,
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
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => {
    // Default: expand the section containing the active route
    const initial: Record<string, boolean> = {};
    const sections: Record<string, NavItem[]> = {};
    items.forEach((item) => {
      const section = item.section ?? "Main";
      if (!sections[section]) sections[section] = [];
      sections[section].push(item);
    });
    Object.entries(sections).forEach(([sectionName, sectionItems]) => {
      const hasActive = sectionItems.some(
        (item) => pathname === item.href || pathname.startsWith(item.href + "/")
      );
      initial[sectionName] = hasActive;
    });
    // Always expand Overview by default
    initial["Overview"] = true;
    return initial;
  });

  const displayName = companyName || "EVERIST.ai";
  const displaySubtitle = companyName ? "Health Platform" : "Private Health";

  // Group items by section (preserving order from items array)
  const sectionOrder: string[] = [];
  const sections: Record<string, NavItem[]> = {};
  items.forEach((item) => {
    const section = item.section ?? "Main";
    if (!sections[section]) {
      sections[section] = [];
      sectionOrder.push(section);
    }
    sections[section].push(item);
  });

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-kairos-royal border-r border-kairos-border flex flex-col transition-all duration-200 z-40",
        collapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Header */}
      <div className="flex items-center justify-between px-4 py-5 border-b border-kairos-border">
        {collapsed && (
          <SummitGlyph size={28} className="mx-auto" />
        )}
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
            ) : (
              <SummitGlyph size={32} className="flex-shrink-0" />
            )}
            <div className="min-w-0">
              <h1
                className="font-heading font-bold text-lg tracking-wide truncate"
                style={{ color: companyBrandColor || undefined }}
              >
                {companyName ? displayName : <span className="text-kairos-gold">EVERIST.ai</span>}
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
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
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
      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {sectionOrder.map((sectionName) => {
          const sectionItems = sections[sectionName];
          const isExpanded = expandedSections[sectionName] ?? false;
          const hasActiveChild = sectionItems.some(
            (item) => pathname === item.href || pathname.startsWith(item.href + "/")
          );
          const sectionBadgeTotal = sectionItems.reduce((sum, item) => sum + (item.badge ?? 0), 0);

          return (
            <div key={sectionName}>
              {/* Collapsible Section Header */}
              {!collapsed ? (
                <button
                  onClick={() => toggleSection(sectionName)}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-heading font-bold uppercase tracking-wider transition-colors",
                    hasActiveChild
                      ? "text-kairos-gold"
                      : "text-kairos-silver-dark hover:text-white"
                  )}
                >
                  <span>{sectionName}</span>
                  <div className="flex items-center gap-1.5">
                    {!isExpanded && sectionBadgeTotal > 0 && (
                      <span className="bg-danger text-white text-[9px] font-heading font-bold rounded-full min-w-[16px] h-[16px] flex items-center justify-center px-1">
                        {sectionBadgeTotal > 99 ? "99+" : sectionBadgeTotal}
                      </span>
                    )}
                    <ChevronDown
                      size={14}
                      className={cn(
                        "transition-transform duration-200",
                        isExpanded ? "rotate-0" : "-rotate-90"
                      )}
                    />
                  </div>
                </button>
              ) : (
                <div className="h-px bg-kairos-border mx-2 my-2" />
              )}

              {/* Section Items */}
              {(collapsed || isExpanded) && (
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
                            collapsed ? "justify-center px-2" : "pl-5"
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
              )}
            </div>
          );
        })}
      </nav>

      {/* Footer */}
      {!collapsed && (
        <div className="px-4 py-3 border-t border-kairos-border">
          {showPoweredBy ? (
            <p className="text-[10px] text-kairos-silver-dark font-body">
              Powered by <span className="text-kairos-gold font-semibold">EVERIST.ai</span>
            </p>
          ) : (
            <p className="text-[10px] text-kairos-silver-dark font-body">
              EVERIST.ai v0.1.0
            </p>
          )}
        </div>
      )}
    </aside>
  );
}

// ─── Client Nav ──────────────────────────────────────────────────
export const clientNavItems: NavItem[] = [
  // Overview (Alerts moved to TopBar bell icon)
  { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Chat", href: "/chat", icon: <MessageSquare size={18} />, section: "Overview" },
  { label: "Insight Sherpa", href: "/insights", icon: <Brain size={18} />, section: "Overview" },

  // Biometrics
  { label: "Body Comp", href: "/measurements", icon: <Ruler size={18} />, section: "Biometrics" },
  { label: "Sleep & Recovery", href: "/sleep", icon: <Moon size={18} />, section: "Biometrics" },
  { label: "Movement", href: "/workouts", icon: <Footprints size={18} />, section: "Biometrics" },
  { label: "Glucose", href: "/glucose", icon: <Droplets size={18} />, section: "Biometrics" },
  { label: "Blood Pressure", href: "/blood-pressure", icon: <Activity size={18} />, section: "Biometrics" },
  { label: "Cycle Tracker", href: "/cycle-tracker", icon: <Heart size={18} />, section: "Biometrics" },

  // Clinical Reports
  { label: "Blood Labs", href: "/labs", icon: <FlaskConical size={18} />, section: "Clinical Reports" },
  { label: "Genetics", href: "/genetics", icon: <Dna size={18} />, section: "Clinical Reports" },
  { label: "DexaScan", href: "/dexascan", icon: <Scan size={18} />, section: "Clinical Reports" },
  { label: "Gut Biome", href: "/gut-biome", icon: <Bug size={18} />, section: "Clinical Reports" },
  { label: "Medical Record", href: "/medical-record", icon: <FileHeart size={18} />, section: "Clinical Reports" },

  // Protocols
  { label: "Nutrition / Fasting", href: "/nutrition", icon: <UtensilsCrossed size={18} />, section: "Protocols" },
  { label: "Exercise", href: "/workouts", icon: <Dumbbell size={18} />, section: "Protocols" },
  { label: "Supplements", href: "/supplements", icon: <Pill size={18} />, section: "Protocols" },
  { label: "Peptides", href: "/peptides", icon: <Syringe size={18} />, section: "Protocols" },
  { label: "Medications", href: "/medications", icon: <Tablets size={18} />, section: "Protocols" },

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
