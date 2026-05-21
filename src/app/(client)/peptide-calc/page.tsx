"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Syringe,
  ArrowLeft,
  RotateCcw,
  Save,
  Trash2,
  ChevronDown,
  ChevronUp,
  Plus,
  Calculator,
} from "lucide-react";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────
interface SavedPeptide {
  id: string;
  name: string;
  syringeSize: number;
  unitMode: "units" | "ml";
  vialUnit: "mg" | "iu";
  peptideAmount: number;
  bacWater: number;
  desiredDose: number;
  createdAt: string;
}

const SYRINGE_SIZES = [30, 50, 100] as const;
const STORAGE_KEY = "kairos-saved-peptides";

// ─── Helpers ──────────────────────────────────────────────────────
function loadSaved(): SavedPeptide[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSaved(list: SavedPeptide[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
export default function PeptideCalcPage() {
  const router = useRouter();

  // ── Calculator state ────────────────────────────────────────────
  const [unitMode, setUnitMode] = useState<"units" | "ml">("units");
  const [syringeSize, setSyringeSize] = useState<number>(100);
  const [vialUnit, setVialUnit] = useState<"mg" | "iu">("mg");
  const [peptideAmount, setPeptideAmount] = useState<string>("");
  const [bacWater, setBacWater] = useState<string>("");
  const [desiredDose, setDesiredDose] = useState<string>("");
  const [saveName, setSaveName] = useState("");
  const [showSaveForm, setShowSaveForm] = useState(false);

  // ── Saved list ──────────────────────────────────────────────────
  const [saved, setSaved] = useState<SavedPeptide[]>([]);
  const [showSaved, setShowSaved] = useState(false);

  useEffect(() => {
    setSaved(loadSaved());
  }, []);

  // ── Calculations ────────────────────────────────────────────────
  const calc = useMemo(() => {
    const pep = parseFloat(peptideAmount);
    const bac = parseFloat(bacWater);
    const dose = parseFloat(desiredDose);

    if (!pep || !bac || !dose || pep <= 0 || bac <= 0 || dose <= 0) {
      return { drawUnits: 0, drawMl: 0, concentration: 0, usesPerVial: 0 };
    }

    // Convert peptide amount to mcg for uniform calculation
    const peptideMcg = vialUnit === "mg" ? pep * 1000 : pep; // IU treated as mcg-equivalent
    const concentrationPerMl = peptideMcg / bac; // mcg per mL
    const drawMl = dose / concentrationPerMl; // mL to draw
    const drawUnits = drawMl * syringeSize; // units on the syringe
    const usesPerVial = Math.floor(peptideMcg / dose);

    return {
      drawUnits: Math.round(drawUnits * 100) / 100,
      drawMl: Math.round(drawMl * 1000) / 1000,
      concentration: Math.round(concentrationPerMl * 100) / 100,
      usesPerVial,
    };
  }, [peptideAmount, bacWater, desiredDose, syringeSize, vialUnit]);

  const displayDraw = unitMode === "units"
    ? `${calc.drawUnits} units`
    : `${calc.drawMl} mL`;

  // ── Syringe ruler rendering ─────────────────────────────────────
  const syringePercent = Math.min((calc.drawUnits / syringeSize) * 100, 100);

  // ── Actions ─────────────────────────────────────────────────────
  function handleReset() {
    setPeptideAmount("");
    setBacWater("");
    setDesiredDose("");
    setSaveName("");
    setShowSaveForm(false);
  }

  function handleSave() {
    if (!saveName.trim()) return;
    const entry: SavedPeptide = {
      id: crypto.randomUUID(),
      name: saveName.trim(),
      syringeSize,
      unitMode,
      vialUnit,
      peptideAmount: parseFloat(peptideAmount) || 0,
      bacWater: parseFloat(bacWater) || 0,
      desiredDose: parseFloat(desiredDose) || 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [entry, ...saved];
    setSaved(updated);
    persistSaved(updated);
    setSaveName("");
    setShowSaveForm(false);
  }

  function handleDelete(id: string) {
    const updated = saved.filter((s) => s.id !== id);
    setSaved(updated);
    persistSaved(updated);
  }

  function handleLoad(entry: SavedPeptide) {
    setSyringeSize(entry.syringeSize);
    setUnitMode(entry.unitMode);
    setVialUnit(entry.vialUnit);
    setPeptideAmount(String(entry.peptideAmount));
    setBacWater(String(entry.bacWater));
    setDesiredDose(String(entry.desiredDose));
    setShowSaved(false);
  }

  // ── Major tick marks for the ruler ──────────────────────────────
  const majorTicks = syringeSize === 30 ? [0, 5, 10, 15, 20, 25, 30]
    : syringeSize === 50 ? [0, 10, 20, 30, 40, 50]
    : [0, 10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

  return (
    <div className="animate-fade-in max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button
          onClick={() => router.push("/peptides")}
          className="text-kairos-silver-dark hover:text-white transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="font-heading font-bold text-2xl text-white flex items-center gap-2">
            <Calculator size={24} className="text-kairos-gold" />
            PeptideCalc
          </h1>
          <p className="text-xs font-body text-kairos-silver-dark mt-0.5">
            Calculate your draw amount for any peptide
          </p>
        </div>
      </div>

      <div className="kairos-card">
        {/* ── Display Mode Toggle ─────────────────────────────── */}
        <div className="flex gap-2 mb-6">
          {(["units", "ml"] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setUnitMode(mode)}
              className={cn(
                "px-5 py-2 rounded-kairos-sm text-sm font-heading font-semibold transition-all border",
                unitMode === mode
                  ? "bg-kairos-gold text-kairos-royal-dark border-kairos-gold"
                  : "border-kairos-border text-kairos-silver-dark hover:text-white hover:border-kairos-gold/50"
              )}
            >
              {mode === "units" ? "Units" : "mL"}
            </button>
          ))}
        </div>

        {/* ── Syringe Size ────────────────────────────────────── */}
        <div className="mb-6">
          <h3 className="text-sm font-heading font-bold text-white mb-3">Syringe Size</h3>
          <div className="border-t border-kairos-border mb-3" />
          <div className="flex gap-2">
            {SYRINGE_SIZES.map((size) => (
              <button
                key={size}
                onClick={() => setSyringeSize(size)}
                className={cn(
                  "flex-1 py-2.5 rounded-kairos-sm text-sm font-heading font-semibold transition-all border",
                  syringeSize === size
                    ? "bg-kairos-gold text-kairos-royal-dark border-kairos-gold"
                    : "border-kairos-border text-kairos-silver-dark hover:text-white hover:border-kairos-gold/50"
                )}
              >
                {size} units
              </button>
            ))}
          </div>
        </div>

        {/* ── Vial Details ────────────────────────────────────── */}
        <div className="mb-6">
          <h3 className="text-sm font-heading font-bold text-white mb-3">Vial Details</h3>
          <div className="border-t border-kairos-border mb-3" />

          {/* mg / IU toggle */}
          <div className="flex gap-2 mb-4">
            {(["mg", "iu"] as const).map((u) => (
              <button
                key={u}
                onClick={() => setVialUnit(u)}
                className={cn(
                  "px-5 py-2 rounded-kairos-sm text-sm font-heading font-semibold transition-all border",
                  vialUnit === u
                    ? "bg-kairos-gold text-kairos-royal-dark border-kairos-gold"
                    : "border-kairos-border text-kairos-silver-dark hover:text-white hover:border-kairos-gold/50"
                )}
              >
                {u === "mg" ? "mg" : "IU"}
              </button>
            ))}
          </div>

          {/* Peptide amount */}
          <div className="mb-3">
            <label className="block text-xs font-heading text-kairos-gold mb-1">
              Peptide amount
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={peptideAmount}
                onChange={(e) => setPeptideAmount(e.target.value)}
                placeholder="0"
                className="w-full sm:w-64 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2.5 pr-12 text-sm font-body focus:border-kairos-gold focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-kairos-silver-dark font-heading">
                {vialUnit}
              </span>
            </div>
          </div>

          {/* BAC water */}
          <div className="mb-3">
            <label className="block text-xs font-heading text-kairos-gold mb-1">
              BAC water
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={bacWater}
                onChange={(e) => setBacWater(e.target.value)}
                placeholder="0"
                className="w-full sm:w-64 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2.5 pr-12 text-sm font-body focus:border-kairos-gold focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-kairos-silver-dark font-heading">
                mL
              </span>
            </div>
          </div>

          {/* Desired dose */}
          <div className="mb-4">
            <label className="block text-xs font-heading text-kairos-gold mb-1">
              Desired amount
            </label>
            <div className="relative">
              <input
                type="number"
                inputMode="decimal"
                value={desiredDose}
                onChange={(e) => setDesiredDose(e.target.value)}
                placeholder="0"
                className="w-full sm:w-64 bg-kairos-royal-surface border border-kairos-border text-white rounded-kairos-sm px-3 py-2.5 pr-12 text-sm font-body focus:border-kairos-gold focus:outline-none"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-kairos-silver-dark font-heading">
                mcg
              </span>
            </div>
          </div>
        </div>

        {/* ── Result ──────────────────────────────────────────── */}
        <div className="bg-kairos-royal-surface rounded-kairos-sm p-4 mb-6 border border-kairos-border">
          <div className="text-center mb-2">
            <p className="text-lg font-heading font-bold text-kairos-gold">
              Draw amount: {displayDraw}
            </p>
            <p className="text-sm font-body text-kairos-silver-dark">
              Vial contains {calc.usesPerVial} uses
            </p>
            {calc.concentration > 0 && (
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                Concentration: {calc.concentration} mcg/mL
              </p>
            )}
          </div>

          {/* ── Syringe Ruler ──────────────────────────────────── */}
          <div className="mt-4 px-2">
            <div className="relative h-10">
              {/* Track */}
              <div className="absolute top-4 left-0 right-0 h-1 bg-kairos-border rounded" />
              {/* Fill */}
              <div
                className="absolute top-4 left-0 h-1 bg-kairos-gold rounded transition-all duration-300"
                style={{ width: `${syringePercent}%` }}
              />
              {/* Tick marks */}
              {majorTicks.map((tick) => {
                const pct = (tick / syringeSize) * 100;
                return (
                  <div
                    key={tick}
                    className="absolute flex flex-col items-center"
                    style={{ left: `${pct}%`, transform: "translateX(-50%)" }}
                  >
                    <div className="w-px h-3 bg-kairos-silver-dark" />
                    <span className="text-[9px] font-heading text-kairos-silver-dark mt-1">
                      {tick}
                    </span>
                  </div>
                );
              })}
              {/* Needle indicator */}
              {calc.drawUnits > 0 && calc.drawUnits <= syringeSize && (
                <div
                  className="absolute top-1 flex flex-col items-center transition-all duration-300"
                  style={{ left: `${syringePercent}%`, transform: "translateX(-50%)" }}
                >
                  <div className="w-0 h-0 border-l-[4px] border-r-[4px] border-t-[6px] border-l-transparent border-r-transparent border-t-kairos-gold" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Action Buttons ──────────────────────────────────── */}
        <div className="flex gap-3">
          <button
            onClick={handleReset}
            className="flex-1 kairos-btn-outline flex items-center justify-center gap-2"
          >
            <RotateCcw size={16} />
            Reset
          </button>
          <button
            onClick={() => setShowSaveForm(true)}
            disabled={!parseFloat(peptideAmount) || !parseFloat(bacWater) || !parseFloat(desiredDose)}
            className="flex-1 kairos-btn-gold flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Save size={16} />
            Save
          </button>
        </div>

        {/* ── Save Form (inline) ──────────────────────────────── */}
        {showSaveForm && (
          <div className="mt-4 p-4 bg-kairos-royal-surface rounded-kairos-sm border border-kairos-gold/30">
            <label className="block text-xs font-heading text-kairos-gold mb-2">
              Peptide Name
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
                placeholder="e.g. BPC-157, Semaglutide..."
                className="flex-1 bg-kairos-royal border border-kairos-border text-white rounded-kairos-sm px-3 py-2 text-sm font-body focus:border-kairos-gold focus:outline-none"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && handleSave()}
              />
              <button
                onClick={handleSave}
                disabled={!saveName.trim()}
                className="kairos-btn-gold px-4 disabled:opacity-40"
              >
                Save
              </button>
            </div>
          </div>
        )}
      </div>

      {/* ━━━ Saved Peptides ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
      {saved.length > 0 && (
        <div className="kairos-card mt-6">
          <button
            onClick={() => setShowSaved(!showSaved)}
            className="w-full flex items-center justify-between"
          >
            <div className="flex items-center gap-2">
              <Syringe size={16} className="text-kairos-gold" />
              <h3 className="font-heading font-bold text-white">
                Saved Peptides
                <span className="ml-2 text-xs text-kairos-gold bg-kairos-gold/10 rounded-full px-2 py-0.5">
                  {saved.length}
                </span>
              </h3>
            </div>
            {showSaved ? (
              <ChevronUp size={16} className="text-kairos-silver-dark" />
            ) : (
              <ChevronDown size={16} className="text-kairos-silver-dark" />
            )}
          </button>

          {showSaved && (
            <div className="mt-4 space-y-2">
              {saved.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between p-3 bg-kairos-royal-surface rounded-kairos-sm border border-kairos-border hover:border-kairos-gold/30 transition-colors"
                >
                  <button
                    onClick={() => handleLoad(entry)}
                    className="flex-1 text-left"
                  >
                    <p className="text-sm font-heading font-semibold text-white">
                      {entry.name}
                    </p>
                    <p className="text-xs font-body text-kairos-silver-dark mt-0.5">
                      {entry.peptideAmount}{entry.vialUnit} in {entry.bacWater}mL BAC →{" "}
                      {entry.desiredDose}mcg dose · {entry.syringeSize}u syringe
                    </p>
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-2 text-kairos-silver-dark hover:text-red-400 transition-colors ml-2"
                    aria-label={`Delete ${entry.name}`}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
