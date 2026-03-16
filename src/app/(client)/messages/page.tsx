"use client";

import { MessagingDashboard } from "@/components/messaging/MessagingDashboard";

export default function MessagesPage() {
  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">Messages</h1>
        <p className="text-gray-400 mt-1">
          Chat with your coach or AI health assistant in real time.
        </p>
      </div>

      <MessagingDashboard
        userId="demo-client"
        role="client"
        userName="You"
      />
    </div>
  );
}
