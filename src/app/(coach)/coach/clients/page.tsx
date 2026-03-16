"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { Search, Users } from "lucide-react";
import { filterCoachClients, getRosterStats, seedCoachClients } from "@/lib/coach-clients/engine";
import { TIER_LABELS, STATUS_LABELS } from "@/lib/coach-clients/types";
import type { ClientTier, ClientStatus } from "@/lib/coach-clients/types";
import { ClientCard } from "@/components/coach/ClientCard";

type SortField = "name" | "healthScore" | "alerts" | "adherence";

const COACH_ID = "demo-coach";

export default function CoachClientsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<ClientTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

  // Seed data on first render
  useMemo(() => seedCoachClients(COACH_ID), []);

  const clients = useMemo(
    () => filterCoachClients(COACH_ID, { search, tier: tierFilter, status: statusFilter, sortBy, sortOrder }),
    [search, tierFilter, statusFilter, sortBy, sortOrder]
  );

  const stats = useMemo(() => getRosterStats(COACH_ID), []);

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">My Clients</h1>
          <p className="text-gray-400 text-sm">Manage your client roster, track progress, and prioritize attention</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <Users size={14} />
          {stats.totalClients} clients
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-[#D4AF37]">{stats.totalClients}</p>
          <p className="text-[10px] text-gray-500 uppercase">Total</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-white">{stats.avgHealthScore}</p>
          <p className="text-[10px] text-gray-500 uppercase">Avg Score</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-green-400">{stats.stableCount}</p>
          <p className="text-[10px] text-gray-500 uppercase">Stable</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-yellow-400">{stats.attentionCount}</p>
          <p className="text-[10px] text-gray-500 uppercase">Attention</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-red-400">{stats.criticalCount}</p>
          <p className="text-[10px] text-gray-500 uppercase">Critical</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-[#D4AF37]/50"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as ClientTier | "all")}
          className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
        >
          <option value="all">All Tiers</option>
          <option value="tier1">{TIER_LABELS.tier1}</option>
          <option value="tier2">{TIER_LABELS.tier2}</option>
          <option value="tier3">{TIER_LABELS.tier3}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClientStatus | "all")}
          className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-[#D4AF37]/50"
        >
          <option value="all">All Status</option>
          <option value="stable">{STATUS_LABELS.stable}</option>
          <option value="attention">{STATUS_LABELS.attention}</option>
          <option value="critical">{STATUS_LABELS.critical}</option>
        </select>

        <div className="flex gap-1">
          {(["name", "healthScore", "alerts", "adherence"] as SortField[]).map((field) => (
            <button
              key={field}
              onClick={() => handleSort(field)}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                sortBy === field
                  ? "bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30"
                  : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
              }`}
            >
              {field === "healthScore" ? "Score" : field === "alerts" ? "Alerts" : field === "adherence" ? "Adherence" : "Name"}
              {sortBy === field && (sortOrder === "asc" ? " ↑" : " ↓")}
            </button>
          ))}
        </div>
      </div>

      {/* Client List */}
      <div className="space-y-2">
        {clients.length === 0 ? (
          <div className="kairos-card p-12 text-center">
            <p className="text-gray-500">No clients match the current filters.</p>
          </div>
        ) : (
          clients.map((client) => (
            <Link key={client.id} href={`/coach/clients/${client.id}`}>
              <ClientCard client={client} />
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
