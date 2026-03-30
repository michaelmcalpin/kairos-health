"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  ArrowLeft, Building2, Dumbbell, Users, Save, Palette,
  Globe, Mail, Shield, Pause, Play, Trash2, Clock,
  Star, ChevronRight, Loader2,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

type Tab = "overview" | "trainers" | "clients" | "branding" | "audit";

export default function CompanyDetailPage() {
  const router = useRouter();
  const params = useParams();
  const companyId = params.id as string;
  const utils = trpc.useUtils();

  const [tab, setTab] = useState<Tab>("overview");
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  // Fetch company data via tRPC
  const { data: company, isLoading: companyLoading } = trpc.admin.companies.get.useQuery(
    { companyId },
    { staleTime: 30_000 }
  );
  const { data: trainers = [] } = trpc.admin.companies.getTrainers.useQuery(
    { companyId },
    { staleTime: 30_000, enabled: !!company }
  );
  const { data: clients = [] } = trpc.admin.companies.getClients.useQuery(
    { companyId },
    { staleTime: 30_000, enabled: !!company }
  );
  const { data: audit = [] } = trpc.admin.companies.getAuditLog.useQuery(
    { limit: 20, companyId },
    { staleTime: 30_000, enabled: !!company && tab === "audit" }
  );

  // Edit form state
  const [form, setForm] = useState({
    name: "",
    slug: "",
    website: "",
    brandColor: "#D4A574",
    emailFromName: "",
    emailFooter: "",
    maxTrainers: 10,
    maxClients: 100,
  });
  const [formSeeded, setFormSeeded] = useState(false);

  // Seed form when company loads
  if (company && !formSeeded) {
    setForm({
      name: company.name,
      slug: company.slug,
      website: company.website,
      brandColor: company.brandColor,
      emailFromName: company.emailFromName,
      emailFooter: company.emailFooter,
      maxTrainers: company.maxTrainers,
      maxClients: company.maxClients,
    });
    setFormSeeded(true);
  }

  const updateMutation = trpc.admin.companies.update.useMutation({
    onSuccess: () => {
      utils.admin.companies.get.invalidate({ companyId });
      utils.admin.companies.list.invalidate();
      setSaveMsg("Changes saved successfully");
      setFormSeeded(false);
      setTimeout(() => setSaveMsg(null), 3000);
    },
    onError: (err) => {
      setSaveMsg(err.message || "Save failed");
      setTimeout(() => setSaveMsg(null), 3000);
    },
  });

  const actionMutation = trpc.admin.companies.performAction.useMutation({
    onSuccess: (_, variables) => {
      if (variables.action === "delete") {
        router.replace("/super-admin/companies");
      } else {
        utils.admin.companies.get.invalidate({ companyId });
        utils.admin.companies.list.invalidate();
      }
    },
  });

  function handleSave() {
    updateMutation.mutate({ companyId, ...form });
  }

  function handleAction(action: "suspend" | "reactivate" | "delete") {
    actionMutation.mutate({ companyId, action });
  }

  if (companyLoading || !company) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-body text-kairos-silver-dark">Loading company...</p>
        </div>
      </div>
    );
  }

  const trainerPct = company.maxTrainers > 0 ? Math.round((company.trainerCount / company.maxTrainers) * 100) : 0;
  const clientPct = company.maxClients > 0 ? Math.round((company.clientCount / company.maxClients) * 100) : 0;

  const TABS: { id: Tab; label: string; icon: typeof Building2 }[] = [
    { id: "overview", label: "Overview", icon: Building2 },
    { id: "trainers", label: `Trainers (${company.trainerCount})`, icon: Dumbbell },
    { id: "clients", label: `Clients (${company.clientCount})`, icon: Users },
    { id: "branding", label: "Branding & Config", icon: Palette },
    { id: "audit", label: "Audit Log", icon: Clock },
  ];

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.push("/super-admin/companies")} className="p-2 rounded-kairos-sm text-kairos-silver-dark hover:text-white hover:bg-kairos-card-hover transition-colors">
          <ArrowLeft size={20} />
        </button>
        <div className="flex items-center gap-4 flex-1">
          <div
            className="w-14 h-14 rounded-kairos flex items-center justify-center text-white font-heading font-bold text-xl"
            style={{ backgroundColor: company.brandColor + "30", color: company.brandColor }}
          >
            {company.name.charAt(0)}
          </div>
          <div>
            <h1 className="font-heading font-bold text-2xl text-white">{company.name}</h1>
            <p className="text-sm font-body text-kairos-silver-dark">{company.website || company.slug}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-kairos-sm text-xs font-heading font-semibold ${
            company.status === "active" ? "bg-green-500/15 text-green-400" :
            company.status === "suspended" ? "bg-yellow-500/15 text-yellow-400" :
            "bg-gray-500/15 text-gray-400"
          }`}>
            {company.status}
          </span>
          {company.status === "active" ? (
            <button onClick={() => handleAction("suspend")} className="p-2 rounded-kairos-sm text-yellow-400 hover:bg-yellow-500/10 transition-colors" title="Suspend">
              <Pause size={16} />
            </button>
          ) : (
            <button onClick={() => handleAction("reactivate")} className="p-2 rounded-kairos-sm text-green-400 hover:bg-green-500/10 transition-colors" title="Reactivate">
              <Play size={16} />
            </button>
          )}
          <button onClick={() => handleAction("delete")} className="p-2 rounded-kairos-sm text-red-400 hover:bg-red-500/10 transition-colors" title="Delete">
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kairos-card">
          <p className="kairos-label mb-1">Trainers</p>
          <p className="font-heading font-bold text-xl text-white">{company.trainerCount}<span className="text-kairos-silver-dark text-sm font-normal">/{company.maxTrainers}</span></p>
          <CapacityBar pct={trainerPct} />
        </div>
        <div className="kairos-card">
          <p className="kairos-label mb-1">Clients</p>
          <p className="font-heading font-bold text-xl text-white">{company.clientCount}<span className="text-kairos-silver-dark text-sm font-normal">/{company.maxClients}</span></p>
          <CapacityBar pct={clientPct} />
        </div>
        <div className="kairos-card">
          <p className="kairos-label mb-1">Est. MRR</p>
          <p className="font-heading font-bold text-xl text-emerald-400">${(company.clientCount * 200).toLocaleString()}</p>
        </div>
        <div className="kairos-card">
          <p className="kairos-label mb-1">Created</p>
          <p className="font-heading font-bold text-xl text-white">{company.createdAt.slice(0, 10)}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 overflow-x-auto border-b border-kairos-border">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-heading font-semibold whitespace-nowrap transition-colors border-b-2 ${
              tab === id
                ? "text-kairos-gold border-kairos-gold"
                : "text-kairos-silver-dark border-transparent hover:text-white"
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === "overview" && <OverviewTab company={company} trainers={trainers} clients={clients} />}
      {tab === "trainers" && <TrainersTab trainers={trainers} />}
      {tab === "clients" && <ClientsTab clients={clients} />}
      {tab === "branding" && (
        <BrandingTab
          form={form}
          setForm={setForm}
          onSave={handleSave}
          saving={updateMutation.isPending}
          saveMsg={saveMsg}
        />
      )}
      {tab === "audit" && <AuditTab entries={audit} />}
    </div>
  );
}

// ─── Sub Components ──────────────────────────────────────────────

function CapacityBar({ pct }: { pct: number }) {
  return (
    <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
      <div
        className="h-full rounded-full transition-all"
        style={{
          width: `${Math.min(pct, 100)}%`,
          backgroundColor: pct >= 90 ? "#ef4444" : pct >= 70 ? "#eab308" : "#22c55e",
        }}
      />
    </div>
  );
}

type CompanyData = {
  id: string;
  name: string;
  slug: string;
  brandColor: string;
  website: string;
  emailFromName: string;
  emailFooter: string;
  maxTrainers: number;
  maxClients: number;
  trainerCount: number;
  clientCount: number;
  createdAt: string;
};

type TrainerData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  clientCount: number;
  capacity: number;
  rating: number;
  status: "active" | "inactive";
};

type ClientData = {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  tier: "tier1" | "tier2" | "tier3";
  trainerName: string;
  status: "active" | "inactive";
};

function OverviewTab({ company, trainers, clients }: { company: CompanyData; trainers: TrainerData[]; clients: ClientData[] }) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Top Trainers */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4">Top Trainers</h3>
        <div className="space-y-3">
          {trainers.slice(0, 5).map((t) => (
            <div key={t.id} className="flex items-center justify-between py-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-heading font-bold text-xs">
                  {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                </div>
                <div>
                  <p className="text-sm font-body text-white">{t.firstName} {t.lastName}</p>
                  <p className="text-xs font-body text-kairos-silver-dark">{t.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-4 text-right">
                <div>
                  <p className="text-xs font-heading font-semibold text-white">{t.clientCount}/{t.capacity}</p>
                  <p className="text-[10px] text-kairos-silver-dark">clients</p>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={12} className="text-kairos-gold" />
                  <span className="text-xs font-heading text-kairos-gold">{t.rating}</span>
                </div>
              </div>
            </div>
          ))}
          {trainers.length === 0 && (
            <p className="text-sm text-kairos-silver-dark font-body">No trainers assigned yet</p>
          )}
        </div>
      </div>

      {/* Company Details */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4">Company Details</h3>
        <div className="space-y-3">
          <DetailRow label="Slug" value={company.slug} />
          <DetailRow label="Website" value={company.website || "—"} />
          <DetailRow label="Brand Color" value={company.brandColor} color={company.brandColor} />
          <DetailRow label="Email From" value={company.emailFromName} />
          <DetailRow label="Max Trainers" value={String(company.maxTrainers)} />
          <DetailRow label="Max Clients" value={String(company.maxClients)} />
          <DetailRow label="Created" value={company.createdAt.slice(0, 10)} />
        </div>
      </div>

      {/* Recent Clients */}
      <div className="lg:col-span-2 kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4">Recent Clients</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {clients.slice(0, 6).map((c) => (
            <div key={c.id} className="flex items-center gap-3 p-3 rounded-kairos-sm bg-kairos-card-hover">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-heading font-bold text-xs">
                {c.firstName.charAt(0)}{c.lastName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-body text-white truncate">{c.firstName} {c.lastName}</p>
                <p className="text-xs font-body text-kairos-silver-dark truncate">{c.trainerName}</p>
              </div>
              <span className={`px-2 py-0.5 rounded-kairos-sm text-[10px] font-heading font-semibold ${
                c.tier === "tier1" ? "bg-kairos-gold/15 text-kairos-gold" :
                c.tier === "tier2" ? "bg-blue-500/15 text-blue-400" :
                "bg-gray-500/15 text-gray-400"
              }`}>
                {c.tier.replace("tier", "T")}
              </span>
            </div>
          ))}
          {clients.length === 0 && (
            <p className="text-sm text-kairos-silver-dark font-body col-span-3">No clients yet</p>
          )}
        </div>
      </div>
    </div>
  );
}

function DetailRow({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex items-center justify-between py-1.5">
      <span className="text-xs font-body text-kairos-silver-dark">{label}</span>
      <div className="flex items-center gap-2">
        {color && <div className="w-4 h-4 rounded-sm" style={{ backgroundColor: color }} />}
        <span className="text-sm font-body text-white">{value}</span>
      </div>
    </div>
  );
}

function TrainersTab({ trainers }: { trainers: TrainerData[] }) {
  return (
    <div className="kairos-card overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="border-b border-kairos-border">
            <th className="text-left px-6 py-3 kairos-label">Name</th>
            <th className="text-left px-6 py-3 kairos-label">Email</th>
            <th className="text-center px-6 py-3 kairos-label">Clients</th>
            <th className="text-center px-6 py-3 kairos-label">Capacity</th>
            <th className="text-center px-6 py-3 kairos-label">Rating</th>
            <th className="text-center px-6 py-3 kairos-label">Status</th>
          </tr>
        </thead>
        <tbody>
          {trainers.map((t) => (
            <tr key={t.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
              <td className="px-6 py-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-heading font-bold text-xs">
                    {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                  </div>
                  <span className="text-sm font-body text-white">{t.firstName} {t.lastName}</span>
                </div>
              </td>
              <td className="px-6 py-3 text-sm font-body text-kairos-silver-dark">{t.email}</td>
              <td className="px-6 py-3 text-center text-sm font-heading text-white">{t.clientCount}</td>
              <td className="px-6 py-3 text-center text-sm font-heading text-white">{t.capacity}</td>
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
            </tr>
          ))}
          {trainers.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-12 text-center text-kairos-silver-dark font-body">No trainers assigned</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}

function ClientsTab({ clients }: { clients: ClientData[] }) {
  const [search, setSearch] = useState("");
  const filtered = clients.filter((c) =>
    `${c.firstName} ${c.lastName} ${c.email}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="mb-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full max-w-sm bg-kairos-card border border-kairos-border rounded-kairos-sm px-4 py-2 text-sm text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
        />
      </div>
      <div className="kairos-card overflow-hidden p-0">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left px-6 py-3 kairos-label">Name</th>
              <th className="text-left px-6 py-3 kairos-label">Email</th>
              <th className="text-left px-6 py-3 kairos-label">Trainer</th>
              <th className="text-center px-6 py-3 kairos-label">Tier</th>
              <th className="text-center px-6 py-3 kairos-label">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 20).map((c) => (
              <tr key={c.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                <td className="px-6 py-3">
                  <span className="text-sm font-body text-white">{c.firstName} {c.lastName}</span>
                </td>
                <td className="px-6 py-3 text-sm font-body text-kairos-silver-dark">{c.email}</td>
                <td className="px-6 py-3 text-sm font-body text-kairos-silver-dark">{c.trainerName}</td>
                <td className="px-6 py-3 text-center">
                  <span className={`px-2 py-0.5 rounded-kairos-sm text-xs font-heading font-semibold ${
                    c.tier === "tier1" ? "bg-kairos-gold/15 text-kairos-gold" :
                    c.tier === "tier2" ? "bg-blue-500/15 text-blue-400" :
                    "bg-gray-500/15 text-gray-400"
                  }`}>
                    {c.tier.replace("tier", "Tier ")}
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
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-12 text-center text-kairos-silver-dark font-body">No clients found</td>
              </tr>
            )}
          </tbody>
        </table>
        {filtered.length > 20 && (
          <div className="px-6 py-3 text-xs font-body text-kairos-silver-dark border-t border-kairos-border">
            Showing 20 of {filtered.length} clients
          </div>
        )}
      </div>
    </div>
  );
}

