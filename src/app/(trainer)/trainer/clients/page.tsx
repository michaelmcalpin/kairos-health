"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { Search, Users, UserPlus, X, Mail, Check, Clock, ChevronDown, Trash2, Plus, Phone, Calendar } from "lucide-react";
import { TIER_LABELS, STATUS_LABELS } from "@/lib/coach-clients/types";
import type { ClientTier, ClientStatus } from "@/lib/coach-clients/types";
import { ClientCard } from "@/components/coach/ClientCard";
import { trpc } from "@/lib/trpc";

type SortField = "name" | "healthScore" | "alerts" | "adherence";
type ModalTab = "search" | "invite" | "create" | "pending";

export default function CoachClientsPage() {
  const [search, setSearch] = useState("");
  const [tierFilter, setTierFilter] = useState<ClientTier | "all">("all");
  const [statusFilter, setStatusFilter] = useState<ClientStatus | "all">("all");
  const [sortBy, setSortBy] = useState<SortField>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showAddModal, setShowAddModal] = useState(false);

  const utils = trpc.useUtils();

  // ── tRPC queries — real DB data ──────────────────────────────
  const { data: clients = [], isLoading } = trpc.coach.clients.list.useQuery(
    {
      search: search || undefined,
      tier: tierFilter,
      status: statusFilter,
      sortBy,
      sortOrder,
    },
    { staleTime: 15_000, refetchOnWindowFocus: false }
  );

  const { data: stats } = trpc.coach.clients.getStats.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  const handleSort = (field: SortField) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder(field === "name" ? "asc" : "desc");
    }
  };

  const handleClientAdded = useCallback(() => {
    utils.coach.clients.list.invalidate();
    utils.coach.clients.getStats.invalidate();
  }, [utils]);

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">My Clients</h1>
            <p className="text-gray-400 text-sm">Manage your client roster, track progress, and prioritize attention</p>
          </div>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="kairos-card p-3 h-20 animate-pulse bg-gray-800/50" />
          ))}
        </div>
        <div className="space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kairos-card h-24 animate-pulse bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">My Clients</h1>
          <p className="text-gray-400 text-sm">Manage your client roster, track progress, and prioritize attention</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddModal(true)}
            className="kairos-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium"
          >
            <UserPlus size={16} />
            Add Client
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Users size={14} />
            {stats?.totalClients ?? clients.length} clients
          </div>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-kairos-gold">{stats?.totalClients ?? clients.length}</p>
          <p className="text-[10px] text-gray-500 uppercase">Total</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-white">{stats?.avgHealthScore ?? 0}</p>
          <p className="text-[10px] text-gray-500 uppercase">Avg Score</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-green-400">{stats?.stableCount ?? 0}</p>
          <p className="text-[10px] text-gray-500 uppercase">Stable</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-yellow-400">{stats?.attentionCount ?? 0}</p>
          <p className="text-[10px] text-gray-500 uppercase">Attention</p>
        </div>
        <div className="kairos-card p-3 text-center">
          <p className="text-2xl font-heading font-bold text-red-400">{stats?.criticalCount ?? 0}</p>
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
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>

        <select
          value={tierFilter}
          onChange={(e) => setTierFilter(e.target.value as ClientTier | "all")}
          className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
        >
          <option value="all">All Tiers</option>
          <option value="tier1">{TIER_LABELS.tier1}</option>
          <option value="tier2">{TIER_LABELS.tier2}</option>
          <option value="tier3">{TIER_LABELS.tier3}</option>
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ClientStatus | "all")}
          className="px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
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
                  ? "bg-kairos-gold/20 text-kairos-gold border border-kairos-gold/30"
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
            <Users size={48} className="mx-auto mb-4 text-gray-600" />
            <h3 className="font-heading font-semibold text-white mb-2">No clients found</h3>
            <p className="text-sm text-gray-400 mb-4">
              {search || tierFilter !== "all" || statusFilter !== "all"
                ? "No clients match the current filters."
                : "Your client roster is empty. Add your first client to get started."}
            </p>
            {!search && tierFilter === "all" && statusFilter === "all" && (
              <button
                onClick={() => setShowAddModal(true)}
                className="kairos-btn px-6 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2"
              >
                <UserPlus size={16} />
                Add Your First Client
              </button>
            )}
          </div>
        ) : (
          clients.map((client) => (
            <Link key={client.id} href={`/trainer/clients/${client.id}`}>
              <ClientCard client={client} />
            </Link>
          ))
        )}
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <AddClientModal
          onClose={() => setShowAddModal(false)}
          onClientAdded={handleClientAdded}
        />
      )}
    </div>
  );
}

// ─── Add Client Modal ──────────────────────────────────────────

