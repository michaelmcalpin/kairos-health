/**
 * WHOOP API Client
 * Fetches recovery, strain, sleep, and workout data via WHOOP API v1
 */

// ─── Types ──────────────────────────────────────────────────────────────────

interface WhoopCycleData {
  id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  score_state: string;
  score: {
    strain: number;
    kilojoule: number;
    average_heart_rate: number;
    max_heart_rate: number;
  } | null;
}

interface WhoopRecoveryData {
  cycle_id: number;
  sleep_id: number;
  created_at: string;
  updated_at: string;
  score_state: string;
  score: {
    user_calibrating: boolean;
    recovery_score: number;
    resting_heart_rate: number;
    hrv_rmssd_milli: number;
    spo2_percentage: number;
    skin_temp_celsius: number;
  } | null;
}

interface WhoopSleepData {
  id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  score_state: string;
  score: {
    stage_summary: {
      total_in_bed_time_milli: number;
      total_awake_time_milli: number;
      total_no_data_time_milli: number;
      total_light_sleep_time_milli: number;
      total_slow_wave_sleep_time_milli: number;
      total_rem_sleep_time_milli: number;
      sleep_cycle_count: number;
      disturbance_count: number;
    };
    sleep_needed: { baseline_milli: number; need_from_sleep_debt_milli: number };
    respiratory_rate: number;
    sleep_performance_percentage: number;
    sleep_consistency_percentage: number;
    sleep_efficiency_percentage: number;
  } | null;
}

interface WhoopWorkoutData {
  id: number;
  created_at: string;
  updated_at: string;
  start: string;
  end: string;
  timezone_offset: string;
  sport_id: number;
  score_state: string;
  score: {
    strain: number;
    average_heart_rate: number;
    max_heart_rate: number;
    kilojoule: number;
    percent_recorded: number;
    zone_duration: { zone_zero_milli: number; zone_one_milli: number; zone_two_milli: number; zone_three_milli: number; zone_four_milli: number; zone_five_milli: number };
  } | null;
}

interface WhoopPaginatedResponse<T> {
  records: T[];
  next_token?: string;
}

interface WhoopTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  token_type: string;
}

// ─── Base fetch function ────────────────────────────────────────────────────

async function fetchWhoopAPI<T>(
  endpoint: string,
  accessToken: string,
  params?: Record<string, string>,
): Promise<T> {
  const url = new URL(endpoint, "https://api.prod.whoop.com");

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.append(key, value);
    });
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
  });

  if (!res.ok) {
    if (res.status === 401) {
      throw new Error("WHOOP API: Unauthorized (invalid or expired token)");
    }
    throw new Error(`WHOOP API error: ${res.status} ${res.statusText}`);
  }

  return await res.json();
}

// ─── Recovery Data ──────────────────────────────────────────────────────────

/**
 * Fetch recovery data from WHOOP API
 */
export async function fetchWhoopRecovery(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  recovery: Array<{
    date: string;
    recoveryScore: number;
    restingHR: number;
    hrvRmssd: number;
    spo2: number;
    skinTemp: number;
  }>;
}> {
  const response = await fetchWhoopAPI<WhoopPaginatedResponse<WhoopRecoveryData>>(
    "/developer/v1/recovery",
    accessToken,
    { start: `${startDate}T00:00:00.000Z`, end: `${endDate}T23:59:59.999Z` },
  );

  return {
    recovery: response.records
      .filter((r) => r.score !== null)
      .map((r) => ({
        date: r.created_at.split("T")[0],
        recoveryScore: r.score!.recovery_score,
        restingHR: r.score!.resting_heart_rate,
        hrvRmssd: r.score!.hrv_rmssd_milli / 1000,
        spo2: r.score!.spo2_percentage,
        skinTemp: r.score!.skin_temp_celsius,
      })),
  };
}

// ─── Sleep Data ─────────────────────────────────────────────────────────────

/**
 * Fetch sleep data from WHOOP API
 */
