"use client";

import { useMemo, useState } from "react";
import {
  Dumbbell,
  UtensilsCrossed,
  Plus,
  X,
  Trash2,
  Pencil,
  Users,
  Send,
  Search,
  CheckSquare,
  Square,
  Loader2,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Sparkles,
  FileSpreadsheet,
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import ProtocolBulkEditor from "@/components/coach/ProtocolBulkEditor";

type TemplateType = "workouts" | "diet";

const TYPE_META: Record<
  TemplateType,
  { title: string; subtitle: string; icon: typeof Dumbbell; noun: string; overwrites: string }
> = {
  workouts: {
    title: "Exercise Templates",
    subtitle: "Reusable training plans — build once, apply to overwrite a client's workout.",
    icon: Dumbbell,
    noun: "exercise template",
    overwrites: "current workout plan",
  },
  diet: {
    title: "Diet Templates",
    subtitle: "Reusable nutrition plans — build once, apply to overwrite a client's diet.",
    icon: UtensilsCrossed,
    noun: "diet template",
    overwrites: "current diet plan",
  },
};

// ─── Page ───────────────────────────────────────────────────
export default function TrainingProgramsPage() {
  return (
    <div className="space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-heading font-bold text-white mb-1">Programs</h1>
        <p className="text-gray-400 text-sm">
          Build reusable exercise and diet templates — manually, by CSV import, or by AI reading a
          document — then apply them to overwrite a client&apos;s plan.
        </p>
      </div>

      <TemplatesSection type="workouts" />
      <TemplatesSection type="diet" />
    </div>
  );
}

// ─── One section (Exercise or Diet) ─────────────────────────
function TemplatesSection({ type }: { type: TemplateType }) {
  const meta = TYPE_META[type];
  const Icon = meta.icon;
  const utils = trpc.useUtils();

  const { data: templates = [], isLoading } = trpc.coach.programTemplates.list.useQuery(
    { type },
    { refetchOnWindowFocus: false },
  );

  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [applyTarget, setApplyTarget] = useState<{ id: string; name: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const deleteMutation = trpc.coach.programTemplates.delete.useMutation({
    onSuccess: () => {
      utils.coach.programTemplates.list.invalidate({ type });
      setConfirmDelete(null);
    },
  });

  const refreshList = () => utils.coach.programTemplates.list.invalidate({ type });

  return (
    <section className="space-y-4">
      {/* Section header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-kairos-gold/15 border border-kairos-gold/30 flex items-center justify-center shrink-0">
            <Icon size={18} className="text-kairos-gold" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-heading font-bold text-white">{meta.title}</h2>
            <p className="text-xs text-gray-400 truncate">{meta.subtitle}</p>
          </div>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="kairos-btn flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium shrink-0"
        >
          <Plus size={16} />
          New
        </button>
      </div>

      {/* List */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="kairos-card h-32 animate-pulse bg-gray-800/50" />
          ))}
        </div>
      ) : templates.length === 0 ? (
        <div className="kairos-card p-8 text-center border border-dashed border-kairos-border">
          <Icon size={36} className="mx-auto mb-3 text-gray-600" />
          <p className="text-sm text-gray-400 mb-4">
            No {meta.noun}s yet. Create one and fill it in manually, by CSV, or by AI.
          </p>
          <button
            onClick={() => setCreating(true)}
            className="kairos-btn px-5 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2"
          >
            <Plus size={16} /> Create {meta.noun}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((tpl) => (
            <div
              key={tpl.id}
              className="kairos-card p-5 border border-kairos-border hover:border-kairos-gold/40 transition-colors flex flex-col"
            >
              <div className="min-w-0 flex-1 mb-3">
                <h3 className="font-heading font-semibold text-white truncate">{tpl.name}</h3>
                {tpl.description ? (
                  <p className="text-xs text-kairos-silver-dark line-clamp-2 mt-0.5">{tpl.description}</p>
                ) : (
                  <p className="text-xs text-gray-600 italic mt-0.5">No description</p>
                )}
              </div>

              {/* Meta */}
              <div className="flex flex-wrap gap-2 mb-4">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-gray-800 border border-gray-700 text-kairos-silver">
                  <FileSpreadsheet size={11} /> {tpl.rowCount} {type === "diet" ? "meal" : "exercise"}
                  {tpl.rowCount === 1 ? "" : "s"}
                </span>
                {type === "workouts" && tpl.dayCount != null && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-gray-800 border border-gray-700 text-kairos-silver">
                    <Dumbbell size={11} /> {tpl.dayCount} day{tpl.dayCount === 1 ? "" : "s"}
                  </span>
                )}
                {type === "diet" && tpl.planType && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[11px] bg-gray-800 border border-gray-700 text-kairos-silver">
                    {tpl.planType}
                  </span>
                )}
              </div>

              {/* Actions */}
              <div className="mt-auto flex items-center gap-2">
                <button
                  onClick={() => setApplyTarget({ id: tpl.id, name: tpl.name })}
                  disabled={tpl.rowCount === 0}
                  title={tpl.rowCount === 0 ? "Add rows before applying" : undefined}
                  className="kairos-btn flex-1 flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={13} />
                  Apply
                </button>
                <button
                  onClick={() => setEditingId(tpl.id)}
                  className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white hover:border-gray-600 transition-colors"
                  title="Edit template"
                >
                  <Pencil size={14} />
                </button>
                <button
                  onClick={() => setConfirmDelete({ id: tpl.id, name: tpl.name })}
                  className="p-2 rounded-lg bg-gray-800 border border-gray-700 text-kairos-silver hover:text-red-400 hover:border-red-500/40 transition-colors"
                  title="Delete template"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create modal */}
      {creating && (
        <NewTemplateModal
          type={type}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false);
            refreshList();
            setEditingId(id); // jump straight into the editor
          }}
        />
      )}

      {/* Editor modal */}
      {editingId && (
        <TemplateEditorModal
          templateId={editingId}
          type={type}
          onClose={() => setEditingId(null)}
          onSaved={refreshList}
        />
      )}

      {/* Apply modal */}
      {applyTarget && (
        <ApplyTemplateModal
          template={{ ...applyTarget, type }}
          onClose={() => setApplyTarget(null)}
        />
      )}

      {/* Delete confirm */}
      {confirmDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
          onClick={() => setConfirmDelete(null)}
        >
          <div
            className="w-full max-w-sm kairos-card border border-gray-700 rounded-2xl shadow-2xl p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center">
                <Trash2 size={18} className="text-red-400" />
              </div>
              <h2 className="text-lg font-heading font-bold text-white">Delete template?</h2>
            </div>
            <p className="text-sm text-gray-400 mb-5">
              &ldquo;{confirmDelete.name}&rdquo; will be removed. Clients you already applied it to keep their plan.
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setConfirmDelete(null)}
                className="flex-1 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate({ id: confirmDelete.id })}
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
    </section>
  );
}

