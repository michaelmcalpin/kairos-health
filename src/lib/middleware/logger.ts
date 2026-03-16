/**
 * KAIROS Request Logger & Performance Monitor
 *
 * Structured logging for API requests with timing metrics.
 * Outputs JSON logs suitable for log aggregation services.
 */

export interface RequestLog {
  timestamp: string;
  method: string;
  path: string;
  status: number;
  durationMs: number;
  userId?: string;
  userRole?: string;
  ip?: string;
  userAgent?: string;
  error?: string;
  cached?: boolean;
  rateLimited?: boolean;
}

export type LogLevel = "debug" | "info" | "warn" | "error";

// ─── Logger ─────────────────────────────────────────────────────────────────

class Logger {
  private minLevel: LogLevel;
  private levels: Record<LogLevel, number> = { debug: 0, info: 1, warn: 2, error: 3 };

  constructor(minLevel: LogLevel = "info") {
    this.minLevel = minLevel;
  }

  private shouldLog(level: LogLevel): boolean {
    return this.levels[level] >= this.levels[this.minLevel];
  }

  private formatMessage(level: LogLevel, category: string, message: string, data?: Record<string, unknown>): string {
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      ...data,
    };
    return JSON.stringify(entry);
  }

  debug(category: string, message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("debug")) {
      console.debug(this.formatMessage("debug", category, message, data));
    }
  }

  info(category: string, message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("info")) {
      console.info(this.formatMessage("info", category, message, data));
    }
  }

  warn(category: string, message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("warn")) {
      console.warn(this.formatMessage("warn", category, message, data));
    }
  }

  error(category: string, message: string, data?: Record<string, unknown>): void {
    if (this.shouldLog("error")) {
      console.error(this.formatMessage("error", category, message, data));
    }
  }

  /**
   * Log an API request with timing
   */
  request(log: RequestLog): void {
    const level: LogLevel = log.status >= 500 ? "error" : log.status >= 400 ? "warn" : "info";
    const message = `${log.method} ${log.path} ${log.status} ${log.durationMs}ms`;

    if (this.shouldLog(level)) {
      const formatted = this.formatMessage(level, "api", message, {
        ...log,
        // Don't duplicate message fields
        timestamp: undefined,
      });
      if (level === "error") console.error(formatted);
      else if (level === "warn") console.warn(formatted);
      else console.info(formatted);
    }
  }
}

// Singleton with env-based level
const logLevel = (process.env.LOG_LEVEL as LogLevel) || (process.env.NODE_ENV === "production" ? "info" : "debug");
export const logger = new Logger(logLevel);

// ─── Performance Timer ──────────────────────────────────────────────────────

export class PerfTimer {
  private startTime: number;
  private marks: Map<string, number> = new Map();

  constructor() {
    this.startTime = performance.now();
  }

  /**
   * Record a named mark
   */
  mark(name: string): void {
    this.marks.set(name, performance.now());
  }

  /**
   * Get duration since start (ms)
   */
  elapsed(): number {
    return Math.round((performance.now() - this.startTime) * 100) / 100;
  }

  /**
   * Get duration between two marks (ms)
   */
  between(startMark: string, endMark: string): number | null {
    const start = this.marks.get(startMark);
    const end = this.marks.get(endMark);
    if (start === undefined || end === undefined) return null;
    return Math.round((end - start) * 100) / 100;
  }

  /**
   * Get all timings
   */
  getTimings(): Record<string, number> {
    const result: Record<string, number> = { total: this.elapsed() };
    const markEntries = Array.from(this.marks.entries());
    let prevTime = this.startTime;
    let prevName = "start";

    for (const [name, time] of markEntries) {
      result[`${prevName}_to_${name}`] = Math.round((time - prevTime) * 100) / 100;
      prevTime = time;
      prevName = name;
    }

    return result;
  }
}

// ─── API Route Wrapper ──────────────────────────────────────────────────────

/**
 * Wrap an API route handler with automatic logging and timing.
 *
 * Usage:
 * ```ts
 * export const GET = withLogging(async (req) => {
 *   // handler logic
 *   return NextResponse.json({ data });
 * });
 * ```
 */
export function withLogging(
  handler: (req: Request, context?: unknown) => Promise<Response>
): (req: Request, context?: unknown) => Promise<Response> {
  return async (req: Request, context?: unknown): Promise<Response> => {
    const timer = new PerfTimer();
    const url = new URL(req.url);

    try {
      const response = await handler(req, context);
      timer.mark("done");

      logger.request({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: url.pathname,
        status: response.status,
        durationMs: timer.elapsed(),
        ip: req.headers.get("x-forwarded-for") || undefined,
        userAgent: req.headers.get("user-agent") || undefined,
      });

      // Add server timing header
      const newHeaders = new Headers(response.headers);
      newHeaders.set("Server-Timing", `total;dur=${timer.elapsed()}`);

      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: newHeaders,
      });
    } catch (err) {
      timer.mark("error");
      const message = err instanceof Error ? err.message : "Unknown error";

      logger.request({
        timestamp: new Date().toISOString(),
        method: req.method,
        path: url.pathname,
        status: 500,
        durationMs: timer.elapsed(),
        error: message,
      });

      return new Response(
        JSON.stringify({ error: { code: "INTERNAL_ERROR", message } }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }
  };
}
