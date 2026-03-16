import { describe, it, expect } from "vitest";
import {
  startImport,
  updateMappings,
  toggleRowSkip,
  executeImport,
  generateTemplate,
  getMissingRequiredMappings,
} from "../processor";

describe("startImport", () => {
  it("parses CSV and creates a session", () => {
    const csv = "timestamp,value,unit\n2025-01-15T08:00:00Z,95,mg/dL\n2025-01-15T12:00:00Z,110,mg/dL";
    const session = startImport("glucose", "glucose.csv", csv.length, csv);

    expect(session.status).toBe("previewing");
    expect(session.format).toBe("csv");
    expect(session.headers).toEqual(["timestamp", "value", "unit"]);
    expect(session.rows).toHaveLength(2);
    expect(session.mappings.length).toBeGreaterThan(0);
  });

  it("parses JSON and creates a session", () => {
    const json = JSON.stringify([
      { timestamp: "2025-01-15T08:00:00Z", value: 95, unit: "mg/dL" },
    ]);
    const session = startImport("glucose", "data.json", json.length, json);

    expect(session.status).toBe("previewing");
    expect(session.format).toBe("json");
    expect(session.rows).toHaveLength(1);
  });

  it("returns error for empty file", () => {
    const session = startImport("glucose", "empty.csv", 0, "");
    expect(session.status).toBe("error");
  });

  it("auto-maps known columns", () => {
    const csv = "timestamp,value\n2025-01-15T08:00:00Z,95";
    const session = startImport("glucose", "data.csv", csv.length, csv);

    const timestampMapping = session.mappings.find((m) => m.sourceColumn === "timestamp");
    expect(timestampMapping?.targetField).toBe("timestamp");

    const valueMapping = session.mappings.find((m) => m.sourceColumn === "value");
    expect(valueMapping?.targetField).toBe("value");
  });
});

describe("updateMappings", () => {
  it("re-validates rows with new mappings", () => {
    const csv = "time,reading\n2025-01-15T08:00:00Z,95";
    const session = startImport("glucose", "data.csv", csv.length, csv);

    // Initially "time" should auto-map to "timestamp" via alias
    const updated = updateMappings(session, [
      { sourceColumn: "time", targetField: "timestamp", transform: "none" },
      { sourceColumn: "reading", targetField: "value", transform: "none" },
    ]);

    expect(updated.rows[0].data.timestamp).toBe("2025-01-15T08:00:00Z");
    expect(updated.rows[0].data.value).toBe("95");
  });
});

describe("toggleRowSkip", () => {
  it("toggles skip state of a row", () => {
    const csv = "timestamp,value\n2025-01-15T08:00:00Z,95\n2025-01-15T12:00:00Z,110";
    const session = startImport("glucose", "data.csv", csv.length, csv);

    expect(session.rows[0].skip).toBe(false);
    const toggled = toggleRowSkip(session, 0);
    expect(toggled.rows[0].skip).toBe(true);
    const toggled2 = toggleRowSkip(toggled, 0);
    expect(toggled2.rows[0].skip).toBe(false);
  });
});

describe("executeImport", () => {
  it("produces a summary", () => {
    const csv = "timestamp,value\n2025-01-15T08:00:00Z,95\n2025-01-15T12:00:00Z,110";
    const session = startImport("glucose", "data.csv", csv.length, csv);
    const result = executeImport(session);

    expect(result.status).toBe("complete");
    expect(result.summary).not.toBeNull();
    expect(result.summary!.totalRows).toBe(2);
    expect(result.summary!.importedRows).toBe(2);
    expect(result.summary!.duration).toBeGreaterThanOrEqual(0);
  });

  it("excludes skipped rows from import count", () => {
    const csv = "timestamp,value\n2025-01-15T08:00:00Z,95\n2025-01-15T12:00:00Z,110";
    let session = startImport("glucose", "data.csv", csv.length, csv);
    session = toggleRowSkip(session, 0);
    const result = executeImport(session);

    expect(result.summary!.importedRows).toBe(1);
    expect(result.summary!.skippedRows).toBe(1);
  });
});

describe("generateTemplate", () => {
  it("generates CSV template for glucose", () => {
    const template = generateTemplate("glucose");
    expect(template).toContain("timestamp");
    expect(template).toContain("value");
    expect(template).toContain("\n");
  });

  it("generates CSV template for sleep", () => {
    const template = generateTemplate("sleep");
    expect(template).toContain("date");
    expect(template).toContain("duration_hours");
    expect(template).toContain("score");
  });

  it("returns empty for unknown category", () => {
    const template = generateTemplate("unknown" as never);
    expect(template).toBe("");
  });
});

describe("getMissingRequiredMappings", () => {
  it("returns missing required fields", () => {
    const csv = "timestamp,extra\n2025-01-15T08:00:00Z,x";
    const session = startImport("glucose", "data.csv", csv.length, csv);

    // "value" is required for glucose but not mapped from "extra"
    const missing = getMissingRequiredMappings(session);
    expect(missing).toContain("value");
  });

  it("returns empty when all required fields are mapped", () => {
    const csv = "timestamp,value\n2025-01-15T08:00:00Z,95";
    const session = startImport("glucose", "data.csv", csv.length, csv);
    const missing = getMissingRequiredMappings(session);
    expect(missing).toEqual([]);
  });
});
