/**
 * Fitbit Web API Client
 * Fetches activity, sleep, heart rate, and body data via Fitbit Web API v1.2
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface FitbitSleepStage {
  dateTime: string;
  level: "deep" | "light" | "rem" | "wake" | "restless" | "asleep";
  seconds: number;
}

interface FitbitSleepRecord {
  dateOfSleep: string;
  duration: number;
  efficiency: number;
  isMainSleep: boolean;
  startTime: string;
  endTime: string;
  minutesAsleep: number;
  minutesAwake: number;
  timeInBed: number;
  levels: {
    summary: {
      deep?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      light?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      rem?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
      wake?: { count: number; minutes: number; thirtyDayAvgMinutes: number };
    };
    data: FitbitSleepStage[];
  };
}

interface FitbitSleepResponse {
  sleep: FitbitSleepRecord[];
  summary: { totalMinutesAsleep: number; totalSleepRecords: number; totalTimeInBed: number };
}

interface FitbitHeartRateZone {
  caloriesOut: number;
  max: number;
  min: number;
  minutes: number;
  name: string;
}

interface FitbitHeartRateData {
  dateTime: string;
  value: {
    customHeartRateZones: FitbitHeartRateZone[];
    heartRateZones: FitbitHeartRateZone[];
    restingHeartRate: number;
  };
}

interface FitbitActivityData {
  activeDuration: number;
  activityName: string;
  activityTypeId: number;
  averageHeartRate: number;
  calories: number;
  distance: number;
  distanceUnit: string;
  logId: number;
  logType: string;
  startTime: string;
  steps: number;
}

interface FitbitDailySummary {
  activities: FitbitActivityData[];
  summary: {
    activeScore: number;
    activityCalories: number;
    caloriesBMR: number;
    caloriesOut: number;
    distances: Array<{ activity: string; distance: number }>;
    fairlyActiveMinutes: number;
    lightlyActiveMinutes: number;
    sedentaryMinutes: number;
    steps: number;
    veryActiveMinutes: number;
    floors: number;
  };
}

interface FitbitBodyData {
  weight: number;
  bmi: number;
  fat: number;
  date: string;
  time: string;
}

interface FitbitTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
  user_id: string;
}

// ─── Base fetch function ────────────────────────────────────────────────────

async function fetchFitbitAPI<T>(
  endpoint: string,
  accessToken: string,
): Promise<T> {
  const url = `https://api.fitbit.com${endpoint}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Fitbit API: Unauthorized (invalid or expired token)");
    }
    if (res.status === 429) {
      throw new Error("Fitbit API: Rate limit exceeded");
    }
    throw new Error(`Fitbit API error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

// ─── Sleep Data ─────────────────────────────────────────────────────────────

/**
 * Fetch sleep data from Fitbit API
 */
export async function fetchFitbitSleep(
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
    efficiency: number;
    startTime: string;
    endTime: string;
  }>;
}> {
  const response = await fetchFitbitAPI<FitbitSleepResponse>(
    `/1.2/user/-/sleep/date/${startDate}/${endDate}.json`,
    accessToken,
  );

  return {
    sleep: response.sleep
      .filter((r) => r.isMainSleep)
      .map((r) => ({
        date: r.dateOfSleep,
        totalMinutes: r.minutesAsleep,
        deepMinutes: r.levels.summary.deep?.minutes ?? 0,
        remMinutes: r.levels.summary.rem?.minutes ?? 0,
        lightMinutes: r.levels.summary.light?.minutes ?? 0,
        awakeMinutes: r.minutesAwake,
        efficiency: r.efficiency,
        startTime: r.startTime,
        endTime: r.endTime,
      })),
  };
}

// ─── Heart Rate Data ────────────────────────────────────────────────────────

/**
 * Fetch resting heart rate data from Fitbit API
 */
export async function fetchFitbitHeartRate(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  heartRate: Array<{
    date: string;
    restingHR: number;
    zones: Array<{ name: string; minutes: number; caloriesOut: number }>;
  }>;
}> {
  const response = await fetchFitbitAPI<{ "activities-heart": FitbitHeartRateData[] }>(
    `/1/user/-/activities/heart/date/${startDate}/${endDate}.json`,
    accessToken,
  );

  return {
    heartRate: response["activities-heart"].map((r) => ({
      date: r.dateTime,
      restingHR: r.value.restingHeartRate,
      zones: r.value.heartRateZones.map((z) => ({
        name: z.name,
        minutes: z.minutes,
        caloriesOut: z.caloriesOut,
      })),
    })),
  };
}

// ─── Activity Summary ───────────────────────────────────────────────────────

/**
 * Fetch daily activity summary from Fitbit
 */
export async function fetchFitbitDailySummary(
  accessToken: string,
  date: string,
): Promise<{
  steps: number;
  activeCalories: number;
  totalCalories: number;
  fairlyActiveMinutes: number;
  veryActiveMinutes: number;
  floors: number;
  distances: Array<{ activity: string; distance: number }>;
}> {
  const response = await fetchFitbitAPI<FitbitDailySummary>(
    `/1/user/-/activities/date/${date}.json`,
    accessToken,
  );

  return {
    steps: response.summary.steps,
    activeCalories: response.summary.activityCalories,
    totalCalories: response.summary.caloriesOut,
    fairlyActiveMinutes: response.summary.fairlyActiveMinutes,
    veryActiveMinutes: response.summary.veryActiveMinutes,
    floors: response.summary.floors,
    distances: response.summary.distances,
  };
}

// ─── Body Data ──────────────────────────────────────────────────────────────

/**
 * Fetch body weight/fat data from Fitbit
 */
export async function fetchFitbitBody(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  measurements: Array<{
    date: string;
    weightKg: number;
    bmi: number;
    bodyFatPct: number;
  }>;
}> {
  const response = await fetchFitbitAPI<{ weight: FitbitBodyData[] }>(
    `/1/user/-/body/log/weight/date/${startDate}/${endDate}.json`,
    accessToken,
  );

  return {
    measurements: response.weight.map((r) => ({
      date: r.date,
      weightKg: r.weight,
      bmi: r.bmi,
      bodyFatPct: r.fat,
    })),
  };
}

// ─── Token Management ───────────────────────────────────────────────────────

/**
 * Refresh Fitbit access token using refresh token
 */
export async function refreshFitbitToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.FITBIT_CLIENT_ID;
  const clientSecret = process.env.FITBIT_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("Fitbit credentials not configured");
  }

  // Fitbit uses Basic auth for token refresh
  const basicAuth = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

  const res = await fetch("https://api.fitbit.com/oauth2/token", {
    method: "POST",
    headers: {
      Authorization: `Basic ${basicAuth}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
    }),
  });

  if (!res.ok) {
    throw new Error(`Fitbit token refresh failed: ${res.status} ${res.statusText}`);
  }

  const data: FitbitTokenResponse = await res.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── Connection Testing ─────────────────────────────────────────────────────

/**
 * Test Fitbit API connectivity with current token
 */
export async function testFitbitConnection(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.fitbit.com/1/user/-/profile.json", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
