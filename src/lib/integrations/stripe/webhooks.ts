/**
 * KAIROS Stripe Webhook Handler
 *
 * Processes Stripe webhook events and updates KAIROS database accordingly.
 * Each handler updates subscription status, triggers notifications, and
 * logs audit events.
 */

import type Stripe from "stripe";
import { db } from "@/server/db";
import { subscriptions, auditLogs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { eventBus, createRealtimeEvent, type NotificationPayload } from "@/lib/realtime";

type WebhookHandler = (event: Stripe.Event) => Promise<void>;

// ─── Individual Event Handlers ──────────────────────────────────────────────

async function handleCheckoutCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as unknown as Record<string, unknown>;
  const metadata = session.metadata as Record<string, string> | undefined;
  const userId = metadata?.kairos_user_id;
  const tier = metadata?.kairos_tier;

  if (!userId || !tier) {
    console.warn("[Stripe Webhook] Missing metadata on checkout session:", session.id);
    return;
  }

  // Create subscription record in KAIROS
  await db.insert(subscriptions).values({
    userId,
    stripeSubscriptionId: session.subscription as string,
    stripeCustomerId: session.customer as string,
    tier: tier as "tier1" | "tier2" | "tier3",
    status: "active",
    currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
  });

  // User's tier is tracked via the subscriptions table above

  // Send notification
  const notification: NotificationPayload = {
    notificationId: `notif_sub_${Date.now()}`,
    title: "Subscription Activated",
    body: `Welcome to KAIROS! Your ${tier} subscription is now active.`,
    category: "billing",
    actionUrl: "/payments",
    read: false,
  };
  eventBus.publish(createRealtimeEvent("notification:new", userId, notification));

  // Audit log
  await db.insert(auditLogs).values({
    userId,
    action: "subscription.created",
    resourceType: "subscription",
    resourceId: session.id as string,
    metadata: { tier, stripeSessionId: session.id as string },
  });
}

async function handleSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as unknown as Record<string, unknown>;
  const metadata = sub.metadata as Record<string, string> | undefined;
  const userId = metadata?.kairos_user_id;

  if (!userId) return;

  const statusMap: Record<string, string> = {
    active: "active",
    past_due: "past_due",
    canceled: "canceled",
    unpaid: "past_due",
    trialing: "trialing",
  };

  const status = typeof sub.status === "string" ? sub.status : "active";

  await db
    .update(subscriptions)
    .set({
      status: (statusMap[status] || "active") as "active" | "canceled" | "past_due" | "trialing",
    })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id as string));
}

async function handleSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const sub = event.data.object as unknown as Record<string, unknown>;
  const metadata = sub.metadata as Record<string, string> | undefined;
  const userId = metadata?.kairos_user_id;

  if (!userId) return;

  await db
    .update(subscriptions)
    .set({ status: "canceled" })
    .where(eq(subscriptions.stripeSubscriptionId, sub.id as string));

  // Send cancellation notification
  const notification: NotificationPayload = {
    notificationId: `notif_cancel_${Date.now()}`,
    title: "Subscription Canceled",
    body: "Your KAIROS subscription has been canceled. You can resubscribe anytime.",
    category: "billing",
    actionUrl: "/payments",
    read: false,
  };
  eventBus.publish(createRealtimeEvent("notification:new", userId, notification));

  await db.insert(auditLogs).values({
    userId,
    action: "subscription.canceled",
    resourceType: "subscription",
    resourceId: sub.id as string,
    metadata: { stripeSubscriptionId: sub.id as string },
  });
}

async function handleInvoicePaid(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as unknown as Record<string, unknown>;
  const subscriptionId = (invoice.subscription as string) || "";

  if (!subscriptionId) return;

  const periodEnd = typeof invoice.period_end === "number"
    ? new Date(invoice.period_end * 1000)
    : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  await db
    .update(subscriptions)
    .set({
      status: "active",
      currentPeriodEnd: periodEnd,
    })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));
}

async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as unknown as Record<string, unknown>;
  const subscriptionId = (invoice.subscription as string) || "";
  const customerId = (invoice.customer as string) || "";

  if (!subscriptionId) return;

  await db
    .update(subscriptions)
    .set({ status: "past_due" })
    .where(eq(subscriptions.stripeSubscriptionId, subscriptionId));

  // Find user by Stripe customer ID to send notification
  const sub = await db.query.subscriptions.findFirst({
    where: eq(subscriptions.stripeCustomerId, customerId),
  });

  if (sub) {
    const notification: NotificationPayload = {
      notificationId: `notif_fail_${Date.now()}`,
      title: "Payment Failed",
      body: "Your subscription payment could not be processed. Please update your payment method.",
      category: "billing",
      actionUrl: "/payments",
      read: false,
    };
    eventBus.publish(createRealtimeEvent("notification:new", sub.userId, notification));
  }
}

// ─── Handler Registry ───────────────────────────────────────────────────────

const handlers: Record<string, WebhookHandler> = {
  "checkout.session.completed": handleCheckoutCompleted,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  "invoice.paid": handleInvoicePaid,
  "invoice.payment_failed": handleInvoicePaymentFailed,
};

/**
 * Process a Stripe webhook event
 */
export async function processWebhookEvent(event: Stripe.Event): Promise<void> {
  const handler = handlers[event.type];
  if (handler) {
    await handler(event);
    console.log(`[Stripe Webhook] Processed: ${event.type}`);
  } else {
    console.log(`[Stripe Webhook] Unhandled event type: ${event.type}`);
  }
}
