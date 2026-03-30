import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { db } from "@/server/db";
import { users, clientProfiles, trainerProfiles, deviceConnections, syncLogs } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";

type ValidRole = "client" | "trainer" | "company_admin" | "super_admin";
const VALID_ROLES: ValidRole[] = ["client", "trainer", "company_admin", "super_admin"];

interface ClerkUserEvent {
  data: {
    id: string;
    email_addresses: Array<{ email_address: string; id: string }>;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
    public_metadata?: Record<string, unknown>;
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
      const clerkId = userData.id;
      const email = userData.email_addresses[0]?.email_address;
      const firstName = userData.first_name;
      const lastName = userData.last_name;
      const avatarUrl = userData.image_url;
      const metaRole = userData.public_metadata?.role as string | undefined;
      const role: ValidRole = metaRole && VALID_ROLES.includes(metaRole as ValidRole)
        ? (metaRole as ValidRole)
        : "client";
      const companyId = (userData.public_metadata?.companyId as string) || null;

      console.log("[Clerk Webhook] User created:", { clerkId, email, role, companyId });

      // Check if user already exists (idempotent)
      const existing = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
      });

      if (!existing && email) {
        const [newUser] = await db.insert(users).values({
          clerkId,
          email,
          firstName: firstName ?? undefined,
          lastName: lastName ?? undefined,
          avatarUrl: avatarUrl ?? undefined,
          role,
          companyId: companyId ?? undefined,
        }).returning();

        // Create role-specific profile
        if (role === "client" && newUser) {
          await db.insert(clientProfiles).values({ userId: newUser.id, tier: "tier1" });
        } else if (role === "trainer" && newUser) {
          await db.insert(trainerProfiles).values({ userId: newUser.id });
        }
      }

      return { success: true, action: "user_created" };
    }

    case "user.updated": {
      const clerkId = userData.id;
      const email = userData.email_addresses[0]?.email_address;
      const firstName = userData.first_name;
      const lastName = userData.last_name;
      const avatarUrl = userData.image_url;
      const metaRole = userData.public_metadata?.role as string | undefined;

      console.log("[Clerk Webhook] User updated:", { clerkId, email });

      const existingUser = await db.query.users.findFirst({
        where: eq(users.clerkId, clerkId),
      });

      if (existingUser) {
        const updates: Record<string, unknown> = {
          updatedAt: new Date(),
        };
        if (email) updates.email = email;
        if (firstName !== null) updates.firstName = firstName;
        if (lastName !== null) updates.lastName = lastName;
        if (avatarUrl !== null) updates.avatarUrl = avatarUrl;
        // Only update role if explicitly set in metadata
        if (metaRole && VALID_ROLES.includes(metaRole as ValidRole)) {
          updates.role = metaRole;
        }

        await db.update(users).set(updates).where(eq(users.clerkId, clerkId));
      }

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

// ─── Device Provider Webhook Handler ──────────────────────────────────────

interface DeviceWebhookPayload {
  event_type?: string;
  type?: string;
  user_id?: string;
  data_type?: string;
  timestamp?: string;
  [key: string]: unknown;
}

async function handleDeviceWebhook(
  provider: string,
  body: DeviceWebhookPayload,
): Promise<{ success: boolean; action: string }> {
  const eventType = body.event_type || body.type || "data_updated";
  console.log(`[${provider} Webhook] Event: ${eventType}`, {
    userId: body.user_id,
    dataType: body.data_type,
  });

  // Look up device connection by provider user ID if available
  if (body.user_id) {
    // Find the device connection for this provider user
    // In production, we'd store the provider's user ID in device_connections
    // For now, log the webhook and queue a sync
    const connections = await db.query.deviceConnections.findMany({
      where: eq(deviceConnections.provider, provider as "oura" | "dexcom" | "whoop" | "garmin" | "withings"),
    });

    for (const conn of connections) {
      if (conn.status !== "connected") continue;

      // Create a sync log entry to queue the sync
      await db.insert(syncLogs).values({
        deviceConnectionId: conn.id,
        status: "pending",
        startedAt: new Date(),
      });

      console.log(`[${provider} Webhook] Queued sync for connection ${conn.id}`);
    }
  }

  return { success: true, action: `${provider}_webhook_processed` };
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

      // ─── Device Provider Webhooks ─────────────────────────────────────────
      case "oura": {
        // Oura sends webhook notifications when new data is available
        // Verify webhook with shared secret
        const ouraSecret = process.env.OURA_WEBHOOK_SECRET;
        if (ouraSecret) {
          const providedSig = headersList.get("x-oura-signature");
          if (!providedSig) {
            console.warn("[Oura Webhook] Missing signature header");
          }
          // TODO: Verify HMAC signature in production
        }

        const result = await handleDeviceWebhook("oura", body);
        return NextResponse.json(result);
      }

      case "whoop": {
        const whoopSecret = process.env.WHOOP_WEBHOOK_SECRET;
        if (whoopSecret) {
          const providedSig = headersList.get("x-whoop-signature");
          if (!providedSig) {
            console.warn("[WHOOP Webhook] Missing signature header");
          }
        }

        const result = await handleDeviceWebhook("whoop", body);
        return NextResponse.json(result);
      }

      case "garmin": {
        const result = await handleDeviceWebhook("garmin", body);
        return NextResponse.json(result);
      }

      case "withings": {
        const result = await handleDeviceWebhook("withings", body);
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
