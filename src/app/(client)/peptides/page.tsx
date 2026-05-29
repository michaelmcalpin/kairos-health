"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Syringe,
  Calculator,
  ChevronRight,
  Clock,
  Calendar,
  Pill,
  Plus,
  X,
  Check,
  Play,
  Pause,
  CheckCircle2,
  Trash2,
  MapPin,
  FileText,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

type CycleStatus = "planned" | "active" | "completed" | "paused";
type TabType = "active" | "history" | "log";

const STATUS_COLORS: Record<CycleStatus, string> = {
  planned: "text-blue-400 bg-blue-400/10",
  active: "text-emerald-400 bg-emerald-400/10",
  completed: "text-kairos-silver-dark bg-kairos-silver-dark/10",
  paused: "text-amber-400 bg-amber-400/10",
};

const STATUS_LABELS: Record<CycleStatus, string> = {
  planned: "Planned",
  active: "Active",
  completed: "Completed",
  paused: "Paused",
};

const INJECTION_SITES = [
  "Abdomen (Left)", "Abdomen (Right)",
  "Thigh (Left)", "Thigh (Right)",
  "Deltoid (Left)", "Deltoid (Right)",
  "Glute (Left)", "Glute (Right)",
];

const COMMON_PEPTIDES = [
  "BPC-157", "TB-500", "Semaglutide", "Tirzepatide",
  "CJC-1295 / Ipamorelin", "Tesamorelin", "AOD-9604",
  "PT-141", "Selank", "Semax", "GHK-Cu", "NAD+",
  "Epithalon", "Thymosin Alpha-1", "MOTS-c", "SS-31",
];

