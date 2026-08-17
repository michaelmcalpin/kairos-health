"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { Search, Dumbbell } from "lucide-react";
import { searchExercises, type ExerciseDef, type MuscleGroup } from "@/lib/fitness/exercises";

interface ExercisePickerProps {
  /** Current exercise name (controlled). */
  value: string;
  /**
   * Called when the coach types a custom name (group undefined) or selects a
   * suggestion (group provided).
   */
  onChange: (name: string, group?: string) => void;
  placeholder?: string;
  /** Extra classes to tune width/sizing of the input wrapper. */
  className?: string;
}

/** Group a flat list of exercise defs into ordered [group, names[]] buckets. */
function groupResults(results: ExerciseDef[]): { group: MuscleGroup; items: ExerciseDef[] }[] {
  const buckets: { group: MuscleGroup; items: ExerciseDef[] }[] = [];
  const index = new Map<MuscleGroup, ExerciseDef[]>();
  for (const ex of results) {
    let arr = index.get(ex.group);
    if (!arr) {
      arr = [];
      index.set(ex.group, arr);
      buckets.push({ group: ex.group, items: arr });
    }
    arr.push(ex);
  }
  return buckets;
}

export function ExercisePicker({
  value,
  onChange,
  placeholder = "Exercise",
  className = "",
}: ExercisePickerProps) {
  const [open, setOpen] = useState(false);
  const [activeIdx, setActiveIdx] = useState(-1);
  const wrapRef = useRef<HTMLDivElement>(null);

  const safeValue = value ?? "";

  // Suggestions: filtered by current input. Empty input => full browse list.
  const results = useMemo(() => searchExercises(safeValue), [safeValue]);
  const grouped = useMemo(() => groupResults(results), [results]);

  // Flat, order-preserving list for keyboard navigation.
  const flat = useMemo(() => grouped.flatMap((g) => g.items), [grouped]);

  // Close on outside click.
  useEffect(() => {
    if (!open) return;
    function onDocMouseDown(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) {
        setOpen(false);
        setActiveIdx(-1);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const select = (ex: ExerciseDef) => {
    onChange(ex.name, ex.group);
    setOpen(false);
    setActiveIdx(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") {
      setOpen(false);
      setActiveIdx(-1);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "ArrowUp")) {
      setOpen(true);
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIdx((i) => Math.min(i + 1, flat.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIdx((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (open && activeIdx >= 0 && activeIdx < flat.length) {
        e.preventDefault();
        select(flat[activeIdx]);
      }
    }
  };

  // Running index across groups so hover/active highlighting lines up with `flat`.
  let runningIndex = -1;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        type="text"
        value={safeValue}
        onChange={(e) => {
          onChange(e.target.value);
          setOpen(true);
          setActiveIdx(-1);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        autoComplete="off"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        className="kairos-input w-full py-1 text-xs"
      />

      {open && flat.length > 0 && (
        <div className="absolute z-50 mt-1 w-full max-h-64 overflow-y-auto rounded-kairos-sm border border-kairos-border bg-kairos-card shadow-kairos-lg">
          {grouped.map(({ group, items }) => (
            <div key={group}>
              <div className="sticky top-0 flex items-center gap-1.5 bg-kairos-card px-2.5 py-1 text-[10px] font-heading font-semibold uppercase tracking-wider text-kairos-gold">
                <Dumbbell size={10} />
                {group}
              </div>
              {items.map((ex) => {
                runningIndex += 1;
                const idx = runningIndex;
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={`${group}-${ex.name}`}
                    type="button"
                    // Use onMouseDown so selection fires before the input blur/outside-click.
                    onMouseDown={(e) => {
                      e.preventDefault();
                      select(ex);
                    }}
                    onMouseEnter={() => setActiveIdx(idx)}
                    className={`flex w-full items-center px-3 py-1.5 text-left text-xs transition-colors ${
                      isActive
                        ? "bg-kairos-gold/15 text-white"
                        : "text-kairos-silver hover:bg-kairos-gold/10 hover:text-white"
                    }`}
                  >
                    {ex.name}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}

      {open && flat.length === 0 && safeValue.trim() !== "" && (
        <div className="absolute z-50 mt-1 w-full rounded-kairos-sm border border-kairos-border bg-kairos-card px-3 py-2 text-xs text-kairos-silver-dark shadow-kairos-lg">
          <div className="flex items-center gap-1.5">
            <Search size={11} />
            Use &ldquo;{safeValue.trim()}&rdquo; as a custom exercise
          </div>
        </div>
      )}
    </div>
  );
}

export default ExercisePicker;
