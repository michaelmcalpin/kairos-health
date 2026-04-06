/**
 * Stripe Billing Portal
 * POST /api/stripe/portal
 *
 * Creates a billing portal session for subscription management.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { logger } from "@/lib/middleware/logger";
import { createBillingPortalSession } from "@/lib/integrations/stripe";
import { applyRateLimit, RATE_LIMITS } from "@/lib/middleware/rate-limit";
import { checkOrigin } from "@/lib/middleware/sanitize";

export async function POST(req: Request) {
  const rl = await applyRateLimit(req, RATE_LIMITS.checkout);
  if (!rl.allowed && rl.response) return rl.response;

  const originErr = checkOrigin(req);
  if (originErr) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { stripeCustomerId } = body as { stripeCustomerId: string };

    if (!stripeCustomerId) {
      return NextResponse.json({ error: "Missing stripeCustomerId" }, { status: 400 });
    }

    const url = await createBillingPortalSession(stripeCustomerId);
    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    logger.error("stripe", "Portal error", { error: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
