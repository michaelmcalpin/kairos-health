"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import {
  Timer,
  Play,
  Square,
  Flame,
  Zap,
  Trophy,
  Clock,
  Check,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Droplets,
  Pill,
  UtensilsCrossed,
  Battery,
  Target,
  BarChart3,
  Award,
  Activity,
} from "lucide-react";
import { DateRangeNavigator } from "@/components/ui/DateRangeNavigator";
import { useDateRange } from "@/hooks/useDateRange";
import { trpc } from "@/lib/trpc";

// ─── Metabolic Zones ────────────────────────────────────────────────────────

const fastingZones = [
  { name: "Fed State", start: 0, end: 4, color: "#ef4444", description: "Insulin elevated, storing energy" },
  { name: "Early Fasting", start: 4, end: 8, color: "#f97316", description: "Insulin dropping, fat mobilization begins" },
  { name: "Fat Burning", start: 8, end: 12, color: "#eab308", description: "Significant fat oxidation, growth hormone rises" },
  { name: "Ketosis", start: 12, end: 16, color: "#22c55e", description: "Ketone production accelerates" },
  { name: "Deep Ketosis", start: 16, end: 24, color: "#06b6d4", description: "Autophagy begins, cellular repair active" },
  { name: "Autophagy", start: 24, end: 48, color: "#8b5cf6", description: "Peak autophagy, stem cell regeneration" },
];

// ─── Protocol Presets ───────────────────────────────────────────────────────

type FastingDbType = "16_8" | "20_4" | "36hr" | "omad" | "custom";

interface ProtocolPreset {
  id: string;
  label: string;
  subtitle: string;
  dbType: FastingDbType;
  feedingStartHour: number;
  feedingEndHour: number;
  fastHours: number;
  isExtended: boolean;
}

const protocolPresets: ProtocolPreset[] = [
  { id: "16_8", label: "16:8", subtitle: "Feed 12pm–8pm", dbType: "16_8", feedingStartHour: 12, feedingEndHour: 20, fastHours: 16, isExtended: false },
  { id: "18_6", label: "18:6", subtitle: "Feed 12pm–6pm", dbType: "custom", feedingStartHour: 12, feedingEndHour: 18, fastHours: 18, isExtended: false },
  { id: "20_4", label: "20:4", subtitle: "Feed 2pm–6pm", dbType: "20_4", feedingStartHour: 14, feedingEndHour: 18, fastHours: 20, isExtended: false },
  { id: "omad", label: "OMAD", subtitle: "One meal/day", dbType: "omad", feedingStartHour: 17, feedingEndHour: 18, fastHours: 23, isExtended: false },
  { id: "24hr", label: "24hr", subtitle: "Full day fast", dbType: "custom", feedingStartHour: 0, feedingEndHour: 0, fastHours: 24, isExtended: true },
  { id: "36hr", label: "36hr", subtitle: "Extended fast", dbType: "36hr", feedingStartHour: 0, feedingEndHour: 0, fastHours: 36, isExtended: true },
  { id: "48hr", label: "48hr", subtitle: "Deep fast", dbType: "custom", feedingStartHour: 0, feedingEndHour: 0, fastHours: 48, isExtended: true },
  { id: "72hr", label: "72hr", subtitle: "Prolonged fast", dbType: "custom", feedingStartHour: 0, feedingEndHour: 0, fastHours: 72, isExtended: true },
];

function getTargetHoursForProtocol(
  protocol: { type: string; feedingStartHour: number | null; feedingEndHour: number | null } | null | undefined,
): number {
  if (!protocol) return 16;
  const match = protocolPresets.find((p) => {
    if (p.dbType === protocol.type) {
      if (protocol.type === "custom") {
        return p.feedingStartHour === protocol.feedingStartHour && p.feedingEndHour === protocol.feedingEndHour;
      }
      return true;
    }
    return false;
  });
  if (match) return match.fastHours;
  // Custom with feeding window
  if (protocol.feedingStartHour != null && protocol.feedingEndHour != null && protocol.feedingEndHour > protocol.feedingStartHour) {
    return 24 - (protocol.feedingEndHour - protocol.feedingStartHour);
  }
  return 16;
}

