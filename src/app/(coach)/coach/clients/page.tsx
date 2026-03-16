"use client";

import { useState } from "react";
import Link from "next/link";
import { Search, Filter, ChevronRight, Bell, TrendingUp, TrendingDown, Minus, Users } from "lucide-react";
import { useCoachClients } from "@/hooks/coach/useCoachClients";

type SortField = "name" | "score" | "alerts" | "lastActive";
type ClientTier = "tier1" | "tier2" | "tier3" | "all";

interface MockClient {
  id: string;
  name: string;
  initials: string;
  tier: "tier1" | "tier2" | "tier3";
  healthScore: number;
  scoreTrend: "up" | "down" | "flat";
  activeAlerts: number;
  adherence: number;
  lastActive: string;
  status: "stable" | "attention" | "critical";
  nextSession: string | null;
}

const mockClients: MockClient[] = [
  { id: "1", name: "Michael McAlpin", initials: "MM", tier: "tier1", healthScore: 87, scoreTrend: "up", activeAlerts: 2, adherence: 92, lastActive: "2h ago", status: "stable", nextSession: "Today 2:00 PM" },
  { id: "2", name: "Sarah Kim", initials: "SK", tier: "tier1", healthScore: 72, scoreTrend: "down", activeAlerts: 4, adherence: 68, lastActive: "5h ago", status: "attention", nextSession: "Tomorrow 10:00 AM" },
  { id: "3", name: "James Torres", initials: "JT", tier: "tier1", healthScore: 91, scoreTrend: "up", activeAlerts: 0, adherence: 98, lastActive: "1h ago", status: "stable", nextSession: "Mar 12 9:00 AM" },
  { id: "4", name: "Lisa Park", initials: "LP", tier: "tier1", healthScore: 65, scoreTrend: "down", activeAlerts: 5, adherence: 45, lastActive: "2d ago", status: "critical", nextSession: "Today 4:00 PM" },
  { id: "5", name: "David Chen", initials: "DC", tier: "tier2", healthScore: 83, scoreTrend: "flat", activeAlerts: 1, adherence: 85, lastActive: "3h ago", status: "stable", nextSession: null },
  { id: "6", name: "Emma Wilson", initials: "EW", tier: "tier2", healthScore: 78, scoreTrend: "up", activeAlerts: 2, adherence: 76, lastActive: "1d ago", status: "attention", nextSession: "Mar 11 11:00 AM" },
  { id: "7", name: "Alex Rivera", initials: "AR", tier: "tier3", healthScore: 74, scoreTrend: "flat", activeAlerts: 1, adherence: 70, lastActive: "6h ago", status: "stable", nextSession: null },
  { id: "8", name: "Nina Patel", initials: "NP", tier: "tier3", healthScore: 69, scoreTrend: "up", activeAlerts: 3, adherence: 62, lastActive: "4h ago", status: "attention", nextSession: null },
];

const tierLabels: Record<string, string> = { tier1: "Private", tier2: "Associate", tier3: "AI-Guided" };
const tierColors: Record<string, string> = { tier1: "text-kairos-gold", tier2: "text-blue-400", tier3: "text-purple-400" };

export default function CoachClientsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<ClientTier>("all");
  const [sortBy, setSortBy] = useState<SortField>("alerts");

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { clients: _apiClients } = useCoachClients();

  let filtered = mockClients.filter((c) => {
    if (search && !c.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (tierFilter !== "all" && c.tier !== tierFilter) return false;
    return true;
  });

  filtered = [...filtered].sort((a, b) => {
    if (sortBy === "alerts") return b.activeAlerts - a.activeAlerts;
    if (sortBy === "score") return b.healthScore - a.healthScore;
    if (sortBy === "name") return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Client Roster</h2>
          <p className="text-sm font-body text-kairos-silver-dark">{mockClients.length} clients across all tiers</p>
        </div>
        <div className="flex items-center gap-2">
          <Users size={16} className="text-kairos-gold" />
          <span className="text-sm font-heading font-bold text-kairos-gold">{mockClients.length}</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-kairos-silver-dark" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search clients..."
            className="kairos-input pl-9 w-full"
          />
        </div>
        <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1">
          {(["all", "tier1", "tier2", "tier3"] as ClientTier[]).map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors ${
                tierFilter === t ? "bg-kairos-gold text-kairos-royal-dark" : "text-kairos-silver-dark hover:text-white"
              }`}
            >
              {t === "all" ? "All" : tierLabels[t]}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-1 text-xs font-body text-kairos-silver-dark">
          <Filter size={12} />
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortField)}
            className="bg-kairos-card border border-kairos-border text-kairos-silver rounded-kairos-sm px-2 py-1 text-xs"
          >
            <option value="alerts">Sort: Alerts</option>
            <option value="score">Sort: Health Score</option>
            <option value="name">Sort: Name</option>
          </select>
        </div>
      </div>

      {/* Client Cards */}
      <div className="space-y-3">
        {filtered.map((client) => (
          <Link key={client.id} href={`/coach/clients/${client.id}`} className="block kairos-card hover:border-kairos-gold/20 transition-colors cursor-pointer">
            <div className="flex items-center gap-4">
              {/* Avatar */}
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${
                client.status === "critical" ? "bg-red-500/20" : client.status === "attention" ? "bg-yellow-500/20" : "bg-kairos-gold/20"
              }`}>
                <span className={`text-sm font-heading font-bold ${
                  client.status === "critical" ? "text-red-400" : client.status === "attention" ? "text-yellow-400" : "text-kairos-gold"
                }`}>{client.initials}</span>
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-heading font-semibold text-white">{client.name}</p>
                  <span className={`text-[10px] font-heading font-bold ${tierColors[client.tier]}`}>{tierLabels[client.tier]}</span>
                </div>
                <div className="flex items-center gap-4 mt-1 text-xs font-body text-kairos-silver-dark">
                  <span>Last active: {client.lastActive}</span>
                  {client.nextSession && <span>Next: {client.nextSession}</span>}
                </div>
              </div>

              {/* Metrics */}
              <div className="hidden md:flex items-center gap-6">
                <div className="text-center">
                  <p className="kairos-label">Score</p>
                  <div className="flex items-center gap-1">
                    <span className="text-sm font-heading font-bold text-kairos-gold">{client.healthScore}</span>
                    {client.scoreTrend === "up" && <TrendingUp size={12} className="text-green-400" />}
                    {client.scoreTrend === "down" && <TrendingDown size={12} className="text-red-400" />}
                    {client.scoreTrend === "flat" && <Minus size={12} className="text-kairos-silver-dark" />}
                  </div>
                </div>
                <div className="text-center">
                  <p className="kairos-label">Adherence</p>
                  <span className={`text-sm font-heading font-bold ${client.adherence >= 80 ? "text-green-400" : client.adherence >= 60 ? "text-yellow-400" : "text-red-400"}`}>
                    {client.adherence}%
                  </span>
                </div>
                <div className="text-center">
                  <p className="kairos-label">Alerts</p>
                  {client.activeAlerts > 0 ? (
                    <span className="flex items-center gap-1">
                      <Bell size={12} className="text-red-400" />
                      <span className="text-sm font-heading font-bold text-red-400">{client.activeAlerts}</span>
                    </span>
                  ) : (
                    <span className="text-sm font-heading font-bold text-green-400">0</span>
                  )}
                </div>
              </div>

              <ChevronRight size={18} className="text-kairos-silver-dark flex-shrink-0" />
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
