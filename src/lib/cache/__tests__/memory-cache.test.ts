import { describe, it, expect, beforeEach } from "vitest";
import { cache } from "../memory-cache";

describe("MemoryCache", () => {
  beforeEach(() => {
    cache.clear();
  });

  it("sets and gets values", () => {
    cache.set("key1", "value1", { ttlMs: 60000 });
    expect(cache.get("key1")).toBe("value1");
  });

  it("returns undefined for missing keys", () => {
    expect(cache.get("nonexistent")).toBeUndefined();
  });

  it("respects namespaces", () => {
    cache.set("key1", "value-a", { ttlMs: 60000, namespace: "ns1" });
    cache.set("key1", "value-b", { ttlMs: 60000, namespace: "ns2" });

    expect(cache.get("key1", "ns1")).toBe("value-a");
    expect(cache.get("key1", "ns2")).toBe("value-b");
  });

  it("invalidates a namespace", () => {
    cache.set("a", 1, { ttlMs: 60000, namespace: "ns1" });
    cache.set("b", 2, { ttlMs: 60000, namespace: "ns1" });
    cache.set("c", 3, { ttlMs: 60000, namespace: "ns2" });

    const deleted = cache.invalidateNamespace("ns1");
    expect(deleted).toBe(2);
    expect(cache.get("a", "ns1")).toBeUndefined();
    expect(cache.get("c", "ns2")).toBe(3);
  });

  it("deletes specific keys", () => {
    cache.set("key1", "value1", { ttlMs: 60000 });
    expect(cache.delete("key1")).toBe(true);
    expect(cache.get("key1")).toBeUndefined();
  });

  it("stores complex objects", () => {
    const data = { users: [{ id: 1, name: "Test" }], total: 1 };
    cache.set("complex", data, { ttlMs: 60000 });
    expect(cache.get("complex")).toEqual(data);
  });

  it("returns cache stats", () => {
    cache.set("a", 1, { ttlMs: 60000, namespace: "ns1" });
    cache.set("b", 2, { ttlMs: 60000, namespace: "ns2" });

    const stats = cache.getStats();
    expect(stats.size).toBe(2);
    expect(stats.namespaces.ns1).toBe(1);
    expect(stats.namespaces.ns2).toBe(1);
  });
});
