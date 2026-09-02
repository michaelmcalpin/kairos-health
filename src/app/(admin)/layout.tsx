"use client";

import { Sidebar, adminNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="super_admin">
      <div className="flex min-h-screen">
        <Sidebar items={adminNavItems} userName="Admin" />
        <div className="flex-1 ml-64">
          <TopBar title="EVERIST.ai" subtitle="Administration" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
