"use client";

import { Sidebar, coachNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="trainer">
      <div className="flex min-h-screen">
        <Sidebar items={coachNavItems} userName="Coach Portal" />
        <div className="flex-1 ml-64">
          <TopBar title="KAIROS" subtitle="Coach Portal" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
