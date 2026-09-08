"use client";

import { useMemo, useState } from "react";
import { HeartPulse, Brain, Compass, Users, Briefcase, Sparkles, Lock } from "lucide-react";

import { trpc } from "@/lib/trpc";
import { cn } from "@/utils/cn";

type Dimension = "body" | "mind" | "purpose" | "relationships" | "work";

const DIMENSIONS: { key: Dimension; label: string; scope: string; Icon: typeof HeartPulse; color: string }[] = [
  { key: "body", label: "Body", scope: "Fitness, sleep, nutrition", Icon: HeartPulse, color: "#5DCAA5" },
  { key: "mind", label: "Mind", scope: "Mental, emotional", Icon: Brain, color: "#8F7FD6" },
  { key: "purpose", label: "Purpose", scope: "Meaning, values", Icon: Compass, color: "#7FB5E0" },
  { key: "relationships", label: "Relationships", scope: "Family, friends, connection", Icon: Users, color: "#E78FB1" },
  { key: "work", label: "Work", scope: "Career, stress, stability", Icon: Briefcase, color: "#E0A24A" },
];

function Ring({ score }: { score: number | null }) {
  const size = 160, stroke = 13, r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const pct = score == null ? 0 : Math.max(0, Math.min(100, score)) / 100;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} stroke="#1f2b45" strokeWidth={stroke} fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke="#4A90D9" strokeWidth={stroke} fill="none"
          strokeLinecap="round" strokeDasharray={`${circ * pct} ${circ}`}
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-4xl font-heading font-bold text-white">{score == null ? "—" : score}</span>
        <span className="text-xs text-gray-500 mt-1">LifeScore</span>
      </div>
    </div>
  );
}

