"use client";

import { Dumbbell } from "lucide-react";
import { getCompanyTrainers } from "@/lib/company-ops/engine";

const trainers = getCompanyTrainers("company-1");

export default function CompanyTrainersPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-8">
        <h1 className="font-heading font-bold text-3xl text-white mb-2">Trainers</h1>
        <p className="font-body text-kairos-silver-dark">Manage your company&apos;s trainers</p>
      </div>

      <div className="space-y-4">
        {trainers.map((t) => (
          <div key={t.id} className="kairos-card bg-kairos-card border border-kairos-border hover:border-kairos-gold/30 transition-all p-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-kairos-gold/15 flex items-center justify-center">
                <Dumbbell className="w-6 h-6 text-kairos-gold" />
              </div>
              <div className="flex-1">
                <h3 className="font-heading font-bold text-white">{t.firstName} {t.lastName}</h3>
                <p className="font-body text-kairos-silver-dark text-sm">{t.email}</p>
              </div>
              <div className="text-right">
                <p className="font-body text-kairos-gold font-semibold">{t.clientCount} clients</p>
                <p className="font-body text-kairos-silver-dark text-xs">Capacity: {t.capacity}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
