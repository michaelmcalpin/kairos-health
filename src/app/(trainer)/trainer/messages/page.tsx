"use client";

import { MessagingDashboard } from "@/components/messaging/MessagingDashboard";
import { trpc } from "@/lib/trpc";

export default function CoachMessagesPage() {
  const { data: user } = trpc.auth.me.useQuery();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">Client Messages</h1>
        <p className="text-gray-400 mt-1">
          Communicate with your clients, review progress, and provide training guidance.
        </p>
      </div>

      <MessagingDashboard
        userId={user?.id ?? ""}
        role="coach"
        userName={user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "Trainer" : "Trainer"}
      />
    </div>
  );
}
