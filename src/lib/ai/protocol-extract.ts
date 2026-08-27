/**
 * AI-powered protocol document extraction.
 *
 * A coach uploads a messy Word/PDF/Excel/CSV document. The import endpoint
 * (src/app/api/protocol-import/route.ts) extracts its raw content and hands it
 * here; Claude then maps that free-form text into the grid rows the coach's
 * bulk-edit grid expects for the chosen protocol type.
 *
 * The output row shape MUST match the columns in the bulk-edit backend
 * (src/server/trpc/routers/coach/protocol-bulk.ts) exactly, so a coach can drop
 * the extracted rows straight into the grid and publish.
 *
 * Design goals mirror the other AI modules (see protocol-summary.ts and
 * src/app/api/reports/generate/route.ts):
 *   - Same @anthropic-ai/sdk client, ANTHROPIC_MODEL, ANTHROPIC_API_KEY env,
 *     callWithRetry wrapper, and defensive JSON parsing.
 *   - NEVER throw. On a missing API key, an API error, or unparseable output,
 *     resolve with { rows: [], warnings: [...] } so the caller degrades cleanly.
 */

import Anthropic from "@anthropic-ai/sdk";
import { ANTHROPIC_MODEL } from "@/lib/ai/model";
import { callWithRetry } from "@/lib/ai/retry";

export type ProtocolType = "diet" | "supplements" | "peptides" | "workouts";

export interface ExtractColumn {
  key: string;
  label: string;
  type: "text" | "number";
  hint?: string;
}

// Column definitions per protocol type. Keys match the grid EXACTLY (see
// COLUMNS in protocol-bulk.ts); each carries a short hint to guide extraction.
export const EXTRACT_COLUMNS: Record<ProtocolType, ExtractColumn[]> = {
  supplements: [
    { key: "name", label: "Name", type: "text", hint: "the supplement name, e.g. Magnesium Glycinate, Vitamin D3" },
    { key: "dosage", label: "Dosage", type: "text", hint: "amount + unit, e.g. 2 caps, 500mg, 1 scoop" },
    { key: "unit", label: "Unit", type: "text", hint: "the unit only if separable, e.g. mg, mcg, caps, IU" },
    { key: "frequency", label: "Frequency", type: "text", hint: "how often, e.g. daily, 2x daily, every other day" },
    { key: "timeOfDay", label: "Time of Day", type: "text", hint: "when it's taken, e.g. AM / with breakfast / bedtime (comma-join multiple times)" },
    { key: "notes", label: "Notes", type: "text", hint: "any extra instruction, e.g. with food, empty stomach, brand" },
  ],
  // peptideCycles has no timeOfDay column — mirror that table's fields.
  peptides: [
    { key: "name", label: "Name", type: "text", hint: "the peptide/injectable name, e.g. Retatrutide, Tesamorelin, NAD+, GHK-Cu" },
    { key: "dosage", label: "Dosage", type: "text", hint: "dose amount + unit, e.g. 2mg, 300mcg, 15 units" },
    { key: "unit", label: "Unit", type: "text", hint: "the unit only if separable, e.g. mg, mcg, units, IU" },
    { key: "frequency", label: "Frequency", type: "text", hint: "how often, e.g. 1x weekly, M-F nightly, daily" },
    { key: "route", label: "Route", type: "text", hint: "delivery route if stated, e.g. subcutaneous, IM, intranasal, topical" },
    { key: "notes", label: "Notes", type: "text", hint: "any extra instruction, e.g. titration schedule, injection site" },
  ],
  diet: [
    { key: "meal", label: "Meal", type: "text", hint: "meal name/label, e.g. Meal 1, Breakfast; prefix with the day-type when the doc has several" },
    { key: "items", label: "Items", type: "text", hint: "the foods in the meal, comma-joined, e.g. 6oz chicken, 1 cup rice, greens" },
    { key: "calories", label: "Calories", type: "number", hint: "total calories for the meal, digits only" },
    { key: "protein", label: "Protein (g)", type: "number", hint: "grams of protein, digits only" },
    { key: "carbs", label: "Carbs (g)", type: "number", hint: "grams of carbs, digits only" },
    { key: "fat", label: "Fat (g)", type: "number", hint: "grams of fat, digits only" },
  ],
  workouts: [
    { key: "day", label: "Day", type: "text", hint: "the training day/label, e.g. Day 1, Push, Monday - Legs" },
    { key: "exercise", label: "Exercise", type: "text", hint: "the exercise name, e.g. Barbell Back Squat" },
    { key: "muscleGroup", label: "Muscle Group", type: "text", hint: "primary muscle group, e.g. Legs, Chest, Back" },
    { key: "sets", label: "Sets", type: "number", hint: "number of sets, digits only" },
    { key: "reps", label: "Reps", type: "text", hint: "rep scheme as text, e.g. 8-12, 5, AMRAP" },
    { key: "rest", label: "Rest (sec)", type: "number", hint: "rest between sets in seconds, digits only" },
    { key: "notes", label: "Notes", type: "text", hint: "tempo, RPE, or any coaching cue" },
  ],
};

