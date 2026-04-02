/**
 * KAIROS Application Cache
 *
 * TTL-based cache with namespace support for API responses
 * and computed data. Uses Redis when available, falls back
 * to in-memory LRU cache for development.
 *
 * Features:
 * - TTL (time-to-live) per entry
 * - Namespace-based invalidation
 * - LRU eviction when max size exceeded (memory mode)
 * - Stale-while-revalidate support
 * - Redis-backed for production horizontal scaling
 */

import { redis, cacheGet, cacheSet, cacheInvalidate } from "@/lib/redis";

interface CacheEntry<T> {
  value: T;
  expiresAt: number;
  staleAt?: number;
  namespace: string;
  key: string;
  accessedAt: number;
}

export interface CacheOptions {
  /** Time-to-live in milliseconds */
  ttlMs: number;
  /** Optional stale-while-revalidate window in ms */
  staleWhileRevalidateMs?: number;
  /** Namespace for grouped invalidation */
  namespace?: string;
}

// ─── Preset TTLs ────────────────────────────────────────────────────────────

export const CACHE_TTL = {
  /** Real-time data: 10 seconds */
  realtime: 10_000,
  /** Dashboard aggregates: 1 minute */
  dashboard: 60_000,
  /** List queries: 2 minutes */
  list: 120_000,
  /** Stats/summaries: 5 minutes */
  stats: 300_000,
  /** User profile: 10 minutes */
  profile: 600_000,
  /** Config/static: 30 minutes */
  config: 1_800_000,
  /** Lab results: 1 hour */
  labs: 3_600_000,
} as const;

class MemoryCache {
  private store: Map<string, CacheEntry<unknown>> = new Map();
  private maxSize: number;
  private cleanupInterval: ReturnType<typeof setInterval>;

  constructor(maxSize = 5000) {
    this.maxSize = maxSize;
    // Cleanup expired entries every 30 seconds
    this.cleanupInterval = setInterval(() => this.evictExpired(), 30000);
  }

  /**
   * Get a cached value
   */
  get<T>(key: string, namespace = "default"): T | undefined {
    const fullKey = `${namespace}:${key}`;
    const entry = this.store.get(fullKey) as CacheEntry<T> | undefined;

    if (!entry) return undefined;

    const now = Date.now();

    // Check if expired
    if (now > entry.expiresAt) {
      // Check stale-while-revalidate window
      if (entry.staleAt && now <= entry.staleAt) {
        entry.accessedAt = now;
        return entry.value; // Return stale value
      }
      this.store.delete(fullKey);
      return undefined;
    }

    entry.accessedAt = now;
    return entry.value;
  }

  /**
   * Set a cached value
   */
  set<T>(key: string, value: T, options: CacheOptions): void {
    const namespace = options.namespace || "default";
    const fullKey = `${namespace}:${key}`;
    const now = Date.now();

    // Evict if at max capacity
    if (this.store.size >= this.maxSize && !this.store.has(fullKey)) {
      this.evictLRU();
    }

    this.store.set(fullKey, {
      value,
      expiresAt: now + options.ttlMs,
      staleAt: options.staleWhileRevalidateMs
        ? now + options.ttlMs + options.staleWhileRevalidateMs
        : undefined,
      namespace,
      key,
      accessedAt: now,
    });
  }

  /**
   * Get or compute a value (cache-aside pattern)
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => T | Promise<T>,
    options: CacheOptions
  ): Promise<T> {
    const namespace = options.namespace || "default";
    const cached = this.get<T>(key, namespace);
    if (cached !== undefined) return cached;

    const value = await computeFn();
    this.set(key, value, options);
    return value;
  }

  /**
   * Delete a specific key
   */
  delete(key: string, namespace = "default"): boolean {
    return this.store.delete(`${namespace}:${key}`);
  }

  /**
   * Invalidate all entries in a namespace
   */
  invalidateNamespace(namespace: string): number {
    let count = 0;
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      if (entry.namespace === namespace) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Invalidate entries matching a pattern
   */
  invalidatePattern(pattern: string): number {
    let count = 0;
    const regex = new RegExp(pattern);
    const keys = Array.from(this.store.keys());
    for (const key of keys) {
      if (regex.test(key)) {
        this.store.delete(key);
        count++;
      }
    }
    return count;
  }

  /**
   * Clear the entire cache
   */
  clear(): void {
    this.store.clear();
  }

  /**
   * Get cache statistics
   */
  getStats(): {
    size: number;
    maxSize: number;
    namespaces: Record<string, number>;
  } {
    const namespaces: Record<string, number> = {};
    const entries = Array.from(this.store.values());
    for (const entry of entries) {
      const e = entry as CacheEntry<unknown>;
      namespaces[e.namespace] = (namespaces[e.namespace] || 0) + 1;
    }
    return { size: this.store.size, maxSize: this.maxSize, namespaces };
  }

  /**
   * Remove expired entries
   */
  private evictExpired(): void {
    const now = Date.now();
    const entries = Array.from(this.store.entries());
    for (const [key, entry] of entries) {
      const e = entry as CacheEntry<unknown>;
      const finalExpiry = e.staleAt || e.expiresAt;
      if (now > finalExpiry) {
        this.store.delete(key);
      }
    }
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestAccess = Infinity;

    const allEntries = Array.from(this.store.entries());
    for (const [key, entry] of allEntries) {
      const e = entry as CacheEntry<unknown>;
      if (e.accessedAt < oldestAccess) {
        oldestAccess = e.accessedAt;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.store.delete(oldestKey);
    }
  }

  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.store.clear();
  }
}

// ─── Hybrid Cache (Redis + Memory Fallback) ────────────────────────────────

class HybridCache {
  private memory = new MemoryCache();

