import Redis from "ioredis";
import { logger } from "@/lib/middleware/logger";

let redis: Redis | null = null;
let connectionFailed = false;

function getRedisClient(): Redis | null {
  const url = process.env.REDIS_URL;
  if (!url) {
    if (process.env.NODE_ENV !== "test") {
      logger.warn("redis", "REDIS_URL not set — using in-memory fallback");
    }
    return null;
  }

  const client = new Redis(url, {
    maxRetriesPerRequest: 2,
    lazyConnect: true,
    retryStrategy(times) {
      if (times > 3) {
        // Stop retrying after 3 attempts — fall back to in-memory
        connectionFailed = true;
        logger.warn("redis", "Max retries exceeded — disabling Redis for this process");
        return null;
      }
      return Math.min(times * 200, 2000);
    },
    reconnectOnError(err) {
      // Only reconnect on READONLY errors (e.g. failover scenarios)
      return err.message.includes("READONLY");
    },
  });

  // Suppress unhandled error events that crash the process
  client.on("error", (err) => {
    if (!connectionFailed) {
      logger.warn("redis", "Connection error", { error: err.message });
    }
  });

  client.on("connect", () => {
    connectionFailed = false;
    logger.info("redis", "Connected successfully");
  });

  // Attempt connection (non-blocking)
  client.connect().catch(() => {
    connectionFailed = true;
    logger.warn("redis", "Initial connection failed — using in-memory fallback");
  });

  return client;
}

// Initialize lazily on first import
redis = getRedisClient();

/**
 * Check if Redis is available and connected.
 * Returns false when Redis was disabled or connection failed.
 */
function isRedisReady(): boolean {
  if (!redis || connectionFailed) return false;
  return redis.status === "ready";
}

// ─── Cache Helpers ──────────────────────────────────────────────────────────

export async function cacheGet<T>(key: string): Promise<T | null> {
  if (!isRedisReady()) return null;
  try {
    const data = await redis!.get(key);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds = 300): Promise<void> {
  if (!isRedisReady()) return;
  try {
    await redis!.set(key, JSON.stringify(value), "EX", ttlSeconds);
  } catch {
    // Fall through — cache misses are acceptable
  }
}

export async function cacheInvalidate(pattern: string): Promise<void> {
  if (!isRedisReady()) return;
  try {
    const keys = await redis!.keys(pattern);
    if (keys.length > 0) await redis!.del(...keys);
  } catch {
    // Fall through
  }
}

export { redis };
