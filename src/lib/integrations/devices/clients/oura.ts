/**
 * Oura Ring API Client
 * Fetches sleep, heart rate, and HRV data via Oura API v2
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface OuraSleepData {
  id: string;
  day: string;
  timestamp: string;
  bedtimeStart: string;
  bedtimeEnd: string;
  duration: number;
  deepSleep: number;
  lightSleep: number;
  remSleep: number;
  wakeDuration: number;
  sleepPhase: string;
  sleepScore: number;
  restlessness: number;
  efficiency: number;
  timezone: string;
}

interface OuraSleepResponse {
  data: OuraSleepData[];
  nextToken?: string;
}

interface OuraHeartRateData {
  timestamp: string;
  bpm: number;
}

interface OuraHeartRateResponse {
  data: OuraHeartRateData[];
  nextToken?: string;
}

interface OuraHRVData {
  timestamp: string;
  rmssd: number;
}

interface OuraHRVResponse {
  data: OuraHRVData[];
  nextToken?: string;
}

interface OuraTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ─── Base fetch function ────────────────────────────────────────────────────

async function fetchOuraAPI<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint, "https://api.ouraring.com");

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  try {
    const res = await fetch(url.toString(), {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Oura API: Unauthorized (invalid or expired token)");
      }
      throw new Error(`Oura API error: ${res.status} ${res.statusText}`);
    }

    return await res.json();
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Oura API request failed: ${err.message}`);
    }
    throw err;
  }
}

// ─── Sleep Data ──────────────────────────────────────────────────────────────

/**
 * Fetch sleep data from Oura API
 * @param accessToken - Oura API access token
 * @param startDate - ISO format date string (e.g. "2024-03-01")
 * @param endDate - ISO format date string (e.g. "2024-03-31")
 * @returns Normalized sleep data
 */
export async function fetchOuraSleep(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  sleep: Array<{
    date: string;
    totalMinutes: number;
    deepMinutes: number;
    remMinutes: number;
    lightMinutes: number;
    awakeMinutes: number;
    score: number;
    efficiency: number;
  }>;
}> {
  const response = await fetchOuraAPI<OuraSleepResponse>(
    "/v2/usercollection/sleep",
    accessToken,
    {
      start_date: startDate,
      end_date: endDate,
    },
  );

  return {
    sleep: response.data.map((record) => ({
      date: record.day,
      totalMinutes: record.duration,
      deepMinutes: record.deepSleep,
      remMinutes: record.remSleep,
      lightMinutes: record.lightSleep,
      awakeMinutes: record.wakeDuration,
      score: record.sleepScore,
      efficiency: record.efficiency,
    })),
  };
}

// ─── Heart Rate Data ────────────────────────────────────────────────────────

/**
 * Fetch heart rate data from Oura API
 * @param accessToken - Oura API access token
 * @param startDate - ISO format date string (e.g. "2024-03-01")
 * @param endDate - ISO format date string (e.g. "2024-03-31")
 * @returns Heart rate readings
 */
export async function fetchOuraHeartRate(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  heartRate: Array<{
    timestamp: Date;
    bpm: number;
  }>;
}> {
  const response = await fetchOuraAPI<OuraHeartRateResponse>(
    "/v2/usercollection/heartrate",
    accessToken,
    {
      start_date: startDate,
      end_date: endDate,
    },
  );

  return {
    heartRate: response.data.map((record) => ({
      timestamp: new Date(record.timestamp),
      bpm: record.bpm,
    })),
  };
}

// ─── HRV Data ───────────────────────────────────────────────────────────────

/**
 * Fetch HRV (Heart Rate Variability) data from Oura API
 * @param accessToken - Oura API access token
 * @param startDate - ISO format date string (e.g. "2024-03-01")
 * @param endDate - ISO format date string (e.g. "2024-03-31")
 * @returns HRV readings
 */
export async function fetchOuraHRV(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  hrv: Array<{
    timestamp: Date;
    rmssd: number;
  }>;
}> {
  const response = await fetchOuraAPI<OuraHRVResponse>(
    "/v2/usercollection/heart_rate_variability",
    accessToken,
    {
      start_date: startDate,
      end_date: endDate,
    },
  );

  return {
    hrv: response.data.map((record) => ({
      timestamp: new Date(record.timestamp),
      rmssd: record.rmssd,
    })),
  };
}

// ─── Token Management ───────────────────────────────────────────────────────

/**
 * Refresh Oura access token using refresh token
 * @param refreshToken - Oura refresh token
 * @returns New access token, refresh token, and expiration time
 */
export async function refreshOuraToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.OURA_CLIENT_ID;
  const clientSecret = process.env.OURA_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Oura credentials not configured");
  }

  try {
    const res = await fetch("https://api.ouraring.com/oauth/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
        client_id: clientId,
        client_secret: clientSecret,
      }),
    });

    if (!res.ok) {
      if (res.status === 401) {
        throw new Error("Oura: Invalid refresh token");
      }
      throw new Error(`Token refresh failed: ${res.status} ${res.statusText}`);
    }

    const data: OuraTokenResponse = await res.json();

    return {
      accessToken: data.access_token,
      refreshToken: data.refresh_token,
      expiresIn: data.expires_in,
    };
  } catch (err) {
    if (err instanceof Error) {
      throw new Error(`Oura refreshToken failed: ${err.message}`);
    }
    throw err;
  }
}

// ─── Connection Testing ─────────────────────────────────────────────────────

/**
 * Test Oura API connectivity with current token
 * @param accessToken - Oura API access token
 * @returns true if token is valid
 */
export async function testOuraConnection(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.ouraring.com/v2/usercollection/personal_info", {
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
