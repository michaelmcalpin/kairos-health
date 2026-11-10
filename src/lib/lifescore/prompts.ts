/**
 * Everist LifeScore™ curated prompt bank + rule-based selection.
 *
 * Wellbeing-coaching tone: supportive, curious, non-clinical, non-diagnostic.
 * No symptom language, no "you may have X." This is the fast, free backbone;
 * the AI follow-up in tag.ts only fires when the data shows a clear signal.
 */

import type { LifeDimension } from "@/server/db/schema";

export type PromptTrigger = "low" | "high" | "missed" | "neutral";

export interface Prompt {
  dimension: LifeDimension | "general";
  trigger: PromptTrigger;
  text: string;
}

export const PROMPT_BANK: Prompt[] = [
  // ── Body ──
  { dimension: "body", trigger: "low", text: "Your body's asking for something today. What would actually help — rest, food, movement, or a lighter load?" },
  { dimension: "body", trigger: "high", text: "You're feeling strong today. What's been working that's worth keeping?" },
  { dimension: "body", trigger: "neutral", text: "How does your body feel right now, honestly?" },

  // ── Mind ──
  { dimension: "mind", trigger: "low", text: "Sounds like your head's been full. What's taking up the most space today?" },
  { dimension: "mind", trigger: "high", text: "You seem clear-headed today. What helped you get there?" },
  { dimension: "mind", trigger: "neutral", text: "What's the emotional weather like for you today?" },

  // ── Purpose ──
  { dimension: "purpose", trigger: "low", text: "When things feel a bit flat, what usually reconnects you to what matters?" },
  { dimension: "purpose", trigger: "high", text: "Something felt meaningful today. What was it?" },
  { dimension: "purpose", trigger: "neutral", text: "Did anything today feel aligned with what you care about?" },

  // ── Relationships ──
  { dimension: "relationships", trigger: "low", text: "Relationships felt a little harder today. Is there a connection you're missing, or one that's draining you?" },
  { dimension: "relationships", trigger: "high", text: "Someone showed up for you today, or you for them. Want to note it?" },
  { dimension: "relationships", trigger: "neutral", text: "Who did you connect with today, and how did it feel?" },

  // ── Work ──
  { dimension: "work", trigger: "low", text: "Work's felt heavy a few days running. What's been sitting on you?" },
  { dimension: "work", trigger: "high", text: "Work felt good today. What went right?" },
  { dimension: "work", trigger: "neutral", text: "How's work sitting with you this week — energizing, draining, or somewhere in between?" },

  // ── General / missed-task ──
  { dimension: "general", trigger: "missed", text: "A couple of things slipped today. No judgment — what got in the way?" },
  { dimension: "general", trigger: "neutral", text: "Anything on your mind you'd like to get down before the day closes?" },
];

export interface PromptContext {
  /** Today's per-dimension ratings (1–5), missing = not rated. */
  ratings: Partial<Record<LifeDimension, number>>;
  /** Whether the client missed one or more scheduled tasks today. */
  missedTasks: boolean;
}

/**
 * Pure rule-based selection of the base prompt. Picks the dimension showing the
 * clearest signal (lowest or highest rating), falling back to missed-task or a
 * gentle neutral open-ended prompt.
 */
export function selectPrompt(ctx: PromptContext): Prompt {
  const rated = Object.entries(ctx.ratings)
    .filter(([, v]) => typeof v === "number") as Array<[LifeDimension, number]>;

  // Strongest signal: a low rating (≤2) is the most useful thing to ask about.
  const lows = rated.filter(([, v]) => v <= 2).sort((a, b) => a[1] - b[1]);
  if (lows.length > 0) {
    return pick(lows[0][0], "low");
  }

  // Missed tasks are the next most actionable — but only once the client has
  // checked in. Before any rating it read as a scolding ("things slipped
  // today…") first thing in the morning.
  if (ctx.missedTasks && rated.length > 0) {
    return pick("general", "missed");
  }

  // A standout high (=5) is worth reinforcing.
  const highs = rated.filter(([, v]) => v >= 5);
  if (highs.length > 0) {
    return pick(highs[0][0], "high");
  }

  // Otherwise rotate a neutral prompt across the rated dimensions (or general).
  if (rated.length > 0) {
    const dim = rated[Math.floor(Math.random() * rated.length)][0];
    return pick(dim, "neutral");
  }
  return pick("general", "neutral");
}

function pick(dimension: LifeDimension | "general", trigger: PromptTrigger): Prompt {
  const matches = PROMPT_BANK.filter((p) => p.dimension === dimension && p.trigger === trigger);
  if (matches.length > 0) return matches[Math.floor(Math.random() * matches.length)];
  // Fallbacks: same dimension neutral, then general neutral.
  const neutral = PROMPT_BANK.filter((p) => p.dimension === dimension && p.trigger === "neutral");
  if (neutral.length > 0) return neutral[0];
  return PROMPT_BANK.find((p) => p.dimension === "general" && p.trigger === "neutral")!;
}

export const MISS_REASONS = [
  { key: "too_tired", label: "Too tired" },
  { key: "no_time", label: "No time" },
  { key: "forgot", label: "Forgot" },
  { key: "pain", label: "Pain / sore" },
  { key: "not_feeling_it", label: "Not feeling it" },
  { key: "other", label: "Something else" },
] as const;
