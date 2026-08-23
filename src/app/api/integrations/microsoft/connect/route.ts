import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { env } from "@/lib/config/env";
import { isMicrosoftConfigured, getMicrosoftAuthUrl } from "@/lib/integrations/microsoft-calendar";
import { logger } from "@/lib/middleware/logger";

/**
 * GET /api/integrations/microsoft/connect
 *
 * Starts the Microsoft/Outlook Calendar OAuth flow for the signed-in coach.
 * Mirrors the Google flow (HMAC-signed opaque state binding the coachId).
 * If Microsoft isn't configured, redirects back with ?calendar=unconfigured
 * so nothing breaks when the integration is not set up.
 */
function signOAuthState(payload: string): string {
  const secret = process.env.CLERK_SECRET_KEY || process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OAUTH_STATE_SECRET or CLERK_SECRET_KEY must be set in production");
    }
    return crypto.createHmac("sha256", "dev-only-fallback").update(payload, "utf8").digest("hex");
  }
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

export async function GET() {
  try {
    // Not configured → fail gracefully back to the settings page.
    if (!isMicrosoftConfigured()) {
      return NextResponse.redirect(new URL("/trainer/settings?calendar=unconfigured", env.APP_URL));
    }

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.redirect(new URL("/trainer/login", env.APP_URL));
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!dbUser) {
      return NextResponse.redirect(new URL("/trainer/settings?calendar=error", env.APP_URL));
    }

    const redirectUri = `${env.APP_URL}/api/integrations/microsoft/callback`;

    const statePayload = JSON.stringify({
      coachId: dbUser.id,
      provider: "microsoft",
      timestamp: Date.now(),
    });
    const sig = signOAuthState(statePayload);
    const state = Buffer.from(JSON.stringify({ payload: statePayload, sig })).toString("base64");

    const authUrl = getMicrosoftAuthUrl(state, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    logger.error("oauth", "Microsoft connect error", {
      error: err instanceof Error ? err.message : "Unknown",
    });
    return NextResponse.redirect(new URL("/trainer/settings?calendar=error", env.APP_URL));
  }
}
