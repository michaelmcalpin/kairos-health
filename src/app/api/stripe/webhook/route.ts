/**
 * Stripe Webhook Handler
 * POST /api/stripe/webhook
 *
 * Receives Stripe events and processes subscription lifecycle.
 * Must be configured in Stripe Dashboard → Webhooks.
 */

import { NextResponse } from "next/server";
import { constructWebhookEvent, processWebhookEvent } from "@/lib/integrations/stripe";
import { logger } from "@/lib/middleware/logger";
import { applyRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";

export async function POST(req: Request) {
  const rl = await applyRateLimit(req, RATE_LIMITS.webhook);
  if (!rl.allowed && rl.response) return rl.response;

  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  let eventType = "unknown";
  try {
    const body = await req.text();
    const event = constructWebhookEvent(body, signature);
    eventType = event.type;
    const startMs = Date.now();
    await processWebhookEvent(event);
    logger.info("webhook:stripe", "Event processed", {
      eventType,
      eventId: event.id,
      durationMs: Date.now() - startMs,
    });
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    logger.error("webhook:stripe", "Processing error", {
      error: message,
      eventType,
      ip,
    });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
