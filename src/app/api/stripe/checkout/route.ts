/**
 * Stripe Checkout Session Creator
 * POST /api/stripe/checkout
 *
 * Creates a Stripe Checkout session and returns the redirect URL.
 */

import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { createCheckoutSession, type TierKey, type BillingInterval } from "@/lib/integrations/stripe";

export async function POST(req: Request) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const { tier, interval, email } = body as {
      tier: TierKey;
      interval: BillingInterval;
      email: string;
    };

    if (!tier || !interval || !email) {
      return NextResponse.json({ error: "Missing required fields: tier, interval, email" }, { status: 400 });
    }

    const url = await createCheckoutSession({
      tier,
      interval,
      userId,
      email,
    });

    return NextResponse.json({ url });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("[Stripe Checkout] Error:", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
