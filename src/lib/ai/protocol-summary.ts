/**
 * Client-facing protocol change summaries.
 *
 * When a trainer bulk-edits a client's protocol (diet, supplements, peptides,
 * or workout schedule) the system computes the old vs new state. This module
 * turns that BEFORE/AFTER diff into a short, warm, plain-language summary the
 * client can read in their change alert.
 *
 * Design goals:
 *   - Match existing AI-call conventions (see src/app/api/reports/generate/route.ts):
 *     same @anthropic-ai/sdk client, ANTHROPIC_MODEL, ANTHROPIC_API_KEY env,
 *     callWithRetry wrapper, and defensive JSON parsing.
 *   - NEVER throw. If the API key is missing, the API errors, or JSON parsing
 *     fails, fall back to a deterministic diff computed from BEFORE/AFTER so the
 *     caller always receives a usable summary.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { callWithRetry } from "@/lib/ai/retry";

export type ProtocolType = "diet" | "supplements" | "peptides" | "workouts";

export interface ProtocolChangeInput {
  type: ProtocolType;
  clientFirstName?: string;
  before: unknown;
  after: unknown;
}

// Keep BEFORE/AFTER payloads modest so we stay well within token limits.
const MAX_JSON_CHARS = 6000;

// Human-friendly labels for each protocol type.
const TYPE_LABELS: Record<ProtocolType, string> = {
  diet: "diet",
  supplements: "supplement",
  peptides: "peptide",
  workouts: "workout",
};

const SYSTEM_PROMPT =
  "You summarize fitness/wellness protocol changes for a client in plain, friendly language. Only describe what actually changed between BEFORE and AFTER. Do not give medical advice or add recommendations. Be concise.";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Compactly stringify a value, capping the size and appending a truncation note
 * when the payload is larger than MAX_JSON_CHARS.
 */
function safeStringify(value: unknown): string {
  let str: string;
  try {
    str = JSON.stringify(value ?? null);
  } catch {
    str = String(value);
  }
  if (str.length > MAX_JSON_CHARS) {
    return str.slice(0, MAX_JSON_CHARS) + ` ...[truncated, ${str.length} chars total]`;
  }
  return str;
}

/**
 * Pull a name-ish identifier out of an object using the common protocol keys.
 * Returns null if the value isn't an object or has no recognizable label.
 */
