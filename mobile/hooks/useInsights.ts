/**
 * useInsights — Custom hooks for AI health analysis and insights.
 *
 * Tries to fetch insights from the tRPC backend.
 * Falls back to sample data when the API is unreachable.
 *
 * tRPC paths used (under `clientPortal`):
 *   - insights.getAnalysis    -> AI analysis for a specific type/range
 *   - insights.listHistory    -> past analysis history
 *   - insights.askQuestion    -> AI Q&A mutation
 */

import { trpc, DEFAULT_QUERY_OPTIONS, STATIC_QUERY_OPTIONS } from "@/lib/api";

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
// Sample Data
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

const SAMPLE_GLUCOSE_ANALYSIS: HealthAnalysis = {
  id: "analysis-glucose-30d",
  type: "glucose",
  title: "Glucose Analysis",
  summary:
    "Your glucose levels have been generally well-controlled over the past 30 days, with an average of 108 mg/dL. Post-meal spikes remain the primary area for improvement.",
  range: "30d",
  generatedAt: "2026-06-14T08:00:00Z",
  score: 76,
  scoreChange: 3,
  insights: [
    {
      id: "gi-1",
      title: "Average glucose trending down",
      description:
        "Your 30-day average glucose decreased from 114 to 108 mg/dL, indicating improved metabolic control.",
      severity: "positive",
      metric: "Average Glucose",
      value: "108 mg/dL",
      trend: "down",
    },
    {
      id: "gi-2",
      title: "Post-meal spikes above target",
      description:
        "You experienced 8 post-meal readings above 140 mg/dL this month, primarily after lunch (62% of spikes).",
      severity: "attention",
      metric: "Spikes > 140",
      value: "8 episodes",
      trend: "stable",
    },
    {
      id: "gi-3",
      title: "Fasting glucose optimal",
      description:
        "Your fasting glucose averaged 88 mg/dL, which is within the optimal range of 70-100 mg/dL.",
      severity: "positive",
      metric: "Fasting Glucose",
      value: "88 mg/dL",
      trend: "stable",
    },
    {
      id: "gi-4",
      title: "Time in range improved",
      description:
        "Time in range (70-140 mg/dL) increased from 82% to 87%, approaching the 90% target.",
      severity: "positive",
      metric: "Time in Range",
      value: "87%",
      trend: "up",
    },
  ],
  recommendations: [
    {
      id: "gr-1",
      title: "Walk 10-15 minutes after lunch",
      description:
        "A short post-meal walk can reduce glucose spikes by 20-30%. Focus on lunch, where most spikes occur.",
      priority: "high",
      actionable: true,
    },
    {
      id: "gr-2",
      title: "Consider protein-first eating",
      description:
        "Eating protein and vegetables before carbohydrates can reduce post-meal glucose spikes by up to 40%.",
      priority: "medium",
      actionable: true,
    },
    {
      id: "gr-3",
      title: "Maintain Metformin timing",
      description:
        "Your current Metformin schedule appears well-optimized. Continue taking it 30 minutes before meals.",
      priority: "low",
      actionable: false,
    },
  ],
};

const SAMPLE_SLEEP_ANALYSIS: HealthAnalysis = {
  id: "analysis-sleep-30d",
  type: "sleep",
  title: "Sleep Analysis",
  summary:
    "Sleep quality has declined 12% this month. Deep sleep duration is the primary concern, averaging 48 minutes vs. the 66-minute target.",
  range: "30d",
  generatedAt: "2026-06-13T06:00:00Z",
  score: 68,
  scoreChange: -8,
  insights: [
    {
      id: "si-1",
      title: "Deep sleep below target",
      description:
        "Deep sleep averaged 48 minutes per night, down from 66 minutes. This impacts physical recovery and memory consolidation.",
      severity: "warning",
      metric: "Deep Sleep",
      value: "48 min",
      trend: "down",
    },
    {
      id: "si-2",
      title: "Bedtime shifting later",
      description:
        "Average bedtime moved from 10:55 PM to 11:42 PM over the past two weeks.",
      severity: "attention",
      metric: "Avg Bedtime",
      value: "11:42 PM",
      trend: "up",
    },
    {
      id: "si-3",
      title: "REM sleep is stable",
      description:
        "REM sleep averaged 1h 42m per night, which is within the healthy range.",
      severity: "positive",
      metric: "REM Sleep",
      value: "1h 42m",
      trend: "stable",
    },
  ],
  recommendations: [
    {
      id: "sr-1",
      title: "Set a consistent 10:30 PM bedtime",
      description:
        "Consistent sleep timing is the single most impactful change for improving deep sleep duration.",
      priority: "high",
      actionable: true,
    },
    {
      id: "sr-2",
      title: "Reduce screen time after 9 PM",
      description:
        "Blue light exposure before bed suppresses melatonin production and reduces deep sleep quality.",
      priority: "high",
      actionable: true,
    },
  ],
};

