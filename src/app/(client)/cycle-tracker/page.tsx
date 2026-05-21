"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Calendar,
  ChevronLeft,
  ChevronRight,
  X,
  Plus,
  Minus,
  Droplets,
  Thermometer,
  Brain,
  Zap,
  Moon,
  Heart,
  Activity,
  Clock,
  TrendingUp,
  AlertCircle,
  Sparkles,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ─────────────────────────────────────────────────────────────────────

interface DailyLog {
  flow: "none" | "light" | "moderate" | "heavy";
  symptoms: string[];
  mood: number; // 1-5
  energy: number; // 1-5
  bbt: number | null; // basal body temp in F
  cervicalMucus: "none" | "dry" | "sticky" | "creamy" | "eggwhite" | "watery";
  notes: string;
}

interface CycleNotes {
  mood?: number;
  energy?: number;
  bbt?: number | null;
  cervicalMucus?: string;
  dailyLogs?: Record<string, DailyLog>;
}

interface CycleEntry {
  id: string;
  startDate: string;
  cycleLength: number | null;
  periodLength: number | null;
  flowIntensity: string | null;
  symptoms: string[] | null;
  notes: string | null;
  createdAt: string;
}

// ─── Constants ─────────────────────────────────────────────────────────────────

const SYMPTOM_OPTIONS = [
  "Cramps",
  "Bloating",
  "Headache",
  "Breast Tenderness",
  "Acne",
  "Fatigue",
  "Nausea",
  "Back Pain",
  "Mood Swings",
  "Insomnia",
] as const;

const MOOD_EMOJIS = ["", "😢", "😐", "🙂", "😊", "😁"] as const;
const MOOD_LABELS = ["", "Awful", "Low", "Okay", "Good", "Great"] as const;

const ENERGY_LABELS = ["", "Very Low", "Low", "Moderate", "High", "Very High"] as const;

const CERVICAL_MUCUS_OPTIONS = [
  { value: "none", label: "None" },
  { value: "dry", label: "Dry" },
  { value: "sticky", label: "Sticky" },
  { value: "creamy", label: "Creamy" },
  { value: "eggwhite", label: "Egg White" },
  { value: "watery", label: "Watery" },
] as const;

const FLOW_OPTIONS = [
  { value: "none", label: "None", color: "bg-zinc-600" },
  { value: "light", label: "Light", color: "bg-pink-400" },
  { value: "moderate", label: "Moderate", color: "bg-red-400" },
  { value: "heavy", label: "Heavy", color: "bg-red-600" },
] as const;

const PHASE_COLORS: Record<string, string> = {
  menstrual: "#ef4444",
  follicular: "#3b82f6",
  ovulation: "#22c55e",
  luteal: "#a855f7",
};

