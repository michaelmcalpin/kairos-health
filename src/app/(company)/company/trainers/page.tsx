"use client";

import { useState } from "react";
import {
  Dumbbell, Search, Star, Users, MoreVertical, Mail, Plus,
  ArrowUpDown, BarChart3, X, Copy, Check,
} from "lucide-react";
import { useCompanyBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

interface CompanyTrainer {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatarUrl?: string | null;
  clientCount: number;
  capacity: number;
  rating: number;
  status: "active" | "inactive";
}

type SortField = "name" | "clientCount" | "capacity" | "rating";

export default function CompanyTrainersPage() {
  const { company, brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // Fetch real data from DB via tRPC
  const { data: dashboardData, isLoading } = trpc.company.dashboard.getDashboard.useQuery(undefined, {
    staleTime: 30_000,
  });
  const allTrainers: CompanyTrainer[] = dashboardData?.trainers ?? [];
  const allClients = dashboardData?.clients ?? [];

  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showTrainerDetail, setShowTrainerDetail] = useState<string | null>(null);

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

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Loading trainers...</p>
        </div>
      </div>
    );
  }

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
          onClick={() => setShowInviteModal(true)}
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
                onViewClients={() => { setActionMenu(null); setShowTrainerDetail(t.id); }}
                onViewStats={() => { setActionMenu(null); setShowTrainerDetail(t.id); }}
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

      {/* Invite Trainer Modal */}
      {showInviteModal && (
        <InviteTrainerModal
          companyName={company?.name || "your company"}
          accentColor={accentColor}
          onClose={() => setShowInviteModal(false)}
        />
      )}

      {/* Trainer Detail Drawer */}
      {showTrainerDetail && (
        <TrainerDetailDrawer
          trainer={allTrainers.find((t) => t.id === showTrainerDetail) || null}
          clients={allClients.filter((c) => c.trainerId === showTrainerDetail)}
          accentColor={accentColor}
          onClose={() => setShowTrainerDetail(null)}
        />
      )}
    </div>
  );
}

function TrainerRow({
  trainer: t,
  accentColor,
  actionMenuOpen,
  onToggleMenu,
  onViewClients,
  onViewStats,
}: {
  trainer: CompanyTrainer;
  accentColor?: string;
  actionMenuOpen: boolean;
  onToggleMenu: () => void;
  onViewClients: () => void;
  onViewStats: () => void;
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
              <button onClick={onViewClients} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                <Users size={14} /> View Clients
              </button>
              <button onClick={onToggleMenu} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                <Mail size={14} /> Send Message
              </button>
              <button onClick={onViewStats} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                <BarChart3 size={14} /> View Stats
              </button>
            </div>
          )}
        </div>
      </td>
    </tr>
  );
}

// ─── Invite Trainer Modal ─────────────────────────────────────────────────

