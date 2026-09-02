"use client";

import { Sidebar, superAdminNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";
import { trpc } from "@/lib/trpc";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { data: me } = trpc.auth.me.useQuery();
  const userName = me?.firstName && me?.lastName
    ? `${me.firstName} ${me.lastName}`
    : "Super Admin";

  return (
    <RoleGuard allowedRole="super_admin">
      <div className="flex min-h-screen">
        <Sidebar items={superAdminNavItems} userName={userName} />
        <div className="flex-1 ml-64">
          <TopBar title="EVERIST.ai" subtitle="Platform Administration" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