function getActivePresetId(
  protocol: { type: string; feedingStartHour: number | null; feedingEndHour: number | null } | null | undefined,
): string | null {
  if (!protocol) return null;
  for (const p of protocolPresets) {
    if (p.dbType === protocol.type) {
      if (protocol.type === "custom") {
        if (p.feedingStartHour === protocol.feedingStartHour && p.feedingEndHour === protocol.feedingEndHour) {
          return p.id;
        }
      } else {
        return p.id;
      }
    }
  }
  return "custom";
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  if (h === 0) return `${m}m`;
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}

function formatHour(hour: number): string {
  if (hour === 0) return "12am";
  if (hour < 12) return `${hour}am`;
  if (hour === 12) return "12pm";
  return `${hour - 12}pm`;
}

// ─── Pre-Fast Checklist ─────────────────────────────────────────────────────

interface ChecklistItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  required: boolean;
  extendedOnly: boolean;
}

const checklistItems: ChecklistItem[] = [
  { id: "hydrated", label: "Hydrated well (at least 16oz water)", icon: <Droplets size={16} />, required: true, extendedOnly: false },
  { id: "last_meal", label: "Last meal completed", icon: <UtensilsCrossed size={16} />, required: true, extendedOnly: false },
  { id: "supplements", label: "Supplements taken", icon: <Pill size={16} />, required: true, extendedOnly: false },
  { id: "electrolytes", label: "Electrolytes prepared", icon: <Battery size={16} />, required: false, extendedOnly: true },
  { id: "schedule_clear", label: "No strenuous activity planned", icon: <Activity size={16} />, required: false, extendedOnly: true },
  { id: "support", label: "Emergency contact aware of fast", icon: <AlertTriangle size={16} />, required: false, extendedOnly: true },
];

// ─── Main Page ──────────────────────────────────────────────────────────────

