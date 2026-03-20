"use client";

import { Users } from "lucide-react";
import { getCompanyClients } from "@/lib/company-ops/engine";

const clients = getCompanyClients("company-1");

export default function CompanyClientsPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Clients</h1>
        <p className="font-body text-kairos-silver-dark">All clients across your company&apos;s trainers</p>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-kairos-border">
              <th className="text-left py-3 px-4 font-body text-sm text-kairos-silver-dark font-semibold">Client</th>
              <th className="text-left py-3 px-4 font-body text-sm text-kairos-silver-dark font-semibold">Trainer</th>
              <th className="text-left py-3 px-4 font-body text-sm text-kairos-silver-dark font-semibold">Tier</th>
              <th className="text-left py-3 px-4 font-body text-sm text-kairos-silver-dark font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {clients.slice(0, 20).map((c) => (
              <tr key={c.id} className="border-b border-kairos-border/50 hover:bg-kairos-card-hover transition-colors">
                <td className="py-3 px-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-kairos-gold/15 flex items-center justify-center">
                      <Users className="w-4 h-4 text-kairos-gold" />
                    </div>
                    <div>
                      <p className="font-body text-white text-sm">{c.firstName} {c.lastName}</p>
                      <p className="font-body text-kairos-silver-dark text-xs">{c.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-3 px-4 font-body text-kairos-silver-dark text-sm">{c.trainerName}</td>
                <td className="py-3 px-4">
                  <span className={`px-2 py-1 rounded-kairos-sm font-body text-xs font-semibold ${
                    c.tier === "tier1" ? "bg-kairos-gold/15 text-kairos-gold" :
                    c.tier === "tier2" ? "bg-info/15 text-info" :
                    "bg-kairos-silver/15 text-kairos-silver-dark"
                  }`}>
                    {c.tier === "tier1" ? "Private" : c.tier === "tier2" ? "Associate" : "AI-Guided"}
                  </span>
                </td>
                <td className="py-3 px-4">
                  <span className="px-2 py-1 rounded-kairos-sm bg-success/15 text-success font-body text-xs font-semibold">
                    {c.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
