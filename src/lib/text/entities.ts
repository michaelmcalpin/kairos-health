/** Decode HTML entities that AI/PDF parsers sometimes leave in text ("&bull;", "&amp;", "&#8211;"). */
const NAMED: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: "\"", apos: "'", nbsp: " ", bull: "•", middot: "·",
  ndash: "–", mdash: "—", hellip: "…", rsquo: "’", lsquo: "‘", rdquo: "”", ldquo: "“", deg: "°", micro: "µ",
  plusmn: "±", times: "×", ge: "≥", le: "≤",
};

export function decodeEntities(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const code = e[1].toLowerCase() === "x" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code < 0x110000 ? String.fromCodePoint(code) : m;
    }
    return NAMED[e.toLowerCase()] ?? m;
  });
}

/** Decode every string inside a parsed JSON value. */
export function decodeEntitiesDeep<T>(v: T): T {
  if (typeof v === "string") return decodeEntities(v) as unknown as T;
  if (Array.isArray(v)) return v.map(decodeEntitiesDeep) as unknown as T;
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) out[k] = decodeEntitiesDeep(x);
    return out as T;
  }
  return v;
}
