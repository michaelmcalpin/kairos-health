"use client";

import { Building2, Users, Dumbbell, TrendingUp } from "lucide-react";
import { getCompany, getCompanyTrainers, getCompanyClients } from "@/lib/company-ops/engine";

// Demo company for now - in production, comes from auth context
const company = getCompany("company-1")!;
const trainers = getCompanyTrainers("company-1");
const clients = getCompanyClients("company-1");

const stats = [
  { label: "Trainers", value: String(trainers.length), icon: Dumbbell },
  { label: "Clients", value: String(clients.length), icon: Users },
  { label: "Capacity Used", value: `${Math.round((trainers.length / company.maxTrainers) * 100)}%`, icon: TrendingUp },
];

export default function CompanyDashboardPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Building2 className="w-8 h-8 text-kairos-gold" />
          <h1 className="font-heading font-bold text-3xl text-white">{company.name}</h1>
        </div>
        <p className="font-body text-kairos-silver-dark">
          Company administration &mdash; manage trainers, clients, and settings
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div key={stat.label} className="kairos-card bg-kairos-card border border-kairos-border">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-body text-kairos-silver-dark text-sm mb-1">{stat.label}</p>
                  <p className="font-heading font-bold text-2xl text-kairos-gold">{stat.value}</p>
                </div>
                <Icon className="w-8 h-8 text-kairos-gold/50" />
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <h2 className="font-heading font-bold text-lg text-white mb-4">Trainers</h2>
          <div className="space-y-3">
            {trainers.slice(0, 5).map((t) => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-kairos-border last:border-0">
                <div>
                  <p className="font-body text-white text-sm">{t.firstName} {t.lastName}</p>
                  <p className="font-body text-kairos-silver-dark text-xs">{t.email}</p>
                </div>
                <div className="text-right">
                  <p className="font-body text-kairos-gold text-sm">{t.clientCount} clients</p>
                  <p className="font-body text-kairos-silver-dark text-xs">Rating: {t.rating}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <h2 className="font-heading font-bold text-lg text-white mb-4">Recent Clients</h2>
          <div className="space-y-3">
            {clients.slice(0, 5).map((c) => (
              <div key={c.id} className="flex items-center justify-between py-2 border-b border-kairos-border last:border-0">
                <div>
                  <p className="font-body text-white text-sm">{c.firstName} {c.lastName}</p>
                  <p className="font-body text-kairos-silver-dark text-xs">{c.trainerName}</p>
                </div>
                <span className={`px-2 py-1 rounded-kairos-sm font-body text-xs font-semibold ${
                  c.tier === "tier1" ? "bg-kairos-gold/15 text-kairos-gold" :
                  c.tier === "tier2" ? "bg-info/15 text-info" :
                  "bg-kairos-silver/15 text-kairos-silver-dark"
                }`}>
                  {c.tier === "tier1" ? "Private" : c.tier === "tier2" ? "Associate" : "AI-Guided"}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
