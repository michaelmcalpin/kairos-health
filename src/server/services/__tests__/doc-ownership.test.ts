import { describe, it, expect } from "vitest";
import { mentionsName } from "../doc-ownership";

describe("mentionsName", () => {
  it("finds a full name in a file name", () => {
    expect(mentionsName("DEXA Scan — Jeff Kearl Blood lab results Jan 2024.pdf", "Jeff", "Kearl")).toBe(true);
    expect(mentionsName("kearl_jeff_labs.pdf", "Jeff", "Kearl")).toBe(true);
  });
  it("needs both names as whole words", () => {
    expect(mentionsName("Jeffrey Kearlson labs.pdf", "Jeff", "Kearl")).toBe(false);
    expect(mentionsName("Jeff's notes.pdf", "Jeff", "Kearl")).toBe(false);
    expect(mentionsName("anything", null, "Kearl")).toBe(false);
  });
});
