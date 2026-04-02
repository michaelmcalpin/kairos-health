/**
 * KAIROS Error Handling System
 *
 * Typed error classes, error codes, and utilities for
 * consistent error handling across API routes and tRPC procedures.
 */

import { logger } from "@/lib/middleware/logger";

// ─── Error Codes ────────────────────────────────────────────────────────────

export const ERROR_CODES = {
  // Auth
  UNAUTHORIZED: "UNAUTHORIZED",
  FORBIDDEN: "FORBIDDEN",
  SESSION_EXPIRED: "SESSION_EXPIRED",

  // Validation
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Resources
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Business Logic
  SUBSCRIPTION_REQUIRED: "SUBSCRIPTION_REQUIRED",
  TIER_INSUFFICIENT: "TIER_INSUFFICIENT",
  RATE_LIMIT_EXCEEDED: "RATE_LIMIT_EXCEEDED",
  COACH_CLIENT_LIMIT: "COACH_CLIENT_LIMIT",

  // Integration
  STRIPE_ERROR: "STRIPE_ERROR",
  DEVICE_SYNC_ERROR: "DEVICE_SYNC_ERROR",
  LAB_PROVIDER_ERROR: "LAB_PROVIDER_ERROR",
  WEBHOOK_ERROR: "WEBHOOK_ERROR",

  // System
  INTERNAL_ERROR: "INTERNAL_ERROR",
  SERVICE_UNAVAILABLE: "SERVICE_UNAVAILABLE",
  DATABASE_ERROR: "DATABASE_ERROR",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];

// ─── HTTP Status Mapping ────────────────────────────────────────────────────

const HTTP_STATUS: Record<ErrorCode, number> = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  SESSION_EXPIRED: 401,
  VALIDATION_ERROR: 400,
  INVALID_INPUT: 400,
  NOT_FOUND: 404,
  ALREADY_EXISTS: 409,
  CONFLICT: 409,
  SUBSCRIPTION_REQUIRED: 402,
  TIER_INSUFFICIENT: 403,
  RATE_LIMIT_EXCEEDED: 429,
  COACH_CLIENT_LIMIT: 403,
  STRIPE_ERROR: 502,
  DEVICE_SYNC_ERROR: 502,
  LAB_PROVIDER_ERROR: 502,
  WEBHOOK_ERROR: 400,
  INTERNAL_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
  DATABASE_ERROR: 500,
};

// ─── Error Class ────────────────────────────────────────────────────────────

export class KairosError extends Error {
  public readonly code: ErrorCode;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(code: ErrorCode, message: string, details?: Record<string, unknown>) {
    super(message);
    this.name = "KairosError";
    this.code = code;
    this.statusCode = HTTP_STATUS[code] || 500;
    this.details = details;
  }

  toJSON() {
    return {
      error: {
        code: this.code,
        message: this.message,
        ...(this.details ? { details: this.details } : {}),
      },
    };
  }
}

// ─── Error Factories ────────────────────────────────────────────────────────

export const Errors = {
  unauthorized: (message = "Authentication required") =>
    new KairosError("UNAUTHORIZED", message),

  forbidden: (message = "You do not have permission to perform this action") =>
    new KairosError("FORBIDDEN", message),

  notFound: (resource: string) =>
    new KairosError("NOT_FOUND", `${resource} not found`, { resource }),

  validationError: (message: string, fields?: Record<string, string>) =>
    new KairosError("VALIDATION_ERROR", message, fields ? { fields } : undefined),

  subscriptionRequired: (requiredTier?: string) =>
    new KairosError("SUBSCRIPTION_REQUIRED", "An active subscription is required", { requiredTier }),

  tierInsufficient: (requiredTier: string, currentTier: string) =>
    new KairosError("TIER_INSUFFICIENT", `This feature requires ${requiredTier} tier`, {
      requiredTier,
      currentTier,
    }),

  rateLimited: (retryAfterSeconds: number) =>
    new KairosError("RATE_LIMIT_EXCEEDED", "Too many requests, please try again later", {
      retryAfterSeconds,
    }),

  stripeError: (message: string, stripeCode?: string) =>
    new KairosError("STRIPE_ERROR", message, stripeCode ? { stripeCode } : undefined),

  deviceSyncError: (provider: string, message: string) =>
    new KairosError("DEVICE_SYNC_ERROR", message, { provider }),

  internal: (message = "An unexpected error occurred") =>
    new KairosError("INTERNAL_ERROR", message),
} as const;

// ─── Error Handler for API Routes ───────────────────────────────────────────

export function handleApiError(error: unknown): { status: number; body: object } {
  if (error instanceof KairosError) {
    return {
      status: error.statusCode,
      body: error.toJSON(),
    };
  }

  // Zod validation errors
  if (error && typeof error === "object" && "issues" in error) {
    const zodError = error as { issues: Array<{ path: string[]; message: string }> };
    const fields: Record<string, string> = {};
    for (const issue of zodError.issues) {
      fields[issue.path.join(".")] = issue.message;
    }
    const kairosError = Errors.validationError("Invalid input data", fields);
    return { status: kairosError.statusCode, body: kairosError.toJSON() };
  }

  // Unknown errors
  const errorMsg = error instanceof Error ? error.message : String(error);
  logger.error("errors", "Unhandled API error", { error: errorMsg });
  const fallback = Errors.internal();
  return { status: fallback.statusCode, body: fallback.toJSON() };
}
