"use client";

import { Sidebar, clientNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function ClientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="client">
      <div className="flex min-h-screen">
        <Sidebar items={clientNavItems} userName="Client Portal" userTier="Tier 1" />
        <div className="flex-1 ml-64">
          <TopBar title="KAIROS" subtitle="Private Health Management" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
