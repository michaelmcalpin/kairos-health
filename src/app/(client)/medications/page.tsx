"use client";

import { useMemo, useState } from "react";
import { Tablets, CheckCircle, Clock, AlertTriangle, Plus, Info } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

interface MedicationItem {
  id: string;
  name: string;
  dosage: string | null;
  form: string | null;
  frequency: string | null;
  timeOfDay: string | null;
  rationale: string | null;
  coachNotes: string | null;
  taken: boolean;
}

const timeLabels: Record<string, string> = {
  morning: "Morning",
  midday: "Midday",
  evening: "Evening",
  bedtime: "Bedtime",
};

const timeIcons: Record<string, string> = {
  morning: "☀️",
  midday: "🌤️",
  evening: "🌅",
  bedtime: "🌙",
};

export default function MedicationsPage() {
  const { data: protocol, isLoading } = trpc.clientPortal.supplements.getActiveProtocol.useQuery();
  const logAdherence = trpc.clientPortal.supplements.logAdherence.useMutation();

  const [takenIds, setTakenIds] = useState<Set<string>>(new Set());
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Filter for medication category items only
  const medications = useMemo<MedicationItem[]>(() => {
    if (!protocol?.items) return [];
    return protocol.items
      .filter((item) => item.category === "medication")
      .map((item) => ({
        id: item.id,
        name: item.name,
        dosage: item.dosage,
        form: item.form ?? null,
        frequency: item.frequency ?? null,
        timeOfDay: item.timeOfDay ?? null,
        rationale: item.rationale ?? null,
        coachNotes: item.coachNotes ?? null,
        taken: takenIds.has(item.id),
      }));
  }, [protocol?.items, takenIds]);

  const takenCount = medications.filter((m) => m.taken).length;
  const totalCount = medications.length;
  const pct = totalCount > 0 ? Math.round((takenCount / totalCount) * 100) : 0;

  function toggle(id: string) {
    setTakenIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    logAdherence.mutate({ protocolItemId: id });
  }

  // Group by time of day
  const grouped = medications.reduce<Record<string, MedicationItem[]>>((acc, med) => {
    const key = med.timeOfDay ?? "morning";
    if (!acc[key]) acc[key] = [];
    acc[key].push(med);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-heading font-bold text-white">Medications</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            Prescription medication tracking and adherence
          </p>
        </div>
        <div className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold flex items-center gap-1">
          <Tablets size={12} /> {totalCount > 0 ? "Active Protocol" : "No Medications"}
        </div>
      </div>

      {/* Loading state */}
      {isLoading && (
        <div className="kairos-card flex items-center justify-center py-16">
          <div className="animate-spin w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full" />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && totalCount === 0 && (
        <div className="kairos-card flex flex-col items-center justify-center py-16 text-center">
          <div className="w-20 h-20 rounded-full bg-kairos-royal-surface flex items-center justify-center mb-4">
            <Tablets size={32} className="text-kairos-silver-dark" />
          </div>
          <h3 className="font-heading font-semibold text-white text-lg mb-2">No Medications Assigned</h3>
          <p className="text-sm font-body text-kairos-silver-dark max-w-sm mb-4">
            Your coach hasn&apos;t added any prescription medications to your protocol yet.
            Medications will appear here once assigned.
          </p>
          <div className="flex items-start gap-2 bg-kairos-royal-surface border border-kairos-border rounded-xl px-4 py-3 max-w-sm">
            <Info size={14} className="text-kairos-gold flex-shrink-0 mt-0.5" />
            <p className="text-xs font-body text-kairos-silver-dark text-left">
              Only your coach or medical provider can add medications. If you&apos;re taking medications
              not listed here, let your coach know so they can update your protocol.
            </p>
          </div>
        </div>
      )}

      {/* Today's Progress */}
      {totalCount > 0 && (
        <>
          <div className="kairos-card">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-heading font-semibold text-white">Today&apos;s Progress</h3>
              <span className="text-sm font-heading font-bold text-kairos-gold">{takenCount}/{totalCount}</span>
            </div>
            <div className="w-full h-2 bg-kairos-royal-surface rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-kairos-gold to-amber-500 rounded-full transition-all duration-500"
                style={{ width: `${pct}%` }}
              />
            </div>
            <p className="text-xs font-body text-kairos-silver-dark mt-2">
              {pct === 100
                ? "All medications taken today!"
                : pct > 0
                ? `${pct}% complete — ${totalCount - takenCount} remaining`
                : "Tap each medication as you take it"}
            </p>
          </div>

          {/* Grouped medication list */}
          {(["morning", "midday", "evening", "bedtime"] as const).map((timeSlot) => {
            const items = grouped[timeSlot];
            if (!items?.length) return null;
            return (
              <div key={timeSlot}>
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-sm">{timeIcons[timeSlot] ?? ""}</span>
                  <h3 className="font-heading font-semibold text-white text-sm">
                    {timeLabels[timeSlot] ?? timeSlot}
                  </h3>
                  <span className="text-xs font-body text-kairos-silver-dark">
                    ({items.filter((i) => i.taken).length}/{items.length})
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map((med) => (
                    <div key={med.id} className="kairos-card">
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => toggle(med.id)}
                          className={cn(
                            "w-7 h-7 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-colors",
                            med.taken
                              ? "bg-green-500/20 border-green-500 text-green-400"
                              : "border-kairos-border text-transparent hover:border-kairos-silver-dark"
                          )}
                        >
                          <CheckCircle size={14} />
                        </button>
                        <div className="flex-1 min-w-0">
                          <p className={cn(
                            "text-sm font-heading font-semibold",
                            med.taken ? "text-kairos-silver-dark line-through" : "text-white"
                          )}>
                            {med.name}
                          </p>
                          <div className="flex items-center gap-2 mt-0.5">
                            {med.dosage && (
                              <span className="text-xs font-body text-kairos-silver-dark">{med.dosage}</span>
                            )}
                            {med.form && (
                              <span className="text-[10px] font-body px-1.5 py-0.5 rounded bg-kairos-royal-surface text-kairos-silver-dark">
                                {med.form}
                              </span>
                            )}
                            {med.frequency && (
                              <span className="text-[10px] font-body text-kairos-silver-dark flex items-center gap-0.5">
                                <Clock size={10} /> {med.frequency}
                              </span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={() => setExpandedId(expandedId === med.id ? null : med.id)}
                          className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-white hover:bg-kairos-royal-surface transition-colors"
                        >
                          <Info size={14} />
                        </button>
                      </div>
                      {expandedId === med.id && (med.rationale || med.coachNotes) && (
                        <div className="mt-3 pt-3 border-t border-kairos-border space-y-2">
                          {med.rationale && (
                            <div>
                              <p className="text-[10px] font-heading font-semibold text-kairos-silver-dark uppercase tracking-wider mb-0.5">Why prescribed</p>
                              <p className="text-xs font-body text-kairos-silver">{med.rationale}</p>
                            </div>
                          )}
                          {med.coachNotes && (
                            <div>
                              <p className="text-[10px] font-heading font-semibold text-kairos-silver-dark uppercase tracking-wider mb-0.5">Coach notes</p>
                              <p className="text-xs font-body text-kairos-silver">{med.coachNotes}</p>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {/* Important notice */}
          <div className="flex items-start gap-3 bg-amber-500/5 border border-amber-500/20 rounded-xl px-4 py-3">
            <AlertTriangle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-xs font-heading font-semibold text-amber-400 mb-0.5">Important</p>
              <p className="text-xs font-body text-kairos-silver-dark">
                Never adjust dosages or stop medications without consulting your healthcare provider.
                This tracker is for adherence monitoring only.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
