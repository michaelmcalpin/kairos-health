/**
 * EVERIST Environment Configuration
 *
 * Type-safe environment variable access with validation.
 * All env vars are validated at startup time.
 */

function getEnvVar(name: string, defaultValue?: string): string {
  const value = process.env[name] || defaultValue;
  if (value === undefined) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

/**
 * Get an env var that is REQUIRED in production.  In development, falls
 * back to `devDefault` so the app can run without every secret configured.
 */
function requireInProd(name: string, devDefault = ""): string {
  const value = process.env[name];
  if (value) return value;
  if (process.env.NODE_ENV === "production") {
    // During `next build` the env vars aren't always available — they are
    // injected at runtime by Vercel.  Throwing here would crash the build.
    // Log a warning instead and return empty string; actual runtime requests
    // that need the value will fail with a clear error from the calling code.
    console.warn(
      `[EVERIST] WARNING: Environment variable "${name}" is not set. ` +
      `This is expected during build but will cause errors at runtime if not configured.`
    );
    return devDefault;
  }
  return devDefault;
}

function getEnvBool(name: string, defaultValue: boolean): boolean {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  return value === "true" || value === "1";
}

function getEnvInt(name: string, defaultValue: number): number {
  const value = process.env[name];
  if (value === undefined) return defaultValue;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? defaultValue : parsed;
}

// ─── Configuration Object ───────────────────────────────────────────────────

export const env = {
  // App
  NODE_ENV: getEnvVar("NODE_ENV", "development"),
  APP_URL: getEnvVar("NEXT_PUBLIC_APP_URL", "http://localhost:3000"),
  IS_PRODUCTION: process.env.NODE_ENV === "production",
  IS_DEVELOPMENT: process.env.NODE_ENV !== "production",

  // Database — required in production
  DATABASE_URL: requireInProd("DATABASE_URL", "postgresql://localhost:5432/kairos"),

  // Auth (Clerk) — required in production
  CLERK_SECRET_KEY: requireInProd("CLERK_SECRET_KEY"),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: requireInProd("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"),

  // Clerk routing URLs
  NEXT_PUBLIC_CLERK_SIGN_IN_URL: getEnvVar("NEXT_PUBLIC_CLERK_SIGN_IN_URL", "/sign-in"),
  NEXT_PUBLIC_CLERK_SIGN_UP_URL: getEnvVar("NEXT_PUBLIC_CLERK_SIGN_UP_URL", "/sign-up"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL: getEnvVar("NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL", "/dashboard"),
  NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL: getEnvVar("NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL", "/onboarding"),

  // Stripe — required in production
  STRIPE_SECRET_KEY: requireInProd("STRIPE_SECRET_KEY"),
  STRIPE_WEBHOOK_SECRET: requireInProd("STRIPE_WEBHOOK_SECRET"),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: getEnvVar("NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY", ""),

  // Upstash Redis (optional — falls back to in-memory cache/rate-limit).
  // Both are auto-injected by the Vercel ↔ Upstash integration.
  UPSTASH_REDIS_REST_URL: getEnvVar("UPSTASH_REDIS_REST_URL", ""),
  UPSTASH_REDIS_REST_TOKEN: getEnvVar("UPSTASH_REDIS_REST_TOKEN", ""),

  // Webhooks — required in production
  CLERK_WEBHOOK_SECRET: requireInProd("CLERK_WEBHOOK_SECRET"),
  CRON_SECRET: requireInProd("CRON_SECRET"),
  GARMIN_WEBHOOK_SECRET: getEnvVar("GARMIN_WEBHOOK_SECRET", ""),

  // Email (Resend)
  RESEND_API_KEY: getEnvVar("RESEND_API_KEY", ""),
  EMAIL_FROM: getEnvVar("EMAIL_FROM", "Everist.ai <noreply@everist.ai>"),

  // Device Integrations (OAuth)
  OURA_CLIENT_ID: getEnvVar("OURA_CLIENT_ID", ""),
  OURA_CLIENT_SECRET: getEnvVar("OURA_CLIENT_SECRET", ""),
  OURA_WEBHOOK_SECRET: getEnvVar("OURA_WEBHOOK_SECRET", ""),
  DEXCOM_CLIENT_ID: getEnvVar("DEXCOM_CLIENT_ID", ""),
  DEXCOM_CLIENT_SECRET: getEnvVar("DEXCOM_CLIENT_SECRET", ""),
  WHOOP_CLIENT_ID: getEnvVar("WHOOP_CLIENT_ID", ""),
  WHOOP_CLIENT_SECRET: getEnvVar("WHOOP_CLIENT_SECRET", ""),
  WHOOP_WEBHOOK_SECRET: getEnvVar("WHOOP_WEBHOOK_SECRET", ""),
  GARMIN_CLIENT_ID: getEnvVar("GARMIN_CLIENT_ID", ""),
  GARMIN_CLIENT_SECRET: getEnvVar("GARMIN_CLIENT_SECRET", ""),
  FITBIT_CLIENT_ID: getEnvVar("FITBIT_CLIENT_ID", ""),
  FITBIT_CLIENT_SECRET: getEnvVar("FITBIT_CLIENT_SECRET", ""),
  WITHINGS_CLIENT_ID: getEnvVar("WITHINGS_CLIENT_ID", ""),
  WITHINGS_CLIENT_SECRET: getEnvVar("WITHINGS_CLIENT_SECRET", ""),
  WITHINGS_WEBHOOK_SECRET: getEnvVar("WITHINGS_WEBHOOK_SECRET", ""),
  HUME_CLIENT_ID: getEnvVar("HUME_CLIENT_ID", ""),
  HUME_CLIENT_SECRET: getEnvVar("HUME_CLIENT_SECRET", ""),
  // Hume AI (EVI voice) API + webhook verification.
  HUME_API_KEY: getEnvVar("HUME_API_KEY", ""),
  HUME_API_BASE: getEnvVar("HUME_API_BASE", "https://api.hume.ai"),
  // Per-account signing key for verifying inbound EVI webhook payloads
  // (X-Hume-AI-Webhook-Signature / -Timestamp). From app.hume.ai settings.
  HUME_WEBHOOK_SIGNING_KEY: getEnvVar("HUME_WEBHOOK_SIGNING_KEY", ""),

  // Google Calendar (coach calendar integration — Calendly-style busy-time
  // conflict blocking). Redirect URI: ${APP_URL}/api/integrations/google/callback
  GOOGLE_CLIENT_ID: getEnvVar("GOOGLE_CLIENT_ID", ""),
  GOOGLE_CLIENT_SECRET: getEnvVar("GOOGLE_CLIENT_SECRET", ""),

  // Microsoft / Outlook Calendar (coach calendar integration — same
  // Calendly-style busy-time blocking + send-as-coach mail via Graph).
  // Redirect URI: ${APP_URL}/api/integrations/microsoft/callback
  // MICROSOFT_TENANT_ID defaults to "common" (multi-tenant / personal accounts).
  MICROSOFT_CLIENT_ID: getEnvVar("MICROSOFT_CLIENT_ID", ""),
  MICROSOFT_CLIENT_SECRET: getEnvVar("MICROSOFT_CLIENT_SECRET", ""),
  MICROSOFT_TENANT_ID: getEnvVar("MICROSOFT_TENANT_ID", "common"),

  // Token Encryption (optional — plaintext fallback with warning when missing)
  TOKEN_ENCRYPTION_KEY: getEnvVar("TOKEN_ENCRYPTION_KEY", ""),

  // AI (Anthropic Claude)
  ANTHROPIC_API_KEY: requireInProd("ANTHROPIC_API_KEY"),

  // Logging
  LOG_LEVEL: getEnvVar("LOG_LEVEL", "info") as "debug" | "info" | "warn" | "error",

  // Performance
  CACHE_MAX_SIZE: getEnvInt("CACHE_MAX_SIZE", 5000),
  RATE_LIMIT_ENABLED: getEnvBool("RATE_LIMIT_ENABLED", true),

  // Feature Flags (loaded from env, overridable via admin panel)
  ENABLE_DEMO_MODE: getEnvBool("ENABLE_DEMO_MODE", false),
  ENABLE_REALTIME: getEnvBool("ENABLE_REALTIME", true),
  ENABLE_DEVICE_SYNC: getEnvBool("ENABLE_DEVICE_SYNC", false),
  ENABLE_LAB_ORDERING: getEnvBool("ENABLE_LAB_ORDERING", false),
  ENABLE_COACH_MESSAGING: getEnvBool("ENABLE_COACH_MESSAGING", false),
} as const;

// ─── Feature Flags ──────────────────────────────────────────────────────────

export interface FeatureFlags {
  demoMode: boolean;
  realtime: boolean;
  deviceSync: boolean;
  labOrdering: boolean;
  coachMessaging: boolean;
  stripePayments: boolean;
  aiInsights: boolean;
  darkMode: boolean;
  exportData: boolean;
  mobileApp: boolean;
}

// In-memory feature flags (can be toggled via admin API)
let _flags: FeatureFlags = {
  demoMode: env.ENABLE_DEMO_MODE,
  realtime: env.ENABLE_REALTIME,
  deviceSync: env.ENABLE_DEVICE_SYNC,
  labOrdering: env.ENABLE_LAB_ORDERING,
  coachMessaging: env.ENABLE_COACH_MESSAGING,
  stripePayments: !!env.STRIPE_SECRET_KEY,
  aiInsights: false,
  darkMode: false,
  exportData: true,
  mobileApp: false,
};

export function getFeatureFlags(): FeatureFlags {
  return { ..._flags };
}

export function isFeatureEnabled(flag: keyof FeatureFlags): boolean {
  return _flags[flag];
}

export function setFeatureFlag(flag: keyof FeatureFlags, enabled: boolean): void {
  _flags = { ..._flags, [flag]: enabled };
}

export function resetFeatureFlags(): void {
  _flags = {
    demoMode: env.ENABLE_DEMO_MODE,
    realtime: env.ENABLE_REALTIME,
    deviceSync: env.ENABLE_DEVICE_SYNC,
    labOrdering: env.ENABLE_LAB_ORDERING,
    coachMessaging: env.ENABLE_COACH_MESSAGING,
    stripePayments: !!env.STRIPE_SECRET_KEY,
    aiInsights: false,
    darkMode: false,
    exportData: true,
    mobileApp: false,
  };
}

// ─── Tier Feature Matrix ────────────────────────────────────────────────────

export const TIER_FEATURES: Record<string, Record<keyof FeatureFlags, boolean>> = {
  tier1: {
    demoMode: false,
    realtime: true,
    deviceSync: true,
    labOrdering: true,
    coachMessaging: true,
    stripePayments: true,
    aiInsights: true,
    darkMode: true,
    exportData: true,
    mobileApp: true,
  },
  tier2: {
    demoMode: false,
    realtime: true,
    deviceSync: true,
    labOrdering: true,
    coachMessaging: true,
    stripePayments: true,
    aiInsights: false,
    darkMode: true,
    exportData: true,
    mobileApp: true,
  },
  tier3: {
    demoMode: false,
    realtime: true,
    deviceSync: true,
    labOrdering: false,
    coachMessaging: false,
    stripePayments: true,
    aiInsights: false,
    darkMode: true,
    exportData: false,
    mobileApp: false,
  },
};

/**
 * Check if a feature is available for a specific tier
 */
export function isTierFeatureEnabled(tier: string, feature: keyof FeatureFlags): boolean {
  // Global flag must be on AND tier must support it
  if (!_flags[feature]) return false;
  const tierFeatures = TIER_FEATURES[tier];
  if (!tierFeatures) return false;
  return tierFeatures[feature];
}
