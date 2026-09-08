/**
 * Everist LifeScore™ — AI journal theme-tagging + conditional adaptive follow-up.
 *
 * Privacy: tagging turns a private free-text entry into a small set of
 * {dimension, theme, valence} tags. The raw text stays client-private; only
 * these tags (and derived sentiment) are ever surfaced to a coach.
 *
 * Both functions are best-effort and NEVER fabricate: on any error, or with no
 * API key, they return an empty result rather than a guess.
 */

import Anthropic from "@anthropic-ai/sdk";

import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { LIFE_DIMENSIONS, type LifeDimension } from "@/server/db/schema";

export interface JournalTheme {
  dimension: LifeDimension;
  theme: string;
  valence: "positive" | "neutral" | "negative";
}

function client(): Anthropic | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function extractJson(text: string): unknown {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = (fenced ? fenced[1] : text).trim();
  const start = raw.search(/[[{]/);
  if (start === -1) return null;
  try {
    return JSON.parse(raw.slice(start));
  } catch {
    return null;
  }
}

/**
 * Tag a journal entry with up to ~4 {dimension, theme, valence} tags.
 * Returns [] on any failure — callers must treat [] as "not tagged," not
 * "nothing there."
 */
export async function tagJournalEntry(text: string): Promise<JournalTheme[]> {
  const anthropic = client();
  if (!anthropic || !text.trim()) return [];

  try {
    const res = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 512,
      system:
        `You tag short wellbeing-journal entries for the Everist LifeScore system. ` +
        `Classify the entry into up to 4 tags across these five life dimensions ONLY: ` +
        `${LIFE_DIMENSIONS.join(", ")}. ` +
        `Each tag is {dimension, theme, valence}. "theme" is a 1–3 word lowercase phrase ` +
        `(e.g. "work overload", "conflict", "consistent movement"). "valence" is one of ` +
        `positive, neutral, negative. Be supportive and non-clinical — never diagnose or ` +
        `use medical/mental-health condition labels. Respond ONLY with a JSON array, no prose.`,
      messages: [{ role: "user", content: text.slice(0, 4000) }],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return [];
    const parsed = extractJson(block.text);
    if (!Array.isArray(parsed)) return [];

    const valid = new Set(LIFE_DIMENSIONS);
    return parsed
      .filter((t): t is JournalTheme =>
        !!t && typeof t === "object" &&
        valid.has((t as JournalTheme).dimension) &&
        typeof (t as JournalTheme).theme === "string" &&
        ["positive", "neutral", "negative"].includes((t as JournalTheme).valence),
      )
      .slice(0, 4)
      .map((t) => ({ dimension: t.dimension, theme: String(t.theme).slice(0, 40), valence: t.valence }));
  } catch {
    return [];
  }
}

/**
 * Generate ONE tailored follow-up question, but only when the caller has already
 * decided a clear data signal exists (see shouldGenerateFollowUp). Returns null
 * on any failure so the curated prompt is used instead.
 */
export async function generateFollowUp(signal: string): Promise<string | null> {
  const anthropic = client();
  if (!anthropic) return null;
  try {
    const res = await anthropic.messages.create({
      model: ANTHROPIC_MODEL,
      max_tokens: 128,
      system:
        `You are a warm, non-clinical wellbeing coach inside the Everist app. ` +
        `Given a short factual signal about a client's recent data, write ONE brief, ` +
        `caring follow-up question (max 25 words) that invites reflection. ` +
        `Never diagnose, never alarm, never give medical advice. Respond with the question only.`,
      messages: [{ role: "user", content: signal.slice(0, 1000) }],
    });
    const block = res.content.find((b) => b.type === "text");
    if (!block || block.type !== "text") return null;
    const q = block.text.trim().replace(/^["']|["']$/g, "");
    return q.length > 0 ? q.slice(0, 200) : null;
  } catch {
    return null;
  }
}
