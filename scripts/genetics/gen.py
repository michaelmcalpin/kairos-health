import json, re, sys
import os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from authored import A, SECTIONS, OVERRIDE, ALIASES

d = json.load(open(sys.argv[1]))
FIELDS = {"symptoms": "Symptoms to Watch For", "supplements": "Supplement Protocol",
          "peptides": "Peptide Support", "diet": "Diet Strategy",
          "lifestyle": "Lifestyle Strategy", "labs": "Lab Tests to Order"}

def clean(v):
    if v is None: return None
    v = v.strip()
    return None if v.upper() in ("NA", "") or v.upper().startswith("N/A") else v

genes, byname, section, prev = [], {}, None, None
for g in d["genes"]:
    if g["Section"]: section = g["Section"].strip()
    name = g["Gene"].strip()
    raw = {k: clean(g[v]) for k, v in FIELDS.items()}
    # Resolve "Same as X" / "Same as above" back-references.
    for k, v in raw.items():
        if v and v.lower().startswith("same as"):
            ref = v[7:].strip().rstrip(".")
            src = None
            if ref.lower().startswith("above") and prev: src = prev
            else:
                first = re.split(r"[/.]", ref)[0].strip()
                for n in byname:
                    if n.lower() == first.lower() or n.lower().startswith(first.lower()): src = byname[n]; break
                if src is None and prev: src = prev
            extra = re.sub(r"^same as [^.]*\.?\s*", "", v, flags=re.I).strip()
            raw[k] = ((src["raw"][k] or "") + (". " + extra if extra else "")).strip(". ") or None
    sec = OVERRIDE.get(name, section)
    key, title, blurb = SECTIONS[sec]
    a = A[name]
    entry = dict(gene=name, rsId=clean(g["rsID"]), section=key, priority=clean(g["Clinical Priority"]),
                 nickname=a["nick"], plain=a["plain"], changed=a["changed"], meds=a["meds"],
                 technical=dict(function=clean(g["What It Does (Function)"]), effect=clean(g["What Happens When Mutated"])),
                 raw=raw, aliases=ALIASES.get(name, []))
    byname[name] = entry; prev = entry; genes.append(entry)

def split(v, by):
    if not v: return []
    parts = re.split(by, v)
    return [p.strip().strip(".").strip() for p in parts if p and p.strip().strip(".")]

RX = re.compile(r"prescription|\bLDN\b|ketamine|amantadine|ivermectin|mebendazole|baby aspirin|psilocybin|adderall", re.I)
def fix(item):
    item = re.sub(r"^Plus:\s*", "", item)
    # Master DB lists methylfolate in grams; clinical dosing is milligrams.
    item = re.sub(r"(Methylfolate[^,]*?\d)\s*g\b", r"\1 mg", item)
    item = re.sub(r"(up to \d+-\d+)g\b", r"\1 mg", item)
    return item
out = []
for e in genes:
    r = e.pop("raw")
    e["symptoms"] = split(r["symptoms"], r",\s*(?![^()]*\))")
    e["supplements"] = split(r["supplements"], r",\s*(?![^()]*\))|\.\s+")
    e["peptides"] = split(r["peptides"], r",\s*(?![^()]*\))")
    e["lifestyle"] = split(r["diet"], r"\.\s+") + split(r["lifestyle"], r"\.\s+")
    e["labs"] = split(r["labs"], r",\s*(?![^()]*\))")
    rx = []
    for k in ("supplements", "lifestyle", "peptides"):
        keep = []
        for it in (fix(x) for x in e[k]):
            (rx if RX.search(it) else keep).append(it)
        e[k] = list(dict.fromkeys(keep))
    rx = [f"Prescription option from the protocol (needs a doctor): {x}" for x in dict.fromkeys(rx)]
    e["meds"] = list(dict.fromkeys(e["meds"] + rx))
    out.append(e)

sections = []
seen = set()
for _, (k, t, b) in SECTIONS.items():
    if k in seen: continue
    seen.add(k); sections.append(dict(key=k, title=t, blurb=b))

ts = f"""/**
 * Gene library for the coach Genetics Review.
 *
 * GENERATED from the Genetics Master Database (PRO 7 report order) plus
 * hand-written plain-language (about 4th-grade) explanations and medication
 * considerations. Lifestyle/diet, supplement, peptide and lab guidance come
 * straight from the master database. Regenerate rather than hand-editing the
 * lists below.
 */

export type GeneSectionKey = {' | '.join(json.dumps(s['key']) for s in sections)};

export interface GeneSection {{ key: GeneSectionKey; title: string; blurb: string }}

export interface GeneEntry {{
  gene: string;
  rsId: string | null;
  section: GeneSectionKey;
  /** Clinical priority from the master database (e.g. "CRITICAL", "HIGH"). */
  priority: string | null;
  nickname: string;
  /** What the gene does, in plain words. */
  plain: string;
  /** What a change in this gene can mean, in plain words. */
  changed: string;
  symptoms: string[];
  lifestyle: string[];
  supplements: string[];
  peptides: string[];
  /** Medication notes to discuss with the prescriber (not prescriptions). */
  meds: string[];
  labs: string[];
  technical: {{ function: string | null; effect: string | null }};
  aliases: string[];
}}

export const GENE_SECTIONS: GeneSection[] = {json.dumps(sections, indent=2, ensure_ascii=False)};

export const GENE_LIBRARY: GeneEntry[] = {json.dumps(out, indent=2, ensure_ascii=False)};
"""
open(sys.argv[2], "w").write(ts)
print(len(out), "genes;", len(sections), "sections")