function BrandingTab({
  form,
  setForm,
  onSave,
  saving,
  saveMsg,
}: {
  form: { name: string; slug: string; website: string; brandColor: string; emailFromName: string; emailFooter: string; maxTrainers: number; maxClients: number };
  setForm: (f: typeof form) => void;
  onSave: () => void;
  saving: boolean;
  saveMsg: string | null;
}) {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Edit Form */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4">Company Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="kairos-label block mb-1.5">Company Name</label>
            <input
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
            />
          </div>
          <div>
            <label className="kairos-label block mb-1.5">Slug</label>
            <input
              value={form.slug}
              onChange={(e) => setForm({ ...form, slug: e.target.value })}
              className="w-full bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
            />
          </div>
          <div>
            <label className="kairos-label block mb-1.5">Website</label>
            <div className="flex items-center gap-2">
              <Globe size={14} className="text-kairos-silver-dark" />
              <input
                value={form.website}
                onChange={(e) => setForm({ ...form, website: e.target.value })}
                className="flex-1 bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
              />
            </div>
          </div>
          <div>
            <label className="kairos-label block mb-1.5">Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.brandColor}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                className="w-10 h-10 rounded-kairos-sm border border-kairos-border cursor-pointer"
              />
              <input
                value={form.brandColor}
                onChange={(e) => setForm({ ...form, brandColor: e.target.value })}
                className="w-28 bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
              />
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
                className="w-full bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
              />
            </div>
            <div>
              <label className="kairos-label block mb-1.5">Max Clients</label>
              <input
                type="number"
                min={1}
                value={form.maxClients}
                onChange={(e) => setForm({ ...form, maxClients: parseInt(e.target.value) || 100 })}
                className="w-full bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
              />
            </div>
          </div>

          <div className="border-t border-kairos-border pt-4">
            <h4 className="font-heading font-semibold text-white text-sm mb-3 flex items-center gap-2">
              <Mail size={14} /> Email Settings
            </h4>
            <div className="space-y-3">
              <div>
                <label className="kairos-label block mb-1.5">From Name</label>
                <input
                  value={form.emailFromName}
                  onChange={(e) => setForm({ ...form, emailFromName: e.target.value })}
                  className="w-full bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
                />
              </div>
              <div>
                <label className="kairos-label block mb-1.5">Footer Text</label>
                <input
                  value={form.emailFooter}
                  onChange={(e) => setForm({ ...form, emailFooter: e.target.value })}
                  className="w-full bg-kairos-card-hover border border-kairos-border rounded-kairos-sm px-4 py-2.5 text-sm text-white focus:outline-none focus:border-kairos-gold/50"
                />
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={onSave}
              disabled={saving}
              className="flex items-center gap-2 px-5 py-2 bg-kairos-gold text-kairos-royal-dark rounded-kairos-sm font-heading font-semibold text-sm hover:bg-kairos-gold-light transition-colors disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving..." : "Save Changes"}
            </button>
            {saveMsg && (
              <span className={`text-xs font-body ${saveMsg.includes("success") ? "text-green-400" : "text-red-400"}`}>
                {saveMsg}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Live Preview */}
      <div className="space-y-6">
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Brand Preview</h3>
          <div className="rounded-kairos-sm overflow-hidden border border-kairos-border">
            {/* Mini Sidebar Preview */}
            <div className="bg-kairos-royal-dark p-4">
              <div className="flex items-center gap-3 mb-4">
                <div
                  className="w-10 h-10 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold text-sm"
                  style={{ backgroundColor: form.brandColor }}
                >
                  {form.name.charAt(0) || "?"}
                </div>
                <div>
                  <p className="font-heading font-semibold text-white text-sm">{form.name || "Company Name"}</p>
                  <p className="text-[10px] text-kairos-silver-dark">Health Platform</p>
                </div>
              </div>
              <div className="space-y-1">
                {["Dashboard", "Trainers", "Clients", "Settings"].map((item) => (
                  <div
                    key={item}
                    className="px-3 py-2 rounded-kairos-sm text-xs font-heading"
                    style={item === "Dashboard" ? { backgroundColor: form.brandColor + "20", color: form.brandColor } : { color: "#8B95A5" }}
                  >
                    <div className="flex items-center gap-2">
                      <ChevronRight size={10} />
                      {item}
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-3 border-t border-kairos-border text-center">
                <p className="text-[9px] text-kairos-silver-dark">
                  Powered by <span className="text-kairos-gold font-semibold">KAIROS</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Email Preview */}
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-4">Email Header Preview</h3>
          <div className="rounded-kairos-sm overflow-hidden border border-kairos-border bg-white p-6 text-center">
            <div
              className="w-10 h-10 rounded mx-auto mb-2 flex items-center justify-center text-white font-bold text-lg"
              style={{ backgroundColor: form.brandColor }}
            >
              {form.name.charAt(0) || "?"}
            </div>
            <p style={{ color: form.brandColor }} className="font-bold text-lg">{form.emailFromName || form.name || "Company"}</p>
            <p className="text-gray-400 text-[10px] mt-1">Health Platform &bull; Powered by KAIROS</p>
            <div className="mt-4 pt-3 border-t border-gray-200">
              <p className="text-gray-500 text-[10px]">{form.emailFooter || "Footer text"}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

type AuditEntry = {
  id: string;
  action: string;
  details: string;
  timestamp: string;
};

function AuditTab({ entries }: { entries: AuditEntry[] }) {
  const actionColors: Record<string, string> = {
    "company.created": "text-green-400",
    "company.updated": "text-blue-400",
    "company.suspended": "text-yellow-400",
    "company.reactivated": "text-green-400",
    "company.deleted": "text-red-400",
  };

  if (entries.length === 0) {
    return (
      <div className="kairos-card text-center py-12">
        <Shield size={32} className="text-kairos-silver-dark mx-auto mb-3" />
        <p className="font-body text-kairos-silver-dark">No audit entries yet</p>
      </div>
    );
  }

  return (
    <div className="kairos-card overflow-hidden p-0">
      <table className="w-full">
        <thead>
          <tr className="border-b border-kairos-border">
            <th className="text-left px-6 py-3 kairos-label">Action</th>
            <th className="text-left px-6 py-3 kairos-label">Details</th>
            <th className="text-right px-6 py-3 kairos-label">Time</th>
          </tr>
        </thead>
        <tbody>
          {entries.map((e) => (
            <tr key={e.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
              <td className="px-6 py-3">
                <span className={`text-xs font-heading font-semibold ${actionColors[e.action] || "text-white"}`}>
                  {e.action.replace("company.", "")}
                </span>
              </td>
              <td className="px-6 py-3 text-sm font-body text-kairos-silver-dark">{e.details}</td>
              <td className="px-6 py-3 text-xs font-body text-kairos-silver-dark text-right">{new Date(e.timestamp).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
