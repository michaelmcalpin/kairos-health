"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2, Search, Users, Dumbbell, Plus, MoreVertical,
  Edit2, Pause, Play, Trash2, DollarSign, ArrowUpDown, Eye,
  Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type SortBy = "name" | "createdAt" | "trainerCount" | "clientCount";
type StatusFilter = "all" | "active" | "inactive" | "suspended" | "onboarding";

export default function CompaniesPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("createdAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const utils = trpc.useUtils();

  // Fetch data via tRPC
  const { data: stats, isLoading: statsLoading } = trpc.admin.companies.getStats.useQuery(undefined, {
    staleTime: 30_000,
  });
  const { data: result, isLoading: listLoading } = trpc.admin.companies.list.useQuery(
    { search: searchQuery, status: statusFilter, sortBy, sortOrder, page, pageSize: 10 },
    { staleTime: 15_000 }
  );

  const actionMutation = trpc.admin.companies.performAction.useMutation({
    onSuccess: () => {
      utils.admin.companies.list.invalidate();
      utils.admin.companies.getStats.invalidate();
    },
  });

  function toggleSort(field: SortBy) {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setPage(1);
  }

  function handleAction(companyId: string, action: "suspend" | "reactivate" | "delete") {
    actionMutation.mutate({ companyId, action });
    setActionMenu(null);
  }

  if (statsLoading || listLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Loading companies...</p>
        </div>
      </div>
    );
  }

  const companiesList = result?.companies ?? [];
  const totalPages = result?.totalPages ?? 1;
  const total = result?.total ?? 0;

  return (
    <div className="animate-fade-in">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="font-heading font-bold text-3xl text-white mb-2">Companies</h1>
          <p className="font-body text-kairos-silver-dark">
            Manage companies using the Kairos platform
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-kairos-gold text-kairos-royal-dark rounded-kairos-sm font-heading font-semibold text-sm hover:bg-kairos-gold-light transition-colors"
        >
          <Plus size={16} />
          Add Company
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
        <div className="kairos-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="kairos-label mb-1">Total</p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">{stats?.totalCompanies ?? 0}</p>
            </div>
            <Building2 className="w-7 h-7 text-kairos-gold/40" />
          </div>
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="kairos-label mb-1">Active</p>
              <p className="font-heading font-bold text-2xl text-green-400">{stats?.activeCompanies ?? 0}</p>
            </div>
            <Play className="w-7 h-7 text-green-400/40" />
          </div>
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="kairos-label mb-1">Trainers</p>
              <p className="font-heading font-bold text-2xl text-blue-400">{stats?.totalTrainers ?? 0}</p>
            </div>
            <Dumbbell className="w-7 h-7 text-blue-400/40" />
          </div>
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="kairos-label mb-1">Clients</p>
              <p className="font-heading font-bold text-2xl text-purple-400">{stats?.totalClients ?? 0}</p>
            </div>
            <Users className="w-7 h-7 text-purple-400/40" />
          </div>
        </div>
        <div className="kairos-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="kairos-label mb-1">Est. MRR</p>
              <p className="font-heading font-bold text-2xl text-emerald-400">${((stats?.mrr ?? 0) / 1000).toFixed(0)}k</p>
            </div>
            <DollarSign className="w-7 h-7 text-emerald-400/40" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-4 top-3 w-4 h-4 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => { setSearchQuery(e.target.value); setPage(1); }}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-11 pr-4 py-2.5 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
          className="bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
        >
          <option value="all">All Statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
          <option value="inactive">Inactive</option>
          <option value="onboarding">Onboarding</option>
        </select>
      </div>

      {/* Company Table */}
      <div className="kairos-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left px-6 py-4">
                <button onClick={() => toggleSort("name")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors">
                  Company <ArrowUpDown size={12} className={sortBy === "name" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-left px-6 py-4 kairos-label">Status</th>
              <th className="text-center px-6 py-4">
                <button onClick={() => toggleSort("trainerCount")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors mx-auto">
                  Trainers <ArrowUpDown size={12} className={sortBy === "trainerCount" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-4">
                <button onClick={() => toggleSort("clientCount")} className="flex items-center gap-1 kairos-label hover:text-white transition-colors mx-auto">
                  Clients <ArrowUpDown size={12} className={sortBy === "clientCount" ? "text-kairos-gold" : ""} />
                </button>
              </th>
              <th className="text-center px-6 py-4 kairos-label">Capacity</th>
              <th className="text-right px-6 py-4 kairos-label">Actions</th>
            </tr>
          </thead>
          <tbody>
            {companiesList.map((company) => {
              const trainerPct = company.maxTrainers > 0 ? Math.round((company.trainerCount / company.maxTrainers) * 100) : 0;
              const clientPct = company.maxClients > 0 ? Math.round((company.clientCount / company.maxClients) * 100) : 0;
              const capacityPct = Math.max(trainerPct, clientPct);

              const statusColors: Record<string, string> = {
                active: "bg-green-500/15 text-green-400",
                suspended: "bg-yellow-500/15 text-yellow-400",
                inactive: "bg-gray-500/15 text-gray-400",
                onboarding: "bg-blue-500/15 text-blue-400",
              };

              return (
                <tr key={company.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold text-sm flex-shrink-0"
                        style={{ backgroundColor: company.brandColor + "30", color: company.brandColor }}
                      >
                        {company.name.charAt(0)}
                      </div>
                      <div>
                        <button onClick={() => router.push(`/super-admin/companies/${company.id}`)} className="font-heading font-semibold text-white text-sm hover:text-kairos-gold transition-colors text-left">
                          {company.name}
                        </button>
                        <p className="text-xs font-body text-kairos-silver-dark">{company.website || company.slug}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-kairos-sm text-xs font-heading font-semibold ${statusColors[company.status] || statusColors.inactive}`}>
                      {company.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-heading font-semibold text-white text-sm">{company.trainerCount}</span>
                    <span className="text-xs text-kairos-silver-dark">/{company.maxTrainers}</span>
                  </td>
                  <td className="px-6 py-4 text-center">
                    <span className="font-heading font-semibold text-white text-sm">{company.clientCount}</span>
                    <span className="text-xs text-kairos-silver-dark">/{company.maxClients}</span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 justify-center">
                      <div className="w-16 h-1.5 bg-gray-800 rounded-full overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${Math.min(capacityPct, 100)}%`,
                            backgroundColor: capacityPct >= 90 ? "#ef4444" : capacityPct >= 70 ? "#eab308" : "#22c55e",
                          }}
                        />
                      </div>
                      <span className="text-xs font-body text-kairos-silver-dark">{capacityPct}%</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="relative inline-block">
                      <button
                        onClick={() => setActionMenu(actionMenu === company.id ? null : company.id)}
                        className="p-2 rounded-kairos-sm text-kairos-silver-dark hover:text-white hover:bg-kairos-card-hover transition-colors"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {actionMenu === company.id && (
                        <div className="absolute right-0 top-10 w-48 bg-kairos-card border border-kairos-border rounded-kairos-sm shadow-lg z-20 py-1">
                          <button onClick={() => { router.push(`/super-admin/companies/${company.id}`); setActionMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                            <Eye size={14} /> View Details
                          </button>
                          <button onClick={() => { router.push(`/super-admin/companies/${company.id}`); setActionMenu(null); }} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-white hover:bg-kairos-card-hover transition-colors">
                            <Edit2 size={14} /> Edit Company
                          </button>
                          <div className="border-t border-kairos-border my-1" />
                          {company.status === "active" ? (
                            <button onClick={() => handleAction(company.id, "suspend")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-yellow-400 hover:bg-kairos-card-hover transition-colors">
                              <Pause size={14} /> Suspend
                            </button>
                          ) : (
                            <button onClick={() => handleAction(company.id, "reactivate")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-green-400 hover:bg-kairos-card-hover transition-colors">
                              <Play size={14} /> Reactivate
                            </button>
                          )}
                          <button onClick={() => handleAction(company.id, "delete")} className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-kairos-card-hover transition-colors">
                            <Trash2 size={14} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {companiesList.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center text-kairos-silver-dark font-body">
                  No companies found
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
            Showing {(page - 1) * 10 + 1}–{Math.min(page * 10, total)} of {total}
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

      {/* Create Modal */}
      {showCreateModal && (
        <CreateCompanyModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            utils.admin.companies.list.invalidate();
            utils.admin.companies.getStats.invalidate();
          }}
        />
      )}
    </div>
  );
}

// ─── Create Company Modal ────────────────────────────────────────

function CreateCompanyModal({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    website: "",
    brandColor: "#D4A574",
    maxTrainers: 10,
    maxClients: 100,
    emailFromName: "",
  });
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.admin.companies.create.useMutation({
    onSuccess: () => onCreated(),
    onError: (err) => setError(err.message || "Failed to create company"),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    createMutation.mutate({
      name: form.name,
      website: form.website || undefined,
      brandColor: form.brandColor,
      maxTrainers: form.maxTrainers,
      maxClients: form.maxClients,
      emailFromName: form.emailFromName || undefined,
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg bg-kairos-royal border border-kairos-border rounded-kairos shadow-lg">
        <div className="p-6 border-b border-kairos-border">
          <h2 className="font-heading font-bold text-xl text-white">Create New Company</h2>
          <p className="font-body text-sm text-kairos-silver-dark mt-1">Add a new company to the Kairos platform</p>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="px-4 py-2 rounded-kairos-sm bg-red-500/15 border border-red-500/30 text-red-400 text-sm font-body">
              {error}
            </div>
          )}

          <div>
            <label className="kairos-label block mb-1.5">Company Name *</label>
            <input
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
              placeholder="Acme Health Co."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="kairos-label block mb-1.5">Website</label>
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
                placeholder="https://acme.health"
              />
            </div>
            <div>
              <label className="kairos-label block mb-1.5">Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="w-10 h-10 rounded-kairos-sm border border-kairos-border cursor-pointer"
                />
                <input
                  value={form.brandColor}
                  onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                  className="flex-1 bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
                  placeholder="#D4A574"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="kairos-label block mb-1.5">Max Trainers</label>
              <input
                type="number"
                min={1}
                value={form.maxTrainers}
                onChange={(e) => setForm({ ...form, maxTrainers: parseInt(e.target.value) || 10 })}
                className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
              />
            </div>
            <div>
              <label className="kairos-label block mb-1.5">Max Clients</label>
              <input
                type="number"
                min={1}
                value={form.maxClients}
                onChange={(e) => setForm({ ...form, maxClients: parseInt(e.target.value) || 100 })}
                className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
              />
            </div>
          </div>

          <div>
            <label className="kairos-label block mb-1.5">Email From Name</label>
            <input
              value={form.emailFromName}
              onChange={(e) => setForm({ ...form, emailFromName: e.target.value })}
              className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
              placeholder="Defaults to company name"
            />
          </div>

          {/* Preview */}
          {form.name && (
            <div className="p-4 rounded-kairos-sm bg-kairos-card-hover border border-kairos-border">
              <p className="kairos-label mb-2">Brand Preview</p>
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold"
                  style={{ backgroundColor: form.brandColor + "30", color: form.brandColor }}
                >
                  {form.name.charAt(0)}
                </div>
                <div>
                  <p className="font-heading font-semibold text-white text-sm">{form.name}</p>
                  <p className="text-xs font-body text-kairos-silver-dark">{form.website || "No website"}</p>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-kairos-sm text-sm font-heading text-kairos-silver-dark hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={createMutation.isPending}
              className="px-5 py-2 bg-kairos-gold text-kairos-royal-dark rounded-kairos-sm font-heading font-semibold text-sm hover:bg-kairos-gold-light transition-colors disabled:opacity-50"
            >
              {createMutation.isPending ? "Creating..." : "Create Company"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
