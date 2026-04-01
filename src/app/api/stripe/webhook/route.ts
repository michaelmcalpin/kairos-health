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

export async function POST(req: Request) {
  const signature = req.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing stripe-signature header" }, { status: 400 });
  }

  try {
    const body = await req.text();
    const event = constructWebhookEvent(body, signature);
    await processWebhookEvent(event);
    return NextResponse.json({ received: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("webhook:stripe", "Processing error", { error: message });
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
