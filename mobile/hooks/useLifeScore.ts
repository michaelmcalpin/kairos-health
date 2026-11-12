/**
 * The one score the app shows: the Core LifeScore (60% Physical + 40% Mental),
 * from clientPortal.lifeScore.getScore — the same number as the web app.
 */
import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

export interface LifeScoreAction { key: string; area: "physical" | "mental"; title: string; detail: string; gain: number | null; href: string }
interface Part { key: string; label: string; score: number | null; weight: number; detail: string | null }
export interface LifeScoreData {
  score: number | null;
  hasData: boolean;
  physical: { score: number | null; sentiment: string; parts: Part[] };
  mental: { score: number | null; sentiment: string };
  actions?: LifeScoreAction[];
}

export function useLifeScore() {
  const q = trpc.clientPortal.lifeScore.getScore.useQuery(undefined, DEFAULT_QUERY_OPTIONS);
  const data = q.data as LifeScoreData | undefined;
  return {
    data,
    core: data?.score ?? null,
    physical: data?.physical?.score ?? null,
    mental: data?.mental?.score ?? null,
    topAction: data?.actions?.[0] ?? null,
    isLoading: q.isLoading,
    refetch: q.refetch,
  };
}

/** Plain words for a well / steady / struggling sentiment. */
export function sentimentWords(s: string | undefined): string {
  return s === "well" ? "Going well" : s === "struggling" ? "Needs care" : s === "steady" ? "Steady" : "No trend yet";
}

/** "+18 pts" style estimate text. */
export function gainWords(g: number | null | undefined): string {
  return g == null ? "" : ` (up to +${g >= 10 ? Math.round(g) : g} pts)`;
}
