"use client";

import { Sidebar, trainerNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";
import { RoleGuard } from "@/components/auth/RoleGuard";

export default function TrainerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <RoleGuard allowedRole="trainer">
      <div className="flex min-h-screen">
        <Sidebar items={trainerNavItems} userName="Trainer Portal" />
        <div className="flex-1 ml-64">
          <TopBar title="KAIROS" subtitle="Trainer Portal" />
          <main className="p-6">{children}</main>
        </div>
      </div>
    </RoleGuard>
  );
}
