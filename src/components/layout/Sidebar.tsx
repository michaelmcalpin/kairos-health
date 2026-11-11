"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/utils/cn";
import { SummitGlyph } from "@/components/brand/SummitGlyph";
import {
  activeItem,
  groupBySection,
  initialSectionState,
  openActiveSection,
  parseSectionState,
  sectionStateKey,
  type SectionState,
} from "@/lib/nav/sidebar-groups";
import { CLIENT_NAV, CLIENT_ACCOUNT_LINKS, type ClientNavIcon } from "@/lib/nav/client-nav";
import {
  type LucideIcon,
  Sun,
  Watch,
  Upload,
  NotebookPen,
  HeartPulse,
  LayoutDashboard,
  Bell,
  Brain,
  MessageSquare,
  MessageCircle,
  Droplets,
  Moon,
  FlaskConical,
  Pill,
  Ruler,
  Dumbbell,
  Timer,
  UtensilsCrossed,
  CreditCard,
  Users,
  BarChart3,
  Calendar,
  TrendingUp,
  UserCircle,
  DollarSign,
  FileText,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Menu,
  X,
  Settings,
  ClipboardCheck,
  Building2,
  BookOpen,
  Dna,
  Activity,
  Heart,
  Microscope,
  Scan,
  Bug,
  FileHeart,
  Tablets,
  Syringe,
  Camera,
  Target,
  CalendarCheck,
  ShieldCheck,
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
  /** White-label: company name replaces "EVERIST" */
  companyName?: string;
  /** White-label: company logo URL (shown instead of text brand) */
  companyLogoUrl?: string | null;
  /** White-label: hex brand color for accent override */
  companyBrandColor?: string;
  /** Show "Powered by Everist" in footer for white-label companies */
  showPoweredBy?: boolean;
}

