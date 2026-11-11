/**
 * Clinical guardrails for client-facing AI (AI Health Coach chat, reports).
 *
 * Peptide and medicine entries in Everist are reference items the client
 * and coach keep themselves. The AI may repeat a dose exactly as it appears
 * in the client's own list, but it must never suggest a new dose, a change,
 * a cycle, a new compound to start, or where to buy. Two layers:
 *   1. CLIENT_SAFETY_RULES goes into the system prompt.
 *   2. redactDosing() runs on the output, line by line, as a backstop: any
 *      line naming a peptide/prescription drug has its amounts and schedule
 *      replaced with a pointer to the care team — unless that amount or
 *      schedule is what the client's own list says for that compound.
 * Supplements (vitamin D, magnesium…) are not restricted.
 */

export const CLIENT_SAFETY_RULES = `## CLINICAL SAFETY RULES (always apply — these override everything above)
- You are talking to the CLIENT, not their prescriber.
- PEPTIDES and PRESCRIPTION MEDICINES (e.g. BPC-157, TB-500, GHK-Cu, MOTS-c, Epithalon, CJC-1295, Ipamorelin, Sermorelin, Tesamorelin, semaglutide, tirzepatide, testosterone, HCG, anastrozole, enclomiphene, metformin, LDN, rapamycin, thyroid medicine, ketamine, statins): NEVER suggest a dose, amount, frequency, cycle length, injection schedule, or reconstitution / syringe math, and NEVER suggest starting, stopping, adding, switching, or changing the dose of one.
- The client's own protocol and peptide list (entered by them or their coach) are reference records. You MAY repeat a dose and schedule EXACTLY as that list states it (e.g. "your BPC-157 entry says 250 mcg daily"), and say it's what their list shows. Never adjust, extend, or recommend those amounts.
- You MAY explain in plain words what a compound is and what questions to bring to their coach or prescriber.
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

/** One entry from the client's own protocol / peptide list. */
export interface ClientDose {
  name: string;
  dosage?: string | null;
  unit?: string | null;
  frequency?: string | null;
  durationWeeks?: number | null;
}

interface AllowEntry { nameRe: RegExp; keywords: string[]; tokens: Set<string> }
export interface DoseAllowlist { entries: AllowEntry[] }

/** "250 µg" / "250mcg" / "0,5 mL" → comparable token. */
function normToken(t: string): string {
  return t.toLowerCase().replace(/\s+/g, "").replace(/µg|ug/g, "mcg").replace(/,/g, ".")
    .replace(/units?$/, "unit").replace(/ius?$/, "iu").replace(/–/g, "-");
}

const escapeRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Words in COMPOUND_RE that aren't a specific compound (never enough to match an entry). */
const GENERIC_KW = /^(peptides?|injections?|subq|subcutaneous|intramuscular|reconstitut\w*|bac(teriostatic)?water|syringe|statins?|glp1|nad\+?injections?)$/;

/** Build the allowlist from the client's own entries. */
export function buildDoseAllowlist(doses: ClientDose[]): DoseAllowlist {
  const entries: AllowEntry[] = [];
  for (const d of doses) {
    const name = d.name?.trim();
    if (!name) continue;
    const pattern = escapeRe(name.toLowerCase()).replace(/[\s-]+/g, "[- ]?");
    const kw = Array.from(name.matchAll(new RegExp(COMPOUND_RE.source, "gi")))
      .map((m) => m[0].toLowerCase().replace(/[\s-]/g, ""))
      .filter((k) => !GENERIC_KW.test(k));
    const amountText = [d.dosage, d.dosage && d.unit && !/[a-zµ%]/i.test(d.dosage) ? d.unit : null].filter(Boolean).join(" ");
    const schedText = [d.frequency, d.durationWeeks ? `for ${d.durationWeeks} weeks` : null].filter(Boolean).join(" ");
    const tokens = new Set<string>();
    for (const m of Array.from(`${amountText} ${schedText}`.matchAll(new RegExp(DOSE_RE.source, "gi")))) tokens.add(normToken(m[0]));
    for (const m of Array.from(schedText.matchAll(new RegExp(SCHEDULE_RE.source, "gi")))) tokens.add(normToken(m[0]));
    if (tokens.size === 0) continue;
    entries.push({ nameRe: new RegExp(`\\b${pattern}\\b`, "i"), keywords: kw, tokens });
  }
  return { entries };
}

/** Amounts / schedules the client's list gives for compounds named on this line. */
function allowedOnLine(line: string, allow?: DoseAllowlist): Set<string> {
  const out = new Set<string>();
  if (!allow?.entries.length) return out;
  const lineKw = new Set(Array.from(line.matchAll(new RegExp(COMPOUND_RE.source, "gi"))).map((m) => m[0].toLowerCase().replace(/[\s-]/g, "")));
  for (const e of allow.entries) {
    if (e.nameRe.test(line) || e.keywords.some((k) => lineKw.has(k))) e.tokens.forEach((t) => out.add(t));
  }
  return out;
}

/** Redact one line. Returns [line, changed]. */
function redactLine(line: string, allow?: DoseAllowlist): [string, boolean] {
  let changed = false;
  let out = line;
  const sourced = out.replace(SOURCING_RE, "[ask your care team]");
  if (sourced !== out) {
    out = sourced;
    changed = true;
  }
  if (!COMPOUND_RE.test(out)) return [out, changed];
  const before = out;
  const ok = allowedOnLine(out, allow);
  const keepOrRedact = (m: string) => (ok.has(normToken(m)) ? m : REPLACEMENT);
  out = out.replace(DOSE_RE, keepOrRedact).replace(SCHEDULE_RE, keepOrRedact);
  // Collapse "[x] [x]" runs left by back-to-back amounts and schedules.
  out = out.replace(REPEAT_RE, REPLACEMENT);
  return [out, changed || out !== before];
}

/** Redact a whole text. */
export function redactDosing(text: string, allow?: DoseAllowlist): { text: string; redacted: boolean } {
  let redacted = false;
  const lines = text.split("\n").map((l) => {
    const [out, changed] = redactLine(l, allow);
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

  constructor(private allow?: DoseAllowlist) {}

  push(delta: string): string {
    this.buffer += delta;
    const nl = this.buffer.lastIndexOf("\n");
    if (nl === -1) return "";
    const complete = this.buffer.slice(0, nl + 1);
    this.buffer = this.buffer.slice(nl + 1);
    const r = redactDosing(complete, this.allow);
    if (r.redacted) this.redacted = true;
    return r.text;
  }

  /** Emit the held-back tail, plus a care-team note if anything was redacted. */
  flush(): string {
    const r = redactDosing(this.buffer, this.allow);
    this.buffer = "";
    if (r.redacted) this.redacted = true;
    return r.text + (this.redacted ? NOTE : "");
  }
}

/** Redact every string inside a parsed JSON value (AI reports). */
export function redactDosingDeep<T>(value: T, allow?: DoseAllowlist): T {
  if (typeof value === "string") return redactDosing(value, allow).text as unknown as T;
  if (Array.isArray(value)) return value.map((v) => redactDosingDeep(v, allow)) as unknown as T;
  if (value && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) out[k] = redactDosingDeep(v, allow);
    return out as T;
  }
  return value;
}
