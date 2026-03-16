import { describe, it, expect } from "vitest";
import { autoMapColumns, validateRows, computePreviewStats } from "../validator";
import type { ColumnMapping } from "../types";

describe("autoMapColumns", () => {
  it("maps exact field name matches", () => {
    const mappings = autoMapColumns(["timestamp", "value", "unit"], "glucose");
    expect(mappings[0].targetField).toBe("timestamp");
    expect(mappings[1].targetField).toBe("value");
    expect(mappings[2].targetField).toBe("unit");
  });

  it("maps alias field names", () => {
    const mappings = autoMapColumns(["time", "reading", "device"], "glucose");
    expect(mappings[0].targetField).toBe("timestamp");
    expect(mappings[1].targetField).toBe("value");
    expect(mappings[2].targetField).toBe("source");
  });

  it("handles normalized headers (spaces, caps)", () => {
    const mappings = autoMapColumns(["Date Of Birth", "Sleep Score"], "sleep");
    // "date_of_birth" doesn't match anything, "sleep_score" doesn't either
    // but "score" alias should not match "sleep_score" exactly
    // This tests graceful handling of unmatched columns
    expect(mappings[0].targetField).toBeNull();
  });

  it("returns null for unknown columns", () => {
    const mappings = autoMapColumns(["random_col", "xyz"], "glucose");
    expect(mappings[0].targetField).toBeNull();
    expect(mappings[1].targetField).toBeNull();
  });

  it("maps sleep-specific fields", () => {
    const mappings = autoMapColumns(
      ["date", "duration_hours", "score", "deep_hours", "rem_hours"],
      "sleep"
    );
    expect(mappings[0].targetField).toBe("date");
    expect(mappings[1].targetField).toBe("duration_hours");
    expect(mappings[2].targetField).toBe("score");
    expect(mappings[3].targetField).toBe("deep_hours");
    expect(mappings[4].targetField).toBe("rem_hours");
  });
});

describe("validateRows", () => {
  const glucoseHeaders = ["timestamp", "value", "unit"];
  const glucoseMappings: ColumnMapping[] = [
    { sourceColumn: "timestamp", targetField: "timestamp", transform: "none" },
    { sourceColumn: "value", targetField: "value", transform: "none" },
    { sourceColumn: "unit", targetField: "unit", transform: "none" },
  ];

  it("validates valid glucose rows", () => {
    const rows = [["2025-01-15T08:00:00Z", "95", "mg/dL"]];
    const result = validateRows(rows, glucoseHeaders, glucoseMappings, "glucose");
    expect(result).toHaveLength(1);
    expect(result[0].errors).toHaveLength(0);
    expect(result[0].skip).toBe(false);
    expect(result[0].data.timestamp).toBe("2025-01-15T08:00:00Z");
    expect(result[0].data.value).toBe("95");
  });

  it("flags missing required fields", () => {
    const rows = [["2025-01-15T08:00:00Z", "", "mg/dL"]];
    const result = validateRows(rows, glucoseHeaders, glucoseMappings, "glucose");
    expect(result[0].errors.length).toBeGreaterThan(0);
    expect(result[0].errors[0].message).toContain("Required field");
    expect(result[0].skip).toBe(true);
  });

  it("flags invalid dates", () => {
    const rows = [["not-a-date", "95", "mg/dL"]];
    const result = validateRows(rows, glucoseHeaders, glucoseMappings, "glucose");
    const dateErrors = result[0].errors.filter((e) => e.column === "timestamp");
    expect(dateErrors.length).toBeGreaterThan(0);
  });

  it("warns on out-of-range glucose", () => {
    const rows = [["2025-01-15T08:00:00Z", "700", "mg/dL"]];
    const result = validateRows(rows, glucoseHeaders, glucoseMappings, "glucose");
    const warnings = result[0].errors.filter((e) => e.severity === "warning");
    expect(warnings.length).toBeGreaterThan(0);
    expect(warnings[0].message).toContain("outside expected range");
  });

  it("validates numeric fields", () => {
    const rows = [["2025-01-15T08:00:00Z", "abc", "mg/dL"]];
    const result = validateRows(rows, glucoseHeaders, glucoseMappings, "glucose");
    const numErrors = result[0].errors.filter((e) => e.message.includes("Expected a number"));
    expect(numErrors.length).toBeGreaterThan(0);
  });

  it("handles unmapped columns gracefully", () => {
    const mappings: ColumnMapping[] = [
      { sourceColumn: "timestamp", targetField: "timestamp", transform: "none" },
      { sourceColumn: "value", targetField: "value", transform: "none" },
      { sourceColumn: "extra", targetField: null, transform: "none" },
    ];
    const rows = [["2025-01-15T08:00:00Z", "95", "ignored"]];
    const result = validateRows(rows, ["timestamp", "value", "extra"], mappings, "glucose");
    expect(result[0].data.timestamp).toBe("2025-01-15T08:00:00Z");
    expect(result[0].data.extra).toBeUndefined();
  });
});

describe("computePreviewStats", () => {
  it("computes correct stats", () => {
    const rows = [
      { rowIndex: 0, data: {}, errors: [], skip: false },
      { rowIndex: 1, data: {}, errors: [{ row: 2, column: "x", value: "", message: "err", severity: "error" as const }], skip: false },
      { rowIndex: 2, data: {}, errors: [{ row: 3, column: "x", value: "", message: "warn", severity: "warning" as const }], skip: false },
      { rowIndex: 3, data: {}, errors: [], skip: true },
    ];
    const stats = computePreviewStats(rows);
    expect(stats.total).toBe(4);
    expect(stats.validCount).toBe(1);
    expect(stats.errorCount).toBe(1);
    expect(stats.warningCount).toBe(1);
    expect(stats.skipCount).toBe(1);
  });
});
