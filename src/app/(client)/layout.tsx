"use client";

import { useMemo } from "react";
import { Sidebar, clientNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { CompanyBrandProvider, useCompanyBrand } from "@/lib/company-ops";
import { FloatingChat } from "@/components/chat/FloatingChat";
import { trpc } from "@/lib/trpc";

/** Nav items gated behind feature toggles: label → toggle key */
const TOGGLED_NAV_ITEMS: Record<string, string> = {
  "Cycle Tracker": "cycleTracker",
};

function ClientShell({ children }: { children: React.ReactNode }) {
  const { brand, cssVars } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";

  // Fetch feature toggles to conditionally show/hide sidebar items
  const { data: toggles } = trpc.clientPortal.settings.getFeatureToggles.useQuery(undefined, {
    staleTime: 5 * 60 * 1000, // cache 5 min
    retry: false,
  });

  const filteredNavItems = useMemo(() => {
    if (!toggles) {
      // While loading, hide toggled items to avoid flash
      return clientNavItems.filter((item) => !TOGGLED_NAV_ITEMS[item.label]);
    }
    return clientNavItems.filter((item) => {
      const toggleKey = TOGGLED_NAV_ITEMS[item.label];
      if (!toggleKey) return true; // not a toggled item — always show
      return toggles[toggleKey] === true;
    });
  }, [toggles]);

  return (
    <div className="flex min-h-screen" style={isWhiteLabel ? (cssVars as React.CSSProperties) : undefined}>
      <Sidebar
        items={filteredNavItems}
        userName="Client Portal"
        userTier="Tier 1"
        companyName={isWhiteLabel ? brand.name : undefined}
        companyLogoUrl={isWhiteLabel ? brand.logoUrl : undefined}
        companyBrandColor={isWhiteLabel ? brand.brandColor : undefined}
        showPoweredBy={isWhiteLabel}
      />
      <div className="flex-1 ml-64">
        <TopBar
          title={isWhiteLabel ? brand.name : "Everist.ai"}
          subtitle={isWhiteLabel ? "Health Platform" : "Private Health Management"}
          brandColor={isWhiteLabel ? brand.brandColor : undefined}
        />
        <main className="p-6">{children}</main>
      </div>
      <FloatingChat />
    </div>
  );
}

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="client">
      <CompanyBrandProvider>
        <ClientShell>{children}</ClientShell>
      </CompanyBrandProvider>
    </RoleGuard>
  );
}
