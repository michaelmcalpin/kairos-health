"use client";

import { Sidebar, adminNavItems } from "@/components/layout/Sidebar";
import { TopBar } from "@/components/layout/TopBar";

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen">
      <Sidebar items={adminNavItems} userName="Admin" />
      <div className="flex-1 ml-64">
        <TopBar title="KAIROS" subtitle="Administration" />
        <main className="p-6">{children}</main>
      </div>
    </div>
  );
}
