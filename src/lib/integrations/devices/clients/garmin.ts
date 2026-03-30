/**
 * Garmin Connect API Client
 * Fetches activities, sleep, heart rate, body composition, and stress data
 *
 * Note: Garmin uses OAuth 1.0a, not OAuth 2.0. The authorization flow is
 * different from other providers. Token management uses consumer key/secret pairs.
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface GarminSleepData {
  calendarDate: string;
  sleepTimeSeconds: number;
  deepSleepSeconds: number;
  lightSleepSeconds: number;
  remSleepSeconds: number;
  awakeSleepSeconds: number;
  sleepStartTimestampGMT: number;
  sleepEndTimestampGMT: number;
  averageSpO2Value: number;
  lowestSpO2Value: number;
  averageRespirationValue: number;
  sleepScores: {
    overall: number;
    remPercentage: number;
    deepPercentage: number;
    lightPercentage: number;
    awakeningsCount: number;
  } | null;
}

interface GarminActivityData {
  activityId: number;
  activityName: string;
  activityType: { typeKey: string };
  startTimeGMT: string;
  startTimeLocal: string;
  duration: number;
  distance: number;
  calories: number;
  averageHR: number;
  maxHR: number;
  averageSpeed: number;
  steps: number;
  elevationGain: number;
}

interface GarminDailySummary {
  calendarDate: string;
  totalSteps: number;
  totalDistanceMeters: number;
  activeKilocalories: number;
  restingHeartRate: number;
  maxHeartRate: number;
  minHeartRate: number;
  averageStressLevel: number;
  maxStressLevel: number;
  stressDuration: number;
  bodyBatteryChargedValue: number;
  bodyBatteryDrainedValue: number;
  floorsClimbed: number;
  intensiveMinutes: number;
  moderateIntensiveMinutes: number;
}

interface GarminBodyCompData {
  calendarDate: string;
  weight: number;
  bmi: number;
  bodyFatPercentage: number;
  muscleMass: number;
  boneMass: number;
  bodyWater: number;
}

interface GarminTokenResponse {
  oauth_token: string;
  oauth_token_secret: string;
}

// ─── Base fetch function ────────────────────────────────────────────────────

async function fetchGarminAPI<T>(
  endpoint: string,
  accessToken: string,
  tokenSecret: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint, "https://apis.garmin.com");

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  // Garmin uses OAuth 1.0a — in production, you'd sign requests with
  // consumer key, consumer secret, token, and token secret.
  // For simplicity, we use the access token as a Bearer token here,
  // assuming a proxy/wrapper handles OAuth 1.0a signing.
  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("Garmin API: Unauthorized (invalid or expired token)");
    }
    throw new Error(`Garmin API error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

// ─── Sleep Data ─────────────────────────────────────────────────────────────

/**
 * Fetch sleep data from Garmin Connect API
 */
export async function fetchGarminSleep(
  accessToken: string,
  tokenSecret: string,
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
    spo2: number;
    respiratoryRate: number;
  }>;
}> {
  const response = await fetchGarminAPI<GarminSleepData[]>(
    "/wellness-api/rest/dailySleepData",
    accessToken,
    tokenSecret,
    { startDate, endDate },
  );

  return {
    sleep: response.map((r) => ({
      date: r.calendarDate,
      totalMinutes: Math.round(r.sleepTimeSeconds / 60),
      deepMinutes: Math.round(r.deepSleepSeconds / 60),
      remMinutes: Math.round(r.remSleepSeconds / 60),
      lightMinutes: Math.round(r.lightSleepSeconds / 60),
      awakeMinutes: Math.round(r.awakeSleepSeconds / 60),
      score: r.sleepScores?.overall ?? 0,
      spo2: r.averageSpO2Value,
      respiratoryRate: r.averageRespirationValue,
    })),
  };
}

// ─── Activity Data ──────────────────────────────────────────────────────────

/**
 * Fetch activities from Garmin Connect API
 */
export async function fetchGarminActivities(
  accessToken: string,
  tokenSecret: string,
  startDate: string,
  endDate: string,
): Promise<{
  activities: Array<{
    id: number;
    name: string;
    type: string;
    date: string;
    durationMinutes: number;
    distanceMeters: number;
    calories: number;
    avgHR: number;
    maxHR: number;
    steps: number;
    elevationGain: number;
  }>;
}> {
  const response = await fetchGarminAPI<GarminActivityData[]>(
    "/activitylist-service/activities/search/activities",
    accessToken,
    tokenSecret,
    { startDate, endDate },
  );

  return {
    activities: response.map((a) => ({
      id: a.activityId,
      name: a.activityName,
      type: a.activityType.typeKey,
      date: a.startTimeLocal.split("T")[0],
      durationMinutes: Math.round(a.duration / 60),
      distanceMeters: a.distance,
      calories: a.calories,
      avgHR: a.averageHR,
      maxHR: a.maxHR,
      steps: a.steps,
      elevationGain: a.elevationGain,
    })),
  };
}

// ─── Daily Summary ──────────────────────────────────────────────────────────

/**
 * Fetch daily summary data (steps, stress, body battery, HR)
 */
export async function fetchGarminDailySummary(
  accessToken: string,
  tokenSecret: string,
  date: string,
): Promise<{
  steps: number;
  restingHR: number;
  avgStress: number;
  bodyBatteryCharged: number;
  bodyBatteryDrained: number;
  activeCalories: number;
  floorsClimbed: number;
  intensiveMinutes: number;
}> {
  const response = await fetchGarminAPI<GarminDailySummary>(
    "/wellness-api/rest/dailySummary",
    accessToken,
    tokenSecret,
    { calendarDate: date },
  );

  return {
    steps: response.totalSteps,
    restingHR: response.restingHeartRate,
    avgStress: response.averageStressLevel,
    bodyBatteryCharged: response.bodyBatteryChargedValue,
    bodyBatteryDrained: response.bodyBatteryDrainedValue,
    activeCalories: response.activeKilocalories,
    floorsClimbed: response.floorsClimbed,
    intensiveMinutes: response.intensiveMinutes + response.moderateIntensiveMinutes,
  };
}

// ─── Body Composition ───────────────────────────────────────────────────────

/**
 * Fetch body composition data from Garmin
 */
export async function fetchGarminBodyComposition(
  accessToken: string,
  tokenSecret: string,
  startDate: string,
  endDate: string,
): Promise<{
  measurements: Array<{
    date: string;
    weightKg: number;
    bmi: number;
    bodyFatPct: number;
    muscleMassKg: number;
    bodyWaterPct: number;
  }>;
}> {
  const response = await fetchGarminAPI<GarminBodyCompData[]>(
    "/weight-service/weight/dateRange",
    accessToken,
    tokenSecret,
    { startDate, endDate },
  );

  return {
    measurements: response.map((r) => ({
      date: r.calendarDate,
      weightKg: r.weight / 1000, // Garmin returns grams
      bmi: r.bmi,
      bodyFatPct: r.bodyFatPercentage,
      muscleMassKg: r.muscleMass / 1000,
      bodyWaterPct: r.bodyWater,
    })),
  };
}

// ─── Connection Testing ─────────────────────────────────────────────────────

/**
 * Test Garmin API connectivity with current token
 */
export async function testGarminConnection(
  accessToken: string,
  tokenSecret: string,
): Promise<boolean> {
  try {
    const res = await fetch("https://apis.garmin.com/wellness-api/rest/user/id", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
