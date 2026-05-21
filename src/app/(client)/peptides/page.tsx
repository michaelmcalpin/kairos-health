"use client";

import { useRouter } from "next/navigation";
import {
  Syringe,
  Calculator,
  ChevronRight,
  Clock,
  Calendar,
  Pill,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

export default function PeptidesPage() {
  const router = useRouter();

  // Fetch active protocol to show peptide items
  const { data: protocol, isLoading } = trpc.clientPortal.supplements.getActiveProtocol.useQuery(undefined, {
    staleTime: 30_000,
  });

  const peptideItems = protocol?.items?.filter(
    (i) => i.category === "peptide" || i.category === "injection"
  ) ?? [];

  return (
    <div className="animate-fade-in">
      <div className="mb-6">
        <h1 className="font-heading font-bold text-2xl text-white">Peptides</h1>
        <p className="text-sm font-body text-kairos-silver-dark mt-1">
          Peptide protocol tracking and dosing tools
        </p>
      </div>

      {/* ── Quick Links ──────────────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
        <button
          onClick={() => router.push("/peptide-calc")}
          className="kairos-card flex items-center gap-4 hover:border-kairos-gold/40 transition-all cursor-pointer group"
        >
          <div className="w-12 h-12 rounded-full bg-kairos-gold/15 flex items-center justify-center group-hover:bg-kairos-gold/25 transition-colors">
            <Calculator size={24} className="text-kairos-gold" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-heading font-semibold text-white text-sm">PeptideCalc</h3>
            <p className="text-xs font-body text-kairos-silver-dark">
              Calculate draw amounts for any peptide
            </p>
          </div>
          <ChevronRight size={16} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
        </button>

        <div className="kairos-card flex items-center gap-4 opacity-60">
          <div className="w-12 h-12 rounded-full bg-purple-500/15 flex items-center justify-center">
            <Calendar size={24} className="text-purple-400" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-heading font-semibold text-white text-sm">Cycle Planner</h3>
            <p className="text-xs font-body text-kairos-silver-dark">
              Coming soon — plan peptide cycles
            </p>
          </div>
        </div>
      </div>

      {/* ── Active Peptide Protocol ───────────────────────────── */}
      <div className="kairos-card">
        <div className="flex items-center gap-2 mb-4">
          <Syringe size={18} className="text-kairos-gold" />
          <h2 className="font-heading font-bold text-lg text-white">Active Protocol</h2>
        </div>

        {isLoading ? (
          <div className="py-8 text-center">
            <div className="w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs font-body text-kairos-silver-dark mt-2">Loading protocol…</p>
          </div>
        ) : peptideItems.length === 0 ? (
          <div className="py-12 text-center">
            <div className="w-14 h-14 rounded-full bg-kairos-gold/10 flex items-center justify-center mx-auto mb-3">
              <Syringe size={28} className="text-kairos-gold" />
            </div>
            <p className="font-heading font-semibold text-white mb-1">No Peptides Prescribed</p>
            <p className="text-sm font-body text-kairos-silver-dark max-w-sm mx-auto">
              Your trainer hasn&apos;t added any peptides to your protocol yet.
              Use the PeptideCalc above to calculate dosing for your peptides.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {peptideItems.map((item) => (
              <div
                key={item.id}
                className="rounded-xl border border-kairos-border bg-kairos-royal-surface/50 p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Pill size={14} className="text-violet-400" />
                    <h3 className="font-heading font-semibold text-white text-sm">{item.name}</h3>
                  </div>
                  <span className="text-xs font-heading font-semibold text-kairos-gold bg-kairos-gold/10 px-2 py-0.5 rounded-full">
                    {item.dosage}{item.unit}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  {item.frequency && (
                    <div className="flex items-center gap-1.5 text-kairos-silver-dark">
                      <Clock size={12} />
                      <span>{item.frequency}</span>
                    </div>
                  )}
                  {item.timeOfDay && (
                    <div className="flex items-center gap-1.5 text-kairos-silver-dark">
                      <Calendar size={12} />
                      <span>{item.timeOfDay}</span>
                    </div>
                  )}
                </div>

                {item.rationale && (
                  <p className="text-xs font-body text-kairos-silver-dark mt-2 border-t border-kairos-border pt-2">
                    {item.rationale}
                  </p>
                )}
                {item.coachNotes && (
                  <p className="text-xs font-body text-kairos-silver-dark italic mt-1">
                    Coach: {item.coachNotes}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
