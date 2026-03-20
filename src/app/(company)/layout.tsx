"use client";

import { Sidebar, companyAdminNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function CompanyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="company_admin">
      <div className="flex min-h-screen">
        <Sidebar items={companyAdminNavItems} userName="Company Admin" />
        <div className="flex-1 ml-64">
          <TopBar title="KAIROS" subtitle="Company Portal" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