export default function LifeScorePage() {
  const utils = trpc.useUtils();
  const [ratings, setRatings] = useState<Partial<Record<Dimension, number>>>({});
  const [journal, setJournal] = useState("");
  const [followUp, setFollowUp] = useState<string | null>(null);

  const scoreQuery = trpc.clientPortal.lifeScore.getScore.useQuery(undefined, { retry: false });
  const promptQuery = trpc.clientPortal.lifeScore.getPrompt.useQuery(undefined, { retry: false });
  const historyQuery = trpc.clientPortal.lifeScore.getJournalHistory.useQuery({ limit: 10 }, { retry: false });

  const submitCheckin = trpc.clientPortal.lifeScore.submitCheckin.useMutation();
  const saveJournal = trpc.clientPortal.lifeScore.saveJournal.useMutation();

  const score = scoreQuery.data;
  const dimResults = useMemo(() => {
    const m = new Map<string, { score: number | null; sentiment: string }>();
    for (const d of score?.dimensions ?? []) m.set(d.dimension, { score: d.score, sentiment: d.sentiment });
    return m;
  }, [score]);

  const prompt = promptQuery.data;
  const history = historyQuery.data ?? [];

  const setRating = (dim: Dimension, val: number) =>
    setRatings((p) => ({ ...p, [dim]: p[dim] === val ? undefined : val }));

  const handleSubmitCheckin = async () => {
    const entries = DIMENSIONS.filter((d) => ratings[d.key] != null)
      .map((d) => ({ dimension: d.key, rating: ratings[d.key] as number }));
    if (entries.length === 0) return;
    const res = await submitCheckin.mutateAsync({ ratings: entries });
    setFollowUp(res?.followUp ?? null);
    await Promise.all([
      utils.clientPortal.lifeScore.getScore.invalidate(),
      utils.clientPortal.lifeScore.getPrompt.invalidate(),
    ]);
  };

  const handleSaveJournal = async () => {
    if (!journal.trim()) return;
    await saveJournal.mutateAsync({ text: journal.trim() });
    setJournal("");
    await Promise.all([historyQuery.refetch(), utils.clientPortal.lifeScore.getScore.invalidate()]);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-heading font-bold text-white">Everist LifeScore™</h1>
        <p className="text-gray-400 mt-1 max-w-2xl">
          Your health is more than your body. LifeScore measures the five dimensions that shape how well you&apos;re actually living.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Score + dimensions */}
        <div className="kairos-card">
          {scoreQuery.isLoading ? (
            <div className="h-64 animate-pulse bg-gray-800/50 rounded-lg" />
          ) : (
            <>
              <div className="flex justify-center mb-5">
                <Ring score={score?.score ?? null} />
              </div>
              <div className="space-y-3">
                {DIMENSIONS.map((d) => {
                  const r = dimResults.get(d.key);
                  const val = r?.score ?? null;
                  return (
                    <div key={d.key} className="flex items-center gap-3">
                      <d.Icon size={16} style={{ color: d.color }} />
                      <div className="flex-1">
                        <div className="h-1.5 bg-kairos-royal-surface rounded-full overflow-hidden">
                          <div className="h-full rounded-full transition-all duration-700"
                            style={{ width: `${val ?? 0}%`, background: d.color }} />
                        </div>
                      </div>
                      <span className="text-xs text-gray-300 w-24 text-right">{d.label}</span>
                      <span className="text-sm font-semibold text-white w-8 text-right">{val ?? "—"}</span>
                    </div>
                  );
                })}
              </div>
              {!score?.hasData && (
                <p className="text-xs text-gray-500 text-center mt-4">
                  Rate a few dimensions to start building your LifeScore.
                </p>
              )}
            </>
          )}
        </div>

        {/* Daily check-in */}
        <div className="kairos-card">
          <h2 className="text-sm font-heading font-bold text-kairos-gold mb-1">Today&apos;s check-in</h2>
          <p className="text-xs text-gray-500 mb-4">Rate each area. Skip any you&apos;d rather not.</p>
          {DIMENSIONS.map((d) => (
            <div key={d.key} className="flex items-center justify-between py-2">
              <span className="flex items-center gap-2 text-sm text-gray-200">
                <d.Icon size={15} style={{ color: d.color }} /> {d.label}
              </span>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => {
                  const active = (ratings[d.key] ?? 0) >= n;
                  return (
                    <button key={n} type="button" onClick={() => setRating(d.key, n)}
                      aria-label={`${d.label} ${n}`}
                      className="w-4 h-4 rounded-full border transition-colors"
                      style={{
                        borderColor: active ? d.color : "#3a4763",
                        background: active ? d.color : "transparent",
                      }} />
                  );
                })}
              </div>
            </div>
          ))}

          {(followUp || prompt?.text) && (
            <div className="mt-4 rounded-xl bg-kairos-royal-surface p-3">
              <p className="text-[10px] uppercase tracking-wide text-kairos-gold font-semibold mb-1 flex items-center gap-1">
                <Sparkles size={11} /> {followUp ? "Follow-up" : "Reflection"}
              </p>
              <p className="text-sm text-gray-200 leading-relaxed">{followUp ?? prompt?.text}</p>
            </div>
          )}

          <button type="button" onClick={handleSubmitCheckin} disabled={submitCheckin.isPending}
            className="w-full mt-4 px-4 py-2.5 rounded-lg bg-kairos-gold text-kairos-royal-dark font-heading font-semibold text-sm hover:bg-kairos-gold/90 transition-colors disabled:opacity-60">
            {submitCheckin.isPending ? "Saving…" : "Save check-in"}
          </button>
        </div>
      </div>

      {/* Journal */}
      <div className="kairos-card mt-6">
        <h2 className="text-sm font-heading font-bold text-kairos-gold mb-3">Journal</h2>
        <textarea
          value={journal}
          onChange={(e) => setJournal(e.target.value)}
          placeholder="Anything on your mind — work, relationships, how you're feeling…"
          rows={4}
          className="w-full rounded-xl bg-kairos-royal-surface border border-kairos-border p-3 text-sm text-white placeholder-gray-500 resize-y"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="flex items-center gap-1.5 text-xs text-gray-500">
            <Lock size={12} /> Private — your coach sees themes, not the words.
          </span>
          <button type="button" onClick={handleSaveJournal} disabled={saveJournal.isPending || !journal.trim()}
            className="px-4 py-2 rounded-lg bg-kairos-royal-surface hover:bg-kairos-card-hover text-white text-sm font-heading font-semibold transition-colors disabled:opacity-50">
            {saveJournal.isPending ? "Saving…" : "Save entry"}
          </button>
        </div>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div className="mt-6">
          <h2 className="text-lg font-heading font-bold text-white mb-3">Recent entries</h2>
          <div className="space-y-3">
            {history.map((h) => (
              <div key={h.id} className="kairos-card">
                <p className="text-xs text-kairos-gold mb-1">{h.date}</p>
                <p className="text-sm text-gray-200 leading-relaxed">{h.text}</p>
                {h.themes.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {h.themes.map((t, i) => (
                      <span key={i} className={cn("text-xs px-2.5 py-1 rounded-full bg-kairos-royal-surface text-gray-300")}>
                        {t.dimension} · {t.theme}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