// ─── New Template modal (name + description) ────────────────
function NewTemplateModal({
  type,
  onClose,
  onCreated,
}: {
  type: TemplateType;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const meta = TYPE_META[type];
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const createMutation = trpc.coach.programTemplates.create.useMutation({
    onSuccess: (res) => onCreated(res.id),
    onError: (e) => setError(e.message),
  });

  const handleCreate = () => {
    setError(null);
    if (!name.trim()) {
      setError("Give your template a name.");
      return;
    }
    createMutation.mutate({ type, name: name.trim(), description: description.trim() || undefined });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md kairos-card border border-gray-700 rounded-2xl shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-heading font-bold text-white">New {meta.noun}</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        {error && (
          <div className="px-4 py-2 mb-3 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}

        <div className="space-y-3">
          <div>
            <label className="block text-xs text-gray-400 mb-1">Name *</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={type === "diet" ? "e.g. High-Protein Cut" : "e.g. Foundational Strength — Phase 1"}
              className="kairos-input w-full"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            />
          </div>
          <div>
            <label className="block text-xs text-gray-400 mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Short summary (optional)"
              className="kairos-input w-full"
            />
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-5">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={createMutation.isPending}
            className="kairos-btn px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
          >
            {createMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Plus size={14} />}
            Create &amp; build
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Editor modal (bulk editor in template mode) ────────────
function TemplateEditorModal({
  templateId,
  type,
  onClose,
  onSaved,
}: {
  templateId: string;
  type: TemplateType;
  onClose: () => void;
  onSaved: () => void;
}) {
  const meta = TYPE_META[type];
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.coach.programTemplates.get.useQuery(
    { id: templateId },
    { refetchOnWindowFocus: false },
  );

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const renameMutation = trpc.coach.programTemplates.rename.useMutation({
    onSuccess: () => {
      utils.coach.programTemplates.get.invalidate({ id: templateId });
      onSaved();
    },
  });

  const currentName = nameDraft ?? data?.name ?? "";

  const commitName = () => {
    const trimmed = currentName.trim();
    if (trimmed && data && trimmed !== data.name) {
      renameMutation.mutate({ id: templateId, name: trimmed, description: data.description ?? undefined });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-4xl kairos-card border border-gray-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-700/50 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <meta.icon size={18} className="text-kairos-gold shrink-0" />
            <input
              value={currentName}
              onChange={(e) => setNameDraft(e.target.value)}
              onBlur={commitName}
              placeholder="Template name"
              className="bg-transparent text-lg font-heading font-bold text-white focus:outline-none focus:border-b focus:border-kairos-gold/50 min-w-0 flex-1"
            />
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors shrink-0">
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto">
          {isLoading || !data ? (
            <div className="p-10 flex flex-col items-center justify-center gap-3">
              <Loader2 size={24} className="animate-spin text-kairos-gold" />
              <p className="text-sm text-gray-400">Loading template…</p>
            </div>
          ) : (
            <>
              <p className="text-[11px] text-kairos-silver-dark flex items-center gap-1.5 mb-4">
                <Sparkles size={12} className="text-kairos-gold/70 shrink-0" />
                Build this {meta.noun} manually, paste from a spreadsheet, import a CSV, or upload a Word/PDF/Excel
                file for AI to read. Save when done, then apply it to any client.
              </p>
              <ProtocolBulkEditor
                mode="template"
                templateId={templateId}
                type={data.type}
                columns={data.columns}
                initialRows={data.rows}
                initialPlanMeta={data.planMeta ?? undefined}
                onSaved={onSaved}
              />
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Apply modal (multi-select + overwrite confirmation) ────
function ApplyTemplateModal({
  template,
  onClose,
}: {
  template: { id: string; name: string; type: TemplateType };
  onClose: () => void;
}) {
  const meta = TYPE_META[template.type];
  const { data: clientsData, isLoading } = trpc.coach.clients.listAll.useQuery(undefined, {
    refetchOnWindowFocus: false,
  });
  const clients = clientsData ?? [];

  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState(false);
  const [result, setResult] = useState<{
    applied: number;
    skipped: Array<{ clientId: string; reason: string }>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const applyMutation = trpc.coach.programTemplates.applyToClients.useMutation({
    onSuccess: (res) => setResult(res),
    onError: (e) => {
      setError(e.message);
      setConfirming(false);
    },
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

  const proceed = () => {
    setError(null);
    if (selected.size === 0) {
      setError("Select at least one client.");
      return;
    }
    setConfirming(true);
  };

  const handleApply = () => {
    applyMutation.mutate({ id: template.id, clientIds: Array.from(selected) });
  };

  const reasonLabel = (reason: string) => {
    if (reason === "no_access") return "no access";
    if (reason === "error") return "failed";
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
            <h2 className="text-lg font-heading font-bold text-white truncate">Apply {meta.noun}</h2>
            <p className="text-xs text-kairos-silver-dark truncate">{template.name}</p>
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
                  Applied to {result.applied} client{result.applied === 1 ? "" : "s"}
                </p>
                <p className="text-xs text-gray-400">Each client&apos;s {meta.overwrites} was replaced and they were notified.</p>
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
        ) : confirming ? (
          // ── Overwrite confirmation ──
          <div className="p-6 space-y-4 overflow-y-auto">
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} className="text-amber-400" />
              </div>
              <div>
                <p className="text-white font-heading font-semibold mb-1">
                  Replace {selected.size} client{selected.size === 1 ? "'s" : "s'"} {meta.overwrites}?
                </p>
                <p className="text-sm text-gray-400">
                  Applying &ldquo;{template.name}&rdquo; overwrites each selected client&apos;s {meta.overwrites} with this
                  template. Their previous plan will be replaced and they&apos;ll be notified. This can&apos;t be undone.
                </p>
              </div>
            </div>

            <div className="max-h-40 overflow-y-auto rounded-xl border border-gray-700 divide-y divide-gray-800">
              {Array.from(selected).map((id) => (
                <div key={id} className="px-3 py-2 text-sm text-kairos-silver truncate">
                  {nameById.get(id) ?? id}
                </div>
              ))}
            </div>

            {applyMutation.isError && (
              <div className="px-4 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                <AlertCircle size={14} /> {applyMutation.error.message}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={() => setConfirming(false)}
                disabled={applyMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-800 border border-gray-700 text-kairos-silver hover:text-white transition-colors disabled:opacity-50"
              >
                Back
              </button>
              <button
                onClick={handleApply}
                disabled={applyMutation.isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-amber-500/90 hover:bg-amber-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {applyMutation.isPending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                Overwrite &amp; notify
              </button>
            </div>
          </div>
        ) : (
          // ── Client selection ──
          <>
            <div className="p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="px-4 py-2 rounded-lg text-sm bg-red-500/10 border border-red-500/30 text-red-400 flex items-center gap-2">
                  <AlertCircle size={14} /> {error}
                </div>
              )}

              <p className="text-xs text-gray-400 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-400 shrink-0" />
                Applying replaces each selected client&apos;s {meta.overwrites}.
              </p>

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
                onClick={proceed}
                disabled={selected.size === 0}
                className="kairos-btn px-5 py-2 rounded-xl text-sm font-medium flex items-center gap-2 disabled:opacity-50"
              >
                <Send size={14} />
                Apply to {selected.size || ""} client{selected.size === 1 ? "" : "s"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
