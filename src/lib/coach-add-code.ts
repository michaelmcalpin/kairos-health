/**
 * Client-issued "coach add code" — a client shares this so a coach can add
 * themselves as that client's coach (consent-based). Format: EVX-XXXX-XXXX,
 * using an unambiguous alphabet (no 0/O/1/I/L).
 */

const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

function segment(n: number): string {
  let s = "";
  for (let i = 0; i < n; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export function generateCoachAddCode(): string {
  return `EVX-${segment(4)}-${segment(4)}`;
}

/** Normalize a coach-entered code to the canonical EVX-XXXX-XXXX form,
 *  tolerating lowercase, spaces, or missing dashes. Returns null if unusable. */
export function normalizeCoachAddCode(raw: string): string | null {
  const c = (raw || "").toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (c.length === 11 && c.startsWith("EVX")) {
    return `EVX-${c.slice(3, 7)}-${c.slice(7, 11)}`;
  }
  return null;
}