function AddClientModal({
  onClose,
  onClientAdded,
}: {
  onClose: () => void;
  onClientAdded: () => void;
}) {
  const [tab, setTab] = useState<ModalTab>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedTier, setSelectedTier] = useState<"tier1" | "tier2" | "tier3">("tier3");
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteNote, setInviteNote] = useState("");
  const [feedback, setFeedback] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.trim().length >= 2) {
        setDebouncedQuery(searchQuery.trim());
      } else {
        setDebouncedQuery("");
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data: searchResults = [], isFetching: isSearching } = trpc.coach.clients.searchUsers.useQuery(
    { query: debouncedQuery },
    { enabled: debouncedQuery.length >= 2, staleTime: 10_000 }
  );

  const { data: invitations = [], refetch: refetchInvitations } = trpc.coach.clients.listInvitations.useQuery(
    undefined,
    { staleTime: 15_000 }
  );

  const addClientMutation = trpc.coach.clients.addClient.useMutation({
    onSuccess: () => {
      setFeedback({ type: "success", message: "Client assigned successfully!" });
      onClientAdded();
      setSearchQuery("");
      setDebouncedQuery("");
    },
    onError: (err) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  const inviteClientMutation = trpc.coach.clients.inviteClient.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setFeedback({ type: "success", message: "Invitation sent!" });
        setInviteEmail("");
        setInviteNote("");
        refetchInvitations();
      } else {
        const msg = "message" in result ? (result as { message: string }).message : "Could not send invitation.";
        if ("existingUserId" in result) {
          setFeedback({ type: "error", message: msg });
          setTab("search");
          setSearchQuery(inviteEmail);
        } else {
          setFeedback({ type: "error", message: msg });
        }
      }
    },
    onError: (err) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  const createClientMutation = trpc.coach.clients.createClient.useMutation({
    onSuccess: (result) => {
      if (result.success) {
        setFeedback({ type: "success", message: "Client created and welcome email sent!" });
        onClientAdded();
      } else {
        const msg = "message" in result ? (result as { message: string }).message : "Could not create client.";
        if ("existingUserId" in result) {
          setFeedback({ type: "error", message: msg });
          setTab("search");
        } else {
          setFeedback({ type: "error", message: msg });
        }
      }
    },
    onError: (err) => {
      setFeedback({ type: "error", message: err.message });
    },
  });

  const cancelInvitationMutation = trpc.coach.clients.cancelInvitation.useMutation({
    onSuccess: () => {
      refetchInvitations();
    },
  });

  const handleAddClient = (clientId: string) => {
    setFeedback(null);
    addClientMutation.mutate({ clientId, tier: selectedTier });
  };

  const handleInvite = () => {
    if (!inviteEmail.trim()) return;
    setFeedback(null);
    inviteClientMutation.mutate({
      email: inviteEmail.trim(),
      tier: selectedTier,
      note: inviteNote.trim() || undefined,
    });
  };

  const pendingInvitations = invitations.filter((i) => i.status === "pending");

  // Clear feedback after 4s
  useEffect(() => {
    if (!feedback) return;
    const timer = setTimeout(() => setFeedback(null), 4000);
    return () => clearTimeout(timer);
  }, [feedback]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        className="w-full max-w-lg mx-4 kairos-card border border-gray-700 rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50">
          <h2 className="text-lg font-heading font-bold text-white">Add Client</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-700/50">
          {([
            { key: "search" as ModalTab, label: "Search", icon: Search },
            { key: "invite" as ModalTab, label: "Invite", icon: Mail },
            { key: "create" as ModalTab, label: "Create", icon: Plus },
            { key: "pending" as ModalTab, label: `Pending${pendingInvitations.length > 0 ? ` (${pendingInvitations.length})` : ""}`, icon: Clock },
          ]).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => { setTab(key); setFeedback(null); }}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-3 text-xs font-medium transition-colors ${
                tab === key
                  ? "text-kairos-gold border-b-2 border-kairos-gold"
                  : "text-gray-400 hover:text-gray-200"
              }`}
            >
              <Icon size={14} />
              {label}
            </button>
          ))}
        </div>

        {/* Feedback */}
        {feedback && (
          <div className={`mx-6 mt-4 px-4 py-2 rounded-lg text-sm ${
            feedback.type === "success"
              ? "bg-green-500/10 border border-green-500/30 text-green-400"
              : "bg-red-500/10 border border-red-500/30 text-red-400"
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Tier Selector (shared across tabs) */}
        <div className="px-6 pt-4 flex items-center gap-2">
          <span className="text-xs text-gray-400">Assign tier:</span>
          <div className="flex gap-1">
            {(["tier1", "tier2", "tier3"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setSelectedTier(t)}
                className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                  selectedTier === t
                    ? "bg-kairos-gold/20 text-kairos-gold border border-kairos-gold/30"
                    : "bg-gray-800 text-gray-400 border border-gray-700 hover:border-gray-600"
                }`}
              >
                {TIER_LABELS[t]}
              </button>
            ))}
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 min-h-[320px] max-h-[400px] overflow-y-auto">
          {tab === "search" && (
            <SearchTab
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              results={searchResults}
              isSearching={isSearching}
              onAdd={handleAddClient}
              isAdding={addClientMutation.isPending}
            />
          )}
          {tab === "invite" && (
            <InviteTab
              email={inviteEmail}
              onEmailChange={setInviteEmail}
              note={inviteNote}
              onNoteChange={setInviteNote}
              onInvite={handleInvite}
              isInviting={inviteClientMutation.isPending}
            />
          )}
          {tab === "create" && (
            <CreateClientTab
              tier={selectedTier}
              onCreate={(data) => {
                setFeedback(null);
                createClientMutation.mutate({ ...data, tier: selectedTier });
              }}
              isCreating={createClientMutation.isPending}
            />
          )}
          {tab === "pending" && (
            <PendingTab
              invitations={invitations}
              onCancel={(id) => cancelInvitationMutation.mutate({ invitationId: id })}
              isCancelling={cancelInvitationMutation.isPending}
            />
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Search Tab ───────────────────────────────────────────────

function SearchTab({
  searchQuery,
  onSearchChange,
  results,
  isSearching,
  onAdd,
  isAdding,
}: {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  results: { id: string; email: string; firstName: string | null; lastName: string | null; avatarUrl: string | null; name: string; status: string; createdAt: string }[];
  isSearching: boolean;
  onAdd: (clientId: string) => void;
  isAdding: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          placeholder="Search by name or email (min 2 characters)..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          autoFocus
        />
      </div>

      {isSearching && (
        <div className="text-center py-8">
          <div className="w-6 h-6 border-2 border-kairos-gold/30 border-t-kairos-gold rounded-full animate-spin mx-auto" />
          <p className="text-xs text-gray-500 mt-2">Searching...</p>
        </div>
      )}

      {!isSearching && searchQuery.length >= 2 && results.length === 0 && (
        <div className="text-center py-8">
          <Users size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400">No matching users found.</p>
          <p className="text-xs text-gray-500 mt-1">Try a different search or invite them by email.</p>
        </div>
      )}

      {!isSearching && results.length > 0 && (
        <div className="space-y-2">
          {results.map((user) => (
            <div
              key={user.id}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-gray-700/50 hover:border-gray-600 transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-full bg-gray-700 flex items-center justify-center text-xs font-bold text-white shrink-0 overflow-hidden">
                  {user.avatarUrl ? (
                    <img src={user.avatarUrl} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    (user.firstName?.[0] ?? user.email[0]).toUpperCase()
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{user.name}</p>
                  <p className="text-xs text-gray-400 truncate">{user.email}</p>
                </div>
              </div>
              <button
                onClick={() => onAdd(user.id)}
                disabled={isAdding}
                className="kairos-btn px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1 shrink-0"
              >
                <UserPlus size={12} />
                Assign
              </button>
            </div>
          ))}
        </div>
      )}

      {searchQuery.length < 2 && !isSearching && (
        <div className="text-center py-8">
          <Search size={32} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400">Search for existing users to add as clients.</p>
          <p className="text-xs text-gray-500 mt-1">Type at least 2 characters to search by name or email.</p>
        </div>
      )}
    </div>
  );
}

// ─── Invite Tab ──────────────────────────────────────────────

function InviteTab({
  email,
  onEmailChange,
  note,
  onNoteChange,
  onInvite,
  isInviting,
}: {
  email: string;
  onEmailChange: (e: string) => void;
  note: string;
  onNoteChange: (n: string) => void;
  onInvite: () => void;
  isInviting: boolean;
}) {
  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

  return (
    <div className="space-y-4">
      <p className="text-sm text-gray-400">
        Invite someone who hasn&apos;t signed up yet. They&apos;ll receive an invitation to join the platform.
      </p>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Email Address</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="email"
            placeholder="client@example.com"
            value={email}
            onChange={(e) => onEmailChange(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
            autoFocus
          />
        </div>
      </div>

      <div>
        <label className="block text-xs text-gray-400 mb-1.5">Personal Note (optional)</label>
        <textarea
          placeholder="Welcome message or context for the invitation..."
          value={note}
          onChange={(e) => onNoteChange(e.target.value)}
          rows={3}
          className="w-full px-4 py-2.5 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50 resize-none"
        />
      </div>

      <button
        onClick={onInvite}
        disabled={!isValidEmail || isInviting}
        className="kairos-btn w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isInviting ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Sending...
          </>
        ) : (
          <>
            <Mail size={16} />
            Send Invitation
          </>
        )}
      </button>
    </div>
  );
}

// ─── Create Client Tab ──────────────────────────────────────

function CreateClientTab({
  tier,
  onCreate,
  isCreating,
}: {
  tier: "tier1" | "tier2" | "tier3";
  onCreate: (data: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    dateOfBirth?: string;
    gender?: string;
    note?: string;
  }) => void;
  isCreating: boolean;
}) {
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [gender, setGender] = useState("");
  const [note, setNote] = useState("");

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const canSubmit = firstName.trim() && lastName.trim() && isValidEmail;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onCreate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      dateOfBirth: dateOfBirth || undefined,
      gender: gender || undefined,
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm text-gray-400">
        Create a new client profile. They&apos;ll receive a welcome email to activate their account.
      </p>

      {/* Name row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">First Name *</label>
          <input
            type="text"
            placeholder="Jane"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
            autoFocus
          />
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Last Name *</label>
          <input
            type="text"
            placeholder="Doe"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
      </div>

      {/* Email */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Email *</label>
        <div className="relative">
          <Mail size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="email"
            placeholder="jane@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
      </div>

      {/* Phone */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Mobile Phone</label>
        <div className="relative">
          <Phone size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            type="tel"
            placeholder="(555) 123-4567"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full pl-9 pr-4 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
      </div>

      {/* DOB + Gender row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">Date of Birth</label>
          <div className="relative">
            <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="date"
              value={dateOfBirth}
              onChange={(e) => setDateOfBirth(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50 [color-scheme:dark]"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs text-gray-400 mb-1">Gender</label>
          <select
            value={gender}
            onChange={(e) => setGender(e.target.value)}
            className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white focus:outline-none focus:border-kairos-gold/50 appearance-none"
          >
            <option value="">Select...</option>
            <option value="male">Male</option>
            <option value="female">Female</option>
            <option value="non-binary">Non-binary</option>
            <option value="other">Other</option>
            <option value="prefer-not-to-say">Prefer not to say</option>
          </select>
        </div>
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs text-gray-400 mb-1">Note (optional)</label>
        <textarea
          placeholder="Any intake notes or context..."
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-xl bg-gray-800 border border-gray-700 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-kairos-gold/50 resize-none"
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit || isCreating}
        className="kairos-btn w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isCreating ? (
          <>
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            Creating...
          </>
        ) : (
          <>
            <UserPlus size={16} />
            Create Client
          </>
        )}
      </button>
    </div>
  );
}

// ─── Pending Tab ─────────────────────────────────────────────

function PendingTab({
  invitations,
  onCancel,
  isCancelling,
}: {
  invitations: { id: string; email: string; status: string; tier: string; note: string | null; createdAt: string; expiresAt: string | null }[];
  onCancel: (id: string) => void;
  isCancelling: boolean;
}) {
  const pending = invitations.filter((i) => i.status === "pending");
  const past = invitations.filter((i) => i.status !== "pending");

  if (invitations.length === 0) {
    return (
      <div className="text-center py-8">
        <Mail size={32} className="mx-auto mb-3 text-gray-600" />
        <p className="text-sm text-gray-400">No invitations yet.</p>
        <p className="text-xs text-gray-500 mt-1">Use the &quot;Invite by Email&quot; tab to send invitations.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {pending.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Pending</h3>
          {pending.map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-800/50 border border-yellow-500/20"
            >
              <div className="min-w-0">
                <p className="text-sm text-white truncate">{inv.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
                    Pending
                  </span>
                  <span className="text-[10px] text-gray-500">
                    Sent {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                  {inv.expiresAt && (
                    <span className="text-[10px] text-gray-500">
                      Expires {new Date(inv.expiresAt).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => onCancel(inv.id)}
                disabled={isCancelling}
                className="text-gray-400 hover:text-red-400 transition-colors p-1"
                title="Cancel invitation"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {past.length > 0 && (
        <div className="space-y-2">
          <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">History</h3>
          {past.slice(0, 10).map((inv) => (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-xl bg-gray-800/30 border border-gray-700/30"
            >
              <div className="min-w-0">
                <p className="text-sm text-gray-300 truncate">{inv.email}</p>
                <div className="flex items-center gap-2 mt-1">
                  <span className={`text-[10px] px-2 py-0.5 rounded-full border ${
                    inv.status === "accepted"
                      ? "bg-green-500/10 text-green-400 border-green-500/20"
                      : inv.status === "cancelled"
                        ? "bg-gray-500/10 text-gray-400 border-gray-500/20"
                        : "bg-red-500/10 text-red-400 border-red-500/20"
                  }`}>
                    {inv.status === "accepted" ? "Accepted" : inv.status === "cancelled" ? "Cancelled" : "Expired"}
                  </span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(inv.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
