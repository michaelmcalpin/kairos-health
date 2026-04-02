/**
 * KAIROS Rate Limiter
 *
 * Sliding window rate limiter with Redis support for production
 * horizontal scaling. Falls back to in-memory when Redis is unavailable.
 */

import { redis } from "@/lib/redis";
import { logger } from "@/lib/middleware/logger";

export interface RateLimitConfig {
  /** Maximum number of requests in the window */
  maxRequests: number;
  /** Window duration in milliseconds */
  windowMs: number;
  /** Identifier function (default: IP-based) */
  keyFn?: (req: Request) => string;
  /** Custom message on limit exceeded */
  message?: string;
}

interface WindowEntry {
  count: number;
  resetAt: number;
}

// ─── In-Memory Fallback ────────────────────────────────────────────────────

class InMemoryRateLimiter {
  private windows: Map<string, WindowEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  check(key: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.windows.get(key);

    if (!entry || now > entry.resetAt) {
      const resetAt = now + config.windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    if (entry.count < config.maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.windows.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetAt) {
        this.windows.delete(key);
      }
    }
  }

  getStats(): { activeKeys: number } {
    return { activeKeys: this.windows.size };
  }

  destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.windows.clear();
  }
}

// ─── Redis-Backed Rate Limiter ─────────────────────────────────────────────

class RedisRateLimiter {
  async check(key: string, config: RateLimitConfig): Promise<{
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  }> {
    if (!redis) {
      // This shouldn't happen since we check before constructing, but just in case
      return memoryLimiter.check(key, config);
    }

    const now = Date.now();
    const redisKey = `ratelimit:${key}`;
    const windowSec = Math.ceil(config.windowMs / 1000);

    try {
      // Atomic increment + TTL set using a Lua script
      const result = await redis.eval(
        `
        local current = redis.call('INCR', KEYS[1])
        if current == 1 then
          redis.call('EXPIRE', KEYS[1], ARGV[1])
        end
        local ttl = redis.call('TTL', KEYS[1])
        return {current, ttl}
        `,
        1,
        redisKey,
        windowSec,
      ) as [number, number];

      const count = Number(result[0]);
      const ttl = Number(result[1]);
      const resetAt = now + ttl * 1000;

      if (count <= config.maxRequests) {
        return {
          allowed: true,
          remaining: config.maxRequests - count,
          resetAt,
        };
      }

      return {
        allowed: false,
        remaining: 0,
        resetAt,
        retryAfter: ttl > 0 ? ttl : Math.ceil(config.windowMs / 1000),
      };
    } catch (err) {
      // If Redis fails, fall back to memory limiter
      logger.warn("rate-limit", "Redis rate limit check failed, falling back to memory", {
        error: err instanceof Error ? err.message : "Unknown",
      });
      return memoryLimiter.check(key, config);
    }
  }

  getStats(): { activeKeys: number; backend: string } {
    return { activeKeys: -1, backend: "redis" };
  }
}

// ─── Singleton Instances ───────────────────────────────────────────────────

const memoryLimiter = new InMemoryRateLimiter();
const redisLimiter = redis ? new RedisRateLimiter() : null;

// ─── Preset Configurations ──────────────────────────────────────────────────

export const RATE_LIMITS = {
  /** Standard API: 100 requests per minute */
  standard: { maxRequests: 100, windowMs: 60000 } as RateLimitConfig,

  /** Auth endpoints: 10 requests per minute */
  auth: { maxRequests: 10, windowMs: 60000 } as RateLimitConfig,

  /** Webhook endpoints: 500 requests per minute */
  webhook: { maxRequests: 500, windowMs: 60000 } as RateLimitConfig,

  /** SSE connections: 5 per user */
  sse: { maxRequests: 5, windowMs: 300000 } as RateLimitConfig,

  /** Data write: 30 per minute */
  write: { maxRequests: 30, windowMs: 60000 } as RateLimitConfig,

  /** Stripe checkout: 5 per minute */
  checkout: { maxRequests: 5, windowMs: 60000 } as RateLimitConfig,

  /** Device sync: 10 per 15 minutes */
  deviceSync: { maxRequests: 10, windowMs: 900000 } as RateLimitConfig,
} as const;

// ─── Middleware Helper ──────────────────────────────────────────────────────

/**
 * Apply rate limiting to an API route handler.
 * Uses Redis when available, falls back to in-memory.
 * Returns rate limit headers and 429 response if exceeded.
 */
export async function applyRateLimit(
  req: Request,
  config: RateLimitConfig = RATE_LIMITS.standard
): Promise<{
  allowed: boolean;
  headers: Record<string, string>;
  response?: Response;
}> {
  const key = config.keyFn
    ? config.keyFn(req)
    : req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";

  const result = redisLimiter
    ? await redisLimiter.check(key, config)
    : memoryLimiter.check(key, config);

  const headers: Record<string, string> = {
    "X-RateLimit-Limit": String(config.maxRequests),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
  };

  if (!result.allowed) {
    headers["Retry-After"] = String(result.retryAfter || 60);
    return {
      allowed: false,
      headers,
      response: new Response(
        JSON.stringify({
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: config.message || "Too many requests. Please try again later.",
            retryAfter: result.retryAfter,
          },
        }),
        {
          status: 429,
          headers: { ...headers, "Content-Type": "application/json" },
        }
      ),
    };
  }

  return { allowed: true, headers };
}

export { memoryLimiter as rateLimiter };