  /**
   * Get a cached value. Checks Redis first, then memory.
   */
  get<T>(key: string, namespace = "default"): T | undefined {
    // Synchronous path: check memory cache
    // Redis is checked in getOrSet for async workflows
    return this.memory.get<T>(key, namespace);
  }

  /**
   * Set a cached value. Writes to both Redis and memory.
   */
  set<T>(key: string, value: T, options: CacheOptions): void {
    const namespace = options.namespace || "default";
    const fullKey = `${namespace}:${key}`;

    // Always set in memory for fast synchronous reads
    this.memory.set(key, value, options);

    // Also set in Redis for cross-instance sharing
    if (redis) {
      const ttlSeconds = Math.ceil(options.ttlMs / 1000);
      cacheSet(fullKey, value, ttlSeconds).catch(() => {
        // Silently fall back to memory-only on Redis error
      });
    }
  }

  /**
   * Get or compute a value. Checks Redis first, then memory, then computes.
   */
  async getOrSet<T>(
    key: string,
    computeFn: () => T | Promise<T>,
    options: CacheOptions,
  ): Promise<T> {
    const namespace = options.namespace || "default";
    const fullKey = `${namespace}:${key}`;

    // Check memory first (fastest)
    const memCached = this.memory.get<T>(key, namespace);
    if (memCached !== undefined) return memCached;

    // Check Redis (if available)
    if (redis) {
      try {
        const redisCached = await cacheGet<T>(fullKey);
        if (redisCached !== null && redisCached !== undefined) {
          // Backfill memory cache
          this.memory.set(key, redisCached, options);
          return redisCached;
        }
      } catch {
        // Redis error — continue to compute
      }
    }

    // Compute the value
    const value = await computeFn();
    this.set(key, value, options);
    return value;
  }

  /**
   * Delete a specific key from both caches.
   */
  delete(key: string, namespace = "default"): boolean {
    const fullKey = `${namespace}:${key}`;
    if (redis) {
      cacheInvalidate(fullKey).catch(() => {});
    }
    return this.memory.delete(key, namespace);
  }

  /**
   * Invalidate all entries in a namespace.
   */
  invalidateNamespace(namespace: string): number {
    if (redis) {
      cacheInvalidate(`${namespace}:*`).catch(() => {});
    }
    return this.memory.invalidateNamespace(namespace);
  }

  /**
   * Invalidate entries matching a pattern.
   */
  invalidatePattern(pattern: string): number {
    if (redis) {
      cacheInvalidate(`*${pattern}*`).catch(() => {});
    }
    return this.memory.invalidatePattern(pattern);
  }

  /**
   * Clear the entire cache.
   */
  clear(): void {
    this.memory.clear();
  }

  /**
   * Get cache statistics.
   */
  getStats(): {
    size: number;
    maxSize: number;
    namespaces: Record<string, number>;
    backend: string;
  } {
    const memStats = this.memory.getStats();
    return {
      ...memStats,
      backend: redis ? "redis+memory" : "memory",
    };
  }

  destroy(): void {
    this.memory.destroy();
  }
}

// Singleton instance
export const cache = new HybridCache();

// ─── Cache Key Builders ─────────────────────────────────────────────────────

export const CacheKeys = {
  /** Client dashboard data */
  clientDashboard: (userId: string, dateRange: string) =>
    `dashboard:${userId}:${dateRange}`,

  /** Client glucose stats */
  glucoseStats: (userId: string, dateRange: string) =>
    `glucose:stats:${userId}:${dateRange}`,

  /** Client sleep stats */
  sleepStats: (userId: string, dateRange: string) =>
    `sleep:stats:${userId}:${dateRange}`,

  /** Coach client list */
  coachClients: (coachId: string) =>
    `coach:clients:${coachId}`,

  /** Coach dashboard */
  coachDashboard: (coachId: string) =>
    `coach:dashboard:${coachId}`,

  /** Admin analytics */
  adminAnalytics: (dateRange: string) =>
    `admin:analytics:${dateRange}`,

  /** Lab results for a user */
  labResults: (userId: string) =>
    `labs:results:${userId}`,

  /** Device sync state */
  syncState: (userId: string, provider: string) =>
    `sync:${userId}:${provider}`,
} as const;

// ─── Cache Namespaces ───────────────────────────────────────────────────────

export const CacheNamespaces = {
  CLIENT: "client",
  COACH: "coach",
  ADMIN: "admin",
  LABS: "labs",
  SYNC: "sync",
} as const;
