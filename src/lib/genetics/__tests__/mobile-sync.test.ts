import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

// The iOS app can't import from src/, so it carries copies. Keep them identical.
const root = resolve(__dirname, "../../../..");
const read = (p: string) => readFileSync(resolve(root, p), "utf8");

describe("mobile genetics copies", () => {
  for (const f of ["gene-library.ts", "interpret.ts"]) {
    it(`mobile/lib/genetics/${f} matches the web version`, () => {
      expect(read(`mobile/lib/genetics/${f}`)).toBe(read(`src/lib/genetics/${f}`));
    });
  }
});
