"use client";

import { useState } from "react";
import { Building2, Search, Users, Dumbbell } from "lucide-react";
import { getCompanies, filterCompanies } from "@/lib/company-ops/engine";

const allCompanies = getCompanies();

export default function CompaniesPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const filtered = filterCompanies(allCompanies, searchQuery);

  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Companies</h1>
        <p className="font-body text-kairos-silver-dark">
          Manage companies using the Kairos platform
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-kairos-silver-dark text-sm mb-1">Total Companies</p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">{allCompanies.length}</p>
            </div>
            <Building2 className="w-8 h-8 text-kairos-gold/50" />
          </div>
        </div>
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-kairos-silver-dark text-sm mb-1">Total Trainers</p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">
                {allCompanies.reduce((s, c) => s + c.trainerCount, 0)}
              </p>
            </div>
            <Dumbbell className="w-8 h-8 text-kairos-gold/50" />
          </div>
        </div>
        <div className="kairos-card bg-kairos-card border border-kairos-border">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-body text-kairos-silver-dark text-sm mb-1">Total Clients</p>
              <p className="font-heading font-bold text-2xl text-kairos-gold">
                {allCompanies.reduce((s, c) => s + c.clientCount, 0)}
              </p>
            </div>
            <Users className="w-8 h-8 text-kairos-gold/50" />
          </div>
        </div>
      </div>

      <div className="mb-6">
        <div className="relative">
          <Search className="absolute left-4 top-3.5 w-5 h-5 text-kairos-silver-dark" />
          <input
            type="text"
            placeholder="Search companies..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-kairos-card border border-kairos-border rounded-kairos-sm pl-12 pr-4 py-3 text-white placeholder-kairos-silver-dark focus:outline-none focus:border-kairos-gold/50"
          />
        </div>
      </div>

      <div className="space-y-4">
        {filtered.map((company) => (
          <div key={company.id} className="kairos-card bg-kairos-card border border-kairos-border hover:border-kairos-gold/30 transition-all p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div
                  className="w-12 h-12 rounded-kairos-sm flex items-center justify-center text-white font-heading font-bold text-lg"
                  style={{ backgroundColor: company.brandColor + "30", color: company.brandColor }}
                >
                  {company.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-lg">{company.name}</h3>
                  <p className="font-body text-kairos-silver-dark text-sm">{company.website}</p>
                </div>
              </div>
              <div className="flex gap-8 items-center">
                <div className="text-center">
                  <p className="font-heading font-bold text-white">{company.trainerCount}</p>
                  <p className="font-body text-kairos-silver-dark text-xs">Trainers</p>
                </div>
                <div className="text-center">
                  <p className="font-heading font-bold text-white">{company.clientCount}</p>
                  <p className="font-body text-kairos-silver-dark text-xs">Clients</p>
                </div>
                <span className="px-3 py-1 rounded-kairos-sm bg-success/15 text-success font-body text-xs font-semibold">
                  {company.status}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
