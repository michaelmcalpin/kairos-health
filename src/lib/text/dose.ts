/**
 * "100 mg" + "mg" → "100 mg" (not "100 mg mg"); "5000" + "IU" → "5000 IU".
 * Use everywhere a dosage and unit are shown together.
 */
export function formatDose(dosage: string | number | null | undefined, unit?: string | null): string {
  const d = dosage == null ? "" : String(dosage).trim();
  const u = (unit ?? "").trim();
  if (!d) return u;
  if (!u) return d;
  const norm = (x: string) => x.toLowerCase().replace(/\s+/g, "").replace("µ", "u");
  if (norm(d).endsWith(norm(u))) return d;
  return `${d} ${u}`;
}