export default function PeptidesPage() {
  const router = useRouter();
  const utils = trpc.useUtils();
  const [tab, setTab] = useState<TabType>("active");
  const [showNewCycle, setShowNewCycle] = useState(false);
  const [showLogDose, setShowLogDose] = useState(false);
  const [selectedCycleId, setSelectedCycleId] = useState<string | null>(null);

  // Queries
  const { data: activeCycles = [], isLoading: loadingActive } =
    trpc.clientPortal.peptides.getCycles.useQuery({ status: "active" });
  const { data: plannedCycles = [] } =
    trpc.clientPortal.peptides.getCycles.useQuery({ status: "planned" });
  const { data: completedCycles = [], isLoading: loadingHistory } =
    trpc.clientPortal.peptides.getCycles.useQuery({ status: "completed" });
  const { data: pausedCycles = [] } =
    trpc.clientPortal.peptides.getCycles.useQuery({ status: "paused" });
  const { data: recentLogs = [], isLoading: loadingLogs } =
    trpc.clientPortal.peptides.getRecentLogs.useQuery({ limit: 30 });

  // Also fetch protocol peptide items
  const { data: protocol } = trpc.clientPortal.supplements.getActiveProtocol.useQuery(undefined, {
    staleTime: 30_000,
  });
  const protocolPeptides = protocol?.items?.filter(
    (i) => i.category === "peptide" || i.category === "injection"
  ) ?? [];

  // Mutations
  const createCycle = trpc.clientPortal.peptides.createCycle.useMutation({
    onSuccess: () => {
      utils.clientPortal.peptides.getCycles.invalidate();
      setShowNewCycle(false);
    },
  });
  const updateStatus = trpc.clientPortal.peptides.updateCycleStatus.useMutation({
    onSuccess: () => utils.clientPortal.peptides.getCycles.invalidate(),
  });
  const deleteCycle = trpc.clientPortal.peptides.deleteCycle.useMutation({
    onSuccess: () => utils.clientPortal.peptides.getCycles.invalidate(),
  });
  const logDose = trpc.clientPortal.peptides.logDose.useMutation({
    onSuccess: () => {
      utils.clientPortal.peptides.getRecentLogs.invalidate();
      setShowLogDose(false);
    },
  });
  const deleteLog = trpc.clientPortal.peptides.deleteLog.useMutation({
    onSuccess: () => utils.clientPortal.peptides.getRecentLogs.invalidate(),
  });

  // New cycle form state
  const [cycleForm, setCycleForm] = useState({
    name: "",
    peptideName: "",
    dosage: "",
    unit: "mcg",
    frequency: "Daily",
    route: "subcutaneous",
    injectionSites: [] as string[],
    startDate: new Date().toISOString().split("T")[0],
    endDate: "",
    durationWeeks: "",
    notes: "",
  });

  // Log dose form state
  const [logForm, setLogForm] = useState({
    peptideName: "",
    dosage: "",
    unit: "mcg",
    date: new Date().toISOString().split("T")[0],
    time: new Date().toTimeString().slice(0, 5),
    injectionSite: "",
    notes: "",
    cycleId: undefined as string | undefined,
  });

  function handleCreateCycle() {
    if (!cycleForm.name || !cycleForm.peptideName || !cycleForm.startDate) return;
    createCycle.mutate({
      name: cycleForm.name,
      peptideName: cycleForm.peptideName,
      dosage: cycleForm.dosage || undefined,
      unit: cycleForm.unit || undefined,
      frequency: cycleForm.frequency || undefined,
      route: cycleForm.route || undefined,
      injectionSites: cycleForm.injectionSites.length > 0 ? cycleForm.injectionSites : undefined,
      startDate: cycleForm.startDate,
      endDate: cycleForm.endDate || undefined,
      durationWeeks: cycleForm.durationWeeks ? parseInt(cycleForm.durationWeeks) : undefined,
      status: "active",
      notes: cycleForm.notes || undefined,
    });
  }

  function handleLogDose() {
    if (!logForm.peptideName || !logForm.date) return;
    logDose.mutate({
      cycleId: logForm.cycleId,
      peptideName: logForm.peptideName,
      dosage: logForm.dosage || undefined,
      unit: logForm.unit || undefined,
      date: logForm.date,
      time: logForm.time || undefined,
      injectionSite: logForm.injectionSite || undefined,
      notes: logForm.notes || undefined,
    });
  }

  const allUpcoming = [...plannedCycles, ...activeCycles, ...pausedCycles];

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading font-bold text-2xl text-white">Peptides</h1>
          <p className="text-sm font-body text-kairos-silver-dark mt-1">
            Cycle planning, dosing logs, and protocol tracking
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setLogForm({
                peptideName: activeCycles[0]?.peptideName || "",
                dosage: activeCycles[0]?.dosage || "",
                unit: activeCycles[0]?.unit || "mcg",
                date: new Date().toISOString().split("T")[0],
                time: new Date().toTimeString().slice(0, 5),
                injectionSite: "",
                notes: "",
                cycleId: activeCycles[0]?.id,
              });
              setShowLogDose(true);
            }}
            className="kairos-btn-outline flex items-center gap-2 text-sm"
          >
            <Check size={14} />
            <span className="font-heading">Log Dose</span>
          </button>
          <button
            onClick={() => setShowNewCycle(true)}
            className="kairos-btn-gold flex items-center gap-2 text-sm"
          >
            <Plus size={14} />
            <span className="font-heading">New Cycle</span>
          </button>
        </div>
      </div>

      {/* Quick Links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              Calculate reconstitution &amp; draw amounts
            </p>
          </div>
          <ChevronRight size={16} className="text-kairos-silver-dark group-hover:text-kairos-gold transition-colors" />
        </button>

        <div className="kairos-card flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-violet-500/15 flex items-center justify-center">
            <Syringe size={24} className="text-violet-400" />
          </div>
          <div className="flex-1 text-left">
            <h3 className="font-heading font-semibold text-white text-sm">
              {activeCycles.length} Active {activeCycles.length === 1 ? "Cycle" : "Cycles"}
            </h3>
            <p className="text-xs font-body text-kairos-silver-dark">
              {recentLogs.length} doses logged recently
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-kairos-royal-surface rounded-lg p-1">
        {(["active", "history", "log"] as TabType[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "flex-1 py-2 px-3 rounded-md text-xs font-heading font-semibold transition-colors",
              tab === t
                ? "bg-kairos-gold text-kairos-royal-dark"
                : "text-kairos-silver-dark hover:text-white"
            )}
          >
            {t === "active" ? "Active Cycles" : t === "history" ? "History" : "Dose Log"}
          </button>
        ))}
      </div>

      {/* New Cycle Form */}
      {showNewCycle && (
        <div className="kairos-card border-kairos-gold/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">New Peptide Cycle</h3>
            <button onClick={() => setShowNewCycle(false)} className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-white hover:bg-kairos-royal-surface transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Cycle Name</label>
              <input
                value={cycleForm.name}
                onChange={(e) => setCycleForm({ ...cycleForm, name: e.target.value })}
                placeholder="e.g. BPC-157 Healing Cycle"
                className="kairos-input w-full"
              />
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Peptide</label>
              <select
                value={cycleForm.peptideName}
                onChange={(e) => setCycleForm({ ...cycleForm, peptideName: e.target.value })}
                className="kairos-input w-full"
              >
                <option value="">Select peptide...</option>
                {COMMON_PEPTIDES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Dosage</label>
                <input
                  value={cycleForm.dosage}
                  onChange={(e) => setCycleForm({ ...cycleForm, dosage: e.target.value })}
                  placeholder="250"
                  className="kairos-input w-full"
                />
              </div>
              <div className="w-24">
                <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Unit</label>
                <select
                  value={cycleForm.unit}
                  onChange={(e) => setCycleForm({ ...cycleForm, unit: e.target.value })}
                  className="kairos-input w-full"
                >
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                  <option value="IU">IU</option>
                  <option value="units">units</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Frequency</label>
              <select
                value={cycleForm.frequency}
                onChange={(e) => setCycleForm({ ...cycleForm, frequency: e.target.value })}
                className="kairos-input w-full"
              >
                <option value="Daily">Daily</option>
                <option value="Twice daily">Twice daily</option>
                <option value="Every other day">Every other day</option>
                <option value="3x per week">3x per week</option>
                <option value="Weekly">Weekly</option>
                <option value="As needed">As needed</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Start Date</label>
              <input
                type="date"
                value={cycleForm.startDate}
                onChange={(e) => setCycleForm({ ...cycleForm, startDate: e.target.value })}
                className="kairos-input w-full"
              />
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Duration (weeks)</label>
                <input
                  type="number"
                  value={cycleForm.durationWeeks}
                  onChange={(e) => setCycleForm({ ...cycleForm, durationWeeks: e.target.value })}
                  placeholder="8"
                  className="kairos-input w-full"
                />
              </div>
              <div className="flex-1">
                <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">End Date</label>
                <input
                  type="date"
                  value={cycleForm.endDate}
                  onChange={(e) => setCycleForm({ ...cycleForm, endDate: e.target.value })}
                  className="kairos-input w-full"
                />
              </div>
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-heading text-kairos-silver-dark mb-2 block">Injection Sites (rotate)</label>
            <div className="flex flex-wrap gap-2">
              {INJECTION_SITES.map((site) => (
                <button
                  key={site}
                  onClick={() => {
                    const sites = cycleForm.injectionSites.includes(site)
                      ? cycleForm.injectionSites.filter((s) => s !== site)
                      : [...cycleForm.injectionSites, site];
                    setCycleForm({ ...cycleForm, injectionSites: sites });
                  }}
                  className={cn(
                    "px-3 py-1 rounded-full text-xs font-heading transition-colors",
                    cycleForm.injectionSites.includes(site)
                      ? "bg-kairos-gold text-kairos-royal-dark"
                      : "bg-kairos-royal-surface text-kairos-silver-dark border border-kairos-border hover:text-white"
                  )}
                >
                  {site}
                </button>
              ))}
            </div>
          </div>

          <div className="mb-4">
            <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Notes</label>
            <textarea
              value={cycleForm.notes}
              onChange={(e) => setCycleForm({ ...cycleForm, notes: e.target.value })}
              placeholder="Protocol rationale, goals, etc."
              rows={2}
              className="kairos-input w-full resize-none"
            />
          </div>

          <button
            onClick={handleCreateCycle}
            disabled={!cycleForm.name || !cycleForm.peptideName || createCycle.isPending}
            className="w-full kairos-btn-gold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {createCycle.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-kairos-royal-dark border-t-transparent rounded-full" />
            ) : (
              <Plus size={16} />
            )}
            <span className="font-heading text-sm">Start Cycle</span>
          </button>
        </div>
      )}

      {/* Log Dose Form */}
      {showLogDose && (
        <div className="kairos-card border-emerald-500/30">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-white">Log Dose</h3>
            <button onClick={() => setShowLogDose(false)} className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-white hover:bg-kairos-royal-surface transition-colors">
              <X size={16} />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Peptide</label>
              <select
                value={logForm.peptideName}
                onChange={(e) => {
                  const cycle = activeCycles.find((c) => c.peptideName === e.target.value);
                  setLogForm({
                    ...logForm,
                    peptideName: e.target.value,
                    dosage: cycle?.dosage || "",
                    unit: cycle?.unit || "mcg",
                    cycleId: cycle?.id,
                  });
                }}
                className="kairos-input w-full"
              >
                <option value="">Select...</option>
                {activeCycles.map((c) => (
                  <option key={c.id} value={c.peptideName}>{c.peptideName}</option>
                ))}
                {COMMON_PEPTIDES.filter(
                  (p) => !activeCycles.some((c) => c.peptideName === p)
                ).map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <div className="flex-1">
                <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Dosage</label>
                <input
                  value={logForm.dosage}
                  onChange={(e) => setLogForm({ ...logForm, dosage: e.target.value })}
                  placeholder="250"
                  className="kairos-input w-full"
                />
              </div>
              <div className="w-20">
                <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Unit</label>
                <select value={logForm.unit} onChange={(e) => setLogForm({ ...logForm, unit: e.target.value })} className="kairos-input w-full">
                  <option value="mcg">mcg</option>
                  <option value="mg">mg</option>
                  <option value="IU">IU</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Date</label>
              <input type="date" value={logForm.date} onChange={(e) => setLogForm({ ...logForm, date: e.target.value })} className="kairos-input w-full" />
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Time</label>
              <input type="time" value={logForm.time} onChange={(e) => setLogForm({ ...logForm, time: e.target.value })} className="kairos-input w-full" />
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Injection Site</label>
              <select value={logForm.injectionSite} onChange={(e) => setLogForm({ ...logForm, injectionSite: e.target.value })} className="kairos-input w-full">
                <option value="">Select site...</option>
                {INJECTION_SITES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-heading text-kairos-silver-dark mb-1 block">Notes</label>
              <input value={logForm.notes} onChange={(e) => setLogForm({ ...logForm, notes: e.target.value })} placeholder="Optional" className="kairos-input w-full" />
            </div>
          </div>

          <button
            onClick={handleLogDose}
            disabled={!logForm.peptideName || logDose.isPending}
            className="w-full kairos-btn-gold flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {logDose.isPending ? (
              <div className="animate-spin w-4 h-4 border-2 border-kairos-royal-dark border-t-transparent rounded-full" />
            ) : (
              <Check size={16} />
            )}
            <span className="font-heading text-sm">Log Dose</span>
          </button>
        </div>
      )}

      {/* Tab Content: Active Cycles */}
      {tab === "active" && (
        <div className="space-y-4">
          {/* Protocol peptides from coach */}
          {protocolPeptides.length > 0 && (
            <div className="kairos-card">
              <div className="flex items-center gap-2 mb-3">
                <Pill size={16} className="text-violet-400" />
                <h3 className="font-heading font-semibold text-white text-sm">Coach-Prescribed Protocol</h3>
              </div>
              <div className="space-y-2">
                {protocolPeptides.map((item) => (
                  <div key={item.id} className="rounded-lg border border-kairos-border bg-kairos-royal-surface/50 p-3 flex items-center justify-between">
                    <div>
                      <span className="font-heading font-semibold text-white text-sm">{item.name}</span>
                      <span className="ml-2 text-xs text-kairos-gold">{item.dosage}{item.unit}</span>
                      {item.frequency && <span className="ml-2 text-xs text-kairos-silver-dark">{item.frequency}</span>}
                    </div>
                    {item.timeOfDay && <span className="text-xs text-kairos-silver-dark">{item.timeOfDay}</span>}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Active/planned cycles */}
          {loadingActive ? (
            <div className="kairos-card flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full" />
            </div>
          ) : allUpcoming.length === 0 && protocolPeptides.length === 0 ? (
            <div className="kairos-card flex flex-col items-center justify-center py-16">
              <div className="w-20 h-20 rounded-full bg-kairos-royal-surface flex items-center justify-center mb-4">
                <Syringe size={32} className="text-kairos-silver-dark" />
              </div>
              <h3 className="font-heading font-semibold text-white text-lg mb-2">No Active Cycles</h3>
              <p className="text-sm font-body text-kairos-silver-dark text-center max-w-sm mb-6">
                Start a new peptide cycle to track your dosing schedule, injection sites, and progress.
              </p>
              <button onClick={() => setShowNewCycle(true)} className="kairos-btn-outline flex items-center gap-2">
                <Plus size={16} />
                <span className="font-heading text-sm">Create Cycle</span>
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {allUpcoming.map((cycle) => (
                <div key={cycle.id} className="kairos-card">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="font-heading font-semibold text-white">{cycle.name}</h3>
                        <span className={cn("text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full", STATUS_COLORS[cycle.status as CycleStatus])}>
                          {STATUS_LABELS[cycle.status as CycleStatus]}
                        </span>
                      </div>
                      <p className="text-sm text-kairos-gold font-heading">{cycle.peptideName}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {cycle.status === "planned" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: cycle.id, status: "active" })}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Start cycle"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      {cycle.status === "active" && (
                        <>
                          <button
                            onClick={() => updateStatus.mutate({ id: cycle.id, status: "paused" })}
                            className="p-1.5 rounded-lg text-amber-400 hover:bg-amber-400/10 transition-colors"
                            title="Pause cycle"
                          >
                            <Pause size={14} />
                          </button>
                          <button
                            onClick={() => updateStatus.mutate({ id: cycle.id, status: "completed" })}
                            className="p-1.5 rounded-lg text-kairos-silver-dark hover:bg-kairos-silver-dark/10 transition-colors"
                            title="Complete cycle"
                          >
                            <CheckCircle2 size={14} />
                          </button>
                        </>
                      )}
                      {cycle.status === "paused" && (
                        <button
                          onClick={() => updateStatus.mutate({ id: cycle.id, status: "active" })}
                          className="p-1.5 rounded-lg text-emerald-400 hover:bg-emerald-400/10 transition-colors"
                          title="Resume cycle"
                        >
                          <Play size={14} />
                        </button>
                      )}
                      <button
                        onClick={() => deleteCycle.mutate({ id: cycle.id })}
                        className="p-1.5 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors"
                        title="Delete cycle"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
                    {cycle.dosage && (
                      <div className="flex items-center gap-1.5 text-kairos-silver-dark">
                        <Syringe size={12} />
                        <span>{cycle.dosage} {cycle.unit}</span>
                      </div>
                    )}
                    {cycle.frequency && (
                      <div className="flex items-center gap-1.5 text-kairos-silver-dark">
                        <Clock size={12} />
                        <span>{cycle.frequency}</span>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5 text-kairos-silver-dark">
                      <Calendar size={12} />
                      <span>{cycle.startDate}{cycle.endDate ? ` → ${cycle.endDate}` : ""}</span>
                    </div>
                    {cycle.durationWeeks && (
                      <div className="flex items-center gap-1.5 text-kairos-silver-dark">
                        <Clock size={12} />
                        <span>{cycle.durationWeeks} weeks</span>
                      </div>
                    )}
                  </div>

                  {(cycle.injectionSites as string[] | null)?.length ? (
                    <div className="flex items-center gap-1.5 mt-2">
                      <MapPin size={12} className="text-kairos-silver-dark" />
                      <div className="flex flex-wrap gap-1">
                        {(cycle.injectionSites as string[]).map((site) => (
                          <span key={site} className="text-[10px] px-2 py-0.5 rounded-full bg-kairos-royal-surface text-kairos-silver-dark border border-kairos-border">
                            {site}
                          </span>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {cycle.notes && (
                    <p className="text-xs text-kairos-silver-dark mt-2 pt-2 border-t border-kairos-border">
                      <FileText size={10} className="inline mr-1" />{cycle.notes}
                    </p>
                  )}

                  {/* Quick log button */}
                  {cycle.status === "active" && (
                    <button
                      onClick={() => {
                        setLogForm({
                          peptideName: cycle.peptideName,
                          dosage: cycle.dosage || "",
                          unit: cycle.unit || "mcg",
                          date: new Date().toISOString().split("T")[0],
                          time: new Date().toTimeString().slice(0, 5),
                          injectionSite: "",
                          notes: "",
                          cycleId: cycle.id,
                        });
                        setShowLogDose(true);
                      }}
                      className="mt-3 w-full py-2 rounded-lg border border-emerald-500/30 text-emerald-400 text-xs font-heading font-semibold hover:bg-emerald-500/10 transition-colors flex items-center justify-center gap-2"
                    >
                      <Check size={14} />
                      Log Today&apos;s Dose
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab Content: History */}
      {tab === "history" && (
        <div className="space-y-3">
          {loadingHistory ? (
            <div className="kairos-card flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full" />
            </div>
          ) : completedCycles.length === 0 ? (
            <div className="kairos-card text-center py-12">
              <p className="text-sm text-kairos-silver-dark">No completed cycles yet.</p>
            </div>
          ) : (
            completedCycles.map((cycle) => (
              <div key={cycle.id} className="kairos-card opacity-75">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading font-semibold text-white text-sm">{cycle.name}</h3>
                    <p className="text-xs text-kairos-gold">{cycle.peptideName} — {cycle.dosage} {cycle.unit}</p>
                    <p className="text-xs text-kairos-silver-dark mt-1">
                      {cycle.startDate} → {cycle.endDate || "Ongoing"}{cycle.durationWeeks ? ` (${cycle.durationWeeks} weeks)` : ""}
                    </p>
                  </div>
                  <span className={cn("text-[10px] font-heading font-bold uppercase px-2 py-0.5 rounded-full", STATUS_COLORS.completed)}>
                    Completed
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab Content: Dose Log */}
      {tab === "log" && (
        <div className="space-y-3">
          {loadingLogs ? (
            <div className="kairos-card flex items-center justify-center py-12">
              <div className="animate-spin w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full" />
            </div>
          ) : recentLogs.length === 0 ? (
            <div className="kairos-card text-center py-12">
              <p className="text-sm text-kairos-silver-dark">No doses logged yet.</p>
              <button
                onClick={() => setShowLogDose(true)}
                className="mt-4 kairos-btn-outline text-sm flex items-center gap-2 mx-auto"
              >
                <Plus size={14} />
                <span className="font-heading">Log First Dose</span>
              </button>
            </div>
          ) : (
            <div className="kairos-card">
              <div className="space-y-2">
                {recentLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-2 border-b border-kairos-border last:border-0">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                        <Check size={14} className="text-emerald-400" />
                      </div>
                      <div>
                        <p className="text-sm font-heading font-semibold text-white">{log.peptideName}</p>
                        <div className="flex items-center gap-2 text-xs text-kairos-silver-dark">
                          <span>{log.date}</span>
                          {log.time && <span>at {log.time}</span>}
                          {log.dosage && <span>· {log.dosage} {log.unit}</span>}
                          {log.injectionSite && (
                            <span className="flex items-center gap-1">
                              <MapPin size={10} /> {log.injectionSite}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => deleteLog.mutate({ id: log.id })}
                      className="p-1.5 rounded-lg text-kairos-silver-dark hover:text-red-400 hover:bg-red-400/10 transition-colors"
                    >
                      <Trash2 size={12} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
