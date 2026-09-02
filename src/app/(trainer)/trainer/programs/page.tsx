"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dumbbell,
  Plus,
  X,
  Trash2,
  Pencil,
  Users,
  Send,
  Calendar,
  Clock,
  Search,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import ExercisePicker from "@/components/coach/ExercisePicker";

// ─── Local builder types ────────────────────────────────────
type ExerciseRow = {
  name: string;
  muscleGroup?: string;
  sets: number;
  reps: string;
  restSeconds?: number;
};

type DayRow = {
  name: string;
  exercises: ExerciseRow[];
};

function emptyExercise(): ExerciseRow {
  return { name: "", muscleGroup: undefined, sets: 3, reps: "8-10", restSeconds: undefined };
}

function emptyDay(): DayRow {
  return { name: "", exercises: [emptyExercise()] };
}

const todayIso = () => new Date().toISOString().slice(0, 10);

// ─── Page ───────────────────────────────────────────────────
export default function TrainingProgramsPage() {
  const utils = trpc.useUtils();

  const { data: templates = [], isLoading } = trpc.coach.plans.listWorkoutTemplates.useQuery(undefined, {
    staleTime: 15_000,
    refetchOnWindowFocus: false,
  });

  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const deleteMutation = trpc.coach.plans.deleteWorkoutTemplate.useMutation({
    onSuccess: () => {
      utils.coach.plans.listWorkoutTemplates.invalidate();
      setConfirmDelete(null);
    },
  });

  const openNew = () => {
    setEditingId(null);
    setBuilderOpen(true);
  };

  const openEdit = (id: string) => {
    setEditingId(id);
    setBuilderOpen(true);
  };

  // ── Loading skeleton ──
  if (isLoading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-heading font-bold text-white mb-1">Training Programs</h1>
            <p className="text-gray-400 text-sm">Build reusable routines and apply them to one or many clients</p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="kairos-card h-40 animate-pulse bg-gray-800/50" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-heading font-bold text-white mb-1">Training Programs</h1>
          <p className="text-gray-400 text-sm">Build reusable routines and apply them to one or many clients</p>
        </div>
        <button
          onClick={openNew}
          className="kairos-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0"
        >
          <Plus size={16} />
          New Program
        </button>
      </div>

      {/* Template Library */}
      {templates.length === 0 ? (
        <div className="kairos-card p-12 text-center">
          <Dumbbell size={48} className="mx-auto mb-4 text-gray-600" />
          <h3 className="font-heading font-semibold text-white mb-2">No programs yet — create your first routine</h3>
          <p className="text-sm text-gray-400 mb-4">
            Programs are reusable exercise templates you can apply to any of your clients in a couple of clicks.
          </p>
          <button
            onClick={openNew}
            className="kairos-btn px-6 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus size={16} />
            Create Your First Program
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="kairos-card p-5 border border-kairos-border hover:border-kairos-gold/40 transition-colors flex flex-col"
            >
              <div className="flex items-start gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-kairos-gold/15 border border-kairos-gold/30 flex items-center justify-center shrink-0">
                  <Dumbbell size={18} className="text-kairos-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-heading font-semibold text-white truncate">{tpl.name}</h3>
                  {tpl.description ? (
                    <p className="text-xs text-kairos-silver-dark line-clamp-2 mt-0.5">{tpl.description}</p>
                  ) : (
                    <p className="text-xs text-gray-600 italic mt-0.5">No description</p>
                  )}
                </div>
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 mb-3">
                {tpl.durationWeeks != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-gray-800 border border-gray-700 text-kairos-silver">
                    <Clock size={11} /> {tpl.durationWeeks} wk{tpl.durationWeeks === 1 ? "" : "s"}
                  </span>
                )}
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-gray-800 border border-gray-700 text-kairos-silver">
                  <Calendar size={11} /> {tpl.sessionCount} day{tpl.sessionCount === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-gray-800 border border-gray-700 text-kairos-silver">
                  <Dumbbell size={11} /> {tpl.exerciseCount} exercise{tpl.exerciseCount === 1 ? "" : "s"}
                </span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] text-kairos-silver-dark mb-4">
                <Users size={12} className="text-kairos-gold" />
                Assigned to {tpl.assignedClientCount} client{tpl.assignedClientCount === 1 ? "" : "s"}
              </div>

              {/* Actions */}
              <div className="mt-auto flex items-center gap-2">
                <button
                  onClick={() => setApplyTarget({ id: tpl.id, name: tpl.name })}
                  className="kairos-btn flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                >
                  <Send size={13} />
                  Apply
                </button>
                <button
                  onClick={() => openEdit(tpl.id)}
                  className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors"
                  title="Edit program"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: tpl.id, name: tpl.name })}
                  className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-kairos-silver hover:text-red-400 hover:border-red-500/40 transition-colors"
                  title="Delete program"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Builder Modal */}
      {builderOpen && (
        <ProgramBuilderModal
          programId={editingId}
          onClose={() => setBuilderOpen(false)}
          onSaved={() => {
            utils.coach.plans.listWorkoutTemplates.invalidate();
            setBuilderOpen(false);
          }}
        />
      )}

      {/* Apply Modal */}
      {applyTarget && (
        <ApplyModal
          program={applyTarget}
          onClose={() => setApplyTarget(null)}
          onApplied={() => utils.coach.plans.listWorkoutTemplates.invalidate()}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm mx-4 kairos-card border border-gray-700 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <h2 className="text-lg font-heading font-bold text-white">Delete program?</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              &ldquo;{confirmDelete.name}&rdquo; will be permanently removed. Clients already assigned this program keep their copy.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ programId: confirmDelete.id })}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-red-500/90 hover:bg-red-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {deleteMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Builder Modal (New + Edit) ─────────────────────────────
function ProgramBuilderModal({
  programId,
  onClose,
  onSaved,
}: {
  programId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const isEdit = programId != null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [durationWeeks, setDurationWeeks] = useState("");
  const [days, setDays] = useState<DayRow[]>([emptyDay()]);
  const [error, setError] = useState<string | null>(null);

  // Prefill for edit
  const { data: existing, isLoading: isLoadingExisting } = trpc.coach.plans.getWorkoutTemplate.useQuery(
    { programId: programId ?? "" },
    { enabled: isEdit, refetchOnWindowFocus: false },
  );

  useEffect(() => {
    if (!existing) return;
    setName(existing.name ?? "");
    setDescription(existing.description ?? "");
    setDurationWeeks(existing.durationWeeks != null ? String(existing.durationWeeks) : "");
    const mapped: DayRow[] = (existing.sessions ?? []).map((s) => ({
      name: s.name ?? "",
      exercises:
        s.exercises.length > 0
          ? s.exercises.map((raw) => {
              // The stored jsonb type is narrower than the runtime shape, which
              // also carries name/muscleGroup written by createWorkoutTemplate.
              const e = raw as {
                name?: string;
                muscleGroup?: string;
                sets?: number;
                reps?: string;
                restSeconds?: number;
              };
              return {
                name: e.name ?? "",
                muscleGroup: e.muscleGroup ?? undefined,
                sets: e.sets ?? 3,
                reps: e.reps ?? "",
                restSeconds: e.restSeconds ?? undefined,
              };
            })
          : [emptyExercise()],
    }));
    setDays(mapped.length > 0 ? mapped : [emptyDay()]);
  }, [existing]);

  const createMutation = trpc.coach.plans.createWorkoutTemplate.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });
  const updateMutation = trpc.coach.plans.updateWorkoutTemplate.useMutation({
    onSuccess: onSaved,
    onError: (e) => setError(e.message),
  });
  const isSaving = createMutation.isPending || updateMutation.isPending;

  // ── Day/exercise mutators ──
  const addDay = () => setDays((d) => [...d, emptyDay()]);
  const removeDay = (di: number) => setDays((d) => d.filter((_, i) => i !== di));
  const setDayName = (di: number, val: string) =>
    setDays((d) => d.map((day, i) => (i === di ? { ...day, name: val } : day)));

  const addExercise = (di: number) =>
    setDays((d) => d.map((day, i) => (i === di ? { ...day, exercises: [...day.exercises, emptyExercise()] } : day)));
  const removeExercise = (di: number, ei: number) =>
    setDays((d) =>
      d.map((day, i) => (i === di ? { ...day, exercises: day.exercises.filter((_, j) => j !== ei) } : day)),
    );
  const updateExercise = (di: number, ei: number, patch: Partial<ExerciseRow>) =>
    setDays((d) =>
      d.map((day, i) =>
        i === di
          ? { ...day, exercises: day.exercises.map((ex, j) => (j === ei ? { ...ex, ...patch } : ex)) }
          : day,
      ),
    );

  const handleSave = () => {
    setError(null);
    if (!name.trim()) {
      setError("Program name is required.");
      return;
    }
    // Build sessions: only keep exercises that have a name.
    const sessions = days
      .map((day) => ({
        name: day.name.trim() || undefined,
        exercises: day.exercises
          .filter((ex) => ex.name.trim())
          .map((ex) => ({
            name: ex.name.trim(),
            muscleGroup: ex.muscleGroup || undefined,
            sets: Number.isFinite(ex.sets) && ex.sets > 0 ? ex.sets : 1,
            reps: ex.reps.trim() || "1",
            restSeconds: ex.restSeconds != null && Number.isFinite(ex.restSeconds) ? ex.restSeconds : undefined,
          })),
      }))
      .filter((s) => s.exercises.length > 0);

    if (sessions.length === 0) {
      setError("Add at least one exercise to a day.");
      return;
    }

    const durationVal = durationWeeks.trim() ? Number(durationWeeks) : undefined;
    const durationClean = durationVal != null && Number.isFinite(durationVal) && durationVal > 0 ? durationVal : undefined;

    if (isEdit && programId) {
      updateMutation.mutate({
        programId,
        name: name.trim(),
        description: description.trim() || undefined,
        durationWeeks: durationClean,
        sessions,
      });
    } else {
      createMutation.mutate({
        name: name.trim(),
        description: description.trim() || undefined,
        durationWeeks: durationClean,
        sessions,
      });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-2xl kairos-card border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 shrink-0">
          <h2 className="text-lg font-heading font-bold text-white">{isEdit ? "Edit Program" : "New Program"}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {isEdit && isLoadingExisting ? (
          <div className="p-10 flex flex-col items-center justify-center gap-3">
            <Loader2 size={24} className="animate-spin text-kairos-gold" />
            <p className="text-sm text-gray-400">Loading program…</p>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="p-6 space-y-5 overflow-y-auto">
              {error && (
                <div className="px-4 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Details */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Program Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Foundational Strength — Phase 1"
                    className="kairos-input w-full"
                    autoFocus
                  />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs text-gray-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Short summary of goals / focus"
                      className="kairos-input w-full"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">Duration (weeks)</label>
                    <input
                      type="number"
                      min={1}
                      value={durationWeeks}
                      onChange={(e) => setDurationWeeks(e.target.value)}
                      placeholder="8"
                      className="kairos-input w-full"
                    />
                  </div>
                </div>
              </div>

              {/* Sessions builder */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-heading font-semibold text-white">Sessions</h3>
                  <button
                    onClick={addDay}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold hover:bg-kairos-gold/25 transition-colors"
                  >
                    <Plus size={13} /> Add Day
                  </button>
                </div>

                {days.map((day, di) => (
                  <div key={di} className="rounded-xl border border-gray-700 bg-gray-800/40 p-3 space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-kairos-gold/15 border border-kairos-gold/30 text-kairos-gold text-xs font-bold shrink-0">
                        {di + 1}
                      </span>
                      <input
                        type="text"
                        value={day.name}
                        onChange={(e) => setDayName(di, e.target.value)}
                        placeholder={`Day ${di + 1} name (optional, e.g. Upper Body)`}
                        className="kairos-input flex-1 py-1.5 text-sm"
                      />
                      {days.length > 1 && (
                        <button
                          onClick={() => removeDay(di)}
                          className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition-colors shrink-0"
                          title="Remove day"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>

                    {/* Exercise rows */}
                    <div className="space-y-2">
                      {day.exercises.map((ex, ei) => (
                        <div key={ei} className="flex items-start gap-2">
                          <div className="flex-1 min-w-0">
                            <ExercisePicker
                              value={ex.name}
                              onChange={(nm, group) => updateExercise(di, ei, { name: nm, muscleGroup: group })}
                              placeholder="Exercise name"
                            />
                            {ex.muscleGroup && (
                              <span className="mt-1 inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-medium bg-kairos-gold/10 border border-kairos-gold/30 text-kairos-gold">
                                {ex.muscleGroup}
                              </span>
                            )}
                          </div>
                          <input
                            type="number"
                            min={1}
                            value={ex.sets}
                            onChange={(e) => updateExercise(di, ei, { sets: Number(e.target.value) })}
                            placeholder="Sets"
                            title="Sets"
                            className="kairos-input w-14 py-1 text-xs text-center shrink-0"
                          />
                          <input
                            type="text"
                            value={ex.reps}
                            onChange={(e) => updateExercise(di, ei, { reps: e.target.value })}
                            placeholder="Reps"
                            title="Reps (e.g. 8-10)"
                            className="kairos-input w-16 py-1 text-xs text-center shrink-0"
                          />
                          <input
                            type="number"
                            min={0}
                            value={ex.restSeconds ?? ""}
                            onChange={(e) =>
                              updateExercise(di, ei, {
                                restSeconds: e.target.value === "" ? undefined : Number(e.target.value),
                              })
                            }
                            placeholder="Rest"
                            title="Rest (seconds)"
                            className="kairos-input w-16 py-1 text-xs text-center shrink-0"
                          />
                          <button
                            onClick={() => removeExercise(di, ei)}
                            disabled={day.exercises.length === 1}
                            className="p-1.5 rounded-lg text-gray-500 hover:text-red-400 transition-colors shrink-0 disabled:opacity-30 disabled:hover:text-gray-500"
                            title="Remove exercise"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <button
                      onClick={() => addExercise(di)}
                      className="inline-flex items-center gap-1.5 text-xs text-kairos-silver-dark hover:text-kairos-gold transition-colors"
                    >
                      <Plus size={12} /> Add exercise
                    </button>
                  </div>
                ))}

                <div className="grid grid-cols-[1fr_auto_auto_auto_auto] gap-2 px-3 text-[10px] uppercase tracking-wider text-gray-600">
                  <span>Exercise</span>
                  <span className="w-14 text-center">Sets</span>
                  <span className="w-16 text-center">Reps</span>
                  <span className="w-16 text-center">Rest s</span>
                  <span className="w-7" />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="kairos-btn px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {isSaving ? <Loader2 size={14} className="animate-spin" /> : <CheckCircle2 size={14} />}
                {isEdit ? "Save Changes" : "Create Program"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Apply Modal ────────────────────────────────────────────
function ApplyModal({
  program,
  onClose,
  onApplied,
}: {
  program: { id: string; name: string };
  onClose: () => void;
  onApplied: () => void;
}) {
  const { data: clientsData, isLoading } = trpc.coach.clients.listAll.useQuery(undefined, { refetchOnWindowFocus: false });
  const clients = clientsData ?? [];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [startDate, setStartDate] = useState(todayIso());
  const [result, setResult] = useState<{ assigned: number; skipped: Array<{ clientId: string; reason: string }> } | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);

  const assignMutation = trpc.coach.plans.assignTemplateToClients.useMutation({
    onSuccess: (res) => {
      setResult(res);
      onApplied();
    },
    onError: (e) => setError(e.message),
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter((c) => (c.name ?? "").toLowerCase().includes(q));
  }, [clients, search]);

  const allFilteredSelected = filtered.length > 0 && filtered.every((c) => selected.has(c.id));

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (allFilteredSelected) filtered.forEach((c) => next.delete(c.id));
      else filtered.forEach((c) => next.add(c.id));
      return next;
    });

  const nameById = useMemo(() => {
    const m = new Map<string, string>();
    clients.forEach((c) => m.set(c.id, c.name ?? "Client"));
    return m;
  }, [clients]);

  const handleApply = () => {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one client.");
      return;
    }
    assignMutation.mutate({
      programId: program.id,
      clientIds: Array.from(selected),
      startDate,
    });
  };

  const reasonLabel = (reason: string) => {
    if (reason === "already_assigned") return "already assigned";
    if (reason === "no_access") return "no access";
    return reason.replace(/_/g, " ");
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-lg kairos-card border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-700/50 shrink-0">
          <div className="min-w-0">
            <h2 className="text-lg font-heading font-bold text-white truncate">Apply Program</h2>
            <p className="text-xs text-kairos-silver-dark truncate">{program.name}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {result ? (
          // ── Result summary ──
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-green-500/10 border border-green-500/30 flex items-center justify-center">
                <CheckCircle2 size={22} className="text-green-400" />
              </div>
              <div>
                <p className="text-white font-heading font-semibold">
                  Assigned to {result.assigned} client{result.assigned === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-gray-400">
                  {program.name} starting {startDate}
                </p>
              </div>
            </div>

            {result.skipped.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-yellow-400 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertCircle size={13} /> Skipped ({result.skipped.length})
                </p>
                <div className="space-y-1.5">
                  {result.skipped.map((s) => (
                    <div
                      key={s.clientId}
                      className="flex items-center justify-between p-2.5 rounded-lg bg-gray-800/50 border border-yellow-500/20"
                    >
                      <span className="text-sm text-gray-300 truncate">{nameById.get(s.clientId) ?? s.clientId}</span>
                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-yellow-500/10 text-yellow-400 border border-yellow-500/20 shrink-0">
                        {reasonLabel(s.reason)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="kairos-btn w-full py-2.5 rounded-xl text-sm font-medium flex items-center justify-center gap-2"
            >
              Done
            </button>
          </div>
        ) : (
          <>
            {/* Body */}
            <div className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="px-4 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              {/* Start date */}
              <div>
                <label className="block text-xs text-gray-400 mb-1">Start Date</label>
                <div className="relative">
                  <Calendar size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="kairos-input w-full pl-9 [color-scheme:dark]"
                  />
                </div>
              </div>

              {/* Client multi-select */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs text-gray-400">
                    Clients {selected.size > 0 && <span className="text-kairos-gold">({selected.size} selected)</span>}
                  </label>
                  {filtered.length > 0 && (
                    <button
                      onClick={toggleAll}
                      className="inline-flex items-center gap-1.5 text-xs text-kairos-silver-dark hover:text-kairos-gold transition-colors"
                    >
                      {allFilteredSelected ? <CheckSquare size={13} /> : <Square size={13} />}
                      Select all
                    </button>
                  )}
                </div>

                <div className="relative mb-2">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search clients…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="kairos-input w-full pl-9"
                  />
                </div>

                <div className="max-h-64 overflow-y-auto rounded-xl border border-gray-700 divide-y divide-gray-800">
                  {isLoading ? (
                    <div className="p-6 flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Loader2 size={16} className="animate-spin" /> Loading clients…
                    </div>
                  ) : filtered.length === 0 ? (
                    <div className="p-6 text-center text-sm text-gray-500">
                      {clients.length === 0 ? "You have no clients yet." : "No clients match your search."}
                    </div>
                  ) : (
                    filtered.map((c) => {
                      const isSel = selected.has(c.id);
                      return (
                        <button
                          key={c.id}
                          onClick={() => toggle(c.id)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-800/50 transition-colors"
                        >
                          {isSel ? (
                            <CheckSquare size={16} className="text-kairos-gold shrink-0" />
                          ) : (
                            <Square size={16} className="text-gray-600 shrink-0" />
                          )}
                          <span className={`text-sm truncate ${isSel ? "text-white" : "text-kairos-silver"}`}>
                            {c.name || "Unnamed client"}
                          </span>
                        </button>
                      );
                    })
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-700/50 flex items-center justify-end gap-2 shrink-0">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                disabled={assignMutation.isPending || selected.size === 0}
                className="kairos-btn px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                {assignMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Apply to {selected.size || ""} client{selected.size === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
