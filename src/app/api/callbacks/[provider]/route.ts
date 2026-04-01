import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { deviceConnections } from "@/server/db/schema";
import { PROVIDERS, getProviderEnvKeys } from "@/lib/integrations/devices/providers";
import { eq, and } from "drizzle-orm";
import { logger } from "@/lib/middleware/logger";

/**
 * OAuth Callback Handler
 *
 * Receives authorization code from OAuth provider, exchanges it for tokens,
 * and stores the connection in the deviceConnections table.
 */
export async function GET(
  req: Request,
  { params }: { params: { provider: string } }
) {
  try {
    const { provider: providerId } = params;
    const url = new URL(req.url);

    // Extract query parameters
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    // Handle OAuth errors from provider
    if (error) {
      const errorDescription = url.searchParams.get("error_description") || error;
      logger.error("oauth", `${providerId} error: ${errorDescription}`);
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent(errorDescription)}`, req.url)
      );
    }

    // Validate required parameters
    if (!code || !state) {
      return NextResponse.redirect(
        new URL("/settings?error=Missing authorization code or state", req.url)
      );
    }

    // Decode state to get userId and provider
    let decodedState: { userId: string; provider: string };
    try {
      const stateBuffer = Buffer.from(state, "base64");
      decodedState = JSON.parse(stateBuffer.toString("utf-8"));
    } catch (err) {
      logger.error("oauth", "Failed to decode state", { error: err instanceof Error ? err.message : "Unknown" });
      return NextResponse.redirect(
        new URL("/settings?error=Invalid state parameter", req.url)
      );
    }

    const { userId, provider: stateProvider } = decodedState;

    // Verify state provider matches URL provider
    if (stateProvider !== providerId) {
      logger.error("oauth", "Provider mismatch", { stateProvider, urlProvider: providerId });
      return NextResponse.redirect(
        new URL("/settings?error=Provider mismatch", req.url)
      );
    }

    // Get provider configuration
    const providerConfig = PROVIDERS[providerId];
    if (!providerConfig) {
      logger.error("oauth", "Unknown provider", { provider: providerId });
      return NextResponse.redirect(
        new URL("/settings?error=Unknown provider", req.url)
      );
    }

    // Get OAuth credentials
    const envKeys = getProviderEnvKeys(providerId);
    const clientId = process.env[envKeys.clientId];
    const clientSecret = process.env[envKeys.clientSecret];

    if (!clientId || !clientSecret) {
      logger.error("oauth", "Missing credentials", { provider: providerId });
      return NextResponse.redirect(
        new URL("/settings?error=Provider not configured", req.url)
      );
    }

    // Exchange authorization code for tokens
    const tokenRes = await fetch(providerConfig.tokenUrl, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callbacks/${providerId}`,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!tokenRes.ok) {
      const error = await tokenRes.text();
      logger.error("oauth", "Token exchange failed", { provider: providerId, status: tokenRes.status });
      return NextResponse.redirect(
        new URL(`/settings?error=${encodeURIComponent("Token exchange failed")}`, req.url)
      );
    }

    const tokenData = await tokenRes.json();

    // Extract token information
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token;
    const expiresIn = tokenData.expires_in;
    const scopes = tokenData.scope
      ? (typeof tokenData.scope === "string" ? tokenData.scope.split(" ") : tokenData.scope)
      : providerConfig.scopes;

    if (!accessToken) {
      logger.error("oauth", "No access token in response", { provider: providerId });
      return NextResponse.redirect(
        new URL("/settings?error=No access token received", req.url)
      );
    }

    // Calculate token expiration
    const tokenExpiresAt = expiresIn
      ? new Date(Date.now() + expiresIn * 1000)
      : null;

    // Upsert device connection
    // First check if connection already exists
    const existingConnection = await db
      .select()
      .from(deviceConnections)
      .where(
        and(
          eq(deviceConnections.clientId, userId),
          eq(deviceConnections.provider, providerId as any)
        )
      )
      .limit(1);

    if (existingConnection.length > 0) {
      // Update existing connection
      await db
        .update(deviceConnections)
        .set({
          accessTokenEnc: accessToken,
          refreshTokenEnc: refreshToken || null,
          scopes: scopes as any,
          tokenExpiresAt: tokenExpiresAt as any,
          status: "connected",
        })
        .where(eq(deviceConnections.id, existingConnection[0].id));

      logger.info("oauth", "Updated device connection", { provider: providerId, userId });
    } else {
      // Insert new connection
      await db.insert(deviceConnections).values({
        clientId: userId as any,
        provider: providerId as any,
        accessTokenEnc: accessToken,
        refreshTokenEnc: refreshToken || null,
        scopes: scopes as any,
        tokenExpiresAt: tokenExpiresAt as any,
        status: "connected",
      });

      logger.info("oauth", "Created device connection", { provider: providerId, userId });
    }

    // Redirect to settings with success
    return NextResponse.redirect(
      new URL(`/settings?connected=${providerId}`, req.url)
    );
  } catch (err) {
    logger.error("oauth", "Callback handler error", { error: err instanceof Error ? err.message : "Unknown" });
    return NextResponse.redirect(
      new URL(
        `/settings?error=${encodeURIComponent("An error occurred during authentication")}`,
        req.url
      )
    );
  }
}
