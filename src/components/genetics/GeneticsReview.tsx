"use client";

/**
 * Genetics Review — plain-language, sectioned view of a client's gene results
 * for coaches. Each gene expands to show what it does, what the change can
 * mean, and an action plan: lifestyle & food, supplements, peptides,
 * medications to discuss with a prescriber, and labs to check.
 */

import { useMemo, useState } from "react";
import {
  ChevronDown, Dna, Search, Leaf, Pill, Syringe, Stethoscope, FlaskConical,
  Info, AlertTriangle, Eye,
} from "lucide-react";

import { cn } from "@/utils/cn";
import {
  interpretMarkers, groupBySection, startHere, STRENGTH_LABEL,
  type RawMarker, type GeneView, type Strength, type Priority,
} from "@/lib/genetics/interpret";

interface Pathway {
  pathway: string;
  genesAffected: number;
  genesInPathway: number;
  homozygousCount: number;
  heterozygousCount: number;
  priorityLevel: string | null;
}

interface Props {
  markers: RawMarker[];
  pathways?: Pathway[];
  profile?: { status: string; uploadType: string | null; createdAt: string } | null;
}

const STRENGTH_STYLE: Record<Strength, string> = {
  two: "bg-red-500/10 text-red-300 border-red-500/30",
  one: "bg-amber-500/10 text-amber-300 border-amber-500/30",
  none: "bg-emerald-500/10 text-emerald-300 border-emerald-500/30",
  unknown: "bg-gray-700/40 text-gray-300 border-gray-600",
};

const PRIORITY_LABEL: Record<Priority, string> = {
  critical: "Top priority", high: "High priority", medium: "Medium priority", low: "Low priority",
};
const PRIORITY_STYLE: Record<Priority, string> = {
  critical: "text-red-300", high: "text-orange-300", medium: "text-yellow-300", low: "text-gray-400",
};

