"use client";

import { useState } from "react";
import { Search, MessageSquare, User } from "lucide-react";
import { trpc } from "@/lib/trpc";

type TrainerStatus = "active" | "inactive" | "suspended" | "onboarding";

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-900 text-green-200",
  inactive: "bg-gray-900 text-gray-200",
  suspended: "bg-yellow-900 text-yellow-200",
  onboarding: "bg-blue-900 text-blue-200",
};

const STATUS_LABELS: Record<string, string> = {
  active: "Active",
  inactive: "Inactive",
  suspended: "On Leave",
  onboarding: "Pending",
};

export default function CoachesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TrainerStatus | "All">("All");

  const { data: statsData } = trpc.admin.dashboard.getTrainerStats.useQuery(undefined, { staleTime: 30_000 });
  const stats = statsData ?? {
    totalCoaches: 0, activeCoaches: 0, onLeaveCoaches: 0, pendingCoaches: 0,
    totalClients: 0, totalRevenue: 0, avgHealthScore: 0,
  };

  const { data: coachesData } = trpc.admin.dashboard.listTrainers.useQuery(
    { search: searchQuery || undefined, status: statusFilter === "All" ? undefined : statusFilter },
    { staleTime: 15_000 }
  );
  const filteredCoaches = coachesData ?? [];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Coach Management</h1>
        <p className="text-sm font-body text-kairos-silver-dark">
          Manage and monitor your coaching team performance
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="kairos-card">
          <div className="text-kairos-gold font-heading font-bold text-2xl">{stats.totalCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Total Coaches</div>
        </div>
        <div className="kairos-card">
          <div className="text-green-400 font-heading font-bold text-2xl">{stats.activeCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Active</div>
        </div>
        <div className="kairos-card">
          <div className="text-yellow-400 font-heading font-bold text-2xl">{stats.onLeaveCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">On Leave</div>
        </div>
        <div className="kairos-card">
          <div className="text-blue-400 font-heading font-bold text-2xl">{stats.pendingCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Pending Approval</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="kairos-card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-kairos-silver-dark" />
            <input
              type="text"
              placeholder="Search coaches or specializations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-kairos-sm bg-kairos-card border border-kairos-border text-white font-body text-sm placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold"
            />
          </div>
          <div className="flex gap-2">
            {([
              { value: "All" as const, label: "All" },
              { value: "active" as const, label: "Active" },
              { value: "suspended" as const, label: "On Leave" },
              { value: "onboarding" as const, label: "Pending" },
            ]).map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value)}
                className={`px-4 py-2 rounded-kairos-sm text-sm font-body font-semibold transition-colors ${
                  statusFilter === value
                    ? "bg-kairos-gold text-kairos-royal"
                    : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:border-kairos-gold"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Coach Roster Table */}
      <div className="kairos-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Name</th>
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Specialization</th>
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Status</th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Clients</th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Capacity</th>
              <th className="text-right py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Revenue</th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Avg Health Score</th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredCoaches.length > 0 ? (
              filteredCoaches.map((coach) => (
                <tr key={coach.id} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                  <td className="py-3 px-4 font-body text-sm text-white">{coach.name}</td>
                  <td className="py-3 px-4 font-body text-sm text-kairos-silver-dark">{coach.specialization}</td>
                  <td className="py-3 px-4">
                    <span className={`inline-block px-3 py-1 rounded-kairos-sm font-body text-xs font-semibold ${STATUS_COLORS[coach.status] ?? "bg-gray-900 text-gray-200"}`}>
                      {STATUS_LABELS[coach.status] ?? coach.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-body text-sm text-white text-center">{coach.clientsAssigned}</td>
                  <td className="py-3 px-4 font-body text-sm text-kairos-silver-dark text-center">{coach.clientCapacity}</td>
                  <td className="py-3 px-4 font-body text-sm text-white text-right">${coach.revenueGenerated.toLocaleString()}</td>
                  <td className="py-3 px-4 font-body text-sm text-white text-center">
                    {coach.avgHealthScore > 0 ? coach.avgHealthScore : "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-center">
                      <button className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body" title="View Profile">
                        <User className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body" title="Send Message">
                        <MessageSquare className="w-3 h-3" />
                        <span>Message</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="py-8 text-center text-kairos-silver-dark font-body">
                  No coaches found matching your criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