export async function fetchWhoopSleep(
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
    respiratoryRate: number;
  }>;
}> {
  const response = await fetchWhoopAPI<WhoopPaginatedResponse<WhoopSleepData>>(
    "/developer/v1/activity/sleep",
    accessToken,
    { start: `${startDate}T00:00:00.000Z`, end: `${endDate}T23:59:59.999Z` },
  );

  return {
    sleep: response.records
      .filter((r) => r.score !== null)
      .map((r) => {
        const s = r.score!.stage_summary;
        return {
          date: r.start.split("T")[0],
          totalMinutes: Math.round((s.total_in_bed_time_milli - s.total_awake_time_milli) / 60000),
          deepMinutes: Math.round(s.total_slow_wave_sleep_time_milli / 60000),
          remMinutes: Math.round(s.total_rem_sleep_time_milli / 60000),
          lightMinutes: Math.round(s.total_light_sleep_time_milli / 60000),
          awakeMinutes: Math.round(s.total_awake_time_milli / 60000),
          score: r.score!.sleep_performance_percentage,
          efficiency: r.score!.sleep_efficiency_percentage,
          respiratoryRate: r.score!.respiratory_rate,
        };
      }),
  };
}

// ─── Strain / Cycle Data ────────────────────────────────────────────────────

/**
 * Fetch strain (cycle) data from WHOOP API
 */
export async function fetchWhoopStrain(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  strain: Array<{
    date: string;
    strain: number;
    kilojoules: number;
    avgHR: number;
    maxHR: number;
  }>;
}> {
  const response = await fetchWhoopAPI<WhoopPaginatedResponse<WhoopCycleData>>(
    "/developer/v1/cycle",
    accessToken,
    { start: `${startDate}T00:00:00.000Z`, end: `${endDate}T23:59:59.999Z` },
  );

  return {
    strain: response.records
      .filter((r) => r.score !== null)
      .map((r) => ({
        date: r.start.split("T")[0],
        strain: r.score!.strain,
        kilojoules: r.score!.kilojoule,
        avgHR: r.score!.average_heart_rate,
        maxHR: r.score!.max_heart_rate,
      })),
  };
}

// ─── Workout Data ───────────────────────────────────────────────────────────

/**
 * Fetch workout data from WHOOP API
 */
export async function fetchWhoopWorkouts(
  accessToken: string,
  startDate: string,
  endDate: string,
): Promise<{
  workouts: Array<{
    date: string;
    sportId: number;
    strain: number;
    avgHR: number;
    maxHR: number;
    kilojoules: number;
    durationMinutes: number;
  }>;
}> {
  const response = await fetchWhoopAPI<WhoopPaginatedResponse<WhoopWorkoutData>>(
    "/developer/v1/activity/workout",
    accessToken,
    { start: `${startDate}T00:00:00.000Z`, end: `${endDate}T23:59:59.999Z` },
  );

  return {
    workouts: response.records
      .filter((r) => r.score !== null)
      .map((r) => ({
        date: r.start.split("T")[0],
        sportId: r.sport_id,
        strain: r.score!.strain,
        avgHR: r.score!.average_heart_rate,
        maxHR: r.score!.max_heart_rate,
        kilojoules: r.score!.kilojoule,
        durationMinutes: Math.round(
          (new Date(r.end).getTime() - new Date(r.start).getTime()) / 60000,
        ),
      })),
  };
}

// ─── Token Management ───────────────────────────────────────────────────────

/**
 * Refresh WHOOP access token using refresh token
 */
export async function refreshWhoopToken(
  refreshToken: string,
): Promise<{ accessToken: string; refreshToken: string; expiresIn: number }> {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("WHOOP credentials not configured");
  }

  const res = await fetch("https://api.prod.whoop.com/oauth/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "refresh_token",
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
    }),
  });

  if (!res.ok) {
    throw new Error(`WHOOP token refresh failed: ${res.status} ${res.statusText}`);
  }

  const data: WhoopTokenResponse = await res.json();

  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in,
  };
}

// ─── Connection Testing ─────────────────────────────────────────────────────

/**
 * Test WHOOP API connectivity with current token
 */
export async function testWhoopConnection(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("https://api.prod.whoop.com/developer/v1/user/profile/basic", {
      method: "GET",
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    return res.ok;
  } catch {
    return false;
  }
}
