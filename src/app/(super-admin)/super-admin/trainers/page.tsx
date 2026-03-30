"use client";

import { useState, useMemo } from "react";
import { Search, MessageSquare, User, X, Send } from "lucide-react";
import { CompanySelector, useCompanyFilter } from "@/components/admin/CompanySelector";
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

export default function TrainersPage() {
  const { selectedCompany, setSelectedCompany, company } = useCompanyFilter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TrainerStatus | "All">("All");
  const [viewingTrainer, setViewingTrainer] = useState<{ name: string; email?: string; specialization?: string; clients: number; capacity: number; revenue?: number; score?: number } | null>(null);
  const [messagingTrainer, setMessagingTrainer] = useState<string | null>(null);
  const [messageText, setMessageText] = useState("");
  const [messageSent, setMessageSent] = useState(false);

  // Platform-level data via tRPC
  const { data: platformStatsData } = trpc.admin.dashboard.getTrainerStats.useQuery(
    undefined,
    { staleTime: 30_000 }
  );
  const platformStats = platformStatsData ?? {
    totalCoaches: 0, activeCoaches: 0, onLeaveCoaches: 0, pendingCoaches: 0,
    totalClients: 0, totalRevenue: 0, avgHealthScore: 0,
  };

  const { data: platformTrainersData } = trpc.admin.dashboard.listTrainers.useQuery(
    { search: searchQuery || undefined, status: statusFilter === "All" ? undefined : statusFilter },
    { staleTime: 15_000 }
  );
  const platformTrainers = platformTrainersData ?? [];

  // Company-level data via tRPC
  const { data: companyTrainersData } = trpc.admin.companies.getTrainers.useQuery(
    { companyId: company?.id ?? "" },
    { enabled: !!company, staleTime: 30_000 }
  );
  const companyTrainers = companyTrainersData ?? [];

  // Filter company trainers by search
  const filteredCompanyTrainers = useMemo(() => {
    if (!company) return [];
    let trainers = companyTrainers;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      trainers = trainers.filter(
        (t) =>
          `${t.firstName} ${t.lastName}`.toLowerCase().includes(q) ||
          t.email.toLowerCase().includes(q),
      );
    }
    return trainers;
  }, [company, companyTrainers, searchQuery]);

  // Stats
  const stats = useMemo(() => {
    if (!company) return platformStats;
    const trainers = companyTrainers;
    const active = trainers.filter((t) => t.status === "active");
    return {
      totalCoaches: trainers.length,
      activeCoaches: active.length,
      onLeaveCoaches: 0,
      pendingCoaches: 0,
      totalClients: active.reduce((s, t) => s + t.clientCount, 0),
      totalRevenue: active.reduce((s, t) => s + t.clientCount, 0) * 200 * 12,
      avgHealthScore: active.length > 0
        ? Math.round((active.reduce((s, t) => s + t.rating, 0) / active.length) * 10) / 10
        : 0,
    };
  }, [company, companyTrainers, platformStats]);

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Trainer Management</h1>
          <p className="text-sm font-body text-kairos-silver-dark">
            Manage and monitor your training team performance
          </p>
        </div>
        <CompanySelector value={selectedCompany} onChange={setSelectedCompany} />
      </div>

      {/* Company Badge */}
      {company && (
        <div
          className="flex items-center gap-3 px-4 py-3 rounded-kairos-sm border mb-6"
          style={{ borderColor: company.brandColor + "40", backgroundColor: company.brandColor + "10" }}
        >
          <div
            className="w-7 h-7 rounded flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: company.brandColor }}
          >
            {company.name.charAt(0)}
          </div>
          <span className="font-heading font-semibold text-white text-sm">{company.name}</span>
          <span className="text-xs text-kairos-silver-dark ml-auto">
            {company.trainerCount} trainers · capacity {company.maxTrainers}
          </span>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <div className="kairos-card">
          <div className="text-kairos-gold font-heading font-bold text-2xl">{stats.totalCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Total Trainers</div>
        </div>
        <div className="kairos-card">
          <div className="text-green-400 font-heading font-bold text-2xl">{stats.activeCoaches}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Active</div>
        </div>
        <div className="kairos-card">
          <div className="text-white font-heading font-bold text-2xl">{stats.totalClients}</div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">Total Clients</div>
        </div>
        <div className="kairos-card">
          <div className="text-kairos-gold font-heading font-bold text-2xl">
            {company
              ? (stats.avgHealthScore * 10).toFixed(0)
              : stats.avgHealthScore.toFixed(1)}
          </div>
          <div className="text-kairos-silver-dark text-xs font-body mt-1">
            {company ? "Avg Rating (x10)" : "Avg Health Score"}
          </div>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="kairos-card mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 w-4 h-4 text-kairos-silver-dark" />
            <input
              type="text"
              placeholder={company ? "Search trainers..." : "Search trainers or specializations..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-kairos-sm bg-kairos-card border border-kairos-border text-white font-body text-sm placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold"
            />
          </div>
          {!company && (
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
          )}
        </div>
      </div>

      {/* Trainer Roster Table */}
      <div className="kairos-card overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Name</th>
              {company && (
                <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Email</th>
              )}
              {!company && (
                <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Specialization</th>
              )}
              {!company && (
                <th className="text-left py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Status</th>
              )}
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Clients</th>
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Capacity</th>
              {company && (
                <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Rating</th>
              )}
              {!company && (
                <th className="text-right py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Revenue</th>
              )}
              {!company && (
                <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Avg Health Score</th>
              )}
              <th className="text-center py-3 px-4 text-kairos-gold font-heading font-semibold text-sm">Actions</th>
            </tr>
          </thead>
          <tbody>
            {company ? (
              filteredCompanyTrainers.length > 0 ? (
                filteredCompanyTrainers.map((trainer) => {
                  const utilization = trainer.capacity > 0
                    ? Math.round((trainer.clientCount / trainer.capacity) * 100)
                    : 0;
                  return (
                    <tr key={trainer.id} className="border-b border-kairos-border hover:bg-kairos-card-hover transition-colors">
                      <td className="py-3 px-4 font-body text-sm text-white">
                        {trainer.firstName} {trainer.lastName}
                      </td>
                      <td className="py-3 px-4 font-body text-sm text-kairos-silver-dark">{trainer.email}</td>
                      <td className="py-3 px-4 font-body text-sm text-white text-center">{trainer.clientCount}</td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${utilization}%`,
                                backgroundColor: utilization > 85 ? "#EF4444" : utilization > 60 ? "#F59E0B" : "#22C55E",
                              }}
                            />
                          </div>
                          <span className="text-xs text-kairos-silver-dark">{utilization}%</span>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-body text-sm text-kairos-gold text-center">{trainer.rating}</td>
                      <td className="py-3 px-4">
                        <div className="flex gap-2 justify-center">
                          <button
                            onClick={() => setViewingTrainer({ name: `${trainer.firstName} ${trainer.lastName}`, email: trainer.email, clients: trainer.clientCount, capacity: trainer.capacity, score: trainer.rating })}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body"
                          >
                            <User className="w-3 h-3" />
                            <span>View</span>
                          </button>
                          <button
                            onClick={() => setMessagingTrainer(`${trainer.firstName} ${trainer.lastName}`)}
                            className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body"
                          >
                            <MessageSquare className="w-3 h-3" />
                            <span>Message</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-kairos-silver-dark font-body">
                    No trainers found matching your criteria.
                  </td>
                </tr>
              )
            ) : (
              platformTrainers.length > 0 ? (
                platformTrainers.map((coach) => (
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
                        <button
                          onClick={() => setViewingTrainer({ name: coach.name, specialization: coach.specialization, clients: coach.clientsAssigned, capacity: coach.clientCapacity, revenue: coach.revenueGenerated, score: coach.avgHealthScore })}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body" title="View Profile"
                        >
                          <User className="w-3 h-3" />
                          <span>View</span>
                        </button>
                        <button
                          onClick={() => setMessagingTrainer(coach.name)}
                          className="inline-flex items-center gap-1 px-3 py-1 rounded-kairos-sm bg-kairos-card border border-kairos-border text-kairos-silver-dark hover:bg-kairos-card-hover hover:border-kairos-gold transition-colors text-xs font-body" title="Send Message"
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
                    No trainers found matching your criteria.
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </div>

      {/* Trainer Detail Drawer */}
      {viewingTrainer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">Trainer Profile</h2>
              <button onClick={() => setViewingTrainer(null)} className="text-kairos-silver-dark hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-full bg-kairos-gold/20 flex items-center justify-center">
                  <span className="text-kairos-gold font-heading font-bold text-lg">{viewingTrainer.name.split(" ").map((n) => n[0]).join("")}</span>
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-lg">{viewingTrainer.name}</h3>
                  {viewingTrainer.email && <p className="text-sm text-kairos-silver-dark">{viewingTrainer.email}</p>}
                  {viewingTrainer.specialization && <p className="text-sm text-kairos-silver-dark">{viewingTrainer.specialization}</p>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="kairos-card text-center">
                  <p className="text-xl font-heading font-bold text-kairos-gold">{viewingTrainer.clients}</p>
                  <p className="text-xs text-kairos-silver-dark">Clients</p>
                </div>
                <div className="kairos-card text-center">
                  <p className="text-xl font-heading font-bold text-white">{viewingTrainer.capacity}</p>
                  <p className="text-xs text-kairos-silver-dark">Capacity</p>
                </div>
                {viewingTrainer.revenue !== undefined && (
                  <div className="kairos-card text-center">
                    <p className="text-xl font-heading font-bold text-green-400">${viewingTrainer.revenue.toLocaleString()}</p>
                    <p className="text-xs text-kairos-silver-dark">Revenue</p>
                  </div>
                )}
                {viewingTrainer.score !== undefined && viewingTrainer.score > 0 && (
                  <div className="kairos-card text-center">
                    <p className="text-xl font-heading font-bold text-white">{viewingTrainer.score}</p>
                    <p className="text-xs text-kairos-silver-dark">Score/Rating</p>
                  </div>
                )}
              </div>
              {viewingTrainer.capacity > 0 && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-kairos-silver-dark">Utilization</span>
                    <span className="text-xs text-white font-semibold">{Math.round((viewingTrainer.clients / viewingTrainer.capacity) * 100)}%</span>
                  </div>
                  <div className="w-full h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div className="h-full rounded-full bg-kairos-gold transition-all" style={{ width: `${Math.min(100, Math.round((viewingTrainer.clients / viewingTrainer.capacity) * 100))}%` }} />
                  </div>
                </div>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-kairos-border">
              <button onClick={() => setViewingTrainer(null)} className="kairos-btn-outline flex-1">Close</button>
              <button onClick={() => { setMessagingTrainer(viewingTrainer.name); setViewingTrainer(null); }} className="kairos-btn-gold flex-1 flex items-center justify-center gap-2"><MessageSquare className="w-4 h-4" /> Message</button>
            </div>
          </div>
        </div>
      )}

      {/* Message Modal */}
      {messagingTrainer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-kairos-card border border-kairos-border rounded-kairos w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-kairos-border">
              <h2 className="font-heading font-bold text-lg text-white">Message {messagingTrainer}</h2>
              <button onClick={() => { setMessagingTrainer(null); setMessageText(""); setMessageSent(false); }} className="text-kairos-silver-dark hover:text-white"><X size={20} /></button>
            </div>
            <div className="p-6 space-y-4">
              {messageSent ? (
                <div className="text-center py-4">
                  <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-3">
                    <Send className="w-5 h-5 text-green-400" />
                  </div>
                  <p className="text-white font-heading font-semibold">Message Sent!</p>
                  <p className="text-sm text-kairos-silver-dark mt-1">Your message has been delivered to {messagingTrainer}.</p>
                </div>
              ) : (
                <>
                  <div>
                    <label className="kairos-label mb-1 block">Subject</label>
                    <input placeholder="Message subject..." className="kairos-input w-full" />
                  </div>
                  <div>
                    <label className="kairos-label mb-1 block">Message</label>
                    <textarea value={messageText} onChange={(e) => setMessageText(e.target.value)} placeholder="Write your message..." className="kairos-input w-full h-32 resize-none" />
                  </div>
                </>
              )}
            </div>
            <div className="flex gap-3 p-6 border-t border-kairos-border">
              <button onClick={() => { setMessagingTrainer(null); setMessageText(""); setMessageSent(false); }} className="kairos-btn-outline flex-1">{messageSent ? "Close" : "Cancel"}</button>
              {!messageSent && (
                <button
                  onClick={() => { setMessageSent(true); setTimeout(() => { setMessagingTrainer(null); setMessageText(""); setMessageSent(false); }, 2000); }}
                  disabled={!messageText.trim()}
                  className="kairos-btn-gold flex-1 flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" /> Send Message
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
