/**
 * Stripe Billing Portal
 * POST /api/stripe/portal
 *
 * Creates a billing portal session for subscription management.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createBillingPortalSession } from "@/lib/integrations/stripe";

export async function POST(req: Request) {
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
    console.error("[Stripe Portal] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
