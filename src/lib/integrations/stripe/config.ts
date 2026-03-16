/**
 * KAIROS Stripe Configuration
 *
 * Maps KAIROS subscription tiers to Stripe price IDs.
 * Set STRIPE_SECRET_KEY and price IDs in .env.local
 */

export const STRIPE_CONFIG = {
  /** Stripe API version */
  apiVersion: "2026-02-25.clover" as const,

  /** Product mapping for the three KAIROS tiers */
  tiers: {
    tier1: {
      name: "KAIROS Private",
      monthlyPriceId: process.env.STRIPE_PRICE_TIER1_MONTHLY || "price_tier1_monthly",
      annualPriceId: process.env.STRIPE_PRICE_TIER1_ANNUAL || "price_tier1_annual",
      monthlyAmount: 49900, // $499.00
      annualAmount: 478800, // $4,788.00 (2 months free)
      features: [
        "Dedicated health coach",
        "Unlimited 1:1 sessions",
        "Advanced lab analysis",
        "Custom supplement protocols",
        "Priority support",
      ],
    },
    tier2: {
      name: "KAIROS Associate",
      monthlyPriceId: process.env.STRIPE_PRICE_TIER2_MONTHLY || "price_tier2_monthly",
      annualPriceId: process.env.STRIPE_PRICE_TIER2_ANNUAL || "price_tier2_annual",
      monthlyAmount: 24900, // $249.00
      annualAmount: 239000, // $2,390.00 (2 months free)
      features: [
        "Shared health coach (up to 5 clients)",
        "Bi-weekly 1:1 sessions",
        "Standard lab analysis",
        "Supplement guidance",
        "Email support",
      ],
    },
    tier3: {
      name: "KAIROS AI-Guided",
      monthlyPriceId: process.env.STRIPE_PRICE_TIER3_MONTHLY || "price_tier3_monthly",
      annualPriceId: process.env.STRIPE_PRICE_TIER3_ANNUAL || "price_tier3_annual",
      monthlyAmount: 9900, // $99.00
      annualAmount: 95000, // $950.00 (2 months free)
      features: [
        "AI-powered health insights",
        "Automated tracking & alerts",
        "Basic lab interpretation",
        "Community access",
        "Chat support",
      ],
    },
  },

  /** Webhook event types we handle */
  webhookEvents: [
    "checkout.session.completed",
    "customer.subscription.created",
    "customer.subscription.updated",
    "customer.subscription.deleted",
    "invoice.paid",
    "invoice.payment_failed",
    "customer.updated",
  ] as const,

  /** Coach payout rate */
  coachPayoutRate: 0.6, // 60% to coach

  /** Trial period in days */
  trialPeriodDays: 14,

  /** Success/cancel URLs for checkout */
  urls: {
    success: "/payments?success=true",
    cancel: "/payments?canceled=true",
    billingPortal: "/payments",
  },
} as const;

export type TierKey = keyof typeof STRIPE_CONFIG.tiers;
export type BillingInterval = "monthly" | "annual";
