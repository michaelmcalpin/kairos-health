"use client";

import { useRouter } from "next/navigation";
import { Users, Dumbbell, TrendingUp, Star, DollarSign, ArrowRight } from "lucide-react";
import { useCompanyBrand } from "@/lib/company-ops";
import { trpc } from "@/lib/trpc";

export default function CompanyDashboardPage() {
  const router = useRouter();
  const { brand } = useCompanyBrand();
  const isWhiteLabel = brand.id !== "kairos";
  const accentColor = isWhiteLabel ? brand.brandColor : undefined;

  // ── tRPC query — real DB data ──────────────────────────────
  const { data, isLoading, error } = trpc.company.dashboard.getDashboard.useQuery(undefined, {
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });

  // Loading skeleton
  if (isLoading) {
    return (
      <div className="animate-fade-in">
        <div className="kairos-card mb-6 h-20 animate-pulse bg-gray-800/50" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="kairos-card h-24 animate-pulse bg-gray-800/50" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="kairos-card h-64 animate-pulse bg-gray-800/50" />
          <div className="kairos-card h-64 animate-pulse bg-gray-800/50" />
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="animate-fade-in">
        <div className="kairos-card p-12 text-center">
          <Dumbbell size={48} className="mx-auto mb-4 text-gray-600" />
          <h3 className="font-heading font-semibold text-white mb-2">
            {error ? "Unable to load dashboard" : "No data yet"}
          </h3>
          <p className="text-sm text-gray-400">
            {error ? "There was an error loading your company dashboard." : "Your dashboard will populate once trainers and clients are added."}
          </p>
        </div>
      </div>
    );
  }

  const { company: companyData, stats, trainers, clients } = data;

  const trainerPct = companyData ? Math.round((stats.trainerCount / companyData.maxTrainers) * 100) : 0;
  const clientPct = companyData ? Math.round((stats.clientCount / companyData.maxClients) * 100) : 0;

  return (
    <div className="animate-fade-in">
      {/* Welcome Banner */}
      <div
        className="kairos-card mb-6"
        style={accentColor ? { borderColor: accentColor + "30" } : undefined}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {companyData && (
              <div
                className="w-12 h-12 rounded-kairos flex items-center justify-center text-white font-heading font-bold text-xl"
                style={{ backgroundColor: (accentColor || "rgb(var(--k-accent))"), opacity: 0.9 }}
              >
                {companyData.name.charAt(0)}
              </div>
            )}
            <div>
              <h1 className="font-heading font-bold text-2xl text-white">
                {companyData?.name || "Company Dashboard"}
              </h1>
              <p className="text-sm font-body text-kairos-silver-dark">
                Company administration — manage trainers, clients, and settings
              </p>
            </div>
          </div>
          {companyData && (
            <span className={`px-3 py-1 rounded-kairos-sm text-xs font-heading font-semibold ${
              companyData.status === "active" ? "bg-green-500/15 text-green-400" : "bg-yellow-500/15 text-yellow-400"
            }`}>
              {companyData.status}
            </span>
          )}
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kairos-label">Trainers</p>
            <Dumbbell size={16} className="text-blue-400/50" />
          </div>
          <p className="font-heading font-bold text-2xl text-white">
            {stats.trainerCount}
            {companyData && <span className="text-sm text-kairos-silver-dark font-normal">/{companyData.maxTrainers}</span>}
          </p>
          <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(trainerPct, 100)}%`,
                backgroundColor: accentColor || (trainerPct >= 90 ? "#ef4444" : trainerPct >= 70 ? "#eab308" : "#22c55e"),
              }}
            />
          </div>
        </div>

        <div className="kairos-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kairos-label">Clients</p>
            <Users size={16} className="text-purple-400/50" />
          </div>
          <p className="font-heading font-bold text-2xl text-white">
            {stats.clientCount}
            {companyData && <span className="text-sm text-kairos-silver-dark font-normal">/{companyData.maxClients}</span>}
          </p>
          <div className="mt-2 w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full"
              style={{
                width: `${Math.min(clientPct, 100)}%`,
                backgroundColor: accentColor || (clientPct >= 90 ? "#ef4444" : clientPct >= 70 ? "#eab308" : "#22c55e"),
              }}
            />
          </div>
        </div>

        <div className="kairos-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kairos-label">Capacity</p>
            <TrendingUp size={16} className="text-kairos-gold/50" />
          </div>
          <p className="font-heading font-bold text-2xl" style={{ color: accentColor || "rgb(var(--k-accent))" }}>
            {stats.utilization}%
          </p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">Overall utilization</p>
        </div>

        <div className="kairos-card">
          <div className="flex items-center justify-between mb-2">
            <p className="kairos-label">Est. MRR</p>
            <DollarSign size={16} className="text-emerald-400/50" />
          </div>
          <p className="font-heading font-bold text-2xl text-emerald-400">${stats.estMrr.toLocaleString()}</p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">${(stats.estMrr * 12).toLocaleString()} ARR</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Trainers */}
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-white">Trainers</h2>
            <button
              onClick={() => router.push("/company/trainers")}
              className="text-xs font-heading font-semibold flex items-center gap-1 transition-colors hover:gap-2"
              style={{ color: accentColor || "rgb(var(--k-accent))" }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          {trainers.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No trainers assigned to this company yet.</p>
          ) : (
            <div className="space-y-3">
              {trainers.slice(0, 5).map((t) => (
                <div key={t.id} className="flex items-center justify-between py-2 border-b border-kairos-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 font-heading font-bold text-xs">
                      {t.firstName.charAt(0)}{t.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-body text-white text-sm">{t.firstName} {t.lastName}</p>
                      <p className="font-body text-kairos-silver-dark text-xs">{t.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-xs font-heading text-white">{t.clientCount}<span className="text-kairos-silver-dark">/{t.capacity}</span></p>
                    </div>
                    <div className="flex items-center gap-1">
                      <Star size={12} className="text-kairos-gold" />
                      <span className="text-xs font-heading text-kairos-gold">{t.rating}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Clients */}
        <div className="kairos-card">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading font-semibold text-white">Recent Clients</h2>
            <button
              onClick={() => router.push("/company/clients")}
              className="text-xs font-heading font-semibold flex items-center gap-1 transition-colors hover:gap-2"
              style={{ color: accentColor || "rgb(var(--k-accent))" }}
            >
              View All <ArrowRight size={12} />
            </button>
          </div>
          {clients.length === 0 ? (
            <p className="text-sm text-gray-500 py-4">No clients in this company yet.</p>
          ) : (
            <div className="space-y-3">
              {clients.slice(0, 5).map((c) => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b border-kairos-border/50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-purple-400 font-heading font-bold text-xs">
                      {c.firstName.charAt(0)}{c.lastName.charAt(0)}
                    </div>
                    <div>
                      <p className="font-body text-white text-sm">{c.firstName} {c.lastName}</p>
                      <p className="font-body text-kairos-silver-dark text-xs">{c.trainerName}</p>
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded-kairos-sm font-heading text-xs font-semibold ${
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
  );
}
