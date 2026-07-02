"use client";

import { useState, useEffect, useCallback } from "react";
import { Clock, Plus, Trash2, Save, CalendarOff, Check } from "lucide-react";
import { trpc } from "@/lib/trpc";

// ─── Types ───────────────────────────────────────────────────────

interface TimeSlot {
  start: string;
  end: string;
}

interface DaySchedule {
  dayOfWeek: number;
  enabled: boolean;
  slots: TimeSlot[];
}

const DAY_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_ABBREVIATIONS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const DEFAULT_SCHEDULE: DaySchedule[] = Array.from({ length: 7 }, (_, i) => ({
  dayOfWeek: i,
  enabled: i >= 1 && i <= 5, // Mon–Fri enabled by default
  slots: i >= 1 && i <= 5 ? [{ start: "09:00", end: "17:00" }] : [],
}));

// ─── Component ───────────────────────────────────────────────────

export function AvailabilityEditor() {
  const utils = trpc.useUtils();

  // Fetch existing availability
  const { data: existing, isLoading } = trpc.coach.schedule.getAvailability.useQuery();
  const updateMutation = trpc.coach.schedule.updateAvailability.useMutation({
    onSuccess: () => {
      void utils.coach.schedule.getAvailability.invalidate();
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    },
  });

  const [schedule, setSchedule] = useState<DaySchedule[]>(DEFAULT_SCHEDULE);
  const [bufferMinutes, setBufferMinutes] = useState(15);
  const [blockedDates, setBlockedDates] = useState<string[]>([]);
  const [newBlockedDate, setNewBlockedDate] = useState("");
  const [saved, setSaved] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Initialize from existing data
  useEffect(() => {
    if (existing) {
      const ws = existing.weeklySchedule as DaySchedule[] | undefined;
      if (ws && ws.length > 0) {
        // Merge with defaults to ensure all 7 days exist
        const merged = DEFAULT_SCHEDULE.map((def) => {
          const found = ws.find((d) => d.dayOfWeek === def.dayOfWeek);
          return found ?? def;
        });
        setSchedule(merged);
      }
      setBufferMinutes(existing.bufferMinutes ?? 15);
      setBlockedDates((existing.blockedDates as string[]) ?? []);
    }
  }, [existing]);

  // Track changes
  const markChanged = useCallback(() => {
    setHasChanges(true);
    setSaved(false);
  }, []);

  // ── Day toggle ──
  function toggleDay(dayOfWeek: number) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const enabled = !d.enabled;
        return {
          ...d,
          enabled,
          slots: enabled && d.slots.length === 0 ? [{ start: "09:00", end: "17:00" }] : d.slots,
        };
      })
    );
    markChanged();
  }

  // ── Slot management ──
  function updateSlot(dayOfWeek: number, slotIdx: number, field: "start" | "end", value: string) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const newSlots = d.slots.map((s, i) => (i === slotIdx ? { ...s, [field]: value } : s));
        return { ...d, slots: newSlots };
      })
    );
    markChanged();
  }

  function addSlot(dayOfWeek: number) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        const lastSlot = d.slots[d.slots.length - 1];
        const newStart = lastSlot ? lastSlot.end : "09:00";
        // Default new slot: 2 hours after previous end
        const startHour = parseInt(newStart.split(":")[0]);
        const endHour = Math.min(startHour + 2, 23);
        return { ...d, slots: [...d.slots, { start: newStart, end: `${String(endHour).padStart(2, "0")}:00` }] };
      })
    );
    markChanged();
  }

  function removeSlot(dayOfWeek: number, slotIdx: number) {
    setSchedule((prev) =>
      prev.map((d) => {
        if (d.dayOfWeek !== dayOfWeek) return d;
        return { ...d, slots: d.slots.filter((_, i) => i !== slotIdx) };
      })
    );
    markChanged();
  }

  // ── Blocked dates ──
  function addBlockedDate() {
    if (newBlockedDate && !blockedDates.includes(newBlockedDate)) {
      setBlockedDates((prev) => [...prev, newBlockedDate].sort());
      setNewBlockedDate("");
      markChanged();
    }
  }

  function removeBlockedDate(date: string) {
    setBlockedDates((prev) => prev.filter((d) => d !== date));
    markChanged();
  }

  // ── Save ──
  function handleSave() {
    updateMutation.mutate({
      weeklySchedule: schedule,
      bufferMinutes,
      blockedDates,
    });
    setHasChanges(false);
  }

  if (isLoading) {
    return (
      <div className="kairos-card p-12 text-center">
        <div className="animate-spin w-6 h-6 border-2 border-kairos-gold border-t-transparent rounded-full mx-auto" />
        <p className="text-kairos-silver-dark mt-3 text-sm">Loading availability...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Weekly Schedule */}
      <div className="kairos-card p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Clock className="w-5 h-5 text-kairos-gold" />
            <h3 className="font-heading font-bold text-lg text-white">Weekly Hours</h3>
          </div>
          <div className="flex items-center gap-3">
            {saved && (
              <span className="flex items-center gap-1 text-green-400 text-sm animate-fade-in">
                <Check size={14} /> Saved
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={!hasChanges || updateMutation.isPending}
              className="kairos-btn-gold gap-2 flex items-center text-sm disabled:opacity-50"
            >
              <Save size={14} />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          {schedule.map((day) => (
            <div
              key={day.dayOfWeek}
              className={`border rounded-xl p-4 transition-colors ${
                day.enabled
                  ? "border-kairos-border bg-kairos-card-hover/30"
                  : "border-kairos-border/40 bg-transparent opacity-60"
              }`}
            >
              <div className="flex items-center justify-between">
                {/* Day toggle */}
                <div className="flex items-center gap-3 min-w-[120px]">
                  <button
                    onClick={() => toggleDay(day.dayOfWeek)}
                    className={`relative w-10 h-5 rounded-full transition-colors ${
                      day.enabled ? "bg-kairos-gold" : "bg-gray-600"
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
                        day.enabled ? "left-5.5 translate-x-0.5" : "left-0.5"
                      }`}
                    />
                  </button>
                  <span className="font-heading font-semibold text-sm text-white hidden md:inline">
                    {DAY_NAMES[day.dayOfWeek]}
                  </span>
                  <span className="font-heading font-semibold text-sm text-white md:hidden">
                    {DAY_ABBREVIATIONS[day.dayOfWeek]}
                  </span>
                </div>

                {/* Time slots */}
                {day.enabled && (
                  <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                    {day.slots.map((slot, idx) => (
                      <div key={idx} className="flex items-center gap-1">
                        <input
                          type="time"
                          value={slot.start}
                          onChange={(e) => updateSlot(day.dayOfWeek, idx, "start", e.target.value)}
                          className="bg-kairos-royal-surface border border-kairos-border rounded-lg px-2 py-1 text-sm text-white focus:border-kairos-gold outline-none w-[110px]"
                        />
                        <span className="text-kairos-silver-dark text-xs">to</span>
                        <input
                          type="time"
                          value={slot.end}
                          onChange={(e) => updateSlot(day.dayOfWeek, idx, "end", e.target.value)}
                          className="bg-kairos-royal-surface border border-kairos-border rounded-lg px-2 py-1 text-sm text-white focus:border-kairos-gold outline-none w-[110px]"
                        />
                        {day.slots.length > 1 && (
                          <button
                            onClick={() => removeSlot(day.dayOfWeek, idx)}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors"
                            title="Remove time slot"
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      onClick={() => addSlot(day.dayOfWeek)}
                      className="p-1.5 text-kairos-gold hover:bg-kairos-gold/10 rounded-lg transition-colors"
                      title="Add another time window"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}

                {!day.enabled && (
                  <span className="text-sm text-gray-500 italic">Unavailable</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Buffer Time */}
      <div className="kairos-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <Clock className="w-5 h-5 text-kairos-gold" />
          <h3 className="font-heading font-bold text-lg text-white">Buffer Between Sessions</h3>
        </div>
        <p className="text-sm text-kairos-silver-dark mb-4">
          Minimum gap between back-to-back appointments.
        </p>
        <div className="flex items-center gap-3">
          <select
            value={bufferMinutes}
            onChange={(e) => {
              setBufferMinutes(Number(e.target.value));
              markChanged();
            }}
            className="kairos-input w-40"
          >
            <option value={0}>No buffer</option>
            <option value={5}>5 minutes</option>
            <option value={10}>10 minutes</option>
            <option value={15}>15 minutes</option>
            <option value={20}>20 minutes</option>
            <option value={30}>30 minutes</option>
            <option value={45}>45 minutes</option>
            <option value={60}>1 hour</option>
          </select>
        </div>
      </div>

      {/* Blocked Dates */}
      <div className="kairos-card p-6">
        <div className="flex items-center gap-3 mb-4">
          <CalendarOff className="w-5 h-5 text-kairos-gold" />
          <h3 className="font-heading font-bold text-lg text-white">Blocked Dates</h3>
        </div>
        <p className="text-sm text-kairos-silver-dark mb-4">
          Mark specific dates as unavailable (vacations, holidays, personal days).
        </p>

        <div className="flex items-center gap-3 mb-4">
          <input
            type="date"
            value={newBlockedDate}
            onChange={(e) => setNewBlockedDate(e.target.value)}
            className="kairos-input w-48"
            min={new Date().toISOString().split("T")[0]}
          />
          <button
            onClick={addBlockedDate}
            disabled={!newBlockedDate}
            className="kairos-btn-outline gap-1 flex items-center text-sm disabled:opacity-50"
          >
            <Plus size={14} /> Block Date
          </button>
        </div>

        {blockedDates.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {blockedDates.map((date) => {
              const d = new Date(date + "T12:00:00");
              const label = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
              const isPast = date < new Date().toISOString().split("T")[0];
              return (
                <span
                  key={date}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm border ${
                    isPast
                      ? "border-gray-700 text-gray-500 bg-gray-800/30"
                      : "border-red-500/30 text-red-300 bg-red-500/10"
                  }`}
                >
                  {label}
                  <button
                    onClick={() => removeBlockedDate(date)}
                    className="hover:text-white transition-colors"
                  >
                    <Trash2 size={12} />
                  </button>
                </span>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-gray-500 italic">No dates blocked</p>
        )}
      </div>

      {/* Save button (bottom) */}
      {hasChanges && (
        <div className="sticky bottom-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={updateMutation.isPending}
            className="kairos-btn-gold gap-2 flex items-center shadow-lg shadow-kairos-gold/20 disabled:opacity-50"
          >
            <Save size={16} />
            {updateMutation.isPending ? "Saving..." : "Save All Changes"}
          </button>
        </div>
      )}
    </div>
  );
}
