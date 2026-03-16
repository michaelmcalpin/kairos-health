"use client";

import { useState } from "react";
import { Search, MessageSquare, User } from "lucide-react";

interface Coach {
  id: string;
  name: string;
  specialization: string;
  status: "Active" | "On Leave" | "Pending";
  clientsAssigned: number;
  clientCapacity: number;
  revenueGenerated: number;
  avgHealthScore: number;
}

const mockCoaches: Coach[] = [
  {
    id: "1",
    name: "Dr. Sarah Mitchell",
    specialization: "Longevity Medicine",
    status: "Active",
    clientsAssigned: 12,
    clientCapacity: 15,
    revenueGenerated: 48500,
    avgHealthScore: 8.7,
  },
  {
    id: "2",
    name: "Dr. James Chen",
    specialization: "Metabolic Health",
    status: "Active",
    clientsAssigned: 14,
    clientCapacity: 15,
    revenueGenerated: 52300,
    avgHealthScore: 8.9,
  },
  {
    id: "3",
    name: "Dr. Emma Rodriguez",
    specialization: "Sleep Optimization",
    status: "Active",
    clientsAssigned: 10,
    clientCapacity: 12,
    revenueGenerated: 38200,
    avgHealthScore: 8.4,
  },
  {
    id: "4",
    name: "Dr. Michael Torres",
    specialization: "Functional Medicine",
    status: "Active",
    clientsAssigned: 13,
    clientCapacity: 15,
    revenueGenerated: 49800,
    avgHealthScore: 8.8,
  },
  {
    id: "5",
    name: "Dr. Lisa Anderson",
    specialization: "Nutrition Science",
    status: "Active",
    clientsAssigned: 11,
    clientCapacity: 15,
    revenueGenerated: 42100,
    avgHealthScore: 8.6,
  },
  {
    id: "6",
    name: "Dr. David Kim",
    specialization: "Performance Medicine",
    status: "Active",
    clientsAssigned: 15,
    clientCapacity: 15,
    revenueGenerated: 54200,
    avgHealthScore: 9.1,
  },
  {
    id: "7",
    name: "Dr. Rachel Green",
    specialization: "Longevity Medicine",
    status: "Active",
    clientsAssigned: 9,
    clientCapacity: 12,
    revenueGenerated: 35600,
    avgHealthScore: 8.5,
  },
  {
    id: "8",
    name: "Dr. Marcus Thompson",
    specialization: "Metabolic Health",
    status: "Active",
    clientsAssigned: 12,
    clientCapacity: 15,
    revenueGenerated: 46900,
    avgHealthScore: 8.7,
  },
  {
    id: "9",
    name: "Dr. Patricia Williams",
    specialization: "Functional Medicine",
    status: "On Leave",
    clientsAssigned: 0,
    clientCapacity: 15,
    revenueGenerated: 0,
    avgHealthScore: 0,
  },
  {
    id: "10",
    name: "Dr. Christopher Lee",
    specialization: "Sleep Optimization",
    status: "Active",
    clientsAssigned: 8,
    clientCapacity: 12,
    revenueGenerated: 32400,
    avgHealthScore: 8.3,
  },
  {
    id: "11",
    name: "Dr. Amanda Foster",
    specialization: "Nutrition Science",
    status: "Pending",
    clientsAssigned: 0,
    clientCapacity: 0,
    revenueGenerated: 0,
    avgHealthScore: 0,
  },
  {
    id: "12",
    name: "Dr. Nathan Price",
    specialization: "Performance Medicine",
    status: "Active",
    clientsAssigned: 11,
    clientCapacity: 15,
    revenueGenerated: 44700,
    avgHealthScore: 8.8,
  },
];

export default function CoachesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "On Leave" | "Pending">(
    "All"
  );

  const totalCoaches = mockCoaches.length;
  const activeCoaches = mockCoaches.filter((c) => c.status === "Active").length;
  const onLeaveCoaches = mockCoaches.filter((c) => c.status === "On Leave").length;
  const pendingCoaches = mockCoaches.filter((c) => c.status === "Pending").length;

  const filteredCoaches = mockCoaches.filter((coach) => {
    const matchesSearch =
      coach.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      coach.specialization.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "All" || coach.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "bg-green-900 text-green-200";
      case "On Leave":
        return "bg-yellow-900 text-yellow-200";
      case "Pending":
        return "bg-blue-900 text-blue-200";
      default:
        return "bg-gray-700 text-gray-200";
    }
  };

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
          <div className="text-kairos-gold font-heading font-bold text-2xl">{totalCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Total Coaches</div>
        </div>
        <div className="kairos-card">
          <div className="text-green-400 font-heading font-bold text-2xl">{activeCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Active</div>
        </div>
        <div className="kairos-card">
          <div className="text-yellow-400 font-heading font-bold text-2xl">{onLeaveCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">On Leave</div>
        </div>
        <div className="kairos-card">
          <div className="text-blue-400 font-heading font-bold text-2xl">{pendingCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Pending Approval</div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="kairos-card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          {/* Search Bar */}
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

          {/* Status Filter */}
          <div className="flex gap-2">
            {(["All", "Active", "On Leave", "Pending"] as const).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-kairos-sm text-sm font-body font-semibold transition-colors ${
                  statusFilter === status
                    ? "bg-kairos-gold text-[#122055]"
                    : "bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:border-kairos-gold"
                }`}
              >
                {status}
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
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Name
              </th>
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Specialization
              </th>
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Status
              </th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Clients
              </th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Capacity
              </th>
              <th className="text-right py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Revenue
              </th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Avg Health Score
              </th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filteredCoaches.length > 0 ? (
              filteredCoaches.map((coach) => (
                <tr
                  key={coach.id}
                  className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors"
                >
                  <td className="py-3 px-4 font-body text-sm text-white">{coach.name}</td>
                  <td className="py-3 px-4 font-body text-sm text-kairos-silver-dark">
                    {coach.specialization}
                  </td>
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-3 py-1 rounded-kairos-sm font-body text-xs font-semibold ${getStatusColor(
                        coach.status
                      )}`}
                    >
                      {coach.status}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-body text-sm text-white text-center">
                    {coach.clientsAssigned}
                  </td>
                  <td className="py-3 px-4 font-body text-sm text-kairos-silver-dark text-center">
                    {coach.clientCapacity}
                  </td>
                  <td className="py-3 px-4 font-body text-sm text-white text-right">
                    {"$"}
                    {coach.revenueGenerated.toLocaleString()}
                  </td>
                  <td className="py-3 px-4 font-body text-sm text-white text-center">
                    {coach.avgHealthScore > 0 ? coach.avgHealthScore : "N/A"}
                  </td>
                  <td className="py-3 px-4">
                    <div className="flex gap-2 justify-center">
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body"
                        title="View Profile"
                      >
                        <User className="w-3 h-3" />
                        <span>View</span>
                      </button>
                      <button
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body"
                        title="Send Message"
                      >
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
