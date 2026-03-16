/**
 * KAIROS Stripe Client
 *
 * Server-side Stripe SDK wrapper with helper methods for
 * checkout, subscriptions, and billing portal.
 */

import Stripe from "stripe";
import { STRIPE_CONFIG, type TierKey, type BillingInterval } from "./config";

// Lazy-init Stripe client (only created when first used)
let _stripe: Stripe | null = null;

function getStripe(): Stripe {
  if (!_stripe) {
    const key = process.env.STRIPE_SECRET_KEY;
    if (!key) {
      throw new Error("STRIPE_SECRET_KEY is not set in environment variables");
    }
    _stripe = new Stripe(key, { apiVersion: STRIPE_CONFIG.apiVersion });
  }
  return _stripe;
}

// ─── Checkout ───────────────────────────────────────────────────────────────

export interface CreateCheckoutParams {
  tier: TierKey;
  interval: BillingInterval;
  userId: string;
  email: string;
  clientReferenceId?: string;
}

export async function createCheckoutSession(params: CreateCheckoutParams): Promise<string> {
  const stripe = getStripe();
  const tierConfig = STRIPE_CONFIG.tiers[params.tier];
  const priceId = params.interval === "annual" ? tierConfig.annualPriceId : tierConfig.monthlyPriceId;
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    customer_email: params.email,
    client_reference_id: params.clientReferenceId || params.userId,
    subscription_data: {
      trial_period_days: STRIPE_CONFIG.trialPeriodDays,
      metadata: {
        kairos_user_id: params.userId,
        kairos_tier: params.tier,
      },
    },
    metadata: {
      kairos_user_id: params.userId,
      kairos_tier: params.tier,
    },
    success_url: `${baseUrl}${STRIPE_CONFIG.urls.success}&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${baseUrl}${STRIPE_CONFIG.urls.cancel}`,
  });

  return session.url!;
}

// ─── Billing Portal ─────────────────────────────────────────────────────────

export async function createBillingPortalSession(
  stripeCustomerId: string,
  returnUrl?: string
): Promise<string> {
  const stripe = getStripe();
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl || `${baseUrl}${STRIPE_CONFIG.urls.billingPortal}`,
  });

  return session.url;
}

// ─── Subscription Management ────────────────────────────────────────────────

export async function getSubscription(subscriptionId: string): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  return stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["default_payment_method", "latest_invoice"],
  });
}

export async function cancelSubscription(
  subscriptionId: string,
  immediately = false
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  if (immediately) {
    return stripe.subscriptions.cancel(subscriptionId);
  }
  return stripe.subscriptions.update(subscriptionId, {
    cancel_at_period_end: true,
  });
}

export async function updateSubscriptionTier(
  subscriptionId: string,
  newTier: TierKey,
  interval: BillingInterval
): Promise<Stripe.Subscription> {
  const stripe = getStripe();
  const sub = await stripe.subscriptions.retrieve(subscriptionId);
  const tierConfig = STRIPE_CONFIG.tiers[newTier];
  const priceId = interval === "annual" ? tierConfig.annualPriceId : tierConfig.monthlyPriceId;

  return stripe.subscriptions.update(subscriptionId, {
    items: [
      {
        id: sub.items.data[0].id,
        price: priceId,
      },
    ],
    proration_behavior: "create_prorations",
    metadata: { kairos_tier: newTier },
  });
}

// ─── Customer ───────────────────────────────────────────────────────────────

export async function getOrCreateCustomer(
  email: string,
  name: string,
  metadata?: Record<string, string>
): Promise<Stripe.Customer> {
  const stripe = getStripe();

  // Check for existing customer
  const existing = await stripe.customers.list({ email, limit: 1 });
  if (existing.data.length > 0) {
    return existing.data[0];
  }

  return stripe.customers.create({ email, name, metadata });
}

// ─── Webhook Verification ───────────────────────────────────────────────────

export function constructWebhookEvent(
  payload: string | Buffer,
  signature: string
): Stripe.Event {
  const stripe = getStripe();
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("STRIPE_WEBHOOK_SECRET is not set");
  }
  return stripe.webhooks.constructEvent(payload, signature, secret);
}

// ─── Coach Payouts (Connected Accounts) ─────────────────────────────────────

export async function createCoachPayout(
  coachStripeAccountId: string,
  amountCents: number,
  description: string
): Promise<Stripe.Transfer> {
  const stripe = getStripe();
  return stripe.transfers.create({
    amount: amountCents,
    currency: "usd",
    destination: coachStripeAccountId,
    description,
  });
}

export async function getCoachBalance(coachStripeAccountId: string): Promise<Stripe.Balance> {
  const stripe = getStripe();
  return stripe.balance.retrieve({ stripeAccount: coachStripeAccountId });
}