// Cap raw text so we stay well within token limits.
const MAX_TEXT_CHARS = 24000;

const SYSTEM_PROMPT =
  "You extract a coach's protocol document into structured grid rows. Output ONLY the rows that belong to the requested protocol type. Map free-form dosing/timing/schedule language into the given columns. Do not invent data; leave a field blank (null) if not present. Return STRICT JSON.";

// Per-type extraction guidance for messy real-world documents.
const TYPE_GUIDANCE: Record<ProtocolType, string> = {
  supplements: `This is a SUPPLEMENTS extraction. Documents often have a SCHEDULE TABLE where the times of day are COLUMNS (e.g. Waking, BF, 10AM, Lunch, 3PM, Dinner, Bed) and each cell holds the amount taken at that time. In that case produce ONE row per supplement: put the amount in "dosage" and the times where it appears, comma-joined, into "timeOfDay". EXCLUDE injectable peptides and prescription medications — only oral/topical supplements and vitamins belong here.`,
  peptides: `This is a PEPTIDES extraction. Extract injectable / prescription items (e.g. Reta/Retatrutide, Tesamorelin, NAD+, GHK-Cu, BPC-157, Semaglutide). Capture the dose (mg/mcg/units) in "dosage", the frequency (e.g. "1x weekly", "M-F nightly", "daily") in "frequency", and the "route" if stated (subcutaneous, IM, intranasal, topical). EXCLUDE ordinary oral vitamins/supplements — only peptides and prescriptions belong here.`,
  diet: `This is a DIET extraction. A fast, flush, no-carb, high-protein, keto, carb-cycle, or "pulse" is a DIETARY PLAN — capture its plan-level details in the "plan" object: "planType" (e.g. Fast, Flush, No Carb, High Protein, Keto, Carb Cycle, Pulse, Standard), "startDate" and "endDate" (ISO YYYY-MM-DD if stated, else null; a fast is often 3–5 days then a ramp-up), and "cyclePattern" for on/off rotations (e.g. "3 days on / 2 days off"). Then extract the meals into "rows" with their items and macro targets (calories/protein/carbs/fat) when present. A document may describe multiple day-types (e.g. High Carb vs Low Carb days) — when it does, PREFIX the meal name with the day-type, e.g. "High Carb — Meal 1", "Low Carb — Meal 1". If a phase has no explicit meals (e.g. a water fast), still return the plan and any guidance as a single row with the phase name as "meal".`,
  workouts: `This is a WORKOUTS extraction. Extract the training day, exercise, sets, and reps. Include muscleGroup, rest, and notes when present. One row per exercise; repeat the "day" label for every exercise in that day.`,
};

// ---------------------------------------------------------------------------
// Value coercion (mirrors protocol-bulk.ts toStr/toNum behavior)
// ---------------------------------------------------------------------------

function toText(v: unknown): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length > 0 ? s : null;
}

/**
 * Coerce a value to a number, tolerating the messy strings the model may emit:
 *   "2,260 cal" → 2260, "126P" → 126, "~30g" → 30, "35" → 35.
 * Returns null when no leading numeric value can be recovered.
 */
function toNumber(v: unknown): number | null {
  if (v === null || v === undefined || v === "") return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const s = String(v).replace(/,/g, "");
  // Grab the first number-like token (supports decimals).
  const match = s.match(/-?\d+(\.\d+)?/);
  if (!match) return null;
  const n = Number(match[0]);
  return Number.isFinite(n) ? n : null;
}

/**
 * The required primary field(s) that must be present for a row to be kept.
 */
function hasRequiredFields(type: ProtocolType, row: Record<string, string | number | null>): boolean {
  switch (type) {
    case "supplements":
    case "peptides":
      return toText(row.name) !== null;
    case "diet":
      return toText(row.meal) !== null;
    case "workouts":
      return toText(row.day) !== null && toText(row.exercise) !== null;
  }
}

/**
 * Coerce a raw model row to ONLY the columns of the given type, applying the
 * correct text/number coercion per column.
 */
function coerceRow(
  type: ProtocolType,
  raw: Record<string, unknown>,
): Record<string, string | number | null> {
  const out: Record<string, string | number | null> = {};
  for (const col of EXTRACT_COLUMNS[type]) {
    out[col.key] = col.type === "number" ? toNumber(raw[col.key]) : toText(raw[col.key]);
  }
  return out;
}

/**
 * Extract the first balanced {...} JSON block from a string and parse it.
 * Returns null on any failure.
 */
function extractJson(text: string): { rows?: unknown } | null {
  let jsonStr = text.trim();
  // Strip markdown fences if the model wrapped the JSON.
  if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "").trim();
  }
  const start = jsonStr.indexOf("{");
  const end = jsonStr.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(jsonStr.slice(start, end + 1));
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export interface ExtractInput {
  type: ProtocolType;
  content: { kind: "text"; text: string } | { kind: "pdf"; base64: string };
}

