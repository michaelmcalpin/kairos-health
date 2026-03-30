"use client";

import { MessagingDashboard } from "@/components/messaging/MessagingDashboard";
import { trpc } from "@/lib/trpc";

export default function MessagesPage() {
  const { data: user } = trpc.auth.me.useQuery();

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">Messages</h1>
        <p className="text-gray-400 mt-1">
          Chat with your trainer or AI health assistant in real time.
        </p>
      </div>

      <MessagingDashboard
        userId={user?.id ?? ""}
        role="client"
        userName={user ? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || "You" : "You"}
      />
    </div>
  );
}