export function GeneticsReview({ markers, pathways = [], profile }: Props) {
  const genes = useMemo(() => interpretMarkers(markers), [markers]);
  const counts = useMemo(() => ({
    two: genes.filter((g) => g.strength === "two").length,
    one: genes.filter((g) => g.strength === "one").length,
    none: genes.filter((g) => g.strength === "none").length,
  }), [genes]);
  const attentionCount = genes.filter((g) => g.needsAttention).length;
  const focus = useMemo(() => startHere(genes), [genes]);

  const [filter, setFilter] = useState<"attention" | "all">(attentionCount > 0 ? "attention" : "all");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState<Set<string>>(new Set());
  const [showKey, setShowKey] = useState(false);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return genes.filter((g) =>
      (filter === "all" || g.needsAttention) &&
      (!q || g.gene.toLowerCase().includes(q) || (g.nickname ?? "").toLowerCase().includes(q) ||
        (g.rsId ?? "").toLowerCase().includes(q)),
    );
  }, [genes, filter, query]);
  const sections = useMemo(() => groupBySection(visible), [visible]);

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  const openGene = (id: string) => {
    setFilter("all");
    setOpen((prev) => new Set(prev).add(id));
    setTimeout(() => document.getElementById(`gene-${id}`)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  if (genes.length === 0) return null;

  return (
    <div className="space-y-5">
      {/* ── Summary ── */}
      <div className="kairos-card">
        <div className="flex items-start justify-between gap-3 flex-wrap mb-4">
          <div>
            <h2 className="text-lg font-heading font-bold text-white flex items-center gap-2">
              <Dna size={18} className="text-kairos-gold" /> Genetics Review
            </h2>
            <p className="text-xs text-gray-400 mt-1">
              {genes.length} genes checked
              {profile?.uploadType ? ` · Source: ${profile.uploadType}` : ""}
              {profile?.createdAt ? ` · Added ${new Date(profile.createdAt).toLocaleDateString()}` : ""}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowKey((s) => !s)}
            className="flex items-center gap-1.5 text-xs text-kairos-gold hover:text-kairos-gold/80"
          >
            <Info size={13} /> {showKey ? "Hide" : "How to read this"}
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <SummaryTile label="Two copies changed" hint="Matters most" value={counts.two} tone="two" />
          <SummaryTile label="One copy changed" hint="Can matter under stress" value={counts.one} tone="one" />
          <SummaryTile label="No change" hint="Nothing to fix" value={counts.none} tone="none" />
        </div>

        {showKey && (
          <div className="mt-4 rounded-xl bg-kairos-royal-surface p-4 space-y-2 text-sm text-gray-200">
            <p>Everyone has two copies of each gene, one from each parent.</p>
            {(["two", "one", "none"] as Strength[]).map((s) => (
              <p key={s} className="flex items-start gap-2">
                <span className={cn("shrink-0 text-[11px] px-2 py-0.5 rounded-full border", STRENGTH_STYLE[s])}>{STRENGTH_LABEL[s].short}</span>
                <span>{STRENGTH_LABEL[s].long}</span>
              </p>
            ))}
            <p className="text-gray-400">Genes are not destiny. Food, sleep, movement, and stress change how genes act.</p>
          </div>
        )}

        {focus.length > 0 && (
          <div className="mt-4">
            <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Start here</p>
            <div className="flex flex-wrap gap-2">
              {focus.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => openGene(g.id)}
                  className="text-left px-3 py-2 rounded-xl bg-kairos-gold/10 border border-kairos-gold/30 hover:bg-kairos-gold/20 transition-colors"
                >
                  <span className="block text-sm font-semibold text-white">{g.gene}</span>
                  {g.nickname && <span className="block text-[11px] text-kairos-gold">{g.nickname}</span>}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── Controls ── */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-kairos-border overflow-hidden text-xs">
          {(["attention", "all"] as const).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={cn("px-3 py-1.5 transition-colors", filter === f ? "bg-kairos-gold text-kairos-royal-dark font-semibold" : "text-gray-300 hover:bg-kairos-card-hover")}
            >
              {f === "attention" ? `Needs attention (${attentionCount})` : `All genes (${genes.length})`}
            </button>
          ))}
        </div>
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Find a gene"
            className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-kairos-royal-surface border border-kairos-border text-xs text-white placeholder-gray-500"
          />
        </div>
        <button type="button" onClick={() => setOpen(new Set(visible.map((g) => g.id)))} className="text-xs text-gray-400 hover:text-white px-2">Open all</button>
        <button type="button" onClick={() => setOpen(new Set())} className="text-xs text-gray-400 hover:text-white px-2">Close all</button>
      </div>

      {/* ── Sections ── */}
      {sections.length === 0 ? (
        <div className="kairos-card text-center text-sm text-gray-500 py-6">No genes match.</div>
      ) : (
        sections.map((s) => {
          const score = pathways.find((p) => sectionMatches(p.pathway, s.key));
          return (
            <section key={s.key} className="kairos-card">
              <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                <div>
                  <h3 className="text-base font-heading font-bold text-kairos-gold">{s.title}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">{s.blurb}</p>
                </div>
                {score && (
                  <span className="text-[11px] text-gray-400 bg-kairos-royal-surface rounded-full px-2.5 py-1">
                    {score.genesAffected}/{score.genesInPathway} genes changed
                  </span>
                )}
              </div>
              <div className="space-y-2">
                {s.genes.map((g) => (
                  <GeneCard key={g.id} gene={g} open={open.has(g.id)} onToggle={() => toggle(g.id)} />
                ))}
              </div>
            </section>
          );
        })
      )}

      <p className="text-[11px] text-gray-500 leading-relaxed flex gap-2">
        <AlertTriangle size={13} className="shrink-0 mt-0.5" />
        For coaching and education, not a diagnosis. Medication and peptide notes are things to talk over with the
        client&apos;s prescriber. Do not start, stop, or change a medicine without one.
      </p>
    </div>
  );
}

function SummaryTile({ label, hint, value, tone }: { label: string; hint: string; value: number; tone: Strength }) {
  return (
    <div className={cn("rounded-xl border p-3", STRENGTH_STYLE[tone])}>
      <p className="text-2xl font-heading font-bold">{value}</p>
      <p className="text-xs font-semibold">{label}</p>
      <p className="text-[11px] opacity-70">{hint}</p>
    </div>
  );
}