const PHASE_BG_COLORS: Record<string, string> = {
  menstrual: "bg-red-500/20 text-red-400 border-red-500/30",
  follicular: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  ovulation: "bg-green-500/20 text-green-400 border-green-500/30",
  luteal: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// ─── Helpers ───────────────────────────────────────────────────────────────────

function parseNotesJson(notes: string | null): CycleNotes {
  if (!notes) return {};
  try {
    const parsed = JSON.parse(notes);
    if (typeof parsed === "object" && parsed !== null) return parsed;
  } catch {
    // notes is plain text, not JSON
  }
  return {};
}

function serializeNotes(data: CycleNotes): string {
  return JSON.stringify(data);
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function toDateString(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function addDays(dateStr: string, days: number): string {
  const d = new Date(dateStr + "T00:00:00");
  d.setDate(d.getDate() + days);
  return toDateString(d);
}

function daysBetween(a: string, b: string): number {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / (1000 * 60 * 60 * 24));
}

function getPhase(
  dayInCycle: number,
  cycleLength: number,
  periodLength: number
): { name: string; key: string } {
  if (dayInCycle <= periodLength) return { name: "Menstrual", key: "menstrual" };
  const ovulationDay = Math.round(cycleLength - 14);
  if (dayInCycle < ovulationDay - 3) return { name: "Follicular", key: "follicular" };
  if (dayInCycle >= ovulationDay - 3 && dayInCycle <= ovulationDay + 1)
    return { name: "Ovulation", key: "ovulation" };
  return { name: "Luteal", key: "luteal" };
}

function getCalendarDays(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const startOffset = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const days: (string | null)[] = [];
  // leading nulls
  for (let i = 0; i < startOffset; i++) days.push(null);
  // actual days
  for (let d = 1; d <= totalDays; d++) {
    const m = String(month + 1).padStart(2, "0");
    const dd = String(d).padStart(2, "0");
    days.push(`${year}-${m}-${dd}`);
  }
  return days;
}

function defaultDailyLog(): DailyLog {
  return {
    flow: "none",
    symptoms: [],
    mood: 0,
    energy: 0,
    bbt: null,
    cervicalMucus: "none",
    notes: "",
  };
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function CycleTrackerPage() {
  const today = toDateString(new Date());
  const [calYear, setCalYear] = useState(new Date().getFullYear());
  const [calMonth, setCalMonth] = useState(new Date().getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [showLogPanel, setShowLogPanel] = useState(false);
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null);
  const [dailyLog, setDailyLog] = useState<DailyLog>(defaultDailyLog());
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // ─── tRPC queries ──────────────────────────────────────────────────────────
  const utils = trpc.useUtils();

  const latestQuery = trpc.clientPortal.cycleData.getLatest.useQuery(undefined, {
    staleTime: 30_000,
  });

  const historyStartDate = `${calYear - 1}-01-01`;
  const historyEndDate = `${calYear + 1}-12-31`;
  const historyQuery = trpc.clientPortal.cycleData.getHistory.useQuery(
    { startDate: historyStartDate, endDate: historyEndDate },
    { staleTime: 30_000 }
  );

  const addMutation = trpc.clientPortal.cycleData.add.useMutation({
    onSuccess: () => {
      utils.clientPortal.cycleData.getLatest.invalidate();
      utils.clientPortal.cycleData.getHistory.invalidate();
    },
  });

  const updateMutation = trpc.clientPortal.cycleData.update.useMutation({
    onSuccess: () => {
      utils.clientPortal.cycleData.getLatest.invalidate();
      utils.clientPortal.cycleData.getHistory.invalidate();
    },
  });

  const deleteMutation = trpc.clientPortal.cycleData.delete.useMutation({
    onSuccess: () => {
      utils.clientPortal.cycleData.getLatest.invalidate();
      utils.clientPortal.cycleData.getHistory.invalidate();
    },
  });

  // ─── Derived data ──────────────────────────────────────────────────────────
  const cycles = useMemo(() => {
    return (latestQuery.data ?? []) as CycleEntry[];
  }, [latestQuery.data]);

  const allHistory = useMemo(() => {
    return (historyQuery.data ?? []) as CycleEntry[];
  }, [historyQuery.data]);

  const averageCycleLength = useMemo(() => {
    const withLength = cycles.filter((c) => c.cycleLength && c.cycleLength > 0);
    if (withLength.length === 0) return 28;
    return Math.round(
      withLength.reduce((sum, c) => sum + (c.cycleLength ?? 28), 0) / withLength.length
    );
  }, [cycles]);

  const averagePeriodLength = useMemo(() => {
    const withPeriod = cycles.filter((c) => c.periodLength && c.periodLength > 0);
    if (withPeriod.length === 0) return 5;
    return Math.round(
      withPeriod.reduce((sum, c) => sum + (c.periodLength ?? 5), 0) / withPeriod.length
    );
  }, [cycles]);

  const currentCycle = useMemo(() => {
    if (cycles.length === 0) return null;
    const latest = cycles[0];
    const dayInCycle = daysBetween(latest.startDate, today) + 1;
    const cl = latest.cycleLength ?? averageCycleLength;
    const pl = latest.periodLength ?? averagePeriodLength;
    if (dayInCycle < 1 || dayInCycle > cl + 14) return null; // too far out
    const phase = getPhase(dayInCycle, cl, pl);
    return { ...latest, dayInCycle, cycleLen: cl, periodLen: pl, phase };
  }, [cycles, today, averageCycleLength, averagePeriodLength]);

  const predictions = useMemo(() => {
    if (!currentCycle) return null;
    const nextPeriodStart = addDays(currentCycle.startDate, currentCycle.cycleLen);
    const ovDay = Math.round(currentCycle.cycleLen - 14);
    const ovulationDate = addDays(currentCycle.startDate, ovDay - 1);
    const fertileStart = addDays(ovulationDate, -5);
    const fertileEnd = addDays(ovulationDate, 1);
    return { nextPeriodStart, ovulationDate, fertileStart, fertileEnd };
  }, [currentCycle]);

  // Map for calendar day -> cycle info
  const calendarDayInfo = useMemo(() => {
    const map: Record<
      string,
      {
        isPeriod: boolean;
        isFertile: boolean;
        isOvulation: boolean;
        phaseKey: string;
        dayInCycle: number;
        cycleId: string;
      }
    > = {};

    for (const cycle of allHistory) {
      const cl = cycle.cycleLength ?? averageCycleLength;
      const pl = cycle.periodLength ?? averagePeriodLength;
      const ovDay = Math.round(cl - 14);

      for (let d = 0; d < cl; d++) {
        const dateStr = addDays(cycle.startDate, d);
        const dayNum = d + 1;
        const phase = getPhase(dayNum, cl, pl);
        map[dateStr] = {
          isPeriod: dayNum <= pl,
          isFertile: dayNum >= ovDay - 5 && dayNum <= ovDay + 1,
          isOvulation: dayNum === ovDay,
          phaseKey: phase.key,
          dayInCycle: dayNum,
          cycleId: cycle.id,
        };
      }
    }

    // Also map predictions for the current cycle going forward
    if (currentCycle && predictions) {
      const cl = currentCycle.cycleLen;
      const pl = currentCycle.periodLen;
      const ovDay = Math.round(cl - 14);

      for (let d = 0; d < cl; d++) {
        const dateStr = addDays(currentCycle.startDate, d);
        if (map[dateStr]) continue; // don't overwrite
        const dayNum = d + 1;
        const phase = getPhase(dayNum, cl, pl);
        map[dateStr] = {
          isPeriod: dayNum <= pl,
          isFertile: dayNum >= ovDay - 5 && dayNum <= ovDay + 1,
          isOvulation: dayNum === ovDay,
          phaseKey: phase.key,
          dayInCycle: dayNum,
          cycleId: currentCycle.id,
        };
      }
    }

    return map;
  }, [allHistory, currentCycle, predictions, averageCycleLength, averagePeriodLength]);

  const calendarDays = useMemo(() => getCalendarDays(calYear, calMonth), [calYear, calMonth]);

  const monthLabel = new Date(calYear, calMonth).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  // ─── Calendar navigation ──────────────────────────────────────────────────
  const goToPrevMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m === 0) {
        setCalYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  }, []);

  const goToNextMonth = useCallback(() => {
    setCalMonth((m) => {
      if (m === 11) {
        setCalYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  }, []);

  const goToToday = useCallback(() => {
    const now = new Date();
    setCalYear(now.getFullYear());
    setCalMonth(now.getMonth());
  }, []);

  // ─── Day click → open log panel ───────────────────────────────────────────
  const openDayLog = useCallback(
    (dateStr: string) => {
      setSelectedDate(dateStr);
      setSaveError(null);

      // Try to find existing daily log data
      const info = calendarDayInfo[dateStr];
      if (info) {
        const cycle = allHistory.find((c) => c.id === info.cycleId);
        if (cycle) {
          const notesData = parseNotesJson(cycle.notes);
          const existingLog = notesData.dailyLogs?.[dateStr];
          if (existingLog) {
            setDailyLog({ ...defaultDailyLog(), ...existingLog });
            setShowLogPanel(true);
            return;
          }
          // If this is a period day, pre-fill flow
          if (info.isPeriod) {
            setDailyLog({
              ...defaultDailyLog(),
              flow: (cycle.flowIntensity as DailyLog["flow"]) ?? "moderate",
            });
            setShowLogPanel(true);
            return;
          }
        }
      }
      setDailyLog(defaultDailyLog());
      setShowLogPanel(true);
    },
    [calendarDayInfo, allHistory]
  );

  // ─── Save daily log ──────────────────────────────────────────────────────
  const saveDailyLog = useCallback(async () => {
    if (!selectedDate) return;
    setSaving(true);
    setSaveError(null);

    try {
      const info = calendarDayInfo[selectedDate];
      if (info) {
        // Update existing cycle entry
        const cycle = allHistory.find((c) => c.id === info.cycleId);
        if (cycle) {
          const notesData = parseNotesJson(cycle.notes);
          if (!notesData.dailyLogs) notesData.dailyLogs = {};
          notesData.dailyLogs[selectedDate] = dailyLog;

          // Update the primary flow/symptoms if this is the start date
          const updatePayload: Record<string, unknown> = {
            id: cycle.id,
            notes: serializeNotes(notesData),
          };

          if (selectedDate === cycle.startDate) {
            if (dailyLog.flow !== "none") {
              updatePayload.flowIntensity = dailyLog.flow;
            }
            if (dailyLog.symptoms.length > 0) {
              updatePayload.symptoms = dailyLog.symptoms;
            }
          }

          await updateMutation.mutateAsync(updatePayload as Parameters<typeof updateMutation.mutateAsync>[0]);
        }
      } else {
        // No existing cycle for this date -- create a new cycle entry
        const notesData: CycleNotes = {
          dailyLogs: { [selectedDate]: dailyLog },
        };
        await addMutation.mutateAsync({
          startDate: selectedDate,
          cycleLength: averageCycleLength,
          periodLength: averagePeriodLength,
          flowIntensity: dailyLog.flow !== "none" ? dailyLog.flow : undefined,
          symptoms: dailyLog.symptoms,
          notes: serializeNotes(notesData),
        });
      }
      setShowLogPanel(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }, [
    selectedDate,
    dailyLog,
    calendarDayInfo,
    allHistory,
    averageCycleLength,
    averagePeriodLength,
    addMutation,
    updateMutation,
  ]);

  // ─── Delete cycle entry ────────────────────────────────────────────────────
  const handleDeleteCycle = useCallback(
    async (id: string) => {
      if (!confirm("Delete this cycle entry? This cannot be undone.")) return;
      try {
        await deleteMutation.mutateAsync(id);
      } catch {
        // handled by tRPC error
      }
    },
    [deleteMutation]
  );

  // ─── Loading / Error states ────────────────────────────────────────────────
  const isLoading = latestQuery.isLoading || historyQuery.isLoading;
  const isError = latestQuery.isError || historyQuery.isError;
  const hasData = cycles.length > 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center space-y-4">
          <Loader2 className="w-8 h-8 animate-spin text-kairos-gold mx-auto" />
          <p className="font-body text-kairos-silver-dark">Loading cycle data...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="kairos-card p-8 rounded-kairos-sm border border-red-500/30 text-center max-w-md">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-4" />
          <h2 className="font-heading text-xl text-white mb-2">Unable to Load Data</h2>
          <p className="font-body text-kairos-silver-dark mb-4">
            There was a problem loading your cycle data. Please try again.
          </p>
          <button
            onClick={() => {
              latestQuery.refetch();
              historyQuery.refetch();
            }}
            className="kairos-btn-gold px-6 py-2 rounded-kairos-sm font-body"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  // ─── Empty state ───────────────────────────────────────────────────────────
  if (!hasData) {
    return (
      <div className="space-y-6 animate-fade-in">
        <h1 className="font-heading text-2xl text-white">Cycle Tracker</h1>
        <div className="kairos-card p-8 rounded-kairos-sm border border-kairos-border text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-pink-500/20 to-purple-500/20 flex items-center justify-center mx-auto mb-6">
            <Moon className="w-8 h-8 text-pink-400" />
          </div>
          <h2 className="font-heading text-xl text-white mb-3">Start Tracking Your Cycle</h2>
          <p className="font-body text-kairos-silver-dark mb-2 leading-relaxed">
            Track your menstrual cycle, symptoms, mood, energy, and basal body temperature
            to better understand your hormonal health and predict your fertile window.
          </p>
          <p className="font-body text-kairos-silver-dark mb-6 text-sm">
            Log at least 3 cycles to get accurate predictions. All data stays private
            and is used to calculate your personal patterns.
          </p>
          <button
            onClick={() => openDayLog(today)}
            className="kairos-btn-gold px-8 py-3 rounded-kairos-sm font-body inline-flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            Start Tracking
          </button>
        </div>

        {/* Log Panel (modal) renders even in empty state */}
        {showLogPanel && (
          <LogPanel
            selectedDate={selectedDate}
            dailyLog={dailyLog}
            setDailyLog={setDailyLog}
            saving={saving}
            saveError={saveError}
            onSave={saveDailyLog}
            onClose={() => setShowLogPanel(false)}
          />
        )}
      </div>
    );
  }

  // ─── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="font-heading text-2xl text-white">Cycle Tracker</h1>
        <button
          onClick={() => openDayLog(today)}
          className="kairos-btn-gold px-4 py-2 rounded-kairos-sm font-body text-sm inline-flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          Log Today
        </button>
      </div>

      {/* ── Summary Cards ─────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Cycle Day */}
        <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
          <div className="flex items-center gap-2 mb-3">
            <Calendar className="w-4 h-4 text-kairos-gold" />
            <span className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Cycle Day
            </span>
          </div>
          <p className="text-2xl font-heading text-white">
            {currentCycle ? `Day ${currentCycle.dayInCycle}` : "--"}
          </p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            {currentCycle ? `of ${currentCycle.cycleLen}` : "No active cycle"}
          </p>
        </div>

        {/* Current Phase */}
        <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-4 h-4 text-kairos-gold" />
            <span className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Phase
            </span>
          </div>
          {currentCycle ? (
            <>
              <p className="text-2xl font-heading text-white">{currentCycle.phase.name}</p>
              <div className="mt-2">
                <span
                  className={`text-xs font-body px-2 py-0.5 rounded-full border ${PHASE_BG_COLORS[currentCycle.phase.key]}`}
                >
                  {currentCycle.phase.key === "menstrual" && "Period days"}
                  {currentCycle.phase.key === "follicular" && "Building up"}
                  {currentCycle.phase.key === "ovulation" && "Peak fertility"}
                  {currentCycle.phase.key === "luteal" && "Post-ovulation"}
                </span>
              </div>
            </>
          ) : (
            <p className="text-2xl font-heading text-white">--</p>
          )}
        </div>

        {/* Next Period */}
        <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
          <div className="flex items-center gap-2 mb-3">
            <Clock className="w-4 h-4 text-kairos-gold" />
            <span className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Next Period
            </span>
          </div>
          <p className="text-2xl font-heading text-white">
            {predictions ? formatDate(predictions.nextPeriodStart) : "--"}
          </p>
          {predictions && (
            <p className="text-xs font-body text-kairos-silver-dark mt-1">
              in {daysBetween(today, predictions.nextPeriodStart)} days
            </p>
          )}
        </div>

        {/* Average Cycle */}
        <div className="kairos-card p-5 rounded-kairos-sm border border-kairos-border">
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-kairos-gold" />
            <span className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
              Avg Cycle
            </span>
          </div>
          <p className="text-2xl font-heading text-white">{averageCycleLength} days</p>
          <p className="text-xs font-body text-kairos-silver-dark mt-1">
            Based on {cycles.filter((c) => c.cycleLength).length || 0} cycles
          </p>
        </div>
      </div>

      {/* ── Calendar ──────────────────────────────────────────────────────── */}
      <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
        {/* Calendar header */}
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={goToPrevMonth}
            className="kairos-btn-outline p-2 rounded-kairos-sm"
            aria-label="Previous month"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center">
            <h2 className="font-heading text-lg text-white">{monthLabel}</h2>
            <button
              onClick={goToToday}
              className="text-xs font-body text-kairos-gold hover:underline mt-1"
            >
              Today
            </button>
          </div>
          <button
            onClick={goToNextMonth}
            className="kairos-btn-outline p-2 rounded-kairos-sm"
            aria-label="Next month"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Day name headers */}
        <div className="grid grid-cols-7 gap-1 mb-2">
          {DAY_NAMES.map((name) => (
            <div
              key={name}
              className="text-center text-xs font-body text-kairos-silver-dark py-1"
            >
              {name}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((dateStr, idx) => {
            if (!dateStr) {
              return <div key={`empty-${idx}`} className="h-12" />;
            }

            const isToday = dateStr === today;
            const info = calendarDayInfo[dateStr];
            const dayNum = parseInt(dateStr.split("-")[2], 10);
            const isFuture = dateStr > today;

            let bgColor = "";
            let textColor = "text-white";
            let borderStyle = "";

            if (info) {
              if (info.isPeriod) {
                bgColor = "bg-red-500/25";
                textColor = "text-red-200";
              } else if (info.isOvulation) {
                bgColor = "bg-green-500/30";
                textColor = "text-green-200";
              } else if (info.isFertile) {
                bgColor = "bg-green-500/15";
                textColor = "text-green-300";
              }
            }

            if (isToday) {
              borderStyle = "ring-2 ring-kairos-gold";
            }

            if (isFuture && !info) {
              textColor = "text-zinc-600";
            }

            return (
              <button
                key={dateStr}
                onClick={() => openDayLog(dateStr)}
                className={`
                  h-12 rounded-lg flex flex-col items-center justify-center
                  transition-all duration-150 hover:bg-white/10
                  ${bgColor} ${textColor} ${borderStyle}
                  ${selectedDate === dateStr ? "ring-2 ring-white/50" : ""}
                `}
                title={
                  info
                    ? `Day ${info.dayInCycle} - ${info.phaseKey}`
                    : dateStr
                }
              >
                <span className="text-sm font-body leading-none">{dayNum}</span>
                {info?.isOvulation && (
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 mt-0.5" />
                )}
                {info?.isPeriod && !info.isOvulation && (
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 mt-0.5" />
                )}
              </button>
            );
          })}
        </div>

        {/* Calendar legend */}
        <div className="flex flex-wrap items-center gap-4 mt-4 pt-4 border-t border-kairos-border">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-red-500/40" />
            <span className="text-xs font-body text-kairos-silver-dark">Period</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-500/30" />
            <span className="text-xs font-body text-kairos-silver-dark">Fertile</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-green-400" />
            <span className="text-xs font-body text-kairos-silver-dark">Ovulation</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full ring-2 ring-kairos-gold" />
            <span className="text-xs font-body text-kairos-silver-dark">Today</span>
          </div>
        </div>
      </div>

      {/* ── Predictions ───────────────────────────────────────────────────── */}
      {predictions && (
        <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
          <h2 className="font-heading text-lg text-white mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-kairos-gold" />
            Predictions
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-4 rounded-lg bg-red-500/10 border border-red-500/20">
              <p className="text-xs font-body text-red-400 mb-1 uppercase tracking-wide">
                Next Period
              </p>
              <p className="font-heading text-white">{formatDate(predictions.nextPeriodStart)}</p>
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                ~{averagePeriodLength} days expected
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs font-body text-green-400 mb-1 uppercase tracking-wide">
                Fertile Window
              </p>
              <p className="font-heading text-white">
                {formatDate(predictions.fertileStart)} - {formatDate(predictions.fertileEnd)}
              </p>
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                {daysBetween(predictions.fertileStart, predictions.fertileEnd) + 1} days
              </p>
            </div>
            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
              <p className="text-xs font-body text-green-400 mb-1 uppercase tracking-wide">
                Ovulation Day
              </p>
              <p className="font-heading text-white">{formatDate(predictions.ovulationDate)}</p>
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                {daysBetween(today, predictions.ovulationDate) > 0
                  ? `in ${daysBetween(today, predictions.ovulationDate)} days`
                  : daysBetween(today, predictions.ovulationDate) === 0
                  ? "Today"
                  : `${Math.abs(daysBetween(today, predictions.ovulationDate))} days ago`}
              </p>
            </div>
          </div>
          <p className="text-xs font-body text-kairos-silver-dark mt-4">
            Predictions are based on your last {cycles.length} cycle{cycles.length !== 1 ? "s" : ""}.
            Log more cycles for improved accuracy.
          </p>
        </div>
      )}

      {/* ── Cycle History ─────────────────────────────────────────────────── */}
      <div className="kairos-card p-6 rounded-kairos-sm border border-kairos-border">
        <h2 className="font-heading text-lg text-white mb-4 flex items-center gap-2">
          <Clock className="w-5 h-5 text-kairos-gold" />
          Cycle History
        </h2>

        {allHistory.length === 0 ? (
          <p className="font-body text-kairos-silver-dark text-sm">No cycle history yet.</p>
        ) : (
          <div className="space-y-2">
            {allHistory.map((cycle) => {
              const isExpanded = expandedHistoryId === cycle.id;
              const notesData = parseNotesJson(cycle.notes);
              const dailyLogs = notesData.dailyLogs ?? {};
              const logDates = Object.keys(dailyLogs).sort();

              return (
                <div
                  key={cycle.id}
                  className="border border-kairos-border rounded-lg overflow-hidden"
                >
                  {/* Row header */}
                  <button
                    onClick={() =>
                      setExpandedHistoryId(isExpanded ? null : cycle.id)
                    }
                    className="w-full flex items-center justify-between p-4 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-center gap-4 flex-wrap">
                      <span className="font-heading text-white text-sm">
                        {formatDate(cycle.startDate)}
                      </span>
                      <span className="text-xs font-body text-kairos-silver-dark">
                        {cycle.cycleLength ? `${cycle.cycleLength}d cycle` : "Length unknown"}
                      </span>
                      <span className="text-xs font-body text-kairos-silver-dark">
                        {cycle.periodLength ? `${cycle.periodLength}d period` : ""}
                      </span>
                      {cycle.flowIntensity && (
                        <span className="text-xs font-body px-2 py-0.5 rounded-full bg-red-500/20 text-red-400 border border-red-500/30">
                          {cycle.flowIntensity}
                        </span>
                      )}
                      {cycle.symptoms && cycle.symptoms.length > 0 && (
                        <span className="text-xs font-body text-kairos-silver-dark">
                          {cycle.symptoms.slice(0, 3).join(", ")}
                          {cycle.symptoms.length > 3 && ` +${cycle.symptoms.length - 3}`}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4 text-kairos-silver-dark" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-kairos-silver-dark" />
                      )}
                    </div>
                  </button>

                  {/* Expanded detail */}
                  {isExpanded && (
                    <div className="border-t border-kairos-border p-4 space-y-3">
                      {logDates.length > 0 ? (
                        <div className="space-y-2">
                          <p className="text-xs font-body text-kairos-silver-dark uppercase tracking-wide">
                            Daily Logs ({logDates.length} entries)
                          </p>
                          <div className="grid gap-2">
                            {logDates.map((date) => {
                              const log = dailyLogs[date];
                              return (
                                <div
                                  key={date}
                                  className="flex flex-wrap items-center gap-3 p-3 rounded-lg bg-white/5 text-sm"
                                >
                                  <span className="font-body text-white min-w-[80px]">
                                    {formatDate(date)}
                                  </span>
                                  {log.flow !== "none" && (
                                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                                      {log.flow} flow
                                    </span>
                                  )}
                                  {log.mood > 0 && (
                                    <span className="text-xs">
                                      Mood: {MOOD_EMOJIS[log.mood]}
                                    </span>
                                  )}
                                  {log.energy > 0 && (
                                    <span className="text-xs text-yellow-400">
                                      Energy: {ENERGY_LABELS[log.energy]}
                                    </span>
                                  )}
                                  {log.bbt && (
                                    <span className="text-xs text-blue-400">
                                      BBT: {log.bbt.toFixed(1)}°F
                                    </span>
                                  )}
                                  {log.cervicalMucus !== "none" && (
                                    <span className="text-xs text-purple-400">
                                      CM: {log.cervicalMucus}
                                    </span>
                                  )}
                                  {log.symptoms.length > 0 && (
                                    <span className="text-xs text-kairos-silver-dark">
                                      {log.symptoms.join(", ")}
                                    </span>
                                  )}
                                  {log.notes && (
                                    <span className="text-xs text-kairos-silver-dark italic truncate max-w-[200px]">
                                      {log.notes}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm font-body text-kairos-silver-dark">
                          No daily logs recorded for this cycle.
                        </p>
                      )}

                      <div className="flex justify-end pt-2">
                        <button
                          onClick={() => handleDeleteCycle(cycle.id)}
                          className="text-xs font-body text-red-400 hover:text-red-300 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-500/10"
                          disabled={deleteMutation.isPending}
                        >
                          {deleteMutation.isPending ? "Deleting..." : "Delete Cycle"}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Daily Log Panel (Modal) ───────────────────────────────────────── */}
      {showLogPanel && (
        <LogPanel
          selectedDate={selectedDate}
          dailyLog={dailyLog}
          setDailyLog={setDailyLog}
          saving={saving}
          saveError={saveError}
          onSave={saveDailyLog}
          onClose={() => setShowLogPanel(false)}
        />
      )}
    </div>
  );
}

// ─── Log Panel Component ───────────────────────────────────────────────────────

interface LogPanelProps {
  selectedDate: string | null;
  dailyLog: DailyLog;
  setDailyLog: React.Dispatch<React.SetStateAction<DailyLog>>;
  saving: boolean;
  saveError: string | null;
  onSave: () => void;
  onClose: () => void;
}

function LogPanel({
  selectedDate,
  dailyLog,
  setDailyLog,
  saving,
  saveError,
  onSave,
  onClose,
}: LogPanelProps) {
  const toggleSymptom = (symptom: string) => {
    setDailyLog((prev) => ({
      ...prev,
      symptoms: prev.symptoms.includes(symptom)
        ? prev.symptoms.filter((s) => s !== symptom)
        : [...prev.symptoms, symptom],
    }));
  };

  const adjustBbt = (delta: number) => {
    setDailyLog((prev) => {
      const current = prev.bbt ?? 97.5;
      const next = Math.round((current + delta) * 10) / 10;
      if (next < 96 || next > 100) return prev;
      return { ...prev, bbt: next };
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative kairos-royal-surface rounded-kairos-sm border border-kairos-border w-full max-w-lg max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 kairos-royal-surface border-b border-kairos-border p-5 flex items-center justify-between z-10">
          <div>
            <h2 className="font-heading text-lg text-white">Daily Log</h2>
            <p className="text-xs font-body text-kairos-silver-dark mt-0.5">
              {selectedDate ? formatDate(selectedDate) : ""}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-kairos-silver-dark" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          {/* ── Flow Intensity ─────────────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-red-400" />
              Period Flow
            </label>
            <div className="grid grid-cols-4 gap-2 mt-2">
              {FLOW_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() =>
                    setDailyLog((p) => ({
                      ...p,
                      flow: opt.value as DailyLog["flow"],
                    }))
                  }
                  className={`
                    flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all
                    ${
                      dailyLog.flow === opt.value
                        ? "border-kairos-gold bg-kairos-gold/10"
                        : "border-kairos-border hover:border-white/20"
                    }
                  `}
                >
                  <span
                    className={`w-3 h-3 rounded-full ${opt.color} ${
                      dailyLog.flow === opt.value ? "ring-2 ring-kairos-gold ring-offset-1 ring-offset-transparent" : ""
                    }`}
                  />
                  <span className="text-xs font-body text-white">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Symptoms ──────────────────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-400" />
              Symptoms
            </label>
            <div className="flex flex-wrap gap-2 mt-2">
              {SYMPTOM_OPTIONS.map((symptom) => {
                const active = dailyLog.symptoms.includes(symptom);
                return (
                  <button
                    key={symptom}
                    onClick={() => toggleSymptom(symptom)}
                    className={`
                      text-xs font-body px-3 py-1.5 rounded-full border transition-all
                      ${
                        active
                          ? "bg-kairos-gold/20 border-kairos-gold text-kairos-gold"
                          : "border-kairos-border text-kairos-silver-dark hover:border-white/30"
                      }
                    `}
                  >
                    {symptom}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Mood ──────────────────────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 flex items-center gap-2">
              <Brain className="w-4 h-4 text-purple-400" />
              Mood
            </label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setDailyLog((p) => ({
                      ...p,
                      mood: p.mood === level ? 0 : level,
                    }))
                  }
                  className={`
                    flex-1 flex flex-col items-center gap-1 p-3 rounded-lg border transition-all
                    ${
                      dailyLog.mood === level
                        ? "border-kairos-gold bg-kairos-gold/10"
                        : "border-kairos-border hover:border-white/20"
                    }
                  `}
                >
                  <span className="text-xl">{MOOD_EMOJIS[level]}</span>
                  <span className="text-[10px] font-body text-kairos-silver-dark">
                    {MOOD_LABELS[level]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Energy ────────────────────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 flex items-center gap-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              Energy Level
            </label>
            <div className="flex gap-2 mt-2">
              {[1, 2, 3, 4, 5].map((level) => (
                <button
                  key={level}
                  onClick={() =>
                    setDailyLog((p) => ({
                      ...p,
                      energy: p.energy === level ? 0 : level,
                    }))
                  }
                  className={`
                    flex-1 flex flex-col items-center gap-1.5 p-3 rounded-lg border transition-all
                    ${
                      dailyLog.energy === level
                        ? "border-kairos-gold bg-kairos-gold/10"
                        : "border-kairos-border hover:border-white/20"
                    }
                  `}
                >
                  {/* Battery icon representation */}
                  <div className="relative w-5 h-8 border border-current rounded-sm flex flex-col-reverse overflow-hidden">
                    <div
                      className={`w-full transition-all ${
                        dailyLog.energy === level ? "bg-kairos-gold" : "bg-yellow-500/50"
                      }`}
                      style={{ height: `${(level / 5) * 100}%` }}
                    />
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-1 bg-current rounded-t-sm" />
                  </div>
                  <span className="text-[10px] font-body text-kairos-silver-dark leading-tight text-center">
                    {ENERGY_LABELS[level]}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* ── Basal Body Temperature ────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 flex items-center gap-2">
              <Thermometer className="w-4 h-4 text-blue-400" />
              Basal Body Temperature
            </label>
            <div className="flex items-center gap-3 mt-2">
              <button
                onClick={() => adjustBbt(-0.1)}
                className="kairos-btn-outline p-2 rounded-lg"
                aria-label="Decrease temperature"
              >
                <Minus className="w-4 h-4" />
              </button>
              <div className="flex-1 text-center">
                <input
                  type="number"
                  min={96}
                  max={100}
                  step={0.1}
                  value={dailyLog.bbt ?? ""}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    setDailyLog((p) => ({
                      ...p,
                      bbt: isNaN(val) ? null : Math.round(val * 10) / 10,
                    }));
                  }}
                  placeholder="--.-"
                  className="w-24 text-center text-2xl font-heading text-white bg-transparent border-b-2 border-kairos-border focus:border-kairos-gold outline-none py-1 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                />
                <span className="text-sm font-body text-kairos-silver-dark ml-1">°F</span>
              </div>
              <button
                onClick={() => adjustBbt(0.1)}
                className="kairos-btn-outline p-2 rounded-lg"
                aria-label="Increase temperature"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
            <p className="text-[10px] font-body text-kairos-silver-dark mt-2 text-center">
              Take your temperature first thing in the morning before getting out of bed
            </p>
          </div>

          {/* ── Cervical Mucus ────────────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 flex items-center gap-2">
              <Droplets className="w-4 h-4 text-purple-400" />
              Cervical Mucus
            </label>
            <select
              value={dailyLog.cervicalMucus}
              onChange={(e) =>
                setDailyLog((p) => ({
                  ...p,
                  cervicalMucus: e.target.value as DailyLog["cervicalMucus"],
                }))
              }
              className="w-full mt-2 p-3 rounded-lg bg-white/5 border border-kairos-border text-white font-body text-sm focus:border-kairos-gold outline-none appearance-none cursor-pointer"
            >
              {CERVICAL_MUCUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value} className="bg-zinc-900">
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* ── Notes ─────────────────────────────────────────────────────── */}
          <div>
            <label className="text-sm font-body text-kairos-silver-dark mb-3 block">
              Notes
            </label>
            <textarea
              value={dailyLog.notes}
              onChange={(e) =>
                setDailyLog((p) => ({ ...p, notes: e.target.value }))
              }
              rows={3}
              placeholder="Any additional notes for today..."
              className="w-full mt-2 p-3 rounded-lg bg-white/5 border border-kairos-border text-white font-body text-sm focus:border-kairos-gold outline-none resize-none placeholder:text-zinc-600"
            />
          </div>

          {/* ── Error ─────────────────────────────────────────────────────── */}
          {saveError && (
            <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-xs font-body text-red-400">{saveError}</p>
            </div>
          )}

          {/* ── Actions ───────────────────────────────────────────────────── */}
          <div className="flex gap-3 pt-2">
            <button
              onClick={onClose}
              className="flex-1 kairos-btn-outline py-3 rounded-kairos-sm font-body text-sm"
            >
              Cancel
            </button>
            <button
              onClick={onSave}
              disabled={saving}
              className="flex-1 kairos-btn-gold py-3 rounded-kairos-sm font-body text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Log"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
