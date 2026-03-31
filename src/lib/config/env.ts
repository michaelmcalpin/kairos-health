/**
 * KAIROS Environment Configuration
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

  // Database
  DATABASE_URL: getEnvVar("DATABASE_URL", "postgresql://localhost:5432/kairos"),

  // Auth (Clerk)
  CLERK_SECRET_KEY: getEnvVar("CLERK_SECRET_KEY", ""),
  NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY: getEnvVar("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", ""),

  // Stripe
  STRIPE_SECRET_KEY: getEnvVar("STRIPE_SECRET_KEY", ""),
  STRIPE_WEBHOOK_SECRET: getEnvVar("STRIPE_WEBHOOK_SECRET", ""),

  // Webhooks
  CLERK_WEBHOOK_SECRET: getEnvVar("CLERK_WEBHOOK_SECRET", ""),
  CRON_SECRET: getEnvVar("CRON_SECRET", ""),

  // Email (Resend)
  RESEND_API_KEY: getEnvVar("RESEND_API_KEY", ""),
  EMAIL_FROM: getEnvVar("EMAIL_FROM", "KAIROS Health <noreply@kairos.health>"),

  // Device Integrations (OAuth)
  OURA_CLIENT_ID: getEnvVar("OURA_CLIENT_ID", ""),
  OURA_CLIENT_SECRET: getEnvVar("OURA_CLIENT_SECRET", ""),
  OURA_WEBHOOK_SECRET: getEnvVar("OURA_WEBHOOK_SECRET", ""),
  DEXCOM_CLIENT_ID: getEnvVar("DEXCOM_CLIENT_ID", ""),
  DEXCOM_CLIENT_SECRET: getEnvVar("DEXCOM_CLIENT_SECRET", ""),
  WHOOP_CLIENT_ID: getEnvVar("WHOOP_CLIENT_ID", ""),
  WHOOP_CLIENT_SECRET: getEnvVar("WHOOP_CLIENT_SECRET", ""),
  WHOOP_WEBHOOK_SECRET: getEnvVar("WHOOP_WEBHOOK_SECRET", ""),
  GARMIN_CONSUMER_KEY: getEnvVar("GARMIN_CONSUMER_KEY", ""),
  GARMIN_CONSUMER_SECRET: getEnvVar("GARMIN_CONSUMER_SECRET", ""),
  FITBIT_CLIENT_ID: getEnvVar("FITBIT_CLIENT_ID", ""),
  FITBIT_CLIENT_SECRET: getEnvVar("FITBIT_CLIENT_SECRET", ""),
  WITHINGS_CLIENT_ID: getEnvVar("WITHINGS_CLIENT_ID", ""),
  WITHINGS_CLIENT_SECRET: getEnvVar("WITHINGS_CLIENT_SECRET", ""),
  WITHINGS_WEBHOOK_SECRET: getEnvVar("WITHINGS_WEBHOOK_SECRET", ""),

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
