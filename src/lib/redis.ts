/**
 * Upstash Redis (HTTP) client.
 *
 * We use Upstash's REST client rather than a TCP client (ioredis) because the
 * app runs on Vercel serverless functions, which freeze/thaw between requests
 * and can't hold a persistent socket — a TCP client throws "Connection is
 * closed" intermittently. Upstash talks over stateless HTTPS, so every call is
 * independent and serverless-safe.
 *
 * Configured via UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (both are
 * auto-injected by the Vercel ↔ Upstash integration). When they're absent the
 * client is null and callers fall back to their in-memory path.
 */

import { Redis } from "@upstash/redis";
import { logger } from "@/lib/middleware/logger";

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    if (process.env.NODE_ENV !== "test") {
      logger.warn(
        "redis",
        "UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN not set — using in-memory fallback",
      );
    }
    return null;
  }
  try {
    return new Redis({ url, token });
  } catch (err) {
    logger.warn("redis", "Failed to initialize Upstash client — using in-memory fallback", {
      error: err instanceof Error ? err.message : "Unknown",
    });
    return null;
  }
}

const redis = getRedisClient();

/** Upstash HTTP has no persistent connection — "ready" simply means configured. */
function isRedisReady(): boolean {
  return redis !== null;
}

// ─── Cache Helpers ──────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!redis) return null;
  try {
    // The Upstash client auto-deserializes JSON values.
    const data = await redis.get<T>(key);
    return data ?? null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!redis) return;
  try {
    await redis.set(key, value, { ex: ttlSeconds });
  } catch {
    // Fall through — cache misses are acceptable
  }
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!redis) return;
  try {
    const keys = await redis.keys(pattern);
    if (keys.length > 0) await redis.del(...keys);
  } catch {
    // Fall through
  }
}

export { redis, isRedisReady };
