"use client";

import { Sidebar, companyAdminNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { CompanyBrandProvider, useCompanyBrand } from "@/lib/company-ops";

function CompanyShell({ children }: { children: React.ReactNode }) {
  const { brand, cssVars } = useCompanyBrand();

  return (
    <div className="flex min-h-screen" style={cssVars as React.CSSProperties}>
      <Sidebar
        items={companyAdminNavItems}
        userName="Company Admin"
        companyName={brand.name}
        companyLogoUrl={brand.logoUrl}
        companyBrandColor={brand.brandColor}
        showPoweredBy
      />
      <div className="flex-1 ml-64">
        <TopBar
          title={brand.name}
          subtitle="Company Portal"
          brandColor={brand.brandColor}
        />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="company_admin">
      <CompanyBrandProvider>
        <CompanyShell>{children}</CompanyShell>
      </CompanyBrandProvider>
    </RoleGuard>
  );
}
