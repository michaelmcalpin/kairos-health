/**
 * useInsights — Custom hooks for AI health analysis and insights.
 *
 * Fetches insights from the tRPC backend. Returns null / empty when there is
 * no real analysis to show — never fabricated sample data.
 *
 * tRPC paths used (under `clientPortal`):
 *   - insights.getAnalysis    -> AI analysis for a specific type/range
 *   - insights.listHistory    -> past analysis history
 *   - insights.askQuestion    -> AI Q&A mutation
 */

import { trpc, DEFAULT_QUERY_OPTIONS } from "@/lib/api";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Types
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type AnalysisType =
  | "glucose"
  | "sleep"
  | "cardiovascular"
  | "nutrition"
  | "exercise"
  | "overall"
  | "protocols";

export type AnalysisRange = "7d" | "30d" | "90d" | "6m" | "1y";

export type InsightSeverity = "positive" | "neutral" | "attention" | "warning";

export interface HealthAnalysis {
  id: string;
  type: AnalysisType;
  title: string;
  summary: string;
  range: AnalysisRange;
  generatedAt: string;
  score?: number;
  scoreChange?: number;
  insights: AnalysisInsight[];
  recommendations: AnalysisRecommendation[];
}

export interface AnalysisInsight {
  id: string;
  title: string;
  description: string;
  severity: InsightSeverity;
  metric?: string;
  value?: string;
  trend?: "up" | "down" | "stable";
}

export interface AnalysisRecommendation {
  id: string;
  title: string;
  description: string;
  priority: "high" | "medium" | "low";
  actionable: boolean;
}

export interface AnalysisHistoryItem {
  id: string;
  type: AnalysisType;
  title: string;
  summary: string;
  generatedAt: string;
  score?: number;
}

export interface AskQuestionResponse {
  answer: string;
  sources: { label: string; type: string }[];
  followUpQuestions: string[];
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useHealthAnalysis — AI analysis for a specific type and range
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function rangeToDays(range: AnalysisRange): number {
  switch (range) {
    case "7d": return 7;
    case "30d": return 30;
    case "90d": return 90;
    case "6m": return 180;
    case "1y": return 365;
    default: return 30;
  }
}

export function useHealthAnalysis(
  type: AnalysisType = "overall",
  range: AnalysisRange = "30d",
) {
  const days = rangeToDays(range);
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000).toISOString();

  const query = trpc.clientPortal.insights.getAll.useQuery(
    { startDate, endDate },
    DEFAULT_QUERY_OPTIONS,
  );

  // Real data only — no fabricated sample analysis rendered as the user's own.
  const analysis: HealthAnalysis | null = query.data
    ? mapApiAnalysis(query.data)
    : null;

  return {
    analysis,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAnalysisHistory — list of past analyses
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAnalysisHistory() {
  // Use insights.getAll with a 90-day window to build history from real insights
  const endDate = new Date().toISOString();
  const startDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  const query = trpc.clientPortal.insights.getAll.useQuery(
    { startDate, endDate },
    DEFAULT_QUERY_OPTIONS,
  );

  // Real data only — no fabricated sample history.
  const history: AnalysisHistoryItem[] = query.data
    ? (query.data as any).insights
        ?.map((insight: any) => mapInsightToHistoryItem(insight, insight.category))
        ?? []
    : [];

  return {
    history,
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useAskQuestion — mutation for AI Q&A
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useAskQuestion() {
  // Backend does not have insights.askQuestion — return a no-op
  const ask = (_question: string) => {
    // No-op: endpoint does not exist on backend
  };

  return {
    ask,
    response: null as AskQuestionResponse | null,
    isLoading: false,
    error: null,
    isSuccess: false,
    reset: () => {},
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

/**
 * Maps the backend `insights.getAll` response to a HealthAnalysis.
 *
 * Backend shape: { insights: HealthInsight[], period: { startDate, endDate }, generatedAt }
 * Each HealthInsight has: id, category, severity, title, description, recommendation?, confidence, dataSource, timestamp
 */
function mapApiAnalysis(raw: any): HealthAnalysis {
  // The backend returns a wrapper: { insights: [...], period, generatedAt }
  const insightsArray: any[] = raw.insights ?? [];

  // Derive a summary from the insights
  const summaryParts = insightsArray.map((i: any) => i.title).filter(Boolean);
  const summary = summaryParts.length > 0
    ? summaryParts.join(". ") + "."
    : "No insights available for this period.";

  // Map severity: backend uses "info" | "warning" | "positive" | "critical"
  // Frontend expects "positive" | "neutral" | "attention" | "warning"
  const mapSeverity = (s: string): InsightSeverity => {
    switch (s) {
      case "positive": return "positive";
      case "warning": return "attention";
      case "critical": return "warning";
      case "info":
      default: return "neutral";
    }
  };

  return {
    id: `analysis-${raw.period?.startDate ?? "unknown"}`,
    type: "overall",
    title: "Health Analysis",
    summary,
    range: "30d",
    generatedAt: raw.generatedAt ?? "",
    score: undefined,
    scoreChange: undefined,
    insights: insightsArray.map((i: any) => ({
      id: i.id ?? crypto.randomUUID?.() ?? String(Math.random()),
      title: i.title ?? "",
      description: i.description ?? "",
      severity: mapSeverity(i.severity),
      metric: i.category ?? undefined,
      value: undefined,
      trend: undefined,
    })),
    recommendations: insightsArray
      .filter((i: any) => i.recommendation)
      .map((i: any) => ({
        id: `rec-${i.id ?? Math.random()}`,
        title: i.title ?? "",
        description: i.recommendation ?? "",
        priority: i.severity === "critical" ? "high" as const : i.severity === "warning" ? "medium" as const : "low" as const,
        actionable: true,
      })),
  };
}

/**
 * Maps a backend HealthInsight (from getAll) to an AnalysisHistoryItem.
 */
function mapInsightToHistoryItem(insight: any, category: string): AnalysisHistoryItem {
  const typeMap: Record<string, AnalysisType> = {
    glucose: "glucose",
    sleep: "sleep",
    composite: "overall",
    nutrition: "nutrition",
    activity: "exercise",
  };
  return {
    id: insight.id ?? String(Math.random()),
    type: typeMap[category] ?? "overall",
    title: insight.title ?? "",
    summary: insight.description ?? "",
    generatedAt: insight.timestamp ?? "",
    score: undefined,
  };
}