export function Sidebar({ items, userName, userTier, companyName, companyLogoUrl, companyBrandColor, showPoweredBy }: SidebarProps) {
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  // Below lg the sidebar is an off-canvas drawer (so the content fills the
  // screen on tablets/phones); this tracks whether the drawer is open.
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close the drawer whenever the route changes (a nav item was tapped).
  const closeMobile = () => setMobileOpen(false);

  // Section open/closed state (audit Q7): the section holding the current page
  // is always open; the user's own open/close choices persist per portal for
  // the browser session. First render uses defaults only (no storage) so the
  // server and client markup match; saved state is merged in after mount.
  const storageKey = sectionStateKey(items);
  const [expandedSections, setExpandedSections] = useState<SectionState>(() =>
    initialSectionState(items, pathname, null, ["Overview"]),
  );
  const restored = useRef(false);
  useEffect(() => {
    if (restored.current) return;
    restored.current = true;
    let saved: SectionState | null = null;
    try { saved = parseSectionState(window.sessionStorage.getItem(storageKey)); } catch { /* storage blocked */ }
    if (saved) setExpandedSections(initialSectionState(items, pathname, saved, ["Overview"]));
  }, [items, pathname, storageKey]);

  // On every route change: open the new page's section and reset scroll.
  useEffect(() => {
    setExpandedSections((prev) => openActiveSection(prev, items, pathname));
  }, [pathname, items]);
  useEffect(() => {
    window.scrollTo({ top: 0, left: 0 });
  }, [pathname]);

  // Persist after the first restore so defaults never overwrite saved state.
  useEffect(() => {
    if (!restored.current) return;
    try { window.sessionStorage.setItem(storageKey, JSON.stringify(expandedSections)); } catch { /* storage blocked */ }
  }, [expandedSections, storageKey]);

  const displayName = companyName || "EVERIST.ai";
  const displaySubtitle = companyName ? "Health Platform" : "Private Health";

  // Group items by section (preserving order from items array)
  const grouped = groupBySection(items);
  // Exactly one item is highlighted: the longest href matching the path.
  const current = activeItem(items, pathname);

  const toggleSection = (sectionName: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  return (
    <>
      {/* Mobile/tablet hamburger — opens the drawer. Hidden at lg+ where the
          sidebar is always visible. */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Open menu"
        className="lg:hidden fixed top-3 left-3 z-50 p-2 rounded-lg bg-kairos-royal/90 border border-kairos-border text-white backdrop-blur-md shadow-lg"
      >
        <Menu size={20} />
      </button>

      {/* Backdrop behind the open drawer (below lg only). */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-40"
          onClick={closeMobile}
          aria-hidden="true"
        />
      )}

    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-kairos-royal border-r border-kairos-border flex flex-col transition-transform duration-200 z-40",
        // Width: collapsible rail on desktop; always full width as a drawer.
        collapsed ? "lg:w-16 w-64" : "w-64",
        // Off-canvas below lg unless opened; always on-screen at lg+.
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      {/* Close button inside the drawer (below lg only). */}
      <button
        onClick={closeMobile}
        aria-label="Close menu"
        className="lg:hidden absolute top-3 right-3 z-10 p-1.5 rounded-lg text-kairos-silver-dark hover:text-white"
      >
        <X size={18} />
      </button>
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
        {grouped.map(({ name: sectionName, items: sectionItems }) => {
          const isExpanded = expandedSections[sectionName] ?? false;
          const hasActiveChild = !!current && sectionItems.includes(current);
          const sectionBadgeTotal = sectionItems.reduce((sum, item) => sum + (item.badge ?? 0), 0);
          // A section that is just one destination of the same name (client
          // "Today") renders as a plain link, without a collapsible header.
          const isSingleDestination = sectionItems.length === 1 && sectionItems[0].label === sectionName;

          return (
            <div key={sectionName}>
              {/* Collapsible Section Header */}
              {isSingleDestination ? null : !collapsed ? (
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
              {(collapsed || isExpanded || isSingleDestination) && (
                <ul className="space-y-0.5">
                  {sectionItems.map((item) => {
                    const isActive = item === current;
                    return (
                      <li key={item.href}>
                        <Link
                          href={item.href}
                          onClick={closeMobile}
                          aria-current={isActive ? "page" : undefined}
                          className={cn(
                            "kairos-sidebar-item",
                            isActive && "active",
                            collapsed ? "lg:justify-center lg:px-2 pl-5" : isSingleDestination ? "pl-3 font-semibold" : "pl-5"
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
    </>
  );
}

// ─── Client Nav ──────────────────────────────────────────────────
// Four destinations — Today, Body, Health record, Care. The structure lives in
// src/lib/nav/client-nav.ts (plain data, unit-tested); this maps icons.
const CLIENT_ICONS: Record<ClientNavIcon, LucideIcon> = {
  today: Sun,
  sleep: Moon,
  activity: Dumbbell,
  bp: HeartPulse,
  glucose: Droplets,
  body: Ruler,
  nutrition: UtensilsCrossed,
  fasting: Timer,
  cycle: Heart,
  log: NotebookPen,
  healthData: Activity,
  labs: FlaskConical,
  genetics: Dna,
  dexa: Scan,
  gut: Bug,
  record: FileHeart,
  reports: Brain,
  photos: Camera,
  messages: MessageSquare,
  careTeam: ShieldCheck,
  appointments: CalendarCheck,
  supplements: Pill,
  medications: Tablets,
  peptides: Syringe,
  goals: Target,
  lifescore: Activity,
  devices: Watch,
  settings: Settings,
  payments: CreditCard,
  import: Upload,
};

export function clientNavIcon(key: ClientNavIcon, size = 18): React.ReactNode {
  const Icon = CLIENT_ICONS[key];
  return <Icon size={size} />;
}

export const clientNavItems: NavItem[] = CLIENT_NAV.map((e) => ({
  label: e.label,
  href: e.href,
  section: e.section,
  icon: clientNavIcon(e.icon),
}));

/** Devices / Settings / Payments / Import — shown in the profile menu. */
export const clientAccountLinks = CLIENT_ACCOUNT_LINKS;

// ─── Trainer Nav ─────────────────────────────────────────────────
export const trainerNavItems: NavItem[] = [
  { label: "Today", href: "/trainer/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Inbox", href: "/trainer/inbox", icon: <Bell size={18} />, section: "Overview" },
  { label: "Schedule", href: "/trainer/schedule", icon: <Calendar size={18} />, section: "Overview" },
  { label: "Clients", href: "/trainer/clients", icon: <Users size={18} />, section: "Clients" },
  { label: "Programs", href: "/trainer/programs", icon: <Dumbbell size={18} />, section: "Clients" },
  { label: "Messages", href: "/trainer/messages", icon: <MessageCircle size={18} />, section: "Clients" },
  { label: "Metrics", href: "/trainer/metrics", icon: <TrendingUp size={18} />, section: "Clients" },
  { label: "My Health", href: "/trainer/my-health", icon: <Heart size={18} />, section: "Clients" },
  { label: "Profile", href: "/trainer/profile", icon: <UserCircle size={18} />, section: "Business" },
  { label: "Revenue", href: "/trainer/revenue", icon: <DollarSign size={18} />, section: "Business" },
  // Marketplace hidden from navigation until it has content (page still exists).
  { label: "Settings", href: "/trainer/settings", icon: <Settings size={18} />, section: "Business" },
];

// ─── Company Admin Nav ───────────────────────────────────────────
export const companyAdminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/company/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Coaches", href: "/company/trainers", icon: <Dumbbell size={18} />, section: "People" },
  { label: "Clients", href: "/company/clients", icon: <Users size={18} />, section: "People" },
  { label: "Settings", href: "/company/settings", icon: <Settings size={18} />, section: "Manage" },
];

// ─── Super Admin Nav ─────────────────────────────────────────────
export const superAdminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: <LayoutDashboard size={18} />, section: "Overview" },
  { label: "Companies", href: "/super-admin/companies", icon: <Building2 size={18} />, section: "People" },
  { label: "Coaches", href: "/super-admin/trainers", icon: <Dumbbell size={18} />, section: "People" },
  { label: "Users", href: "/super-admin/users", icon: <Users size={18} />, section: "People" },
  { label: "Clients & Coaches", href: "/super-admin/clients", icon: <Users size={18} />, section: "People" },
  { label: "Analytics", href: "/super-admin/analytics", icon: <BarChart3 size={18} />, section: "Data" },
  { label: "Revenue", href: "/super-admin/revenue", icon: <DollarSign size={18} />, section: "Data" },
  { label: "Content", href: "/super-admin/content", icon: <FileText size={18} />, section: "Manage" },
  { label: "References", href: "/super-admin/references", icon: <BookOpen size={18} />, section: "Manage" },
  { label: "Feedback", href: "/super-admin/feedback", icon: <MessageSquare size={18} />, section: "Manage" },
  { label: "Settings", href: "/super-admin/settings", icon: <Settings size={18} />, section: "Manage" },
];

// Legacy aliases for backward compatibility
export const coachNavItems = trainerNavItems;
export const adminNavItems = superAdminNavItems;
