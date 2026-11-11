"use client";

import { useState } from "react";
import { AlertTriangle, CheckCircle2, FileText, Flag, FlaskConical, Hourglass, Loader2, Plus, Send } from "lucide-react";

import type { inferRouterOutputs } from "@trpc/server";

import { trpc } from "@/lib/trpc";
import type { AppRouter } from "@/server/trpc/routers/_app";
import { statusFromRange } from "@/lib/labs/normalize";
import { BiomarkerGroups } from "./BiomarkerGroups";
import { RangeBar, LabStatus } from "./RangeBar";

/**
 * Coach Labs tab: review-and-release queue on top (confirm units and
 * ranges, flag outliers, add a note, release to the client), then the same
 * grouped range-bar + trend view the client sees.
 */

type Overview = inferRouterOutputs<AppRouter>["coach"]["data"]["labOverview"];
type Panel = Overview["panels"][number];
type Draft = { unit: string; refLow: string; refHigh: string; flagged: boolean };

const SOURCE_LABEL: Record<string, string> = {
  ai_parsed: "Client upload, read by AI",
  imported: "Client file import",
  manual: "Typed in by the client",
  coach_entered: "Entered by a coach",
  pending: "Client uploaded a file",
  url_imported: "Client added a link",
  completed: "Lab feed",
};

const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
const num = (s: string) => (s.trim() === "" ? null : Number.isFinite(Number(s)) ? Number(s) : null);

