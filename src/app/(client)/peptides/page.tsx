"use client";

import { Syringe } from "lucide-react";

export default function PeptidesPage() {
  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-white">Peptides</h1>
        <p className="text-sm font-body text-kairos-silver-dark mt-1">
          Peptide protocol tracking and scheduling
        </p>
      </div>

      <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
        <div className="w-16 h-16 rounded-full bg-kairos-gold/10 flex items-center justify-center mb-4">
          <Syringe size={32} className="text-kairos-gold" />
        </div>
        <h2 className="font-heading font-semibold text-lg text-white mb-2">Coming Soon</h2>
        <p className="text-sm font-body text-kairos-silver-dark max-w-md">
          Track your peptide protocols with dosing schedules, injection logs,
          and cycle management — all prescribed by your trainer.
        </p>
      </div>
    </div>
  );
}
