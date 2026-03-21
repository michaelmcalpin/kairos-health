"use client";

import { Sidebar, clientNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { CompanyBrandProvider, useCompanyBrand } from "@/lib/company-ops";

function ClientShell({ children }: { children: React.ReactNode }) {
  const { brand, cssVars } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";

  return (
    <div className="flex min-h-screen" style={isWhiteLabel ? (cssVars as React.CSSProperties) : undefined}>
      <Sidebar
        items={clientNavItems}
        userName="Client Portal"
        userTier="Tier 1"
        companyName={isWhiteLabel ? brand.name : undefined}
        companyLogoUrl={isWhiteLabel ? brand.logoUrl : undefined}
        companyBrandColor={isWhiteLabel ? brand.brandColor : undefined}
        showPoweredBy={isWhiteLabel}
      />
      <div className="flex-1 ml-64">
        <TopBar
          title={isWhiteLabel ? brand.name : "KAIROS"}
          subtitle={isWhiteLabel ? "Health Platform" : "Private Health Management"}
          brandColor={isWhiteLabel ? brand.brandColor : undefined}
        />
        <main className="p-6">{children}</main>
      </div>
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