function ReviewPanel({ clientId, panel, hints, canEdit, onEnterValues }: {
  clientId: string;
  panel: Panel;
  hints: Overview["hintsByMarker"];
  canEdit: boolean;
  onEnterValues?: (resultId: string, date: string) => void;
}) {
  const utils = trpc.useUtils();
  const [note, setNote] = useState(panel.coachNote ?? "");
  const [drafts, setDrafts] = useState<Record<string, Draft>>(() => Object.fromEntries(panel.markers.map((m) => [m.id, {
    unit: m.unit ?? "", refLow: m.refLow != null ? String(m.refLow) : "", refHigh: m.refHigh != null ? String(m.refHigh) : "", flagged: m.flagged,
  }])));
  const [error, setError] = useState<string | null>(null);
  const review = trpc.coach.data.reviewLabResult.useMutation({
    onSuccess: () => { setError(null); utils.coach.data.labOverview.invalidate({ clientId }); utils.coach.clients.getClientHealthData.invalidate(); },
    onError: (e) => setError(e.message),
  });

  const set = (id: string, k: keyof Draft, v: string | boolean) => setDrafts((d) => ({ ...d, [id]: { ...d[id], [k]: v } }));
  const submit = (release: boolean) => review.mutate({
    clientId, resultId: panel.resultId, note, release,
    markers: panel.markers.map((m) => ({ id: m.id, unit: drafts[m.id].unit, refLow: num(drafts[m.id].refLow), refHigh: num(drafts[m.id].refHigh), flagged: drafts[m.id].flagged })),
  });
  const alreadyVisible = panel.reviewState === "released_unreviewed";
  const noValues = panel.markers.length === 0;
  const warnCount = panel.markers.filter((m) => (hints[m.id] ?? []).some((h) => h.kind !== "no_range")).length;

  return (
    <div className="rounded-kairos-sm border border-kairos-border overflow-hidden">
      <div className="px-4 py-3 bg-white/[0.03] flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-white">{panel.panelName} — {fmtDate(panel.date)}</p>
          <p className="text-xs text-kairos-silver-dark">
            {SOURCE_LABEL[panel.source ?? ""] ?? "Lab result"} · {panel.markers.length} marker{panel.markers.length === 1 ? "" : "s"}
            {warnCount > 0 && <> · <span className="text-amber-300">{warnCount} to check</span></>}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {alreadyVisible ? (
            <span className="text-xs text-kairos-silver">Client can already see these values</span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs text-kairos-silver"><Hourglass size={12} aria-hidden /> Hidden from client until released</span>
          )}
          {panel.fileUrl && (
            <a href={panel.fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-sky-300 hover:text-sky-200">
              <FileText size={12} aria-hidden /> Original file
            </a>
          )}
        </div>
      </div>

      {noValues ? (
        <div className="px-4 py-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-kairos-silver-dark">No values yet. Open the file and enter the results, then review and release.</p>
          {canEdit && onEnterValues && (
            <button type="button" onClick={() => onEnterValues(panel.resultId, panel.date.slice(0, 10))}
              className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-1.5"><Plus size={12} aria-hidden /> Enter values</button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-kairos-silver-dark">
                <th className="px-4 py-2 font-medium">Marker</th>
                <th className="px-2 py-2 font-medium">Value</th>
                <th className="px-2 py-2 font-medium">Unit</th>
                <th className="px-2 py-2 font-medium">Ref low</th>
                <th className="px-2 py-2 font-medium">Ref high</th>
                <th className="px-2 py-2 font-medium min-w-[160px]">Range</th>
                <th className="px-2 py-2 font-medium">Check</th>
                <th className="px-4 py-2 font-medium">Flag</th>
              </tr>
            </thead>
            <tbody>
              {panel.markers.map((m) => {
                const d = drafts[m.id];
                const lo = num(d.refLow), hi = num(d.refHigh);
                const status = statusFromRange(m.value, lo, hi) ?? (m.status && m.status !== "normal" ? m.status : null);
                const h = hints[m.id] ?? [];
                return (
                  <tr key={m.id} className="border-t border-kairos-border/60 align-top">
                    <td className="px-4 py-2 text-white">{m.name}<span className="block text-kairos-silver-dark">{m.code}</span></td>
                    <td className="px-2 py-2 text-white font-semibold whitespace-nowrap">{m.value.toLocaleString("en-US", { maximumFractionDigits: 3 })}</td>
                    <td className="px-2 py-2">
                      <input value={d.unit} onChange={(e) => set(m.id, "unit", e.target.value)} disabled={!canEdit} aria-label={`${m.name} unit`}
                        placeholder={m.expectedUnit ?? "unit"} className="kairos-input w-24 py-1 text-xs" />
                      {m.expectedUnit && d.unit.trim() && d.unit.trim().toLowerCase() !== m.expectedUnit.toLowerCase() && (
                        <span className="block text-kairos-silver-dark mt-0.5">usual: {m.expectedUnit}</span>
                      )}
                    </td>
                    <td className="px-2 py-2"><input value={d.refLow} onChange={(e) => set(m.id, "refLow", e.target.value)} disabled={!canEdit} inputMode="decimal" aria-label={`${m.name} reference low`} className="kairos-input w-16 py-1 text-xs" /></td>
                    <td className="px-2 py-2"><input value={d.refHigh} onChange={(e) => set(m.id, "refHigh", e.target.value)} disabled={!canEdit} inputMode="decimal" aria-label={`${m.name} reference high`} className="kairos-input w-16 py-1 text-xs" /></td>
                    <td className="px-2 py-2">
                      <RangeBar value={m.value} refLow={lo} refHigh={hi} unit={d.unit || null} />
                      <LabStatus status={status} />
                    </td>
                    <td className="px-2 py-2 min-w-[160px]">
                      {h.length === 0 ? <span className="inline-flex items-center gap-1 text-kairos-silver-dark"><CheckCircle2 size={12} aria-hidden /> Looks fine</span> : (
                        <ul className="space-y-0.5">
                          {h.map((x) => (
                            <li key={x.kind} className={`flex items-start gap-1 ${x.kind === "no_range" ? "text-kairos-silver-dark" : "text-amber-300"}`}>
                              <AlertTriangle size={12} className="mt-0.5 shrink-0" aria-hidden /> {x.message}
                            </li>
                          ))}
                        </ul>
                      )}
                    </td>
                    <td className="px-4 py-2">
                      <label className="inline-flex items-center gap-1.5 cursor-pointer text-kairos-silver">
                        <input type="checkbox" checked={d.flagged} onChange={(e) => set(m.id, "flagged", e.target.checked)} disabled={!canEdit} className="accent-sky-400" />
                        <Flag size={12} aria-hidden /> <span className="sr-only">Flag {m.name}</span>
                      </label>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && !noValues && (
        <div className="px-4 py-3 border-t border-kairos-border space-y-2">
          <label htmlFor={`note-${panel.resultId}`} className="text-xs text-kairos-silver-dark block">Note to the client (shown with the results)</label>
          <textarea id={`note-${panel.resultId}`} value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={2000}
            placeholder="e.g. Vitamin D is low — we'll add D3 and recheck in 90 days."
            className="kairos-input w-full text-sm resize-y" />
          {error && <p className="text-xs text-red-300" role="alert">{error}</p>}
          <div className="flex flex-wrap gap-2 justify-end">
            <button type="button" onClick={() => submit(false)} disabled={review.isPending}
              className="kairos-btn-outline px-3 py-1.5 rounded-kairos-sm text-xs disabled:opacity-40 disabled:cursor-not-allowed">
              {alreadyVisible ? "Mark reviewed" : "Save review"}
            </button>
            {!alreadyVisible && (
              <button type="button" onClick={() => submit(true)} disabled={review.isPending}
                className="kairos-btn-gold px-3 py-1.5 rounded-kairos-sm text-xs flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed">
                {review.isPending ? <Loader2 size={12} className="animate-spin" aria-hidden /> : <Send size={12} aria-hidden />} Release to client
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export function CoachLabsReview({ clientId, canEdit, onEnterValues }: {
  clientId: string;
  canEdit: boolean;
  /** Open the "add lab result" form attached to an existing (file-only) result. */
  onEnterValues?: (resultId: string, date: string) => void;
}) {
  const q = trpc.coach.data.labOverview.useQuery({ clientId }, { staleTime: 30_000 });
  if (q.isLoading) {
    return <div className="kairos-card flex items-center justify-center py-12"><Loader2 className="animate-spin text-kairos-silver-dark" aria-label="Loading labs" /></div>;
  }
  if (q.error || !q.data) {
    return <div className="kairos-card text-sm text-kairos-silver-dark text-center py-8">Couldn&apos;t load lab results.</div>;
  }
  const data = q.data;
  const queue = data.panels.filter((p) => p.reviewState !== "released");
  const released = data.panels.filter((p) => p.reviewState === "released");

  return (
    <div className="space-y-6">
      <section className="kairos-card space-y-3" aria-labelledby="coach-lab-review">
        <h2 id="coach-lab-review" className="text-base font-heading font-bold text-white flex items-center gap-2">
          <Hourglass size={16} aria-hidden /> Review &amp; release
          <span className="text-xs font-normal text-kairos-silver-dark">({queue.length} waiting)</span>
        </h2>
        {queue.length === 0 ? (
          <p className="text-sm text-kairos-silver-dark">Nothing to review. New uploads and parsed results will appear here before the client sees them.</p>
        ) : (
          <div className="space-y-4">
            {queue.map((p) => (
              <ReviewPanel key={p.resultId + (p.reviewedAt ?? "")} clientId={clientId} panel={p} hints={data.hintsByMarker} canEdit={canEdit} onEnterValues={onEnterValues} />
            ))}
          </div>
        )}
      </section>

      <section className="kairos-card space-y-3" aria-labelledby="coach-lab-markers">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="coach-lab-markers" className="text-base font-heading font-bold text-white flex items-center gap-2">
            <FlaskConical size={16} aria-hidden /> Biomarkers
          </h2>
          <p className="text-xs text-kairos-silver-dark">
            {data.counts.total} markers · {data.counts.inRange} in range · {data.counts.outOfRange} outside · {data.counts.noRange} without a range
            {queue.some((p) => p.reviewState === "pending_review" && p.markers.length > 0) && " · includes values not yet released"}
          </p>
        </div>
        {data.groups.length === 0 ? (
          <p className="text-sm text-kairos-silver-dark py-4 text-center">No lab values yet.</p>
        ) : (
          <BiomarkerGroups groups={data.groups} />
        )}
      </section>

      {released.length > 0 && (
        <section className="kairos-card space-y-2" aria-labelledby="coach-lab-released">
          <h2 id="coach-lab-released" className="text-base font-heading font-bold text-white">Released panels</h2>
          <ul className="divide-y divide-kairos-border">
            {released.map((p) => (
              <li key={p.resultId} className="py-2 flex flex-wrap items-start justify-between gap-2 text-sm">
                <div className="min-w-0">
                  <p className="text-white">{p.panelName} — {fmtDate(p.date)} <span className="text-xs text-kairos-silver-dark">· {p.markers.length} markers</span></p>
                  {p.coachNote && <p className="text-xs text-kairos-silver mt-0.5 whitespace-pre-line">Note: {p.coachNote}</p>}
                </div>
                <span className="text-xs text-kairos-silver-dark">Released {p.releasedAt ? fmtDate(p.releasedAt) : ""}</span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
