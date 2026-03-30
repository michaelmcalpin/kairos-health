/**
 * Dexcom CGM API Client
 * Fetches continuous glucose monitoring data via Dexcom API v3
 */

interface DexcomEGVRecord {
  systemTime: string;
  displayTime: string;
  value: number;
  trend: string;
  trendRate: number;
}

interface DexcomGlucoseResponse {
  records: DexcomEGVRecord[];
  pageInfo?: {
    nextPageUrl?: string;
  };
}

/**
 * Fetch glucose readings from Dexcom API
 * @param accessToken - Dexcom API access token
 * @param startDate - ISO format date string (e.g. "2024-03-01")
 * @param endDate - ISO format date string (e.g. "2024-03-31")
 * @returns Normalized glucose readings
 */
export async function fetchDexcomGlucose(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{ readings: Array<{ timestamp: Date; valueMgdl: number; trend: string }> }> {
  const url = `https://api.dexcom.com/v3/users/self/egvs?startDate=${startDate}&endDate=${endDate}`;

  try {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Dexcom API: Unauthorized (invalid or expired token)");
      }
      throw new Error(`Dexcom API error: ${res.status} ${res.statusText}`);
    }

    const data: DexcomGlucoseResponse = await res.json();
    const records: DexcomEGVRecord[] = data.records ?? [];

    return {
      readings: records.map((r) => ({
        timestamp: new Date(r.systemTime),
        valueMgdl: r.value,
        trend: r.trend ?? "flat",
      })),
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Dexcom fetchGlucose failed: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Refresh Dexcom access token using refresh token
 * @param refreshToken - Dexcom refresh token
 * @returns New access token, refresh token, and expiration time
 */
export async function refreshDexcomToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.DEXCOM_CLIENT_ID;
  const clientSecret = process.env.DEXCOM_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Dexcom credentials not configured");
  }

  try {
    const res = await fetch("https://api.dexcom.com/v2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: `${process.env.NEXT_PUBLIC_APP_URL}/api/callbacks/dexcom`,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Dexcom: Invalid refresh token");
      }
      throw new Error(`Token refresh failed: ${res.status} ${res.statusText}`);
    }

    const data = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Dexcom refreshToken failed: ${err.message}`);
    }
    throw err;
  }
}

/**
 * Test Dexcom API connectivity with current token
 * @param accessToken - Dexcom API access token
 * @returns true if token is valid
 */
export async function testDexcomConnection(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.dexcom.com/v3/users/self", {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    return res.ok;
  } catch {
    return false;
  }
}
