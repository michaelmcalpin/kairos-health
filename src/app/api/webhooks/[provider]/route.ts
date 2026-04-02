import { NextResponse } from "next/server";
import { headers } from "next/headers";
import crypto from "crypto";
import { db } from "@/server/db";
import { users, clientProfiles, trainerProfiles, deviceConnections, syncLogs } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { logger } from "@/lib/middleware/logger";
import { checkBodySize, MAX_WEBHOOK_BODY_BYTES } from "@/lib/middleware/sanitize";

type ValidRole = "client" | "trainer" | "company_admin" | "super_admin";
const VALID_ROLES: ValidRole[] = ["client", "trainer", "company_admin", "super_admin"];

// ─── Signature Verification ─────────────────────────────────────────────────

function verifySvixSignature(
  payload: string,
  svixId: string,
  svixTimestamp: string,
  svixSignature: string,
  secret: string,
): boolean {
  // Svix secrets are base64-encoded with a "whsec_" prefix
  const secretBytes = Buffer.from(secret.replace("whsec_", ""), "base64");
  const toSign = `${svixId}.${svixTimestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac("sha256", secretBytes)
    .update(toSign, "utf8")
    .digest("base64");

  // Svix sends multiple signatures separated by spaces, each prefixed with "v1,"
  const signatures = svixSignature.split(" ");
  return signatures.some((sig) => {
    const sigValue = sig.replace("v1,", "");
    return crypto.timingSafeEqual(
      Buffer.from(expectedSig),
      Buffer.from(sigValue),
    );
  });
}

function verifyStripeSignature(
  payload: string,
  sigHeader: string,
  secret: string,
): boolean {
  const parts = sigHeader.split(",").reduce(
    (acc, part) => {
      const [key, value] = part.split("=");
      if (key === "t") acc.timestamp = value;
      if (key === "v1") acc.signatures.push(value);
      return acc;
    },
    { timestamp: "", signatures: [] as string[] },
  );

  const signedPayload = `${parts.timestamp}.${payload}`;
  const expectedSig = crypto
    .createHmac("sha256", secret)
    .update(signedPayload, "utf8")
    .digest("hex");

  return parts.signatures.some((sig) => {
    try {
      return crypto.timingSafeEqual(
        Buffer.from(expectedSig, "hex"),
        Buffer.from(sig, "hex"),
      );
    } catch {
      return false;
    }
  });
}

function verifyHmacSignature(
  payload: string,
  providedSignature: string,
  secret: string,
): boolean {
  const expected = crypto
    .createHmac("sha256", secret)
    .update(payload, "utf8")
    .digest("hex");

  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(providedSignature, "hex"),
    );
  } catch {
    return false;
  }
}

// ─── Clerk Webhook Handler ──────────────────────────────────────────────────

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

      logger.info("webhook:clerk", "User created", { clerkId, email, role, companyId });

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

      logger.info("webhook:clerk", "User updated", { clerkId, email });

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
        if (metaRole && VALID_ROLES.includes(metaRole as ValidRole)) {
          updates.role = metaRole;
        }

        await db.update(users).set(updates).where(eq(users.clerkId, clerkId));
      }

      return { success: true, action: "user_updated" };
    }

    case "user.deleted": {
      logger.info("webhook:clerk", "User deleted", { clerkId: userData.id });
      return { success: true, action: "user_deleted" };
    }

    case "session.created": {
      logger.debug("webhook:clerk", "Session created", { userId: userData.id });
      return { success: true, action: "session_logged" };
    }

    default: {
      logger.debug("webhook:clerk", "Unhandled event type", { eventType });
      return { success: true, action: "ignored" };
    }
  }
}

// ─── Stripe Webhook Handler ─────────────────────────────────────────────────

async function handleStripeWebhook(body: Record<string, unknown>) {
  const eventType = body.type as string;

  switch (eventType) {
    case "checkout.session.completed": {
      logger.info("webhook:stripe", "Checkout completed");
      return { success: true, action: "checkout_completed" };
    }

    case "customer.subscription.updated": {
      logger.info("webhook:stripe", "Subscription updated");
      return { success: true, action: "subscription_updated" };
    }

    case "customer.subscription.deleted": {
      logger.info("webhook:stripe", "Subscription cancelled");
      return { success: true, action: "subscription_cancelled" };
    }

    case "invoice.payment_succeeded": {
      logger.info("webhook:stripe", "Payment succeeded");
      return { success: true, action: "payment_recorded" };
    }

    case "invoice.payment_failed": {
      logger.warn("webhook:stripe", "Payment failed");
      return { success: true, action: "payment_failed_logged" };
    }

    default: {
      logger.debug("webhook:stripe", "Unhandled event", { eventType });
      return { success: true, action: "ignored" };
    }
  }
}

// ─── Device Provider Webhook Handler ────────────────────────────────────────

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
  logger.info(`webhook:${provider}`, `Event: ${eventType}`, {
    userId: body.user_id,
    dataType: body.data_type,
  });

  if (body.user_id) {
    const connections = await db.query.deviceConnections.findMany({
      where: eq(deviceConnections.provider, provider as "oura" | "dexcom" | "whoop" | "garmin" | "withings"),
    });

    for (const conn of connections) {
      if (conn.status !== "connected") continue;

      await db.insert(syncLogs).values({
        deviceConnectionId: conn.id,
        status: "pending",
        startedAt: new Date(),
      });

      logger.debug(`webhook:${provider}`, "Queued sync", { connectionId: conn.id });
    }
  }

  return { success: true, action: `${provider}_webhook_processed` };
}

// ─── Helpers ───────────────────────────────────────────────────────────────

const isProduction = process.env.NODE_ENV === "production";

/**
 * In production, webhook secrets are REQUIRED.  In development they are
 * optional so you can test without configuring every provider.
 */
function requireSecret(provider: string, secret: string | undefined): NextResponse | null {
  if (secret) return null;
  if (isProduction) {
    logger.error(`webhook:${provider}`, "Webhook secret not configured in production — rejecting request");
    return NextResponse.json({ error: "Webhook verification unavailable" }, { status: 500 });
  }
  logger.warn(`webhook:${provider}`, "Webhook secret not set — skipping verification (dev only)");
  return null;
}

function verifyDeviceProvider(
  provider: string,
  rawBody: string,
  headersList: Headers,
  headerName: string,
  envVar: string | undefined,
): NextResponse | null {
  const rejection = requireSecret(provider, envVar);
  if (rejection) return rejection;
  if (envVar) {
    const providedSig = headersList.get(headerName);
    if (!providedSig || !verifyHmacSignature(rawBody, providedSig, envVar)) {
      logger.error(`webhook:${provider}`, "Invalid or missing signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }
  return null;
}

// ─── Route Handler ──────────────────────────────────────────────────────────

export async function POST(req: Request, { params }: { params: { provider: string } }) {
  const { provider } = params;
  const headersList = await headers();

  try {
    // Reject oversized payloads before reading the body
    const sizeErr = checkBodySize(req.headers.get("content-length"), MAX_WEBHOOK_BODY_BYTES);
    if (sizeErr) {
      logger.warn("webhook", sizeErr, { provider });
      return NextResponse.json({ error: "Payload too large" }, { status: 413 });
    }

    // Read raw body for signature verification, then parse
    const rawBody = await req.text();
    let body: unknown;
    try {
      body = JSON.parse(rawBody);
    } catch {
      return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
    }

    switch (provider) {
      case "clerk": {
        const svixId = headersList.get("svix-id");
        const svixTimestamp = headersList.get("svix-timestamp");
        const svixSignature = headersList.get("svix-signature");
        const clerkWebhookSecret = process.env.CLERK_WEBHOOK_SECRET;

        const secretReject = requireSecret("clerk", clerkWebhookSecret);
        if (secretReject) return secretReject;

        if (clerkWebhookSecret) {
          if (!svixId || !svixTimestamp || !svixSignature) {
            logger.error("webhook:clerk", "Missing svix headers");
            return NextResponse.json({ error: "Missing signature headers" }, { status: 401 });
          }

          // Reject stale webhooks (older than 5 minutes)
          const timestampSec = parseInt(svixTimestamp, 10);
          const now = Math.floor(Date.now() / 1000);
          if (Math.abs(now - timestampSec) > 300) {
            logger.error("webhook:clerk", "Timestamp expired", { age: Math.abs(now - timestampSec) });
            return NextResponse.json({ error: "Timestamp expired" }, { status: 401 });
          }

          if (!verifySvixSignature(rawBody, svixId, svixTimestamp, svixSignature, clerkWebhookSecret)) {
            logger.error("webhook:clerk", "Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
          }
        }

        const result = await handleClerkWebhook(body as ClerkUserEvent);
        return NextResponse.json(result);
      }

      case "stripe": {
        const stripeSignature = headersList.get("stripe-signature");
        const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

        const secretReject = requireSecret("stripe", stripeWebhookSecret);
        if (secretReject) return secretReject;

        if (stripeWebhookSecret) {
          if (!stripeSignature) {
            logger.error("webhook:stripe", "Missing stripe-signature header");
            return NextResponse.json({ error: "Missing signature" }, { status: 401 });
          }

          if (!verifyStripeSignature(rawBody, stripeSignature, stripeWebhookSecret)) {
            logger.error("webhook:stripe", "Invalid signature");
            return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
          }
        }

        const result = await handleStripeWebhook(body as Record<string, unknown>);
        return NextResponse.json(result);
      }

      case "oura": {
        const err = verifyDeviceProvider("oura", rawBody, headersList, "x-oura-signature", process.env.OURA_WEBHOOK_SECRET);
        if (err) return err;
        const result = await handleDeviceWebhook("oura", body as DeviceWebhookPayload);
        return NextResponse.json(result);
      }

      case "whoop": {
        const err = verifyDeviceProvider("whoop", rawBody, headersList, "x-whoop-signature", process.env.WHOOP_WEBHOOK_SECRET);
        if (err) return err;
        const result = await handleDeviceWebhook("whoop", body as DeviceWebhookPayload);
        return NextResponse.json(result);
      }

      case "garmin": {
        const err = verifyDeviceProvider("garmin", rawBody, headersList, "x-garmin-signature", process.env.GARMIN_WEBHOOK_SECRET);
        if (err) return err;
        const result = await handleDeviceWebhook("garmin", body as DeviceWebhookPayload);
        return NextResponse.json(result);
      }

      case "withings": {
        const err = verifyDeviceProvider("withings", rawBody, headersList, "x-withings-signature", process.env.WITHINGS_WEBHOOK_SECRET);
        if (err) return err;
        const result = await handleDeviceWebhook("withings", body as DeviceWebhookPayload);
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
    }
  } catch (error) {
    logger.error("webhook", `Error processing ${provider} webhook`, {
      error: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}
