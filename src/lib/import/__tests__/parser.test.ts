import { describe, it, expect } from "vitest";
import { parseCSV, parseJSON, detectFormat, detectDelimiter } from "../parser";

describe("parseCSV", () => {
  it("parses basic CSV", () => {
    const csv = "name,value\nAlice,100\nBob,200";
    const result = parseCSV(csv);
    expect(result.headers).toEqual(["name", "value"]);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["Alice", "100"]);
    expect(result.rows[1]).toEqual(["Bob", "200"]);
  });

  it("handles quoted fields with commas", () => {
    const csv = 'name,desc\nAlice,"Hello, World"\nBob,"Goodbye"';
    const result = parseCSV(csv);
    expect(result.rows[0]).toEqual(["Alice", "Hello, World"]);
  });

  it("handles escaped quotes in fields", () => {
    const csv = 'name,desc\nAlice,"She said ""hello"""\nBob,ok';
    const result = parseCSV(csv);
    expect(result.rows[0][1]).toBe('She said "hello"');
  });

  it("handles empty file", () => {
    const result = parseCSV("");
    expect(result.headers).toEqual([]);
    expect(result.errors).toContain("File is empty");
  });

  it("pads short rows", () => {
    const csv = "a,b,c\n1\n4,5,6";
    const result = parseCSV(csv);
    expect(result.rows[0]).toEqual(["1", "", ""]);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("trims extra columns", () => {
    const csv = "a,b\n1,2,3,4";
    const result = parseCSV(csv);
    expect(result.rows[0]).toEqual(["1", "2"]);
  });

  it("skips blank lines", () => {
    const csv = "a,b\n1,2\n\n3,4\n";
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
  });

  it("supports custom delimiter (tab)", () => {
    const tsv = "name\tvalue\nAlice\t100";
    const result = parseCSV(tsv, "\t");
    expect(result.headers).toEqual(["name", "value"]);
    expect(result.rows[0]).toEqual(["Alice", "100"]);
  });

  it("handles multiline quoted fields", () => {
    const csv = 'name,notes\nAlice,"line1\nline2"\nBob,ok';
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0][1]).toBe("line1\nline2");
  });

  it("handles CRLF line endings", () => {
    const csv = "a,b\r\n1,2\r\n3,4";
    const result = parseCSV(csv);
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toEqual(["1", "2"]);
  });
});

describe("parseJSON", () => {
  it("parses array of objects", () => {
    const json = JSON.stringify([
      { name: "Alice", value: 100 },
      { name: "Bob", value: 200 },
    ]);
    const result = parseJSON(json);
    expect(result.headers).toContain("name");
    expect(result.headers).toContain("value");
    expect(result.rows).toHaveLength(2);
    expect(result.rows[0]).toContain("Alice");
  });

  it("parses { data: [...] } wrapper", () => {
    const json = JSON.stringify({
      data: [{ x: 1 }, { x: 2 }],
    });
    const result = parseJSON(json);
    expect(result.headers).toEqual(["x"]);
    expect(result.rows).toHaveLength(2);
  });

  it("handles invalid JSON", () => {
    const result = parseJSON("not json{{{");
    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.headers).toEqual([]);
  });

  it("handles empty array", () => {
    const result = parseJSON("[]");
    expect(result.errors).toContain("No records found in JSON");
  });

  it("handles non-array, non-data JSON", () => {
    const result = parseJSON('{"key": "value"}');
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("handles null/undefined values", () => {
    const json = JSON.stringify([{ a: null, b: "hi" }]);
    const result = parseJSON(json);
    expect(result.rows[0][0]).toBe("");
    expect(result.rows[0][1]).toBe("hi");
  });

  it("handles nested objects as JSON strings", () => {
    const json = JSON.stringify([{ a: { nested: true } }]);
    const result = parseJSON(json);
    expect(result.rows[0][0]).toBe('{"nested":true}');
  });

  it("unions keys from all records", () => {
    const json = JSON.stringify([{ a: 1 }, { b: 2 }, { a: 3, c: 4 }]);
    const result = parseJSON(json);
    expect(result.headers).toContain("a");
    expect(result.headers).toContain("b");
    expect(result.headers).toContain("c");
  });
});

describe("detectFormat", () => {
  it("detects JSON from array start", () => {
    expect(detectFormat("[{")).toBe("json");
  });

  it("detects JSON from object start", () => {
    expect(detectFormat('{"data')).toBe("json");
  });

  it("defaults to CSV", () => {
    expect(detectFormat("name,value")).toBe("csv");
  });
});

describe("detectDelimiter", () => {
  it("detects comma", () => {
    expect(detectDelimiter("a,b,c\n1,2,3")).toBe(",");
  });

  it("detects tab", () => {
    expect(detectDelimiter("a\tb\tc\n1\t2\t3")).toBe("\t");
  });

  it("detects semicolon", () => {
    expect(detectDelimiter("a;b;c\n1;2;3")).toBe(";");
  });
});
