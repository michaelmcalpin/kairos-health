import { NextResponse } from "next/server";

export async function GET() {
  const accountId = process.env.ZOOM_ACCOUNT_ID;
  const clientId = process.env.ZOOM_CLIENT_ID;
  const clientSecret = process.env.ZOOM_CLIENT_SECRET;

  const results: Record<string, unknown> = {
    ZOOM_ACCOUNT_ID: accountId ? `set (${accountId.length} chars, starts: ${accountId.slice(0, 4)}...)` : "NOT SET",
    ZOOM_CLIENT_ID: clientId ? `set (${clientId.length} chars, starts: ${clientId.slice(0, 4)}...)` : "NOT SET",
    ZOOM_CLIENT_SECRET: clientSecret ? `set (${clientSecret.length} chars)` : "NOT SET",
    allPresent: !!(accountId && clientId && clientSecret),
  };

  // If all are present, try to get an access token
  if (accountId && clientId && clientSecret) {
    try {
      const credentials = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");
      const tokenRes = await fetch("https://zoom.us/oauth/token", {
        method: "POST",
        headers: {
          Authorization: `Basic ${credentials}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `grant_type=account_credentials&account_id=${accountId}`,
      });
      const tokenData = await tokenRes.json() as Record<string, unknown>;
      if (tokenRes.ok && tokenData.access_token) {
        results.tokenTest = "SUCCESS — got access token";
        results.tokenType = tokenData.token_type;
        results.expiresIn = tokenData.expires_in;
      } else {
        results.tokenTest = "FAILED";
        results.tokenError = tokenData.reason ?? tokenData.error ?? tokenData.message ?? JSON.stringify(tokenData);
        results.tokenStatus = tokenRes.status;
      }
    } catch (e) {
      results.tokenTest = "ERROR";
      results.tokenError = e instanceof Error ? e.message : String(e);
    }
  }

  return NextResponse.json(results);
}
