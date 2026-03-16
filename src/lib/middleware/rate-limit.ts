/**
 * KAIROS Rate Limiter
 *
 * In-memory sliding window rate limiter for API routes.
 * For production horizontal scaling, replace with Redis-backed implementation.
 */

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

class RateLimiter {
  private windows: Map<string, WindowEntry> = new Map();
  private cleanupInterval: ReturnType<typeof setInterval> | null = null;

  constructor() {
    // Clean up expired entries every 60 seconds
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000);
  }

  /**
   * Check if a request should be allowed
   */
  check(key: string, config: RateLimitConfig): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
    retryAfter?: number;
  } {
    const now = Date.now();
    const entry = this.windows.get(key);

    // No existing window or window expired
    if (!entry || now > entry.resetAt) {
      const resetAt = now + config.windowMs;
      this.windows.set(key, { count: 1, resetAt });
      return { allowed: true, remaining: config.maxRequests - 1, resetAt };
    }

    // Window still active
    if (entry.count < config.maxRequests) {
      entry.count++;
      return {
        allowed: true,
        remaining: config.maxRequests - entry.count,
        resetAt: entry.resetAt,
      };
    }

    // Rate limited
    return {
      allowed: false,
      remaining: 0,
      resetAt: entry.resetAt,
      retryAfter: Math.ceil((entry.resetAt - now) / 1000),
    };
  }

  /**
   * Remove expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    const entries = Array.from(this.windows.entries());
    for (const [key, entry] of entries) {
      if (now > entry.resetAt) {
        this.windows.delete(key);
      }
    }
  }

  /**
   * Get current stats
   */
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

// Singleton instance
const rateLimiter = new RateLimiter();

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
 * Returns rate limit headers and 429 response if exceeded.
 */
export function applyRateLimit(
  req: Request,
  config: RateLimitConfig = RATE_LIMITS.standard
): {
  allowed: boolean;
  headers: Record<string, string>;
  response?: Response;
} {
  const key = config.keyFn
    ? config.keyFn(req)
    : req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "anonymous";

  const result = rateLimiter.check(key, config);

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

export { rateLimiter };