function GeneCard({ gene: g, open, onToggle }: { gene: GeneView; open: boolean; onToggle: () => void }) {
  const [showTech, setShowTech] = useState(false);
  return (
    <div id={`gene-${g.id}`} className="rounded-xl border border-kairos-border bg-gray-800/20">
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left p-3 flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white">{g.gene}</span>
            {g.nickname && <span className="text-xs text-kairos-gold">{g.nickname}</span>}
            <span className={cn("text-[11px] px-2 py-0.5 rounded-full border", STRENGTH_STYLE[g.strength])}>
              {STRENGTH_LABEL[g.strength].short}
            </span>
            {g.strength !== "none" && (
              <span className={cn("text-[11px]", PRIORITY_STYLE[g.priority])}>{PRIORITY_LABEL[g.priority]}</span>
            )}
          </div>
          <p className="text-xs text-gray-300 mt-1 leading-relaxed">{g.plain}</p>
        </div>
        <ChevronDown size={16} className={cn("shrink-0 mt-1 text-gray-400 transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="px-3 pb-4 space-y-4 border-t border-kairos-border pt-3">
          {g.changed && g.strength !== "none" && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1">What this change can mean</p>
              <p className="text-sm text-gray-200 leading-relaxed">{g.changed}</p>
            </div>
          )}
          {g.strength === "none" && (
            <p className="text-sm text-emerald-300">Good news: this gene looks typical. No extra steps needed.</p>
          )}

          {g.symptoms.length > 0 && g.strength !== "none" && (
            <div>
              <p className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-1.5">Signs to watch for</p>
              <div className="flex flex-wrap gap-1.5">
                {g.symptoms.map((s) => (
                  <span key={s} className="text-[11px] text-gray-300 bg-kairos-royal-surface rounded-full px-2.5 py-1">{s}</span>
                ))}
              </div>
            </div>
          )}

          {g.strength !== "none" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <ActionBlock icon={<Leaf size={14} />} title="Lifestyle & food" items={g.lifestyle} tone="text-emerald-300" />
              <ActionBlock icon={<Pill size={14} />} title="Supplements" items={g.supplements} tone="text-sky-300" />
              <ActionBlock
                icon={<Syringe size={14} />} title="Peptide options" items={g.peptides} tone="text-violet-300"
                note={g.peptides.length ? "Per provider protocol. Many peptides need a prescriber." : undefined}
                empty="No peptide is linked to this gene."
              />
              <ActionBlock
                icon={<Stethoscope size={14} />} title="Medications to discuss" items={g.meds} tone="text-amber-300"
                note={g.meds.length ? "Talk these over with the prescriber." : undefined}
                empty="No medication notes for this gene."
              />
              {g.labs.length > 0 && (
                <div className="md:col-span-2">
                  <ActionBlock icon={<FlaskConical size={14} />} title="Labs to check" items={g.labs} tone="text-gray-300" inline />
                </div>
              )}
            </div>
          )}

          {(g.technical.function || g.technical.effect || g.rsId || g.genotype) && (
            <div>
              <button type="button" onClick={() => setShowTech((s) => !s)} className="flex items-center gap-1.5 text-[11px] text-gray-500 hover:text-gray-300">
                <Eye size={12} /> {showTech ? "Hide" : "Show"} coach detail
              </button>
              {showTech && (
                <div className="mt-2 rounded-lg bg-kairos-royal-surface p-3 space-y-1.5 text-xs text-gray-400">
                  {(g.rsId || g.genotype) && <p>{g.rsId ? `${g.rsId} · ` : ""}{g.genotype ? `Result: ${g.genotype}` : ""}</p>}
                  {g.technical.function && <p><span className="text-gray-300">Function:</span> {g.technical.function}</p>}
                  {g.technical.effect && <p><span className="text-gray-300">When changed:</span> {g.technical.effect}</p>}
                  {!g.inLibrary && <p className="text-amber-300/80">Not in the gene library yet. Showing the report&apos;s own notes.</p>}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function ActionBlock({
  icon, title, items, tone, note, empty, inline,
}: { icon: React.ReactNode; title: string; items: string[]; tone: string; note?: string; empty?: string; inline?: boolean }) {
  if (items.length === 0 && !empty) return null;
  return (
    <div className="rounded-lg bg-kairos-royal-surface p-3">
      <p className={cn("text-xs font-semibold flex items-center gap-1.5 mb-1.5", tone)}>{icon} {title}</p>
      {items.length === 0 ? (
        <p className="text-xs text-gray-500">{empty}</p>
      ) : inline ? (
        <p className="text-xs text-gray-300 leading-relaxed">{items.join(" · ")}</p>
      ) : (
        <ul className="space-y-1">
          {items.map((it) => (
            <li key={it} className="text-xs text-gray-300 leading-relaxed flex gap-1.5">
              <span className="text-gray-500">•</span><span>{it}</span>
            </li>
          ))}
        </ul>
      )}
      {note && <p className="text-[10px] text-gray-500 mt-2">{note}</p>}
    </div>
  );
}

/** Loosely match an imported pathway-score name to a review section. */
function sectionMatches(pathway: string, key: string): boolean {
  const p = pathway.toLowerCase();
  const map: Record<string, RegExp> = {
    immune: /immun|inflamm/, gut: /gut|histamine|food|external/, cleanup: /autophag/,
    energy: /mito|longev|energy/, folate: /folate/, b12: /b12/, homocysteine: /homocyst|remethyl/,
    detox: /detox|glutathione/, brain: /neuro|mood/, heart: /cardio|blood|clot/, hormones: /thyroid|endocr|hormon/,
  };
  return map[key]?.test(p) ?? false;
}
