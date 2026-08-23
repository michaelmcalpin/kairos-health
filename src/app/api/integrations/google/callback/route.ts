import { NextResponse } from "next/server";
import crypto from "crypto";
import { db } from "@/server/db";
import { calendarConnections } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { env } from "@/lib/config/env";
import { logger } from "@/lib/middleware/logger";
import { encryptToken } from "@/lib/crypto";
import {
  isGoogleConfigured,
  exchangeCodeForTokens,
  getUserEmail,
} from "@/lib/integrations/google-calendar";

const MAX_STATE_AGE_MS = 10 * 60 * 1000; // 10 minutes

function verifyOAuthState(statePayload: string, providedSig: string): boolean {
  const secret = process.env.CLERK_SECRET_KEY || process.env.OAUTH_STATE_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OAUTH_STATE_SECRET or CLERK_SECRET_KEY must be set in production");
    }
    return (
      crypto.createHmac("sha256", "dev-only-fallback").update(statePayload, "utf8").digest("hex") ===
      providedSig
    );
  }
  const expected = crypto.createHmac("sha256", secret).update(statePayload, "utf8").digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(expected, "hex"), Buffer.from(providedSig, "hex"));
  } catch {
    return false;
  }
}

/**
 * GET /api/integrations/google/callback
 *
 * Google OAuth callback for coach calendar connection. Validates the signed
 * state, exchanges the code for tokens, fetches the account email, and
 * upserts the coach's calendarConnections row (tokens encrypted at rest).
 */
export async function GET(req: Request) {
  const scheduleUrl = (status: string) =>
    new URL(`/trainer/settings?calendar=${status}`, env.APP_URL);

  try {
    if (!isGoogleConfigured()) {
      return NextResponse.redirect(scheduleUrl("unconfigured"));
    }

    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      logger.error("oauth", `google calendar error: ${error}`);
      return NextResponse.redirect(scheduleUrl("error"));
    }
    if (!code || !state) {
      return NextResponse.redirect(scheduleUrl("error"));
    }

    // Decode + verify HMAC-signed state.
    let decoded: { coachId: string; provider: string; timestamp?: number };
    try {
      const outer = JSON.parse(Buffer.from(state, "base64").toString("utf-8"));
      if (!outer.payload || !outer.sig || !verifyOAuthState(outer.payload, outer.sig)) {
        logger.error("oauth", "google calendar state verification failed");
        return NextResponse.redirect(scheduleUrl("error"));
      }
      decoded = JSON.parse(outer.payload);
      if (decoded.timestamp && Date.now() - decoded.timestamp > MAX_STATE_AGE_MS) {
        return NextResponse.redirect(scheduleUrl("error"));
      }
      if (decoded.provider !== "google") {
        return NextResponse.redirect(scheduleUrl("error"));
      }
    } catch {
      return NextResponse.redirect(scheduleUrl("error"));
    }

    const redirectUri = `${env.APP_URL}/api/integrations/google/callback`;
    const tokens = await exchangeCodeForTokens(code, redirectUri);
    if (!tokens) {
      logger.error("oauth", "google calendar token exchange failed");
      return NextResponse.redirect(scheduleUrl("error"));
    }

    const googleEmail = await getUserEmail(tokens.access_token);
    const expiresAt = new Date(Date.now() + tokens.expires_in * 1000);
    const accessTokenEnc = encryptToken(tokens.access_token);
    const refreshTokenEnc = tokens.refresh_token ? encryptToken(tokens.refresh_token) : null;
    // Whether the coach granted the gmail.send scope, enabling send-as-coach.
    const canSendEmail = tokens.scope.includes("gmail.send");

    const existing = await db
      .select()
      .from(calendarConnections)
      .where(
        and(
          eq(calendarConnections.coachId, decoded.coachId),
          eq(calendarConnections.provider, "google"),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(calendarConnections)
        .set({
          googleEmail: googleEmail ?? existing[0].googleEmail,
          accessTokenEnc,
          // Keep a previously-stored refresh token if Google didn't return
          // a new one (it only sends it on first consent).
          refreshTokenEnc: refreshTokenEnc ?? existing[0].refreshTokenEnc,
          expiresAt,
          canSendEmail,
          status: "connected",
          updatedAt: new Date(),
        })
        .where(eq(calendarConnections.id, existing[0].id));
    } else {
      await db.insert(calendarConnections).values({
        coachId: decoded.coachId,
        provider: "google",
        googleEmail: googleEmail ?? null,
        accessTokenEnc,
        refreshTokenEnc,
        expiresAt,
        canSendEmail,
        calendarId: "primary",
        status: "connected",
      });
    }

    logger.info("oauth", "google calendar connected", { coachId: decoded.coachId });
    return NextResponse.redirect(scheduleUrl("connected"));
  } catch (err) {
    logger.error("oauth", "google calendar callback error", {
      error: err instanceof Error ? err.message : "Unknown",
    });
    return NextResponse.redirect(scheduleUrl("error"));
  }
}