const SAMPLE_ANALYSIS_MAP: Partial<Record<AnalysisType, HealthAnalysis>> = {
  glucose: SAMPLE_GLUCOSE_ANALYSIS,
  sleep: SAMPLE_SLEEP_ANALYSIS,
};

const SAMPLE_ANALYSIS_HISTORY: AnalysisHistoryItem[] = [
  {
    id: "analysis-glucose-30d",
    type: "glucose",
    title: "Glucose Analysis (30-day)",
    summary: "Glucose levels well-controlled. Post-meal spikes are the primary area for improvement.",
    generatedAt: "2026-06-14T08:00:00Z",
    score: 76,
  },
  {
    id: "analysis-sleep-30d",
    type: "sleep",
    title: "Sleep Analysis (30-day)",
    summary: "Sleep quality declined 12%. Deep sleep duration is the primary concern.",
    generatedAt: "2026-06-13T06:00:00Z",
    score: 68,
  },
  {
    id: "analysis-cardio-30d",
    type: "cardiovascular",
    title: "Cardiovascular Analysis (30-day)",
    summary: "Blood pressure trending upward. HRV remains strong at 52ms average.",
    generatedAt: "2026-06-10T08:00:00Z",
    score: 72,
  },
  {
    id: "analysis-overall-90d",
    type: "overall",
    title: "Overall Health Report (90-day)",
    summary: "Overall health score improved to 78. Sleep and glucose remain key focus areas.",
    generatedAt: "2026-06-09T08:00:00Z",
    score: 78,
  },
  {
    id: "analysis-exercise-30d",
    type: "exercise",
    title: "Exercise Analysis (30-day)",
    summary: "Training volume consistent. Strength gains noted in upper body compound lifts.",
    generatedAt: "2026-06-05T08:00:00Z",
    score: 82,
  },
];

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// useHealthAnalysis — AI analysis for a specific type and range
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export function useHealthAnalysis(
  type: AnalysisType = "overall",
  range: AnalysisRange = "30d",
) {
  const query = trpc.clientPortal.insights.getAnalysis.useQuery(
    { type, range },
    DEFAULT_QUERY_OPTIONS,
  );

  const analysis: HealthAnalysis | null = query.data
    ? mapApiAnalysis(query.data)
    : SAMPLE_ANALYSIS_MAP[type] ?? null;

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
  const query = trpc.clientPortal.insights.listHistory.useQuery(
    undefined,
    STATIC_QUERY_OPTIONS,
  );

  const history: AnalysisHistoryItem[] = query.data
    ? (query.data as any[]).map(mapApiHistoryItem)
    : SAMPLE_ANALYSIS_HISTORY;

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
  const mutation = trpc.clientPortal.insights.askQuestion.useMutation();

  const ask = (question: string) => {
    mutation.mutate({ question });
  };

  // Shape the response
  const response: AskQuestionResponse | null = mutation.data
    ? {
        answer: (mutation.data as any).answer ?? "",
        sources: (mutation.data as any).sources ?? [],
        followUpQuestions: (mutation.data as any).followUpQuestions ?? [],
      }
    : null;

  return {
    ask,
    response,
    isLoading: mutation.isPending,
    error: mutation.error,
    isSuccess: mutation.isSuccess,
    reset: mutation.reset,
  };
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// Helpers
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function mapApiAnalysis(raw: any): HealthAnalysis {
  return {
    id: raw.id,
    type: raw.type ?? "overall",
    title: raw.title ?? "",
    summary: raw.summary ?? "",
    range: raw.range ?? "30d",
    generatedAt: raw.generatedAt ?? raw.createdAt ?? "",
    score: raw.score ?? undefined,
    scoreChange: raw.scoreChange ?? undefined,
    insights: (raw.insights ?? []).map((i: any) => ({
      id: i.id,
      title: i.title ?? "",
      description: i.description ?? "",
      severity: i.severity ?? "neutral",
      metric: i.metric ?? undefined,
      value: i.value ?? undefined,
      trend: i.trend ?? undefined,
    })),
    recommendations: (raw.recommendations ?? []).map((r: any) => ({
      id: r.id,
      title: r.title ?? "",
      description: r.description ?? "",
      priority: r.priority ?? "medium",
      actionable: r.actionable ?? false,
    })),
  };
}

function mapApiHistoryItem(raw: any): AnalysisHistoryItem {
  return {
    id: raw.id,
    type: raw.type ?? "overall",
    title: raw.title ?? "",
    summary: raw.summary ?? "",
    generatedAt: raw.generatedAt ?? raw.createdAt ?? "",
    score: raw.score ?? undefined,
  };
}
