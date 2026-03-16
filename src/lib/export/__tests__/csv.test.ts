import { describe, it, expect } from "vitest";
import {
  toCSV,
  glucoseCSVColumns,
  sleepCSVColumns,
  nutritionCSVColumns,
} from "../csv";
import type { GlucoseExportRow, SleepExportRow, NutritionExportRow } from "../csv";

describe("toCSV", () => {
  it("generates basic CSV with headers", () => {
    const data = [
      { name: "Alice", age: 30 },
      { name: "Bob", age: 25 },
    ];
    const csv = toCSV(data, [
      { header: "Name", accessor: (r) => r.name },
      { header: "Age", accessor: (r) => r.age },
    ]);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Name,Age");
    expect(lines[1]).toBe("Alice,30");
    expect(lines[2]).toBe("Bob,25");
  });

  it("escapes values with commas", () => {
    const data = [{ desc: "hello, world" }];
    const csv = toCSV(data, [
      { header: "Description", accessor: (r) => r.desc },
    ]);
    expect(csv).toContain('"hello, world"');
  });

  it("escapes values with quotes", () => {
    const data = [{ desc: 'say "hi"' }];
    const csv = toCSV(data, [
      { header: "Description", accessor: (r) => r.desc },
    ]);
    expect(csv).toContain('"say ""hi"""');
  });

  it("handles null values", () => {
    const data = [{ a: null as string | null, b: "ok" }];
    const csv = toCSV(data, [
      { header: "A", accessor: (r) => r.a },
      { header: "B", accessor: (r) => r.b },
    ]);
    expect(csv).toContain(",ok");
  });

  it("supports custom delimiter", () => {
    const data = [{ a: "1", b: "2" }];
    const csv = toCSV(data, [
      { header: "A", accessor: (r) => r.a },
      { header: "B", accessor: (r) => r.b },
    ], { delimiter: "\t" });
    expect(csv).toContain("A\tB");
    expect(csv).toContain("1\t2");
  });

  it("can omit headers", () => {
    const data = [{ x: 1 }];
    const csv = toCSV(data, [
      { header: "X", accessor: (r) => r.x },
    ], { includeHeader: false });
    expect(csv).toBe("1");
  });
});

describe("Glucose CSV columns", () => {
  it("exports glucose data correctly", () => {
    const rows: GlucoseExportRow[] = [
      { timestamp: "2024-03-15T10:00:00Z", valueMgdl: 95, source: "Dexcom", trend: "flat" },
      { timestamp: "2024-03-15T10:05:00Z", valueMgdl: 98, source: "Dexcom", trend: "rising" },
    ];
    const csv = toCSV(rows, glucoseCSVColumns);
    const lines = csv.split("\n");
    expect(lines[0]).toBe("Timestamp,Glucose (mg/dL),Source,Trend");
    expect(lines[1]).toContain("95");
    expect(lines[2]).toContain("rising");
  });
});

describe("Sleep CSV columns", () => {
  it("exports sleep data correctly", () => {
    const rows: SleepExportRow[] = [{
      date: "2024-03-15", totalMinutes: 450, deepMinutes: 90,
      remMinutes: 110, lightMinutes: 200, awakeMinutes: 50,
      score: 82, efficiency: 88,
    }];
    const csv = toCSV(rows, sleepCSVColumns);
    expect(csv).toContain("2024-03-15");
    expect(csv).toContain("450");
    expect(csv).toContain("82");
  });
});

describe("Nutrition CSV columns", () => {
  it("exports nutrition data correctly", () => {
    const rows: NutritionExportRow[] = [{
      date: "2024-03-15", mealType: "lunch", calories: 650,
      protein: 40, carbs: 55, fat: 25, fiber: 8,
    }];
    const csv = toCSV(rows, nutritionCSVColumns);
    expect(csv).toContain("lunch");
    expect(csv).toContain("650");
    expect(csv).toContain("40");
  });
});
