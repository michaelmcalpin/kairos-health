"use client";

import { Sidebar, superAdminNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="super_admin">
      <div className="flex min-h-screen">
        <Sidebar items={superAdminNavItems} userName="Super Admin" />
        <div className="flex-1 ml-64">
          <TopBar title="KAIROS" subtitle="Platform Administration" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
