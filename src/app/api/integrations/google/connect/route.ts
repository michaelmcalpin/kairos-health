import { NextResponse } from "next/server";
import crypto from "crypto";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/server/db";
import { users } from "@/server/db/schema";
import { eq } from "drizzle-orm";
import { isGoogleConfigured, getGoogleAuthUrl } from "@/lib/integrations/google-calendar";
import { getRequestBaseUrl } from "@/lib/integrations/oauth-origin";
import { logger } from "@/lib/middleware/logger";

/**
 * GET /api/integrations/google/connect
 *
 * Starts the Google Calendar OAuth flow for the signed-in coach.
 * Mirrors the device OAuth state signing (HMAC over an opaque payload).
 * If Google isn't configured, redirects back with ?calendar=unconfigured
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

export async function GET(req: Request) {
  const base = getRequestBaseUrl(req);
  try {
    // Not configured → fail gracefully back to the schedule page.
    if (!isGoogleConfigured()) {
      return NextResponse.redirect(new URL("/trainer/settings?calendar=unconfigured", base));
    }

    const { userId: clerkId } = await auth();
    if (!clerkId) {
      return NextResponse.redirect(new URL("/trainer/login", base));
    }

    const dbUser = await db.query.users.findFirst({
      where: eq(users.clerkId, clerkId),
    });
    if (!dbUser) {
      return NextResponse.redirect(new URL("/trainer/settings?calendar=error", base));
    }

    const redirectUri = `${base}/api/integrations/google/callback`;

    const statePayload = JSON.stringify({
      coachId: dbUser.id,
      provider: "google",
      timestamp: Date.now(),
    });
    const sig = signOAuthState(statePayload);
    const state = Buffer.from(JSON.stringify({ payload: statePayload, sig })).toString("base64");

    const authUrl = getGoogleAuthUrl(state, redirectUri);
    return NextResponse.redirect(authUrl);
  } catch (err) {
    logger.error("oauth", "Google connect error", {
      error: err instanceof Error ? err.message : "Unknown",
    });
    return NextResponse.redirect(new URL("/trainer/settings?calendar=error", base));
  }
}
