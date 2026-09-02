"use client";

import { Sidebar, trainerNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { CompanyBrandProvider, useCompanyBrand, isPlatformBrand } from "@/lib/company-ops";

function TrainerShell({ children }: { children: React.ReactNode }) {
  const { brand, cssVars } = useCompanyBrand();
  const isWhiteLabel = !isPlatformBrand(brand);

  return (
    <div className="flex min-h-screen" style={isWhiteLabel ? (cssVars as React.CSSProperties) : undefined}>
      <Sidebar
        items={trainerNavItems}
        userName="Coach Portal"
        companyName={isWhiteLabel ? brand.name : undefined}
        companyLogoUrl={isWhiteLabel ? brand.logoUrl : undefined}
        companyBrandColor={isWhiteLabel ? brand.brandColor : undefined}
        showPoweredBy={isWhiteLabel}
      />
      <div className="flex-1 ml-64">
        <TopBar
          title={isWhiteLabel ? brand.name : "EVERIST.ai"}
          subtitle="Coach Portal"
          brandColor={isWhiteLabel ? brand.brandColor : undefined}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="trainer">
      <CompanyBrandProvider>
        <TrainerShell>{children}</TrainerShell>
      </CompanyBrandProvider>
    </RoleGuard>
  );
}