function itemKey(item: unknown): string | null {
  if (!item || typeof item !== "object") return null;
  const obj = item as Record<string, unknown>;
  for (const key of ["name", "title", "label", "exercise"]) {
    const v = obj[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

/**
 * Deterministic, non-AI diff of BEFORE vs AFTER.
 *
 * When both sides are arrays of objects that carry a name-ish key
 * (name/title/label/exercise), items are matched by that key and counted as
 * added / removed / changed. Otherwise a single generic bullet is returned.
 *
 * Exported so the backend can also render a deterministic diff in the trainer's
 * pre-publish preview.
 */
export function computeDiffBullets(before: unknown, after: unknown): string[] {
  const beforeArr = Array.isArray(before) ? before : null;
  const afterArr = Array.isArray(after) ? after : null;

  // Build keyed maps when possible.
  const beforeMap = new Map<string, unknown>();
  const afterMap = new Map<string, unknown>();
  let keyedCoverage = 0;
  let total = 0;

  for (const item of beforeArr ?? []) {
    total++;
    const k = itemKey(item);
    if (k !== null) {
      keyedCoverage++;
      beforeMap.set(k, item);
    }
  }
  for (const item of afterArr ?? []) {
    total++;
    const k = itemKey(item);
    if (k !== null) {
      keyedCoverage++;
      afterMap.set(k, item);
    }
  }

  // If we have arrays with usable keys, produce a real add/remove/change diff.
  if (beforeArr && afterArr && total > 0 && keyedCoverage === total) {
    const added: string[] = [];
    const removed: string[] = [];
    const changed: string[] = [];

    Array.from(afterMap.entries()).forEach(([k, v]) => {
      if (!beforeMap.has(k)) {
        added.push(k);
      } else if (JSON.stringify(beforeMap.get(k)) !== JSON.stringify(v)) {
        changed.push(k);
      }
    });
    Array.from(beforeMap.keys()).forEach((k) => {
      if (!afterMap.has(k)) removed.push(k);
    });

    const bullets: string[] = [];
    const list = (items: string[]) => {
      const shown = items.slice(0, 4).join(", ");
      return items.length > 4 ? `${shown} and ${items.length - 4} more` : shown;
    };
    if (added.length) bullets.push(`Added ${added.length} item${added.length === 1 ? "" : "s"}: ${list(added)}`);
    if (removed.length) bullets.push(`Removed ${removed.length} item${removed.length === 1 ? "" : "s"}: ${list(removed)}`);
    if (changed.length) bullets.push(`Updated ${changed.length} item${changed.length === 1 ? "" : "s"}: ${list(changed)}`);

    if (bullets.length === 0) {
      bullets.push("No meaningful changes were detected in this update.");
    }
    return bullets;
  }

  // Fallback for arrays of plain values (compare counts) or non-array payloads.
  if (beforeArr && afterArr) {
    const beforeSet = new Set(beforeArr.map((x) => JSON.stringify(x)));
    const afterSet = new Set(afterArr.map((x) => JSON.stringify(x)));
    let addedCount = 0;
    let removedCount = 0;
    Array.from(afterSet).forEach((x) => {
      if (!beforeSet.has(x)) addedCount++;
    });
    Array.from(beforeSet).forEach((x) => {
      if (!afterSet.has(x)) removedCount++;
    });
    const bullets: string[] = [];
    if (addedCount) bullets.push(`Added ${addedCount} item${addedCount === 1 ? "" : "s"}`);
    if (removedCount) bullets.push(`Removed ${removedCount} item${removedCount === 1 ? "" : "s"}`);
    if (bullets.length === 0) {
      bullets.push("No meaningful changes were detected in this update.");
    }
    return bullets;
  }

  // Non-array payloads: is there any change at all?
  const changed = JSON.stringify(before ?? null) !== JSON.stringify(after ?? null);
  return [changed ? "Your plan details were updated." : "No meaningful changes were detected in this update."];
}

/**
 * Deterministic fallback result, used whenever the AI path is unavailable.
 */
function fallbackResult(input: ProtocolChangeInput): { summary: string; bullets: string[] } {
  const label = TYPE_LABELS[input.type] ?? input.type;
  const who = input.clientFirstName ? `${input.clientFirstName}, your` : "Your";
  return {
    summary: `${who} ${label} plan was updated by your coach.`,
    bullets: computeDiffBullets(input.before, input.after),
  };
}

/**
 * Extract the first balanced {...} JSON block from a string and parse it.
 * Returns null on any failure.
 */
function extractJson(text: string): { summary?: unknown; bullets?: unknown } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

/**
 * Summarize a protocol change for a client.
 *
 * Always resolves (never throws). On any failure — missing ANTHROPIC_API_KEY,
 * API error, or unparseable model output — returns a deterministic fallback
 * derived from the BEFORE/AFTER diff.
 */
export async function summarizeProtocolChange(
  input: ProtocolChangeInput,
): Promise<{ summary: string; bullets: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return fallbackResult(input);
  }

  try {
    const label = TYPE_LABELS[input.type] ?? input.type;
    const nameNote = input.clientFirstName
      ? `The client's first name is "${input.clientFirstName}". You may address them by name, warmly.`
      : "";

    const userPrompt = `A coach just updated a client's ${label} protocol. ${nameNote}

Below are the BEFORE and AFTER states as JSON.

BEFORE:
${safeStringify(input.before)}

AFTER:
${safeStringify(input.after)}

Compare BEFORE and AFTER and describe ONLY what actually changed, in warm, plain language a client understands. Cover concrete changes: items added or removed, and any dose, timing, or schedule changes. Do NOT invent details that are not present in the data. Do NOT give medical advice. If nothing meaningfully changed, say so.

Respond with STRICT JSON and nothing else, matching exactly:
{ "summary": "<one friendly sentence summarizing the change>", "bullets": ["<2 to 6 short bullet points, each describing one concrete change>"] }`;

    const anthropic = new Anthropic({ apiKey });

    const response = await callWithRetry(
      () =>
        anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 500,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userPrompt }],
        }),
      "Protocol Change Summary",
    );

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return fallbackResult(input);
    }

    const parsed = extractJson(textBlock.text);
    if (!parsed) {
      return fallbackResult(input);
    }

    const summary =
      typeof parsed.summary === "string" && parsed.summary.trim()
        ? parsed.summary.trim()
        : fallbackResult(input).summary;

    const bullets = Array.isArray(parsed.bullets)
      ? parsed.bullets
          .filter((b): b is string => typeof b === "string" && b.trim().length > 0)
          .map((b) => b.trim())
          .slice(0, 6)
      : [];

    if (bullets.length === 0) {
      return { summary, bullets: computeDiffBullets(input.before, input.after) };
    }

    return { summary, bullets };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Protocol Change Summary Error]", errMsg);
    return fallbackResult(input);
  }
}