function InviteTrainerModal({
  companyName,
  accentColor,
  onClose,
}: {
  companyName: string;
  accentColor?: string;
  onClose: () => void;
}) {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [copied, setCopied] = useState(false);

  const inviteLink = `${typeof window !== "undefined" ? window.location.origin : ""}/join/${companyName.toLowerCase().replace(/\s+/g, "-")}`;

  function handleSendInvite() {
    if (!email.trim()) return;
    setSent(true);
    setTimeout(() => setSent(false), 3000);
    setEmail("");
  }

  function handleCopyLink() {
    navigator.clipboard.writeText(inviteLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-kairos-card border border-kairos-border rounded-xl w-full max-w-md mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="font-heading font-bold text-xl text-white">Invite Trainer</h3>
          <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
        </div>

        {/* Email Invite */}
        <div className="mb-6">
          <label className="block text-xs text-kairos-silver-dark mb-2">Send invite via email</label>
          <div className="flex gap-2">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="trainer@example.com"
              className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
            />
            <button
              onClick={handleSendInvite}
              className="px-4 py-2 rounded-lg font-heading font-semibold text-sm transition-colors"
              style={{
                backgroundColor: accentColor || "rgb(var(--k-accent))",
                color: accentColor ? "#fff" : "rgb(var(--k-bg))",
              }}
            >
              {sent ? "Sent!" : "Send"}
            </button>
          </div>
          {sent && (
            <p className="text-xs text-green-400 mt-2">Invitation sent successfully!</p>
          )}
        </div>

        {/* Or separator */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-700" />
          <span className="text-xs text-gray-500">or share link</span>
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Copy Link */}
        <div>
          <label className="block text-xs text-kairos-silver-dark mb-2">Invite link</label>
          <div className="flex gap-2">
            <input
              type="text"
              readOnly
              value={inviteLink}
              className="flex-1 bg-gray-800/50 border border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-400 font-mono truncate"
            />
            <button
              onClick={handleCopyLink}
              className="px-3 py-2 rounded-lg bg-gray-700 text-white hover:bg-gray-600 transition-colors flex items-center gap-1.5 text-sm"
            >
              {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Trainer Detail Drawer ────────────────────────────────────────────────

interface CompanyClient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: string;
  status: string;
  trainerId: string;
  trainerName: string;
}

function TrainerDetailDrawer({
  trainer,
  clients,
  accentColor,
  onClose,
}: {
  trainer: CompanyTrainer | null;
  clients: CompanyClient[];
  accentColor?: string;
  onClose: () => void;
}) {
  if (!trainer) return null;

  const usagePct = trainer.capacity > 0 ? Math.round((trainer.clientCount / trainer.capacity) * 100) : 0;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg bg-kairos-card border-l border-kairos-border h-full overflow-y-auto animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <h3 className="font-heading font-bold text-xl text-white">Trainer Details</h3>
            <button onClick={onClose} className="p-1 rounded text-gray-400 hover:text-white transition-colors">
              <X size={18} />
            </button>
          </div>

          {/* Profile */}
          <div className="flex items-center gap-4 mb-6">
            <div
              className="w-14 h-14 rounded-full flex items-center justify-center font-heading font-bold text-lg"
              style={{
                backgroundColor: (accentColor || "#D4A574") + "20",
                color: accentColor || "#D4A574",
              }}
            >
              {trainer.firstName.charAt(0)}{trainer.lastName.charAt(0)}
            </div>
            <div>
              <p className="font-heading font-bold text-lg text-white">{trainer.firstName} {trainer.lastName}</p>
              <p className="text-sm text-kairos-silver-dark">{trainer.email}</p>
              <span className={`inline-block mt-1 px-2 py-0.5 rounded-kairos-sm text-xs font-heading font-semibold ${
                trainer.status === "active" ? "bg-green-500/15 text-green-400" : "bg-gray-500/15 text-gray-400"
              }`}>
                {trainer.status}
              </span>
            </div>
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="kairos-card text-center">
              <p className="text-2xl font-heading font-bold text-white">{trainer.clientCount}</p>
              <p className="text-xs text-kairos-silver-dark">Clients</p>
            </div>
            <div className="kairos-card text-center">
              <p className="text-2xl font-heading font-bold" style={{ color: accentColor || "rgb(var(--k-accent))" }}>
                {usagePct}%
              </p>
              <p className="text-xs text-kairos-silver-dark">Capacity</p>
            </div>
            <div className="kairos-card text-center">
              <div className="flex items-center justify-center gap-1">
                <Star size={14} className="text-kairos-gold" />
                <p className="text-2xl font-heading font-bold text-kairos-gold">{trainer.rating}</p>
              </div>
              <p className="text-xs text-kairos-silver-dark">Rating</p>
            </div>
          </div>

          {/* Capacity Bar */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-kairos-silver-dark">Client Capacity</p>
              <p className="text-xs text-white font-heading">{trainer.clientCount}/{trainer.capacity}</p>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(usagePct, 100)}%`,
                  backgroundColor: usagePct >= 90 ? "#ef4444" : usagePct >= 70 ? "#eab308" : "#22c55e",
                }}
              />
            </div>
          </div>

          {/* Client List */}
          <div>
            <h4 className="font-heading font-semibold text-white mb-3">
              Assigned Clients ({clients.length})
            </h4>
            {clients.length === 0 ? (
              <p className="text-sm text-kairos-silver-dark py-4 text-center">No clients assigned yet</p>
            ) : (
              <div className="space-y-2">
                {clients.map((c) => (
                  <div key={c.id} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-800/30 border border-gray-700/30">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-heading font-bold text-xs">
                        {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm text-white">{c.firstName} {c.lastName}</p>
                        <p className="text-xs text-gray-500">{c.email}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-kairos-sm text-xs font-heading font-semibold ${
                      c.tier === "tier1" ? "bg-kairos-gold/15 text-kairos-gold" :
                      c.tier === "tier2" ? "bg-blue-500/15 text-blue-400" :
                      "bg-gray-500/15 text-gray-400"
                    }`}>
                      {c.tier === "tier1" ? "Private" : c.tier === "tier2" ? "Associate" : "AI-Guided"}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
