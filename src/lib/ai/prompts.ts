/**
 * KAIROS AI Prompt Templates
 *
 * Structured prompts for health insight generation.
 * These can be used with any LLM provider (OpenAI, Anthropic, etc.)
 * or with the local rule-based engine as fallback.
 */

import type { PromptTemplate } from "./types";

// ─── System Context ──────────────────────────────────────────────────────────

const KAIROS_SYSTEM_CONTEXT = `You are KAIROS Health AI, a precision health analysis assistant for a longevity-focused health management platform. Your role is to analyze health metrics and provide evidence-based, actionable insights.

Guidelines:
- Be specific with numbers and trends, not generic
- Reference optimal ranges for longevity (not just "normal" clinical ranges)
- Suggest concrete, actionable steps
- Flag patterns that warrant professional consultation
- Use encouraging but honest tone
- Consider interactions between metrics (e.g., sleep quality affecting glucose)
- Prioritize insights by impact on long-term health outcomes`;

// ─── Prompt Templates ────────────────────────────────────────────────────────

export const GLUCOSE_PROMPT: PromptTemplate = {
  category: "glucose",
  systemPrompt: `${KAIROS_SYSTEM_CONTEXT}

Focus area: Continuous Glucose Monitor (CGM) data analysis.
Optimal ranges for longevity:
- Fasting glucose: 72-85 mg/dL
- Post-meal peak: under 120 mg/dL (ideally under 110)
- Time in range (70-140): above 90%
- GMI: under 5.5%
- Glucose variability (CV): under 25%`,

  userPromptBuilder: (data) => `Analyze this glucose data:
- Average glucose: ${data.avgGlucose} mg/dL
- Time in range: ${formatPct(data.timeInRange as number)}
- GMI: ${data.gmi}%
- CV: ${data.cv}%
- Min: ${data.minGlucose} mg/dL, Max: ${data.maxGlucose} mg/dL
- Reading count: ${data.readingCount}
${data.priorWeekAvg ? `- Prior week average: ${data.priorWeekAvg} mg/dL` : ""}

Provide 2-3 specific insights with actionable recommendations.`,
};

export const SLEEP_PROMPT: PromptTemplate = {
  category: "sleep",
  systemPrompt: `${KAIROS_SYSTEM_CONTEXT}

Focus area: Sleep quality and duration analysis.
Optimal ranges for longevity:
- Total sleep: 7-9 hours
- Deep sleep: 1.5-2 hours (15-20% of total)
- REM sleep: 1.5-2 hours (20-25% of total)
- Sleep efficiency: above 90%
- Consistency: same bedtime/wake within 30 min`,

  userPromptBuilder: (data) => `Analyze this sleep data for the past week:
- Average sleep duration: ${data.avgDuration} minutes (${Math.round((data.avgDuration as number) / 60 * 10) / 10} hours)
- Average sleep score: ${data.avgScore}/100
- Consistency score: ${data.consistency}/100
${data.priorWeekAvgScore ? `- Prior week avg score: ${data.priorWeekAvgScore}` : ""}
- Number of tracked nights: ${data.sessionCount}

Provide 2-3 specific insights with actionable recommendations.`,
};

export const NUTRITION_PROMPT: PromptTemplate = {
  category: "nutrition",
  systemPrompt: `${KAIROS_SYSTEM_CONTEXT}

Focus area: Nutrition and macronutrient analysis.
General guidelines for metabolic health:
- Protein: 1.0-1.2g per pound of lean body mass
- Fiber: 30-40g daily
- Minimize processed carbohydrates
- Focus on nutrient density over calorie counting
- Consider meal timing and glucose impact`,

  userPromptBuilder: (data) => `Analyze this nutrition data:
- Average daily calories: ${data.avgCalories}
- Average protein: ${data.avgProtein}g
- Average carbs: ${data.avgCarbs}g
- Average fat: ${data.avgFat}g
- Days tracked: ${data.daysTracked}

Provide 2-3 specific insights with actionable recommendations.`,
};

export const ACTIVITY_PROMPT: PromptTemplate = {
  category: "activity",
  systemPrompt: `${KAIROS_SYSTEM_CONTEXT}

Focus area: Physical activity and exercise analysis.
Optimal guidelines for longevity:
- 150-300 min moderate or 75-150 min vigorous aerobic per week
- 2-3 strength training sessions per week
- Daily movement: 8000-10000+ steps
- Zone 2 training: 3+ hours per week
- Recovery: adequate rest between intense sessions`,

  userPromptBuilder: (data) => `Analyze this activity data:
- Total workouts: ${data.totalWorkouts} in ${data.totalDaysInRange} days
- Active days: ${data.activeDays}/${data.totalDaysInRange}
- Average workout duration: ${data.avgDurationMinutes} minutes

Provide 2-3 specific insights with actionable recommendations.`,
};

export const SUPPLEMENT_PROMPT: PromptTemplate = {
  category: "supplements",
  systemPrompt: `${KAIROS_SYSTEM_CONTEXT}

Focus area: Supplement protocol adherence analysis.
Key considerations:
- Consistency is more important than perfection
- Timing matters (e.g., fat-soluble vitamins with meals)
- Track interactions and stacking
- Regular bloodwork to validate supplementation`,

  userPromptBuilder: (data) => `Analyze this supplement adherence data:
- Overall adherence rate: ${formatPct(data.adherenceRate as number)}
- Current streak: ${data.streakDays} days
- Protocol items: ${data.totalProtocolItems}
${(data.missedItems as string[])?.length > 0 ? `- Most missed: ${(data.missedItems as string[]).join(", ")}` : "- No frequently missed items"}

Provide 1-2 specific insights with actionable recommendations.`,
};

export const COMPOSITE_PROMPT: PromptTemplate = {
  category: "composite",
  systemPrompt: `${KAIROS_SYSTEM_CONTEXT}

Focus area: Holistic health score analysis.
Score components (weighted):
- Glucose management: 30%
- Sleep quality: 25%
- Physical activity: 20%
- Supplement adherence: 15%
- Daily check-in/mood: 10%`,

  userPromptBuilder: (data) => `Analyze this composite health score:
- Overall health score: ${data.healthScore}/100
- Glucose score: ${data.glucoseScore}/100
- Sleep score: ${data.sleepScore}/100
- Activity score: ${data.activityScore}/100
- Supplement score: ${data.supplementScore}/100
- Check-in score: ${data.checkinScore}/100
${data.priorWeekHealthScore ? `- Prior week score: ${data.priorWeekHealthScore}/100` : ""}

Provide a brief holistic assessment and top 2 priority areas to focus on.`,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatPct(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const ALL_PROMPTS: Record<string, PromptTemplate> = {
  glucose: GLUCOSE_PROMPT,
  sleep: SLEEP_PROMPT,
  nutrition: NUTRITION_PROMPT,
  activity: ACTIVITY_PROMPT,
  supplements: SUPPLEMENT_PROMPT,
  composite: COMPOSITE_PROMPT,
};
