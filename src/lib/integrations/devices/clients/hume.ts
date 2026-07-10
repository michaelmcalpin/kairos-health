/**
 * Hume AI API client.
 *
 * Fetches emotion analysis data from the Hume platform.
 * Hume provides voice prosody analysis, facial expression measurement,
 * and emotional wellbeing scores.
 *
 * API docs: https://dev.hume.ai/docs
 */

import { env } from "@/lib/config/env";

const HUME_API_BASE = "https://api.hume.ai/v0";

interface HumeEmotionScore {
  name: string;
  score: number;
}

interface HumeMeasurement {
  id: string;
  timestamp: string;
  emotions: HumeEmotionScore[];
  overall_sentiment: number;
  wellbeing_score: number | null;
}

interface HumeAnalysisResult {
  measurements: HumeMeasurement[];
  summary: {
    dominant_emotion: string;
    average_sentiment: number;
    wellbeing_trend: "improving" | "stable" | "declining" | null;
  };
}

/**
 * Fetch recent emotion measurements from Hume AI.
 */
export async function fetchHumeEmotionData(
  accessToken: string,
  since?: Date,
): Promise<HumeAnalysisResult> {
  const params = new URLSearchParams();
  if (since) {
    params.set("start_time", since.toISOString());
  }
  params.set("limit", "100");

  const response = await fetch(
    `${HUME_API_BASE}/measurements?${params.toString()}`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: "application/json",
      },
    },
  );

  if (!response.ok) {
    throw new Error(`Hume API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();

  // Transform Hume's response format to our internal structure
  const measurements: HumeMeasurement[] = (data.results ?? data.data ?? []).map(
    (item: any) => ({
      id: item.id ?? crypto.randomUUID(),
      timestamp: item.created_at ?? item.timestamp ?? new Date().toISOString(),
      emotions: (item.predictions?.emotions ?? item.emotions ?? []).map(
        (e: any) => ({
          name: e.name,
          score: e.score,
        }),
      ),
      overall_sentiment: item.sentiment_score ?? 0,
      wellbeing_score: item.wellbeing_score ?? null,
    }),
  );

  // Calculate summary
  const allEmotions = new Map<string, number[]>();
  for (const m of measurements) {
    for (const e of m.emotions) {
      const existing = allEmotions.get(e.name) ?? [];
      existing.push(e.score);
      allEmotions.set(e.name, existing);
    }
  }

  let dominantEmotion = "neutral";
  let highestAvg = 0;
  allEmotions.forEach((scores: number[], name: string) => {
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / scores.length;
    if (avg > highestAvg) {
      highestAvg = avg;
      dominantEmotion = name;
    }
  });

  const avgSentiment =
    measurements.length > 0
      ? measurements.reduce((sum, m) => sum + m.overall_sentiment, 0) /
        measurements.length
      : 0;

  return {
    measurements,
    summary: {
      dominant_emotion: dominantEmotion,
      average_sentiment: avgSentiment,
      wellbeing_trend: null,
    },
  };
}

/**
 * Refresh an expired Hume OAuth token.
 */
export async function refreshHumeToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const response = await fetch("https://platform.hume.ai/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: env.HUME_CLIENT_ID,
      client_secret: env.HUME_CLIENT_SECRET,
    }),
  });

  if (!response.ok) {
    throw new Error(`Hume token refresh failed: ${response.status}`);
  }

  const data = await response.json();
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? refreshToken,
    expiresIn: data.expires_in ?? 3600,
  };
}