// Plan-level metadata for a DIET upload. A fast, flush, no-carb, high-protein,
// keto, carb-cycle or "pulse" is a dietary plan distinguished by its TYPE and a
// start/stop window (plus an optional cycling pattern, e.g. "3 days on / 2 off").
export interface ExtractedPlan {
  planType: string | null;
  startDate: string | null;
  endDate: string | null;
  cyclePattern: string | null;
}

export interface ExtractResult {
  rows: Array<Record<string, string | number | null>>;
  warnings: string[];
  plan?: ExtractedPlan | null;
}

/**
 * Extract protocol grid rows from a coach's document.
 *
 * Always resolves (never throws). On any failure — missing ANTHROPIC_API_KEY,
 * API error, or unparseable model output — returns { rows: [], warnings: [...] }.
 */
export async function extractProtocolRows(input: ExtractInput): Promise<ExtractResult> {
  const warnings: string[] = [];

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { rows: [], warnings: ["AI extraction unavailable: ANTHROPIC_API_KEY is not configured."] };
  }

  try {
    const columns = EXTRACT_COLUMNS[input.type];
    const columnList = columns
      .map((c) => `- ${c.key} (${c.type})${c.hint ? `: ${c.hint}` : ""}`)
      .join("\n");

    const instruction = `Extract the "${input.type}" protocol from the document below.

${TYPE_GUIDANCE[input.type]}

Columns to fill for each row (use these EXACT keys):
${columnList}

Rules:
- Output ONLY rows that belong to the "${input.type}" protocol type.
- Do NOT invent data. If a field is not present in the document, set it to null.
- Number columns must be plain numbers (or null); text columns are strings (or null).

Respond with STRICT JSON and nothing else, matching exactly:
{ ${input.type === "diet" ? `"plan": { "planType": <string|null>, "startDate": <YYYY-MM-DD|null>, "endDate": <YYYY-MM-DD|null>, "cyclePattern": <string|null> }, ` : ""}"rows": [ { ${columns.map((c) => `"${c.key}": <value|null>`).join(", ")} } ] }`;

    // Build the user message content. For PDFs we attach a document block so the
    // model reads the file directly; for text we inline the extracted content.
    let userContent: Anthropic.MessageParam["content"];
    if (input.content.kind === "pdf") {
      userContent = [
        {
          type: "document",
          source: {
            type: "base64",
            media_type: "application/pdf",
            data: input.content.base64,
          },
        },
        { type: "text", text: instruction },
      ];
    } else {
      let text = input.content.text ?? "";
      if (text.length > MAX_TEXT_CHARS) {
        text = text.slice(0, MAX_TEXT_CHARS);
        warnings.push(
          `Document text was truncated to ${MAX_TEXT_CHARS} characters for extraction; some rows near the end may be missing.`,
        );
      }
      userContent = `${instruction}

--- DOCUMENT CONTENT ---
${text}`;
    }

    const anthropic = new Anthropic({ apiKey });

    const response = await callWithRetry(
      () =>
        anthropic.messages.create({
          model: ANTHROPIC_MODEL,
          max_tokens: 3000,
          temperature: 0.2,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userContent }],
        }),
      "Protocol Document Extraction",
    );

    const textBlock = response.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return { rows: [], warnings: [...warnings, "AI extraction unavailable: the model returned no text."] };
    }

    const parsed = extractJson(textBlock.text);
    if (!parsed || !Array.isArray(parsed.rows)) {
      return { rows: [], warnings: [...warnings, "AI extraction unavailable: the model output could not be parsed as rows."] };
    }

    const rows = (parsed.rows as unknown[])
      .filter((r): r is Record<string, unknown> => !!r && typeof r === "object" && !Array.isArray(r))
      .map((r) => coerceRow(input.type, r))
      .filter((r) => hasRequiredFields(input.type, r));

    // For diet, surface the plan-level metadata (type + timeframe + cycle).
    let plan: ExtractedPlan | null = null;
    if (input.type === "diet") {
      const p = (parsed as { plan?: unknown }).plan;
      if (p && typeof p === "object" && !Array.isArray(p)) {
        const pr = p as Record<string, unknown>;
        plan = {
          planType: toText(pr.planType),
          startDate: toText(pr.startDate),
          endDate: toText(pr.endDate),
          cyclePattern: toText(pr.cyclePattern),
        };
        if (!plan.planType && !plan.startDate && !plan.endDate && !plan.cyclePattern) {
          plan = null;
        }
      }
    }

    if (rows.length === 0) {
      warnings.push("No rows for the selected protocol type were found in the document.");
    }

    return { rows, warnings, plan };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("[Protocol Document Extraction Error]", errMsg);
    return { rows: [], warnings: [...warnings, `AI extraction unavailable: ${errMsg.slice(0, 200)}`] };
  }
}
