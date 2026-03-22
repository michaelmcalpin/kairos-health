"use client";

import { useState } from "react";
import {
  Dumbbell, Search, Star, Users, MoreVertical, Mail, Plus,
  ArrowUpDown, BarChart3,
} from "lucide-react";
import { useCompanyBrand } from "@/lib/company-ops";
import { getCompanyTrainers } from "@/lib/company-ops/engine";
import type { CompanyTrainer } from "@/lib/company-ops";

type SortField = "name" | "clientCount" | "capacity" | "rating";

export default function CompanyTrainersPage() {
  const { company, brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  const companyId = company?.id || "company-1";
  const allTrainers = getCompanyTrainers(companyId);

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [actionMenu, setActionMenu] = useState<string | null>(null);

  // Filter and sort
  let trainers = allTrainers.filter((t) =>
    `${t.firstName} ${t.lastName} ${t.email}`.toLowerCase().includes(search.toLowerCase())
  );

  trainers = [...trainers].sort((a, b) => {
    const dir = sortOrder === "asc" ? 1 : -1;
    switch (sortField) {
      case "name": return dir * `${a.firstName} ${a.lastName}`.localeCompare(`${b.firstName} ${b.lastName}`);
      case "clientCount": return dir * (a.clientCount - b.clientCount);
      case "capacity": return dir * (a.capacity - b.capacity);
      case "rating": return dir * (a.rating - b.rating);
      default: return 0;
    }
  });

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortOrder("desc");
    }
  }

  // Stats
  const totalClients = allTrainers.reduce((s, t) => s + t.clientCount, 0);
  const totalCapacity = allTrainers.reduce((s, t) => s + t.capacity, 0);
  const avgRating = allTrainers.length > 0
    ? (allTrainers.reduce((s, t) => s + t.rating, 0) / allTrainers.length).toFixed(1)
    : "0";
  const utilization = totalCapacity > 0 ? Math.round((totalClients / totalCapacity) * 100) : 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Trainers</h1>
          <p className="font-body text-kairos-silver-dark">
            Manage {company?.name ? `${company.name}'s` : "your company's"} trainers
          </p>
        </div>
        <button
          className="flex items-center gap-2 px-4 py-2.5 rounded-kairos-sm font-heading font-semibold text-sm transition-colors"
          style={{
            backgroundColor: accentColor || "rgb(var(--k-accent))",
            color: accentColor ? "#fff" : "rgb(var(--k-bg))",
          }}
        >
          <Plus size={16} />
          Invite Trainer
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-1">
            <p className="kairos-label">Total Trainers</p>
            <Dumbbell size={14} className="text-blue-400/50" />
          </div>
          <p className="font-heading font-bold text-xl text-white">{allTrainers.length}</p>
          {company && (
            <p className="text-xs text-kairos-silver-dark mt-0.5">of {company.maxTrainers} max</p>
          )}
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-1">
            <p className="kairos-label">Total Clients</p>
            <Users size={14} className="text-purple-400/50" />
          </div>
          <p className="font-heading font-bold text-xl text-white">{totalClients}</p>
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-1">
            <p className="kairos-label">Avg. Rating</p>
            <Star size={14} className="text-kairos-gold/50" />
          </div>
          <p className="font-heading font-bold text-xl text-kairos-gold">{avgRating}</p>
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-1">
            <p className="kairos-label">Utilization</p>
            <BarChart3 size={14} className="text-emerald-400/50" />
          </div>
          <p className="font-heading font-bold text-xl" style={{ color: utilization >= 90 ? "#ef4444" : utilization >= 70 ? "#eab308" : "#22c55e" }}>
            {utilization}%
          </p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-4">
        <div className="relative max-w-sm">
          <Search className="absolute left-4 top-2.5 w-4 h-4 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search trainers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-11 pr-4 py-2 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
      </div>

      {/* Table */}
      <div className="kairos-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left px-6 py-3">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors">
                  Trainer <ArrowUpDown size={12} className={sortField === "name" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-left px-6 py-3 kairos-label">Email</th>
              <th className="text-center px-6 py-3">
                <button onClick={() => toggleSort("clientCount")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors mx-auto">
                  Clients <ArrowUpDown size={12} className={sortField === "clientCount" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-3">
                <button onClick={() => toggleSort("capacity")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors mx-auto">
                  Capacity <ArrowUpDown size={12} className={sortField === "capacity" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-3">
                <button onClick={() => toggleSort("rating")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors mx-auto">
                  Rating <ArrowUpDown size={12} className={sortField === "rating" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-3 kairos-label">Status</th>
              <th className="text-right px-6 py-3 kairos-label">Actions</th>
            </tr>
          </thead>
          <tbody>
            {trainers.map((t) => (
              <TrainerRow
                key={t.id}
                trainer={t}
                accentColor={accentColor}
                actionMenuOpen={actionMenu === t.id}
                onToggleMenu={() => setActionMenu(actionMenu === t.id ? null : t.id)}
              />
            ))}
            {trainers.length === 0 && (
              <tr>
                <td colSpan={7} className="px-6 py-12 text-center text-kairos-silver-dark font-body">
                  {search ? "No trainers match your search" : "No trainers yet"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TrainerRow({
  trainer: t,
  accentColor,
  actionMenuOpen,
  onToggleMenu,
}: {
  trainer: CompanyTrainer;
  accentColor?: string;
  actionMenuOpen: boolean;
  onToggleMenu: () => void;
}) {
  const usagePct = t.capacity > 0 ? Math.round((t.clientCount / t.capacity) * 100) : 0;

  return (
    <tr className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
      <td className="px-6 py-3">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-full flex items-center justify-center font-heading font-bold text-xs"
            style={{
              backgroundColor: (accentColor || "#D4A574") + "20",
              color: accentColor || "#D4A574",
            }}
          >
            {t.firstName.charAt(0)}{t.lastName.charAt(0)}
          </div>
          <span className="text-sm font-body text-white">{t.firstName} {t.lastName}</span>
        </div>
      </td>
      <td className="px-6 py-3 text-sm font-body text-kairos-silver-dark">{t.email}</td>
      <td className="px-6 py-3 text-center">
        <span className="text-sm font-heading font-semibold text-white">{t.clientCount}</span>
      </td>
      <td className="px-6 py-3">
        <div className="flex items-center gap-2 justify-center">
          <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(usagePct, 100)}%`,
                backgroundColor: usagePct >= 90 ? "#ef4444" : usagePct >= 70 ? "#eab308" : "#22c55e",
              }}
            />
          </div>
          <span className="text-xs font-body text-kairos-silver-dark">{t.clientCount}/{t.capacity}</span>
        </div>
      </td>
      <td className="px-6 py-3 text-center">
        <div className="flex items-center gap-1 justify-center">
          <Star size={12} className="text-kairos-gold" />
          <span className="text-sm font-heading text-kairos-gold">{t.rating}</span>
        </div>
      </td>
      <td className="px-6 py-3 text-center">
        <span className={`px-2 py-0.5 rounded-kairos-sm text-xs font-heading font-semibold ${
          t.status === "active" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
        }`}>
          {t.status}
        </span>
      </td>
      <td className="px-6 py-3 text-right">
        <div className="relative inline-block">
          <button onClick={onToggleMenu} className="p-2 rounded-kairos-sm text-kairos-silver-dark hover:text-white hover:bg-kairos-card-hover transition-colors">
            <MoreVertical size={16} />
          </button>
          {actionMenuOpen && (
            <div className="absolute right-0 top-10 w-44 bg-kairos-card border border-kairos-border rounded-kairos-sm shadow-lg z-20 py-1">
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                <Users size={14} /> View Clients
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                <Mail size={14} /> Send Message
              </button>
              <button className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                <BarChart3 size={14} /> View Stats
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}
