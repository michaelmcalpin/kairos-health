# Gene library generator

Builds `src/lib/genetics/gene-library.ts` (used by the coach Genetics Review)
from the Genetics Master Database spreadsheet plus hand-written content.

- `authored.py` — plain-language (about 4th-grade) explanations, nicknames,
  medication considerations, section names and gene aliases. Edit this to
  change wording.
- `dump.py` — reads the master `.xlsx` into JSON.
- `gen.py` — merges the two, resolves "Same as above" rows, moves prescription
  items out of supplements into medications, fixes methylfolate grams → mg,
  and writes the TypeScript library.

```
python3 -I scripts/genetics/dump.py "Genetics_Master_Database.xlsx" /tmp/master.json
python3 scripts/genetics/gen.py /tmp/master.json src/lib/genetics/gene-library.ts mobile/lib/genetics/gene-library.ts
npx vitest run src/lib/genetics src/components/genetics
```