export default function FastingPage() {
  const { period, setPeriod, dateRange, formattedRange, isCurrent, canForward, goBack, goForward, goToToday } =
    useDateRange({ initialPeriod: "week" });

  const utils = trpc.useUtils();

  // ─── tRPC Queries ───────────────────────────────────────────────────────
  const protocolQuery = trpc.clientPortal.fasting.getProtocol.useQuery();
  const activeFastQuery = trpc.clientPortal.fasting.getActiveFast.useQuery(undefined, {
    refetchInterval: 60_000,
  });

  const dateRangeInput = useMemo(
    () => ({
      startDate: dateRange.startDate.toISOString().split("T")[0],
      endDate: dateRange.endDate.toISOString().split("T")[0],
    }),
    [dateRange],
  );

  const logsQuery = trpc.clientPortal.fasting.listLogs.useQuery(dateRangeInput);
  const statsQuery = trpc.clientPortal.fasting.stats.useQuery(dateRangeInput);

  // ─── tRPC Mutations ────────────────────────────────────────────────────
  const setProtocolMutation = trpc.clientPortal.fasting.setProtocol.useMutation({
    onSuccess: () => {
      utils.clientPortal.fasting.getProtocol.invalidate();
    },
  });

  const startFastMutation = trpc.clientPortal.fasting.startFast.useMutation({
    onSuccess: () => {
      utils.clientPortal.fasting.getActiveFast.invalidate();
      utils.clientPortal.fasting.listLogs.invalidate();
    },
  });

  const endFastMutation = trpc.clientPortal.fasting.endFast.useMutation({
    onSuccess: () => {
      utils.clientPortal.fasting.getActiveFast.invalidate();
      utils.clientPortal.fasting.listLogs.invalidate();
      utils.clientPortal.fasting.stats.invalidate();
    },
  });

  // ─── Local State ──────────────────────────────────────────────────────
  const [elapsedHours, setElapsedHours] = useState(0);
  const [checkedItems, setCheckedItems] = useState<Set<string>>(new Set());
  const [showEndConfirm, setShowEndConfirm] = useState(false);
  const [showProtocolSection, setShowProtocolSection] = useState(true);
  const [customFeedStart, setCustomFeedStart] = useState(12);
  const [customFeedEnd, setCustomFeedEnd] = useState(20);
  const [showCustom, setShowCustom] = useState(false);

  // ─── Derived State ────────────────────────────────────────────────────
  const protocol = protocolQuery.data;
  const activeFast = activeFastQuery.data;
  const isFasting = !!activeFast;
  const logs = logsQuery.data ?? [];
  const stats = statsQuery.data;

  const targetHours = useMemo(() => getTargetHoursForProtocol(protocol), [protocol]);
  const activePresetId = useMemo(() => getActivePresetId(protocol), [protocol]);
  const isExtendedFast = targetHours >= 24;

  // ─── Timer Effect ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!activeFast?.startedAt) {
      setElapsedHours(0);
      return;
    }

    function updateElapsed() {
      const start = new Date(activeFast!.startedAt!).getTime();
      const diff = (Date.now() - start) / (1000 * 60 * 60);
      setElapsedHours(diff);
    }

    updateElapsed();
    const interval = setInterval(updateElapsed, 60_000); // update every minute
    return () => clearInterval(interval);
  }, [activeFast]);

  // ─── Checklist Logic ──────────────────────────────────────────────────
  const visibleChecklist = useMemo(
    () => checklistItems.filter((item) => !item.extendedOnly || isExtendedFast),
    [isExtendedFast],
  );

  const requiredChecked = useMemo(() => {
    const required = visibleChecklist.filter((item) => item.required);
    return required.every((item) => checkedItems.has(item.id));
  }, [visibleChecklist, checkedItems]);

  const toggleCheckItem = useCallback((id: string) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // ─── Actions ──────────────────────────────────────────────────────────
  function handleSelectProtocol(preset: ProtocolPreset) {
    setProtocolMutation.mutate({
      type: preset.dbType,
      feedingStartHour: preset.feedingStartHour,
      feedingEndHour: preset.feedingEndHour,
    });
    setShowCustom(false);
  }

  function handleSetCustomProtocol() {
    setProtocolMutation.mutate({
      type: "custom",
      feedingStartHour: customFeedStart,
      feedingEndHour: customFeedEnd,
    });
    setShowCustom(false);
  }

  function handleStartFast() {
    startFastMutation.mutate();
    setCheckedItems(new Set());
  }

  function handleEndFast(completed: boolean) {
    if (!activeFast?.id) return;
    endFastMutation.mutate({ logId: activeFast.id, completed });
    setShowEndConfirm(false);
  }

  // ─── Timer Display ────────────────────────────────────────────────────
  const currentZone = fastingZones.find((z) => elapsedHours >= z.start && elapsedHours < z.end) ?? fastingZones[fastingZones.length - 1];
  const progress = Math.min((elapsedHours / targetHours) * 100, 100);
  const hoursDisplay = Math.floor(elapsedHours);
  const minutesDisplay = Math.floor((elapsedHours % 1) * 60);
  const remainingHours = Math.max(0, targetHours - elapsedHours);
  const isPastTarget = elapsedHours >= targetHours;

  const ringSize = 240;
  const strokeWidth = 14;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (Math.min(progress, 100) / 100) * circumference;

  // ─── Zone Progress Segments ───────────────────────────────────────────
  const maxZoneHour = Math.max(targetHours, 24);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-heading font-bold text-xl text-white">Fasting</h2>
          <p className="text-sm font-body text-kairos-silver-dark">
            Intermittent fasting with metabolic zone tracking
          </p>
        </div>
        {protocol && (
          <div className="text-xs font-heading font-semibold px-3 py-1 rounded-full bg-kairos-gold/20 text-kairos-gold flex items-center gap-1">
            <Timer size={12} />
            {protocolPresets.find((p) => p.id === activePresetId)?.label ?? "Custom"} Protocol
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          PROTOCOL SELECTOR
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="kairos-card">
        <button
          onClick={() => setShowProtocolSection(!showProtocolSection)}
          className="w-full flex items-center justify-between mb-0"
        >
          <h3 className="font-heading font-semibold text-white flex items-center gap-2">
            <Target size={16} className="text-kairos-gold" /> Fasting Protocol
          </h3>
          {showProtocolSection ? (
            <ChevronUp size={16} className="text-kairos-silver-dark" />
          ) : (
            <ChevronDown size={16} className="text-kairos-silver-dark" />
          )}
        </button>

        {showProtocolSection && (
          <div className="mt-4">
            {/* Standard Protocols */}
            <p className="text-xs font-heading font-semibold text-kairos-silver-dark uppercase tracking-wider mb-2">
              Standard
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {protocolPresets
                .filter((p) => !p.isExtended)
                .map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectProtocol(preset)}
                      disabled={setProtocolMutation.isPending || isFasting}
                      className={`relative p-3 rounded-kairos-sm border transition-all text-left ${
                        isActive
                          ? "border-kairos-gold bg-kairos-gold/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                          : "border-kairos-border hover:border-kairos-silver-dark/40 bg-kairos-card-hover/50 hover:bg-kairos-card-hover"
                      } ${isFasting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className="w-4 h-4 rounded-full bg-kairos-gold flex items-center justify-center">
                            <Check size={10} className="text-kairos-royal-dark" />
                          </div>
                        </div>
                      )}
                      <p className={`text-sm font-heading font-bold ${isActive ? "text-kairos-gold" : "text-white"}`}>
                        {preset.label}
                      </p>
                      <p className="text-[10px] font-body text-kairos-silver-dark mt-0.5">{preset.subtitle}</p>
                    </button>
                  );
                })}
            </div>

            {/* Extended Protocols */}
            <p className="text-xs font-heading font-semibold text-kairos-silver-dark uppercase tracking-wider mb-2">
              Extended
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
              {protocolPresets
                .filter((p) => p.isExtended)
                .map((preset) => {
                  const isActive = activePresetId === preset.id;
                  return (
                    <button
                      key={preset.id}
                      onClick={() => handleSelectProtocol(preset)}
                      disabled={setProtocolMutation.isPending || isFasting}
                      className={`relative p-3 rounded-kairos-sm border transition-all text-left ${
                        isActive
                          ? "border-kairos-gold bg-kairos-gold/10 shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                          : "border-kairos-border hover:border-kairos-silver-dark/40 bg-kairos-card-hover/50 hover:bg-kairos-card-hover"
                      } ${isFasting ? "opacity-50 cursor-not-allowed" : ""}`}
                    >
                      {isActive && (
                        <div className="absolute top-1.5 right-1.5">
                          <div className="w-4 h-4 rounded-full bg-kairos-gold flex items-center justify-center">
                            <Check size={10} className="text-kairos-royal-dark" />
                          </div>
                        </div>
                      )}
                      <p className={`text-sm font-heading font-bold ${isActive ? "text-kairos-gold" : "text-white"}`}>
                        {preset.label}
                      </p>
                      <p className="text-[10px] font-body text-kairos-silver-dark mt-0.5">{preset.subtitle}</p>
                    </button>
                  );
                })}
            </div>

            {/* Custom Protocol */}
            <button
              onClick={() => setShowCustom(!showCustom)}
              disabled={isFasting}
              className={`w-full text-left p-3 rounded-kairos-sm border transition-all ${
                activePresetId === "custom" && !showCustom
                  ? "border-kairos-gold bg-kairos-gold/10"
                  : "border-kairos-border hover:border-kairos-silver-dark/40 bg-kairos-card-hover/50 hover:bg-kairos-card-hover"
              } ${isFasting ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              <p className={`text-sm font-heading font-bold ${activePresetId === "custom" ? "text-kairos-gold" : "text-white"}`}>
                Custom
              </p>
              <p className="text-[10px] font-body text-kairos-silver-dark mt-0.5">Set your own feeding window</p>
            </button>

            {showCustom && !isFasting && (
              <div className="mt-3 p-4 rounded-kairos-sm border border-kairos-border bg-kairos-card-hover/50">
                <div className="flex items-end gap-4">
                  <div className="flex-1">
                    <label className="text-xs font-heading font-semibold text-kairos-silver-dark block mb-1">
                      Feeding Start
                    </label>
                    <select
                      value={customFeedStart}
                      onChange={(e) => setCustomFeedStart(Number(e.target.value))}
                      className="w-full bg-kairos-royal-dark border border-kairos-border rounded-kairos-sm px-3 py-2 text-sm font-body text-white focus:outline-none focus:border-kairos-gold"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {formatHour(i)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="text-xs font-heading font-semibold text-kairos-silver-dark block mb-1">
                      Feeding End
                    </label>
                    <select
                      value={customFeedEnd}
                      onChange={(e) => setCustomFeedEnd(Number(e.target.value))}
                      className="w-full bg-kairos-royal-dark border border-kairos-border rounded-kairos-sm px-3 py-2 text-sm font-body text-white focus:outline-none focus:border-kairos-gold"
                    >
                      {Array.from({ length: 24 }, (_, i) => (
                        <option key={i} value={i}>
                          {formatHour(i)}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    onClick={handleSetCustomProtocol}
                    disabled={customFeedEnd <= customFeedStart || setProtocolMutation.isPending}
                    className="kairos-btn-gold px-4 py-2 text-sm disabled:opacity-50"
                  >
                    {setProtocolMutation.isPending ? "Saving..." : "Save"}
                  </button>
                </div>
                {customFeedEnd > customFeedStart && (
                  <p className="text-xs font-body text-kairos-silver-dark mt-2">
                    {24 - (customFeedEnd - customFeedStart)}h fast / {customFeedEnd - customFeedStart}h feeding window (
                    {formatHour(customFeedStart)} - {formatHour(customFeedEnd)})
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          ACTIVE FAST TIMER  /  PRE-FAST CHECKLIST
         ═══════════════════════════════════════════════════════════════════ */}
      {isFasting ? (
        /* ── Active Fast Timer ─────────────────────────────────────────── */
        <div className="kairos-card flex flex-col items-center py-8">
          <h3 className="font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <Flame size={16} className="text-kairos-gold" /> Active Fast
          </h3>
          <p className="text-xs font-body text-kairos-silver-dark mb-6">
            Started {activeFast?.startedAt ? new Date(activeFast.startedAt).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" }) : ""}
          </p>

          {/* Circular Timer */}
          <div className="relative" style={{ width: ringSize, height: ringSize }}>
            <svg width={ringSize} height={ringSize} className="transform -rotate-90">
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke="rgba(30,42,90,0.5)"
                strokeWidth={strokeWidth}
              />
              <circle
                cx={ringSize / 2}
                cy={ringSize / 2}
                r={radius}
                fill="none"
                stroke={isPastTarget ? "#22c55e" : currentZone.color}
                strokeWidth={strokeWidth}
                strokeLinecap="round"
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
                className="transition-all duration-1000"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-4xl font-heading font-bold text-white tracking-tight">
                {String(hoursDisplay).padStart(2, "0")}:{String(minutesDisplay).padStart(2, "0")}
              </span>
              <span className="text-xs font-body text-kairos-silver-dark mt-1">
                of {targetHours}h goal
              </span>
              {isPastTarget && (
                <span className="text-[10px] font-heading font-bold text-green-400 mt-1 flex items-center gap-1">
                  <Trophy size={10} /> TARGET REACHED
                </span>
              )}
            </div>
          </div>

          {/* Current Zone */}
          <div className="mt-5 text-center">
            <span
              className="text-xs font-heading font-bold px-3 py-1 rounded-full"
              style={{ backgroundColor: `${currentZone.color}20`, color: currentZone.color }}
            >
              {currentZone.name}
            </span>
            <p className="text-xs font-body text-kairos-silver-dark mt-2">{currentZone.description}</p>
            {remainingHours > 0 && (
              <p className="text-xs font-body text-kairos-silver-dark mt-1">
                {Math.floor(remainingHours)}h {Math.round((remainingHours % 1) * 60)}m remaining to target
              </p>
            )}
          </div>

          {/* Zone Progress Bar */}
          <div className="w-full mt-6 px-2">
            <div className="relative h-3 rounded-full overflow-hidden bg-kairos-royal-dark/60 flex">
              {fastingZones
                .filter((z) => z.start < maxZoneHour)
                .map((zone) => {
                  const zoneEnd = Math.min(zone.end, maxZoneHour);
                  const widthPct = ((zoneEnd - zone.start) / maxZoneHour) * 100;
                  const isFilled = elapsedHours >= zoneEnd;
                  const isPartial = elapsedHours >= zone.start && elapsedHours < zoneEnd;
                  const fillPct = isPartial ? ((elapsedHours - zone.start) / (zoneEnd - zone.start)) * 100 : 0;
                  return (
                    <div
                      key={zone.name}
                      className="relative h-full"
                      style={{ width: `${widthPct}%` }}
                    >
                      <div
                        className="absolute inset-0 opacity-20"
                        style={{ backgroundColor: zone.color }}
                      />
                      {(isFilled || isPartial) && (
                        <div
                          className="absolute inset-y-0 left-0 transition-all duration-1000"
                          style={{
                            width: isFilled ? "100%" : `${fillPct}%`,
                            backgroundColor: zone.color,
                            opacity: 0.8,
                          }}
                        />
                      )}
                    </div>
                  );
                })}
            </div>
            <div className="flex justify-between mt-1">
              {fastingZones
                .filter((z) => z.start < maxZoneHour)
                .map((zone) => (
                  <span key={zone.name} className="text-[9px] font-body text-kairos-silver-dark">
                    {zone.start}h
                  </span>
                ))}
              <span className="text-[9px] font-body text-kairos-silver-dark">{maxZoneHour}h</span>
            </div>
          </div>

          {/* Re-feed guidance for extended fasts */}
          {isExtendedFast && isPastTarget && (
            <div className="w-full mt-6 p-4 rounded-kairos-sm border border-green-500/30 bg-green-500/5">
              <h4 className="font-heading font-semibold text-green-400 text-sm mb-2 flex items-center gap-2">
                <UtensilsCrossed size={14} /> Re-Feed Guidance
              </h4>
              <ul className="text-xs font-body text-kairos-silver-dark space-y-1">
                <li>- Start with bone broth or diluted apple cider vinegar</li>
                <li>- Wait 30 minutes, then eat a small portion of easily digestible food</li>
                <li>- Avoid high-carb and high-sugar foods for the first meal</li>
                <li>- Gradually increase portion size over the next 2-4 hours</li>
              </ul>
            </div>
          )}

          {/* End Fast Button */}
          <div className="mt-6">
            {!showEndConfirm ? (
              <button
                onClick={() => setShowEndConfirm(true)}
                className="kairos-btn-outline flex items-center gap-2 px-8 py-3 border-red-400 text-red-400 hover:bg-red-400/10"
              >
                <Square size={18} /> End Fast
              </button>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <p className="text-sm font-body text-kairos-silver-dark">
                  {isPastTarget
                    ? "You reached your target! Mark as completed?"
                    : "You haven't reached your target yet. End fast early?"}
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => handleEndFast(isPastTarget)}
                    disabled={endFastMutation.isPending}
                    className={`flex items-center gap-2 px-5 py-2 rounded-kairos-sm text-sm font-heading font-semibold transition-colors ${
                      isPastTarget
                        ? "bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
                        : "bg-red-500/20 text-red-400 hover:bg-red-500/30 border border-red-500/30"
                    }`}
                  >
                    {endFastMutation.isPending
                      ? "Saving..."
                      : isPastTarget
                        ? "Complete Fast"
                        : "End Early (Broken)"}
                  </button>
                  <button
                    onClick={() => setShowEndConfirm(false)}
                    className="px-5 py-2 rounded-kairos-sm text-sm font-heading font-semibold text-kairos-silver-dark hover:text-white border border-kairos-border hover:border-kairos-silver-dark/40 transition-colors"
                  >
                    Keep Going
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── Pre-Fast Checklist ────────────────────────────────────────── */
        <div className="kairos-card">
          <h3 className="font-heading font-semibold text-white mb-1 flex items-center gap-2">
            <Play size={16} className="text-kairos-gold" /> Pre-Fast Checklist
          </h3>
          <p className="text-xs font-body text-kairos-silver-dark mb-4">
            Complete the required items before starting your {targetHours}h fast
          </p>

          <div className="space-y-2 mb-6">
            {visibleChecklist.map((item) => {
              const isChecked = checkedItems.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheckItem(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-kairos-sm border transition-all text-left ${
                    isChecked
                      ? "border-green-500/30 bg-green-500/5"
                      : "border-kairos-border hover:border-kairos-silver-dark/40 bg-kairos-card-hover/30 hover:bg-kairos-card-hover/60"
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 transition-colors ${
                      isChecked ? "border-green-500 bg-green-500" : "border-kairos-silver-dark/40"
                    }`}
                  >
                    {isChecked && <Check size={12} className="text-white" />}
                  </div>
                  <span className={`text-kairos-silver-dark ${isChecked ? "text-green-400" : ""}`}>
                    {item.icon}
                  </span>
                  <span
                    className={`text-sm font-body flex-1 ${
                      isChecked ? "text-green-400" : "text-kairos-silver"
                    }`}
                  >
                    {item.label}
                  </span>
                  {item.required && !isChecked && (
                    <span className="text-[9px] font-heading font-bold text-kairos-gold uppercase">Required</span>
                  )}
                  {item.extendedOnly && (
                    <span className="text-[9px] font-heading font-bold text-cyan-400 uppercase">Extended</span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="flex justify-center">
            <button
              onClick={handleStartFast}
              disabled={!requiredChecked || startFastMutation.isPending}
              className="kairos-btn-gold flex items-center gap-2 px-8 py-3 disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {startFastMutation.isPending ? (
                "Starting..."
              ) : (
                <>
                  <Play size={18} /> Begin Fast
                </>
              )}
            </button>
          </div>
          {!requiredChecked && (
            <p className="text-center text-[10px] font-body text-kairos-silver-dark mt-2">
              Complete all required checklist items to begin
            </p>
          )}
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════
          METABOLIC ZONES REFERENCE
         ═══════════════════════════════════════════════════════════════════ */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4 flex items-center gap-2">
          <Zap size={16} className="text-kairos-gold" /> Metabolic Zones
        </h3>
        <div className="space-y-2">
          {fastingZones.map((zone) => {
            const isActive = isFasting && elapsedHours >= zone.start && elapsedHours < zone.end;
            const isPast = isFasting && elapsedHours >= zone.end;
            return (
              <div
                key={zone.name}
                className={`flex items-center gap-3 px-3 py-2 rounded-kairos-sm transition-colors ${
                  isActive ? "bg-kairos-card-hover border border-kairos-gold/20" : ""
                }`}
              >
                <div
                  className="w-3 h-3 rounded-full flex-shrink-0"
                  style={{ backgroundColor: zone.color, opacity: isPast ? 0.4 : 1 }}
                />
                <div className="flex-1">
                  <p
                    className={`text-sm font-heading font-semibold ${
                      isActive ? "text-white" : isPast ? "text-kairos-silver-dark" : "text-kairos-silver"
                    }`}
                  >
                    {zone.name}
                  </p>
                  <p className="text-[10px] font-body text-kairos-silver-dark">
                    {zone.start}–{zone.end}h &middot; {zone.description}
                  </p>
                </div>
                {isPast && (
                  <span className="text-green-400">
                    <Zap size={14} />
                  </span>
                )}
                {isActive && (
                  <span className="text-kairos-gold text-[10px] font-heading font-bold">NOW</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════
          STATS + HISTORY SECTION
         ═══════════════════════════════════════════════════════════════════ */}
      <DateRangeNavigator
        availablePeriods={["week", "month", "year"]}
        selectedPeriod={period}
        onPeriodChange={setPeriod}
        formattedRange={formattedRange}
        isCurrent={isCurrent}
        canForward={canForward}
        onBack={goBack}
        onForward={goForward}
        onToday={goToToday}
      />

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="kairos-card text-center">
          <div className="flex items-center justify-center mb-2">
            <BarChart3 size={16} className="text-kairos-gold" />
          </div>
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Total Fasts</p>
          <p className="text-2xl font-heading font-bold text-white">
            {stats?.totalFasts ?? 0}
          </p>
        </div>
        <div className="kairos-card text-center">
          <div className="flex items-center justify-center mb-2">
            <Trophy size={16} className="text-green-400" />
          </div>
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Completed</p>
          <p className="text-2xl font-heading font-bold text-green-400">
            {stats?.completedFasts ?? 0}
          </p>
        </div>
        <div className="kairos-card text-center">
          <div className="flex items-center justify-center mb-2">
            <Award size={16} className="text-kairos-gold" />
          </div>
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Completion Rate</p>
          <p className="text-2xl font-heading font-bold text-kairos-gold">
            {stats?.completionRate ?? 0}%
          </p>
        </div>
        <div className="kairos-card text-center">
          <div className="flex items-center justify-center mb-2">
            <Clock size={16} className="text-cyan-400" />
          </div>
          <p className="text-xs font-body text-kairos-silver-dark mb-1">Avg Duration</p>
          <p className="text-2xl font-heading font-bold text-cyan-400">
            {stats?.avgDurationMinutes ? formatDuration(stats.avgDurationMinutes) : "--"}
          </p>
        </div>
      </div>

      {/* Fasting History */}
      <div className="kairos-card">
        <h3 className="font-heading font-semibold text-white mb-4 flex items-center gap-2">
          <Clock size={16} className="text-kairos-gold" /> Fasting History
        </h3>

        {logsQuery.isLoading ? (
          <div className="text-center py-8">
            <p className="text-sm font-body text-kairos-silver-dark">Loading history...</p>
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-sm font-body text-kairos-silver-dark">No fasting records for this period</p>
          </div>
        ) : (
          <div className="space-y-3">
            {logs.map((fast) => {
              const startDate = fast.startedAt ? new Date(fast.startedAt) : null;
              const endDate = fast.endedAt ? new Date(fast.endedAt) : null;
              let durationMin = 0;
              if (startDate && endDate) {
                durationMin = (endDate.getTime() - startDate.getTime()) / (1000 * 60);
              }
              const durationHrs = (durationMin / 60).toFixed(1);

              return (
                <div key={fast.id} className="flex items-center gap-3 py-2 border-b border-kairos-border/30 last:border-0">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                      fast.completed ? "bg-green-500/20" : "bg-red-500/20"
                    }`}
                  >
                    {fast.completed ? (
                      <Trophy size={14} className="text-green-400" />
                    ) : (
                      <Flame size={14} className="text-red-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-heading font-semibold text-white">
                      {durationMin > 0 ? `${durationHrs}h fast` : "In progress"}
                    </p>
                    <p className="text-xs font-body text-kairos-silver-dark">
                      {startDate
                        ? startDate.toLocaleDateString("en-US", {
                            weekday: "short",
                            month: "short",
                            day: "numeric",
                          })
                        : fast.date}
                      {startDate &&
                        ` at ${startDate.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`}
                    </p>
                  </div>
                  <span
                    className={`text-[10px] font-heading font-bold flex-shrink-0 ${
                      fast.completed ? "text-green-400" : fast.endedAt ? "text-red-400" : "text-kairos-gold"
                    }`}
                  >
                    {fast.completed ? "Completed" : fast.endedAt ? "Broken" : "Active"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
