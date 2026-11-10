/**
 * Clinical guardrails for client-facing AI (AI Health Coach chat, reports).
 *
 * Peptides and prescription medicines are prescriber decisions. The AI may
 * explain what a compound is and what the client's own protocol already
 * lists, but it must never suggest a dose, frequency, cycle, or a new
 * compound to start. Two layers:
 *   1. CLIENT_SAFETY_RULES goes into the system prompt.
 *   2. redactDosing() runs on the output, line by line, as a backstop: any
 *      line naming a peptide/prescription drug has its amounts and schedule
 *      replaced with a pointer to the care team.
 * Supplements (vitamin D, magnesium…) are not restricted.
 */

export const CLIENT_SAFETY_RULES = `## CLINICAL SAFETY RULES (always apply — these override everything above)
- You are talking to the CLIENT, not their prescriber.
- PEPTIDES and PRESCRIPTION MEDICINES (e.g. BPC-157, TB-500, GHK-Cu, MOTS-c, Epithalon, CJC-1295, Ipamorelin, Sermorelin, Tesamorelin, semaglutide, tirzepatide, testosterone, HCG, anastrozole, enclomiphene, metformin, LDN, rapamycin, thyroid medicine, ketamine, statins): NEVER give a dose, amount, frequency, cycle length, injection schedule, or reconstitution / syringe math, and NEVER suggest starting, stopping, adding, or switching one.
- You MAY explain in plain words what a compound is, what the client's current protocol already lists (as written by their care team), and what questions to bring to their coach or prescriber.
- When a peptide or medicine could be relevant, say so generally and write: "Ask your care team whether this fits you — dosing is set by your prescriber."
- Never mention sourcing (e.g. research-market vials, where to buy).
- Supplements and lifestyle advice are fine, with the usual "check with your coach before changing your protocol."`;

const COMPOUND_RE = new RegExp(
  "\\b(" + [
    "peptides?", "bpc[- ]?157", "tb[- ]?500", "thymosin", "ghk[- ]?cu", "mots[- ]?c", "epit?h?alon", "cjc[- ]?1295",
    "ipamorelin", "sermorelin", "tesamorelin", "hexarelin", "ghrp[- ]?\\d*", "mk[- ]?677", "ibutamoren", "aod[- ]?9604",
    "pt[- ]?141", "bremelanotide", "selank", "semax", "dsip", "kpv", "ll[- ]?37", "ss[- ]?31", "elamipretide", "humanin",
    "dihexa", "cerebrolysin", "pinealon", "kisspeptin", "oxytocin", "retatrutide", "semaglutide", "tirzepatide",
    "liraglutide", "ozempic", "wegovy", "mounjaro", "zepbound", "glp[- ]?1",
    "testosterone", "trt", "hcg", "anastrozole", "enclomiphene", "clomiphene", "clomid", "tamoxifen", "finasteride",
    "dutasteride", "estradiol", "progesterone", "metformin", "acarbose", "empagliflozin", "dapagliflozin",
    "ldn", "naltrexone", "rapamycin", "sirolimus", "levothyroxine", "liothyronine", "armour thyroid", "cytomel", "synthroid",
    "ketamine", "modafinil", "armodafinil", "tadalafil", "sildenafil", "atorvastatin", "rosuvastatin", "statins?",
    "ivermectin", "mebendazole", "fenbendazole", "amantadine", "psilocybin", "nad\\+? injections?", "injections?",
    "subq", "sub-?cutaneous", "intramuscular", "reconstitut\\w*", "bac(teriostatic)? water", "syringe",
  ].join("|") + ")\\b",
  "i",
);

/** Amounts (2 mg, 250mcg, 0.1 mL, 10 units, 1-2 mg) and schedules (3x/week, twice weekly, 5 days on…). */
const DOSE_RE = /\b\d+(?:[.,]\d+)?(?:\s?[-–]\s?\d+(?:[.,]\d+)?)?\s?(?:mg|mcg|µg|ug|g|iu|ius|units?|u|ml|mL|cc|ccs|%)\b/gi;
const SCHEDULE_RE = /\b(?:\d+(?:\s?[-–]\s?\d+)?\s?(?:x|times)\s?(?:\/|per|a|each)?\s?(?:day|daily|week|weekly|month)|(?:once|twice|three times|four times)\s(?:a\s|per\s)?(?:day|daily|week|weekly)|every\s(?:other\s)?(?:\d+\s)?(?:days?|weeks?|hours?|hrs?)|\d+\s?(?:days?|weeks?)\s?on[,/ ]+\d+\s?(?:days?|weeks?)\s?off|for\s\d+(?:\s?[-–]\s?\d+)?\s?(?:weeks?|days?|months?)|\d+\s?(?:-|to)\s?\d+\s?week\s(?:cycle|course))\b/gi;
const SOURCING_RE = /\b(research[- ]market|research[- ]grade|research chemical|grey[- ]market|gray[- ]market)\b[^.\n]*/gi;

const REPLACEMENT = "[dose set by your prescriber]";
const REPEAT_RE = /\[dose set by your prescriber\](?:[\s,·/]*\[dose set by your prescriber\])+/g;
const NOTE = "\n\n_Peptide and medicine doses are set by your prescriber. Ask your care team before starting or changing any of them._";

/** Redact one line. Returns [line, changed]. */
function redactLine(line: string): [string, boolean] {
  let changed = false;
  let out = line;
  const sourced = out.replace(SOURCING_RE, "[ask your care team]");
  if (sourced !== out) {
    out = sourced;
    changed = true;
  }
  if (!COMPOUND_RE.test(out)) return [out, changed];
  const before = out;
  out = out.replace(DOSE_RE, REPLACEMENT).replace(SCHEDULE_RE, REPLACEMENT);
  // Collapse "[x] [x]" runs left by back-to-back amounts and schedules.
  out = out.replace(REPEAT_RE, REPLACEMENT);
  return [out, changed || out !== before];
}

/** Redact a whole text. */
export function redactDosing(text: string): { text: string; redacted: boolean } {
  let redacted = false;
  const lines = text.split("\n").map((l) => {
    const [out, changed] = redactLine(l);
    if (changed) redacted = true;
    return out;
  });
  return { text: lines.join("\n"), redacted };
}

/**
 * Streaming version: feed deltas, get back text that is safe to show.
 * Holds back the current partial line until it ends, so a dose split across
 * deltas is still caught. Call flush() at the end.
 */
export class DosingStreamFilter {
  private buffer = "";
  redacted = false;

  push(delta: string): string {
    this.buffer += delta;
    const nl = this.buffer.lastIndexOf("\n");
    if (nl === -1) return "";
    const complete = this.buffer.slice(0, nl + 1);
    this.buffer = this.buffer.slice(nl + 1);
    const r = redactDosing(complete);
    if (r.redacted) this.redacted = true;
    return r.text;
  }

  /** Emit the held-back tail, plus a care-team note if anything was redacted. */
  flush(): string {
    const r = redactDosing(this.buffer);
    this.buffer = "";
    if (r.redacted) this.redacted = true;
    return r.text + (this.redacted ? NOTE : "");
  }
}

/** Redact every string inside a parsed JSON value (AI reports). */
export function redactDosingDeep<T>(value: T): T {
  if (typeof value === "string") return redactDosing(value).text as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDosingDeep(v)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDosingDeep(v);
    return out as T;
  }
  return value;
}
