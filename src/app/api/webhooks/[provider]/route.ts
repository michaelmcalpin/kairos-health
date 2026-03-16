import { NextResponse } from "next/server";
import { headers } from "next/headers";

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    created_at: number;
    updated_at: number;
  };
  type: string;
}

async function handleClerkWebhook(body: ClerkUserEvent) {
  const eventType = body.type;
  const userData = body.data;

  switch (eventType) {
    case "user.created": {
      // TODO: When DB is connected, insert into users table
      console.log("[Clerk Webhook] User created:", {
        clerkId: userData.id,
        email: userData.email_addresses[0]?.email_address,
        firstName: userData.first_name,
        lastName: userData.last_name,
      });
      // Future: db.insert(users).values({ clerkId, email, name, ... })
      // Future: db.insert(clientProfiles).values({ userId, onboardingStep: 1 })
      return { success: true, action: "user_created" };
    }

    case "user.updated": {
      console.log("[Clerk Webhook] User updated:", {
        clerkId: userData.id,
        email: userData.email_addresses[0]?.email_address,
      });
      // Future: db.update(users).set({ name, email, avatarUrl }).where(eq(users.clerkId, clerkId))
      return { success: true, action: "user_updated" };
    }

    case "user.deleted": {
      console.log("[Clerk Webhook] User deleted:", { clerkId: userData.id });
      // Future: Soft delete — db.update(users).set({ deletedAt: new Date() }).where(...)
      return { success: true, action: "user_deleted" };
    }

    case "session.created": {
      console.log("[Clerk Webhook] Session created for user:", userData.id);
      return { success: true, action: "session_logged" };
    }

    default: {
      console.log("[Clerk Webhook] Unhandled event type:", eventType);
      return { success: true, action: "ignored" };
    }
  }
}

async function handleStripeWebhook(body: Record<string, unknown>) {
  const eventType = body.type as string;

  switch (eventType) {
    case "checkout.session.completed": {
      console.log("[Stripe Webhook] Checkout completed");
      // Future: Create subscription record, update user tier
      return { success: true, action: "checkout_completed" };
    }

    case "customer.subscription.updated": {
      console.log("[Stripe Webhook] Subscription updated");
      // Future: Update subscription status and tier
      return { success: true, action: "subscription_updated" };
    }

    case "customer.subscription.deleted": {
      console.log("[Stripe Webhook] Subscription cancelled");
      // Future: Downgrade user tier, send retention email
      return { success: true, action: "subscription_cancelled" };
    }

    case "invoice.payment_succeeded": {
      console.log("[Stripe Webhook] Payment succeeded");
      // Future: Record payment, update billing history
      return { success: true, action: "payment_recorded" };
    }

    case "invoice.payment_failed": {
      console.log("[Stripe Webhook] Payment failed");
      // Future: Send payment failed alert, retry logic
      return { success: true, action: "payment_failed_logged" };
    }

    default: {
      console.log("[Stripe Webhook] Unhandled event:", eventType);
      return { success: true, action: "ignored" };
    }
  }
}

export async function POST(req: Request, { params }: { params: { provider: string } }) {
  const { provider } = params;
  const headersList = await headers();

  try {
    const body = await req.json();

    switch (provider) {
      case "clerk": {
        // Verify webhook signature in production
        const svixId = headersList.get("svix-id");
        const svixTimestamp = headersList.get("svix-timestamp");
        const svixSignature = headersList.get("svix-signature");

        if (!svixId || !svixTimestamp || !svixSignature) {
          console.warn("[Clerk Webhook] Missing svix headers — skipping verification in dev");
        }

        // TODO: In production, verify with Svix:
        // const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET);
        // wh.verify(JSON.stringify(body), { "svix-id": svixId, ... });

        const result = await handleClerkWebhook(body as ClerkUserEvent);
        return NextResponse.json(result);
      }

      case "stripe": {
        // Verify webhook signature in production
        const stripeSignature = headersList.get("stripe-signature");

        if (!stripeSignature) {
          console.warn("[Stripe Webhook] Missing stripe-signature header — skipping verification in dev");
        }

        // TODO: In production, verify with Stripe:
        // const event = stripe.webhooks.constructEvent(rawBody, stripeSignature, process.env.STRIPE_WEBHOOK_SECRET);

        const result = await handleStripeWebhook(body as Record<string, unknown>);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
    }
  } catch (error) {
    console.error(`[Webhook] Error processing ${provider} webhook:`, error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
