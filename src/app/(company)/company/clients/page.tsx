"use client";

import { useState } from "react";
import {
  Search, ArrowUpDown, Filter,
} from "lucide-react";
import { useCompanyBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

type SortField = "name" | "trainer" | "tier";
type TierFilter = "all" | "tier1" | "tier2" | "tier3";

const TIER_LABELS: Record<string, string> = {
  tier1: "Private",
  tier2: "Associate",
  tier3: "AI-Guided",
};

const TIER_STYLES: Record<string, string> = {
  tier1: "bg-kairos-gold/15 text-kairos-gold",
  tier2: "bg-blue-500/15 text-blue-400",
  tier3: "bg-gray-500/15 text-gray-400",
};

export default function CompanyClientsPage() {
  const { company, brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // Fetch real data from DB via tRPC
  const { data: dashboardData, isLoading } = trpc.company.dashboard.getDashboard.useQuery(undefined, {
    staleTime: 30_000,
  });
  const allClients = dashboardData?.clients ?? [];
  const trainers = dashboardData?.trainers ?? [];

  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<TierFilter>("all");
  const [trainerFilter, setTrainerFilter] = useState("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  // Filter
  let clients = allClients.filter((c) => {
    const matchesSearch = `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(search.toLowerCase());
    const matchesTier = tierFilter === "all" || c.tier === tierFilter;
    const matchesTrainer = trainerFilter === "all" || c.trainerId === trainerFilter;
    return matchesSearch && matchesTier && matchesTrainer;
  });

  // Sort
  clients = [...clients].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "name": return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case "trainer": return dir * a.trainerName.localeCompare(b.trainerName);
      case "tier": return dir * a.tier.localeCompare(b.tier);
      default: return 0;
    }
  });

  const total = clients.length;
  const totalPages = Math.ceil(total / pageSize);
  const paged = clients.slice((page - 1) * pageSize, page * pageSize);

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("asc");
    }
    setPage(1);
  }

  // Tier stats
  const tier1Count = allClients.filter((c) => c.tier === "tier1").length;
  const tier2Count = allClients.filter((c) => c.tier === "tier2").length;
  const tier3Count = allClients.filter((c) => c.tier === "tier3").length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Loading clients...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Clients</h1>
          <p className="font-body text-kairos-silver-dark">
            All clients across {company?.name ? `${company.name}'s` : "your"} trainers
          </p>
        </div>
        <div className="flex items-center gap-4 text-right">
          <div>
            <p className="font-heading font-bold text-2xl text-white">{allClients.length}</p>
            <p className="text-xs text-kairos-silver-dark">
              Total{company ? ` of ${company.maxClients} max` : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Tier Summary */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <button
          onClick={() => { setTierFilter(tierFilter === "tier1" ? "all" : "tier1"); setPage(1); }}
          className={`kairos-card text-left transition-all ${tierFilter === "tier1" ? "ring-1 ring-kairos-gold" : ""}`}
        >
          <p className="kairos-label mb-1">Private (Tier 1)</p>
          <p className="font-heading font-bold text-xl text-kairos-gold">{tier1Count}</p>
        </button>
        <button
          onClick={() => { setTierFilter(tierFilter === "tier2" ? "all" : "tier2"); setPage(1); }}
          className={`kairos-card text-left transition-all ${tierFilter === "tier2" ? "ring-1 ring-blue-400" : ""}`}
        >
          <p className="kairos-label mb-1">Associate (Tier 2)</p>
          <p className="font-heading font-bold text-xl text-blue-400">{tier2Count}</p>
        </button>
        <button
          onClick={() => { setTierFilter(tierFilter === "tier3" ? "all" : "tier3"); setPage(1); }}
          className={`kairos-card text-left transition-all ${tierFilter === "tier3" ? "ring-1 ring-gray-400" : ""}`}
        >
          <p className="kairos-label mb-1">AI-Guided (Tier 3)</p>
          <p className="font-heading font-bold text-xl text-gray-400">{tier3Count}</p>
        </button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-4 top-2.5 w-4 h-4 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search clients..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-11 pr-4 py-2 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
        <div className="flex items-center gap-2">
          <Filter size={14} className="text-kairos-silver-dark" />
          <select
            value={trainerFilter}
            onChange={(e) => { setTrainerFilter(e.target.value); setPage(1); }}
            className="bg-kairos-card border border-kairos-border rounded-kairos-sm px-3 py-2 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
          >
            <option value="all">All Trainers</option>
            {trainers.map((t) => (
              <option key={t.id} value={t.id}>{t.firstName} {t.lastName}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="kairos-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left px-6 py-3">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors">
                  Client <ArrowUpDown size={12} className={sortField === "name" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-left px-6 py-3">
                <button onClick={() => toggleSort("trainer")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors">
                  Trainer <ArrowUpDown size={12} className={sortField === "trainer" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-3">
                <button onClick={() => toggleSort("tier")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors mx-auto">
                  Tier <ArrowUpDown size={12} className={sortField === "tier" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-3 kairos-label">Status</th>
            </tr>
          </thead>
          <tbody>
            {paged.map((c) => (
              <tr key={c.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                <td className="px-6 py-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-8 h-8 rounded-full flex items-center justify-center font-heading font-bold text-xs"
                      style={{
                        backgroundColor: (accentColor || "#A855F7") + "20",
                        color: accentColor || "#A855F7",
                      }}
                    >
                      {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="text-sm font-body text-white">{c.firstName} {c.lastName}</p>
                      <p className="text-xs font-body text-kairos-silver-dark">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-3 text-sm font-body text-kairos-silver-dark">{c.trainerName}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2.5 py-0.5 rounded-kairos-sm text-xs font-heading font-semibold ${TIER_STYLES[c.tier]}`}>
                    {TIER_LABELS[c.tier]}
                  </span>
                </td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-kairos-sm text-xs font-heading font-semibold ${
                    c.status === "active" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
                  }`}>
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
            {paged.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-kairos-silver-dark font-body">
                  {search || tierFilter !== "all" || trainerFilter !== "all" ? "No clients match your filters" : "No clients yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-xs font-body text-kairos-silver-dark">
            Showing {(page - 1) * pageSize + 1}–{Math.min(page * pageSize, total)} of {total}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(page - 1)}
              disabled={page <= 1}
              className="px-3 py-1.5 rounded-kairos-sm text-xs font-heading bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:text-white disabled:opacity-40 transition-colors"
            >
              Previous
            </button>
            <button
              onClick={() => setPage(page + 1)}
              disabled={page >= totalPages}
              className="px-3 py-1.5 rounded-kairos-sm text-xs font-heading bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:text-white disabled:opacity-40 transition-colors"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
