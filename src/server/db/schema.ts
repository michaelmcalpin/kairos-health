import {
  pgTable, uuid, text, varchar, integer, boolean, timestamp, date, real, jsonb, pgEnum, decimal, index,
} from "drizzle-orm/pg-core";

// ======================== ENUMS ========================
export const userRoleEnum = pgEnum("user_role", ["client", "trainer", "company_admin", "super_admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended", "onboarding"]);
export const tierEnum = pgEnum("tier", ["tier1", "tier2", "tier3"]);
export const alertPriorityEnum = pgEnum("alert_priority", ["urgent", "action", "info"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "acknowledged", "resolved", "dismissed"]);
export const protocolStatusEnum = pgEnum("protocol_status", ["active", "proposed", "archived"]);
export const protocolItemCategoryEnum = pgEnum("protocol_item_category", ["supplement", "medication", "peptide", "injection"]);
export const deviceProviderEnum = pgEnum("device_provider", ["oura", "apple_health", "dexcom", "garmin", "whoop", "withings", "fitbit"]);
export const deviceStatusEnum = pgEnum("device_status", ["connected", "disconnected", "error", "syncing"]);
export const transferStatusEnum = pgEnum("transfer_status", ["pending", "accepted", "declined", "completed"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled", "trialing"]);
export const notifCategoryEnum = pgEnum("notif_category", [
  "health_alert", "insight", "weekly_report", "coach_message", "appointment",
  "lab_result", "supplement", "fasting", "streak", "billing", "system", "onboarding",
]);
export const notifPriorityEnum = pgEnum("notif_priority", ["low", "normal", "high", "urgent"]);
export const messageRoleEnum = pgEnum("message_role", ["client", "coach", "ai_coach", "system"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
export const fastingTypeEnum = pgEnum("fasting_type", ["16_8", "20_4", "36hr", "omad", "custom"]);
export const bloodSugarTimingEnum = pgEnum("blood_sugar_timing", ["fasted", "1hr", "2hr", "3hr", "4hr"]);
export const goalCategoryEnum = pgEnum("goal_category", ["glucose", "sleep", "weight", "body_fat", "activity", "nutrition", "supplements", "fasting", "labs", "custom"]);
export const goalStatusEnum = pgEnum("goal_status", ["active", "paused", "completed", "abandoned"]);
export const goalDirectionEnum = pgEnum("goal_direction", ["increase", "decrease", "maintain", "reach"]);
export const goalTimeframeEnum = pgEnum("goal_timeframe", ["weekly", "monthly", "quarterly", "yearly", "open_ended"]);

// ======================== CORE: COMPANIES ========================
export const companies = pgTable("companies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  slug: varchar("slug", { length: 100 }).notNull().unique(),
  logoUrl: text("logo_url"),
  brandColor: varchar("brand_color", { length: 7 }),
  emailFromName: varchar("email_from_name", { length: 255 }),
  emailFooter: text("email_footer"),
  website: varchar("website", { length: 500 }),
  status: userStatusEnum("status").notNull().default("active"),
  maxTrainers: integer("max_trainers").default(10),
  maxClients: integer("max_clients").default(100),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("companies_slug_idx").on(t.slug)]);

// ======================== CORE: USERS & ROLES ========================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("client"),
  companyId: uuid("company_id").references(() => companies.id),
  status: userStatusEnum("status").notNull().default("onboarding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("users_clerk_idx").on(t.clerkId),
  index("users_company_idx").on(t.companyId),
]);

export const clientProfiles = pgTable("client_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  tier: tierEnum("tier").notNull().default("tier3"),
  dateOfBirth: date("date_of_birth"),
  gender: varchar("gender", { length: 20 }),
  heightInches: real("height_inches"),
  goals: jsonb("goals").$type<string[]>().default([]),
  onboardingStep: integer("onboarding_step").default(1),
  onboardingCompleted: boolean("onboarding_completed").default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainerProfiles = pgTable("trainer_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  bio: text("bio"),
  specialties: jsonb("specialties").$type<string[]>().default([]),
  credentials: jsonb("credentials").$type<string[]>().default([]),
  capacity: integer("capacity").default(25),
  marketplaceVisible: boolean("marketplace_visible").default(false),
  acceptingClients: boolean("accepting_clients").default(true),
  monthlyRate: decimal("monthly_rate", { precision: 10, scale: 2 }),
  packages: jsonb("packages").$type<{ name: string; price: number; description: string }[]>(),
  rating: real("rating").default(0),
  reviewCount: integer("review_count").default(0),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const trainerClientRelationships = pgTable("trainer_client_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  transferredFrom: uuid("transferred_from"),
}, (t) => [
  index("tcr_trainer_idx").on(t.trainerId),
  index("tcr_client_idx").on(t.clientId),
]);

// ======================== BIOMETRIC: TIMESCALEDB HYPERTABLES ========================
export const glucoseReadings = pgTable("glucose_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  valueMgdl: real("value_mgdl").notNull(),
  source: varchar("source", { length: 50 }).default("dexcom"),
  trendDirection: varchar("trend_direction", { length: 20 }),
}, (t) => [
  index("glucose_client_ts_idx").on(t.clientId, t.timestamp),
]);

export const heartRateReadings = pgTable("heart_rate_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  bpm: integer("bpm").notNull(),
  source: varchar("source", { length: 50 }),
  activityContext: varchar("activity_context", { length: 20 }),
}, (t) => [index("hr_client_ts_idx").on(t.clientId, t.timestamp)]);

export const hrvReadings = pgTable("hrv_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  rmssd: real("rmssd").notNull(),
  source: varchar("source", { length: 50 }),
}, (t) => [index("hrv_client_ts_idx").on(t.clientId, t.timestamp)]);

export const sleepSessions = pgTable("sleep_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  totalMinutes: integer("total_minutes"),
  deepMinutes: integer("deep_minutes"),
  remMinutes: integer("rem_minutes"),
  lightMinutes: integer("light_minutes"),
  awakeMinutes: integer("awake_minutes"),
  score: integer("score"),
  source: varchar("source", { length: 50 }),
}, (t) => [index("sleep_client_date_idx").on(t.clientId, t.date)]);

export const activitySummaries = pgTable("activity_summaries", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  steps: integer("steps"),
  caloriesActive: integer("calories_active"),
  exerciseMinutes: integer("exercise_minutes"),
  standHours: integer("stand_hours"),
  source: varchar("source", { length: 50 }),
}, (t) => [index("activity_client_date_idx").on(t.clientId, t.date)]);

export const bodyMeasurements = pgTable("body_measurements", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  weightLbs: real("weight_lbs"),
  bodyFatPct: real("body_fat_pct"),
  waistInches: real("waist_inches"),
  chestInches: real("chest_inches"),
  hipsInches: real("hips_inches"),
  rightBicepInches: real("right_bicep_inches"),
  rightThighInches: real("right_thigh_inches"),
  source: varchar("source", { length: 50 }),
});

export const bloodPressureReadings = pgTable("blood_pressure_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  systolic: integer("systolic").notNull(),
  diastolic: integer("diastolic").notNull(),
  source: varchar("source", { length: 50 }).default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("bp_client_date_idx").on(t.clientId, t.date)]);

export const temperatureReadings = pgTable("temperature_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  tempDeviation: real("temp_deviation").notNull(),
  source: varchar("source", { length: 50 }),
});

export const ketoneReadings = pgTable("ketone_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  timestamp: timestamp("timestamp").notNull(),
  valueMmol: real("value_mmol").notNull(),
  source: varchar("source", { length: 50 }),
});

// ======================== CLINICAL: LABS ========================
export const labOrders = pgTable("lab_orders", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  trainerId: uuid("trainer_id").references(() => users.id),
  provider: varchar("provider", { length: 50 }),
  panelName: varchar("panel_name", { length: 255 }),
  status: varchar("status", { length: 50 }).default("ordered"),
  orderedAt: timestamp("ordered_at").notNull().defaultNow(),
});

export const labResults = pgTable("lab_results", {
  id: uuid("id").primaryKey().defaultRandom(),
  orderId: uuid("order_id").references(() => labOrders.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  receivedAt: timestamp("received_at").defaultNow(),
  pdfUrl: text("pdf_url"),
  ocrStatus: varchar("ocr_status", { length: 50 }).default("pending"),
});

export const biomarkerValues = pgTable("biomarker_values", {
  id: uuid("id").primaryKey().defaultRandom(),
  resultId: uuid("result_id").notNull().references(() => labResults.id),
  biomarkerCode: varchar("biomarker_code", { length: 50 }).notNull(),
  value: real("value").notNull(),
  unit: varchar("unit", { length: 50 }),
  refLow: real("ref_low"),
  refHigh: real("ref_high"),
  status: varchar("status", { length: 20 }),
});

export const biomarkerDefinitions = pgTable("biomarker_definitions", {
  id: uuid("id").primaryKey().defaultRandom(),
  code: varchar("code", { length: 50 }).notNull().unique(),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  defaultRefLow: real("default_ref_low"),
  defaultRefHigh: real("default_ref_high"),
  unit: varchar("unit", { length: 50 }),
  description: text("description"),
});

// ======================== PROTOCOLS: SUPPLEMENTS & PEPTIDES ========================
export const supplementProtocols = pgTable("supplement_protocols", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  trainerId: uuid("trainer_id").references(() => users.id),
  isAiGenerated: boolean("is_ai_generated").default(false),
  version: integer("version").notNull().default(1),
  status: protocolStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const protocolItems = pgTable("protocol_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  protocolId: uuid("protocol_id").notNull().references(() => supplementProtocols.id),
  name: varchar("name", { length: 255 }).notNull(),
  category: protocolItemCategoryEnum("category").notNull(),
  dosage: varchar("dosage", { length: 100 }),
  unit: varchar("unit", { length: 50 }),
  form: varchar("form", { length: 50 }),
  route: varchar("route", { length: 50 }),
  frequency: varchar("frequency", { length: 50 }),
  timeOfDay: varchar("time_of_day", { length: 50 }),
  injectionSites: jsonb("injection_sites").$type<string[]>(),
  rationale: text("rationale"),
  coachNotes: text("coach_notes"),
});

export const adherenceLogs = pgTable("adherence_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  protocolItemId: uuid("protocol_item_id").notNull().references(() => protocolItems.id),
  date: date("date").notNull(),
  takenAt: timestamp("taken_at"),
  skipped: boolean("skipped").default(false),
  notes: text("notes"),
}, (t) => [index("adherence_client_date_idx").on(t.clientId, t.date)]);

export const injectionSiteLogs = pgTable("injection_site_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  protocolItemId: uuid("protocol_item_id").notNull().references(() => protocolItems.id),
  date: date("date").notNull(),
  siteCode: varchar("site_code", { length: 50 }),
  notes: text("notes"),
});

// ======================== WORKOUT & TRAINING ========================
export const exerciseLibrary = pgTable("exercise_library", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  muscleGroups: jsonb("muscle_groups").$type<string[]>().default([]),
  equipment: jsonb("equipment").$type<string[]>().default([]),
  videoUrl: text("video_url"),
  instructions: text("instructions"),
  isCustom: boolean("is_custom").default(false),
  createdBy: uuid("created_by").references(() => users.id),
});

export const workoutPrograms = pgTable("workout_programs", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id").references(() => users.id),
  isAiGenerated: boolean("is_ai_generated").default(false),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  durationWeeks: integer("duration_weeks"),
  schedule: jsonb("schedule").$type<Record<string, unknown>>(),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const workoutSessions = pgTable("workout_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  programId: uuid("program_id").notNull().references(() => workoutPrograms.id),
  dayNumber: integer("day_number").notNull(),
  name: varchar("name", { length: 255 }),
  exercises: jsonb("exercises").$type<{ exerciseId: string; sets: number; reps: string; tempo: string; restSeconds: number }[]>(),
});

export const workoutLogs = pgTable("workout_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  sessionId: uuid("session_id").references(() => workoutSessions.id),
  date: date("date").notNull(),
  exercisesCompleted: jsonb("exercises_completed").$type<{ exerciseId: string; sets: { weight: number; reps: number; rpe: number }[] }[]>(),
  notes: text("notes"),
}, (t) => [index("workout_log_client_idx").on(t.clientId, t.date)]);

export const clientWorkoutAssignments = pgTable("client_workout_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  programId: uuid("program_id").notNull().references(() => workoutPrograms.id),
  startDate: date("start_date").notNull(),
  status: varchar("status", { length: 20 }).default("active"),
});

// ======================== FASTING ========================
export const fastingProtocols = pgTable("fasting_protocols", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  trainerId: uuid("trainer_id").references(() => users.id),
  isAiGenerated: boolean("is_ai_generated").default(false),
  type: fastingTypeEnum("type").notNull(),
  feedingStartHour: integer("feeding_start_hour"),
  feedingEndHour: integer("feeding_end_hour"),
  activeDays: jsonb("active_days").$type<number[]>().default([0, 1, 2, 3, 4, 5, 6]),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const fastingLogs = pgTable("fasting_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  startedAt: timestamp("started_at"),
  endedAt: timestamp("ended_at"),
  completed: boolean("completed").default(false),
  metabolicZones: jsonb("metabolic_zones").$type<{ zone: string; durationMinutes: number }[]>(),
}, (t) => [index("fasting_client_date_idx").on(t.clientId, t.date)]);

// ======================== GOALS ========================
export const healthGoals = pgTable("health_goals", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  category: goalCategoryEnum("category").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  targetValue: real("target_value").notNull(),
  targetUnit: varchar("target_unit", { length: 50 }).notNull(),
  targetDirection: goalDirectionEnum("target_direction").notNull(),
  startValue: real("start_value").notNull(),
  currentValue: real("current_value").notNull(),
  status: goalStatusEnum("status").notNull().default("active"),
  timeframe: goalTimeframeEnum("timeframe").notNull(),
  startDate: date("start_date").notNull(),
  targetDate: date("target_date"),
  completedDate: date("completed_date"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("goals_client_status_idx").on(t.clientId, t.status)]);

export const goalMilestones = pgTable("goal_milestones", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull().references(() => healthGoals.id, { onDelete: "cascade" }),
  label: varchar("label", { length: 255 }).notNull(),
  targetValue: real("target_value").notNull(),
  reachedAt: timestamp("reached_at"),
  sortOrder: integer("sort_order").notNull().default(0),
});

export const goalCheckpoints = pgTable("goal_checkpoints", {
  id: uuid("id").primaryKey().defaultRandom(),
  goalId: uuid("goal_id").notNull().references(() => healthGoals.id, { onDelete: "cascade" }),
  value: real("value").notNull(),
  note: text("note"),
  source: varchar("source", { length: 20 }).notNull().default("manual"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("checkpoints_goal_idx").on(t.goalId)]);

// ======================== NUTRITION ========================
export const foodDatabase = pgTable("food_database", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 500 }).notNull(),
  brand: varchar("brand", { length: 255 }),
  barcode: varchar("barcode", { length: 50 }),
  servingSize: varchar("serving_size", { length: 100 }),
  calories: real("calories"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fiberG: real("fiber_g"),
  micronutrients: jsonb("micronutrients").$type<Record<string, number>>(),
  source: varchar("source", { length: 50 }).default("usda"),
  verified: boolean("verified").default(false),
}, (t) => [index("food_barcode_idx").on(t.barcode)]);

export const mealLogs = pgTable("meal_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  mealType: mealTypeEnum("meal_type").notNull(),
  items: jsonb("items").$type<{ foodId: string; name: string; quantity: number; unit: string; calories: number; protein: number; carbs: number; fat: number }[]>(),
  photoUrl: text("photo_url"),
  totalCalories: real("total_calories"),
  totalProtein: real("total_protein"),
  totalCarbs: real("total_carbs"),
  totalFat: real("total_fat"),
  totalFiber: real("total_fiber"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("meal_client_date_idx").on(t.clientId, t.date)]);

export const mealPlans = pgTable("meal_plans", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id").references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  isAiGenerated: boolean("is_ai_generated").default(false),
  name: varchar("name", { length: 255 }).notNull(),
  meals: jsonb("meals").$type<Record<string, unknown>>(),
  macroTargets: jsonb("macro_targets").$type<{ calories: number; protein: number; carbs: number; fat: number; fiber: number }>(),
  status: varchar("status", { length: 20 }).default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const mealTemplates = pgTable("meal_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  name: varchar("name", { length: 255 }).notNull(),
  items: jsonb("items").$type<{ foodId: string; name: string; quantity: number; unit: string }[]>(),
});

export const glycemicResponses = pgTable("glycemic_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  mealLogId: uuid("meal_log_id").notNull().references(() => mealLogs.id),
  peakGlucose: real("peak_glucose"),
  timeToPeakMinutes: integer("time_to_peak_minutes"),
  areaUnderCurve: real("area_under_curve"),
  baseline: real("baseline"),
});

// ======================== ENGAGEMENT ========================
export const dailyCheckins = pgTable("daily_checkins", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  // ── Vitals / Biofeedback ──
  weight: real("weight"),
  sleepHours: real("sleep_hours"),
  sleepQuality: integer("sleep_quality"),
  hrvScore: real("hrv_score"),
  readinessScore: integer("readiness_score"),
  steps: integer("steps"),
  // ── Nutrition ──
  plan: varchar("plan", { length: 100 }),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fiberG: real("fiber_g"),
  totalCalories: real("total_calories"),
  waterOz: real("water_oz"),
  electrolytes: boolean("electrolytes"),
  // ── Activity ──
  cardioMinutes: integer("cardio_minutes"),
  trainingType: varchar("training_type", { length: 50 }),
  trainingDescription: text("training_description"),
  // ── Wellness Scores (1-10) ──
  stress: integer("stress"),
  hunger: integer("hunger"),
  energy: integer("energy"),
  mood: integer("mood"),
  // ── GI / Bowel ──
  bmCount: integer("bm_count"),
  // ── Notes ──
  deviations: text("deviations"),
  notes: text("notes"),
  // ── Data sources ──
  dataSources: jsonb("data_sources").$type<Record<string, string>>().default({}),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (t) => [index("checkin_client_date_idx").on(t.clientId, t.date)]);

// Symptom Assessment — weekly, scored 0/1/4/8 per symptom across 11 categories
// Categories: Digestive, Joint, Mood, Adrenal, Skin, Eyes, Nose, Heart, Head, Weight/Food, Energy/Sleep, Mouth/Throat
export const symptomAssessments = pgTable("symptom_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  weekStart: date("week_start").notNull(),
  // Each category stores { symptomName: score } where score is 0, 1, 4, or 8
  digestive: jsonb("digestive").$type<Record<string, number>>().default({}),
  joint: jsonb("joint").$type<Record<string, number>>().default({}),
  mood: jsonb("mood_symptoms").$type<Record<string, number>>().default({}),
  adrenal: jsonb("adrenal").$type<Record<string, number>>().default({}),
  skin: jsonb("skin").$type<Record<string, number>>().default({}),
  eyes: jsonb("eyes").$type<Record<string, number>>().default({}),
  nose: jsonb("nose").$type<Record<string, number>>().default({}),
  heart: jsonb("heart").$type<Record<string, number>>().default({}),
  head: jsonb("head").$type<Record<string, number>>().default({}),
  weightFood: jsonb("weight_food").$type<Record<string, number>>().default({}),
  energySleep: jsonb("energy_sleep").$type<Record<string, number>>().default({}),
  mouthThroat: jsonb("mouth_throat").$type<Record<string, number>>().default({}),
  totalScore: integer("total_score"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (t) => [index("symptom_client_week_idx").on(t.clientId, t.weekStart)]);

export const progressPhotos = pgTable("progress_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  photoUrls: jsonb("photo_urls").$type<string[]>(),
  poseType: varchar("pose_type", { length: 20 }),
});

export const alerts = pgTable("alerts", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(),
  priority: alertPriorityEnum("priority").notNull(),
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  data: jsonb("data").$type<Record<string, unknown>>(),
  status: alertStatusEnum("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  acknowledgedAt: timestamp("acknowledged_at"),
  resolvedAt: timestamp("resolved_at"),
}, (t) => [
  index("alert_client_status_idx").on(t.clientId, t.status),
]);

export const alertResponses = pgTable("alert_responses", {
  id: uuid("id").primaryKey().defaultRandom(),
  alertId: uuid("alert_id").notNull().references(() => alerts.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  actionTaken: varchar("action_taken", { length: 100 }),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
  followUpResult: jsonb("follow_up_result").$type<Record<string, unknown>>(),
});

// ======================== CHAT ========================
export const conversations = pgTable("conversations", {
  id: uuid("id").primaryKey().defaultRandom(),
  trainerId: uuid("trainer_id").references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  isAiTrainer: boolean("is_ai_trainer").default(false),
  lastMessageAt: timestamp("last_message_at"),
  unreadCountTrainer: integer("unread_count_trainer").default(0),
  unreadCountClient: integer("unread_count_client").default(0),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderId: uuid("sender_id").references(() => users.id),
  senderRole: messageRoleEnum("sender_role").notNull().default("client"),
  isAiMessage: boolean("is_ai_message").default(false),
  body: text("body").notNull(),
  replyTo: uuid("reply_to"),
  readAt: timestamp("read_at"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("msg_conv_idx").on(t.conversationId, t.createdAt)]);

// ======================== DEVICES ========================
export const deviceConnections = pgTable("device_connections", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  provider: deviceProviderEnum("provider").notNull(),
  accessTokenEnc: text("access_token_enc"),
  refreshTokenEnc: text("refresh_token_enc"),
  scopes: jsonb("scopes").$type<string[]>(),
  status: deviceStatusEnum("status").notNull().default("disconnected"),
  lastSyncAt: timestamp("last_sync_at"),
  tokenExpiresAt: timestamp("token_expires_at"),
}, (t) => [index("device_client_provider_idx").on(t.clientId, t.provider)]);

export const syncLogs = pgTable("sync_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  deviceConnectionId: uuid("device_connection_id").notNull().references(() => deviceConnections.id),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
  recordsSynced: integer("records_synced").default(0),
  status: varchar("status", { length: 50 }).default("in_progress"),
  errorMessage: text("error_message"),
});

// ======================== MARKETPLACE & REVENUE ========================
export const trainerReviews = pgTable("trainer_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  rating: integer("rating").notNull(),
  reviewText: text("review_text"),
  coachResponse: text("coach_response"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  tier: tierEnum("tier"),
  stripeSubscriptionId: varchar("stripe_subscription_id", { length: 255 }),
  stripeCustomerId: varchar("stripe_customer_id", { length: 255 }),
  status: subscriptionStatusEnum("status").notNull().default("active"),
  currentPeriodEnd: timestamp("current_period_end"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const clientTransfers = pgTable("client_transfers", {
  id: varchar("id", { length: 20 }).primaryKey(), // CT-XXXX format
  fromTrainerId: uuid("from_trainer_id").notNull().references(() => users.id),
  toTrainerId: uuid("to_trainer_id").notNull().references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  status: transferStatusEnum("status").notNull().default("pending"),
  revenueSharePct: real("revenue_share_pct").default(25),
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
});

// ======================== APPOINTMENTS / SCHEDULING ========================
export const appointmentStatusEnum = pgEnum("appointment_status", [
  "pending", "confirmed", "in_progress", "completed", "cancelled", "no_show",
]);
export const meetingTypeEnum = pgEnum("meeting_type", ["video", "phone", "in_person"]);
export const sessionTypeEnum = pgEnum("session_type", [
  "initial_consultation", "follow_up", "protocol_review", "lab_review", "goal_setting", "ad_hoc",
]);

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id").notNull().references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  coachName: varchar("coach_name", { length: 255 }),
  clientName: varchar("client_name", { length: 255 }),
  sessionType: sessionTypeEnum("session_type").notNull().default("follow_up"),
  meetingType: meetingTypeEnum("meeting_type").notNull().default("video"),
  date: date("date").notNull(),
  startTime: varchar("start_time", { length: 5 }).notNull(), // "09:00"
  endTime: varchar("end_time", { length: 5 }),
  durationMinutes: integer("duration_minutes").default(60),
  status: appointmentStatusEnum("status").notNull().default("pending"),
  notes: text("notes"),
  cancellationReason: text("cancellation_reason"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("appt_coach_date_idx").on(t.coachId, t.date),
  index("appt_client_date_idx").on(t.clientId, t.date),
]);

export const sessionNotes = pgTable("session_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  appointmentId: uuid("appointment_id").notNull().references(() => appointments.id),
  coachId: uuid("coach_id").notNull().references(() => users.id),
  summary: text("summary"),
  keyFindings: jsonb("key_findings").$type<string[]>().default([]),
  actionItems: jsonb("action_items").$type<string[]>().default([]),
  nextSessionFocus: text("next_session_focus"),
  privateNotes: text("private_notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const coachAvailability = pgTable("coach_availability", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id").notNull().references(() => users.id).unique(),
  weeklySchedule: jsonb("weekly_schedule").$type<{
    dayOfWeek: number; enabled: boolean; slots: { start: string; end: string }[];
  }[]>(),
  bufferMinutes: integer("buffer_minutes").default(15),
  blockedDates: jsonb("blocked_dates").$type<string[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ======================== AI COACHING ========================
export const aiCoachingSessions = pgTable("ai_coaching_sessions", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  type: varchar("type", { length: 50 }).notNull(), // briefing, review, chat, protocol_gen, workout_gen
  input: jsonb("input").$type<Record<string, unknown>>(),
  output: jsonb("output").$type<Record<string, unknown>>(),
  model: varchar("model", { length: 100 }),
  tokensUsed: integer("tokens_used"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// ======================== AUDIT ========================
export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id),
  action: varchar("action", { length: 100 }).notNull(),
  resourceType: varchar("resource_type", { length: 100 }),
  resourceId: varchar("resource_id", { length: 255 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  ipAddress: varchar("ip_address", { length: 45 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [index("audit_user_idx").on(t.userId, t.createdAt)]);

// ======================== NOTIFICATIONS ========================
export const notifications = pgTable("notifications", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id),
  category: notifCategoryEnum("category").notNull(),
  priority: notifPriorityEnum("priority").notNull().default("normal"),
  title: varchar("title", { length: 500 }).notNull(),
  body: text("body").notNull(),
  actionUrl: varchar("action_url", { length: 500 }),
  actionLabel: varchar("action_label", { length: 100 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  channels: jsonb("channels").$type<string[]>().default([]),
  deliveryStatus: jsonb("delivery_status").$type<Record<string, string>>().default({}),
  read: boolean("read").notNull().default(false),
  readAt: timestamp("read_at"),
  archived: boolean("archived").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  expiresAt: timestamp("expires_at"),
}, (t) => [
  index("notif_user_created_idx").on(t.userId, t.createdAt),
  index("notif_user_read_idx").on(t.userId, t.read),
]);

export const notificationPreferences = pgTable("notification_preferences", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull().references(() => users.id).unique(),
  enabled: boolean("enabled").notNull().default(true),
  quietHoursStart: varchar("quiet_hours_start", { length: 5 }), // "22:00"
  quietHoursEnd: varchar("quiet_hours_end", { length: 5 }),     // "07:00"
  categories: jsonb("categories").$type<Record<string, { in_app: boolean; email: boolean; push: boolean; sms: boolean }>>(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// ─── Coach Notes ──────────────────────────────────────────────────
export const coachNotes = pgTable("coach_notes", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  coachId: uuid("coach_id").notNull().references(() => users.id),
  content: text("content").notNull(),
  pinned: boolean("pinned").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("coach_notes_client_idx").on(t.clientId, t.createdAt),
  index("coach_notes_coach_idx").on(t.coachId),
]);

// ======================== DAILY CHECK-IN: BLOOD SUGAR ========================
export const bloodSugarReadings = pgTable("blood_sugar_readings", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  date: date("date").notNull(),
  timing: bloodSugarTimingEnum("timing").notNull(),
  valueMgdl: real("value_mgdl").notNull(),
  mealDescription: text("meal_description"),     // what was eaten before measurement
  mealLogId: uuid("meal_log_id").references(() => mealLogs.id),
  source: varchar("source", { length: 50 }).default("manual"),  // manual | dexcom
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("bs_client_date_idx").on(t.clientId, t.date),
]);

// ======================== DAILY CHECK-IN: CYCLE DATA ========================
export const cycleData = pgTable("cycle_data", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  startDate: date("start_date").notNull(),
  cycleLength: integer("cycle_length"),           // in days
  periodLength: integer("period_length"),         // in days
  flowIntensity: varchar("flow_intensity", { length: 20 }),  // light | moderate | heavy
  symptoms: jsonb("symptoms").$type<string[]>().default([]),  // cramps, bloating, etc.
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("cycle_client_date_idx").on(t.clientId, t.startDate),
]);

// ======================== TRAINER: CHECK-IN PRIORITIES ========================
// Trainers can configure which check-in sections a client sees first and which are enabled
export const checkinPriorities = pgTable("checkin_priorities", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  trainerId: uuid("trainer_id").notNull().references(() => users.id),
  // Ordered array of section keys that should appear first / highlighted
  prioritySections: jsonb("priority_sections").$type<string[]>().default([]),
  // Which sections are enabled for this client (null = all enabled)
  enabledSections: jsonb("enabled_sections").$type<string[]>(),
  // Custom prompts the trainer wants the client to answer
  customPrompts: jsonb("custom_prompts").$type<{ label: string; type: "text" | "number" | "boolean" }[]>().default([]),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("checkin_prio_client_idx").on(t.clientId),
]);

// ======================== DAILY CHECK-IN: MEAL PHOTOS ========================
export const mealPhotos = pgTable("meal_photos", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  mealLogId: uuid("meal_log_id").references(() => mealLogs.id),
  checkinId: uuid("checkin_id").references(() => dailyCheckins.id),
  photoUrl: text("photo_url").notNull(),
  mealType: mealTypeEnum("meal_type"),
  aiAnalysis: jsonb("ai_analysis").$type<{
    estimatedCalories?: number;
    estimatedProtein?: number;
    estimatedCarbs?: number;
    estimatedFat?: number;
    foodItems?: string[];
    confidence?: number;
  }>(),
  notes: text("notes"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("meal_photo_client_idx").on(t.clientId, t.createdAt),
]);

// ======================== GENETICS ========================
export const geneticProfiles = pgTable("genetic_profiles", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  uploadType: varchar("upload_type", { length: 50 }),
  sourceUrl: text("source_url"),
  sourceFileName: varchar("source_file_name", { length: 255 }),
  rawData: jsonb("raw_data").$type<Record<string, unknown>>(),
  status: varchar("status", { length: 50 }).notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [
  index("genetic_profiles_client_idx").on(t.clientId),
]);

export const geneticMarkers = pgTable("genetic_markers", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => geneticProfiles.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  section: varchar("section", { length: 100 }),
  gene: varchar("gene", { length: 50 }).notNull(),
  rsId: varchar("rs_id", { length: 50 }),
  pathway: text("pathway"),
  function: text("function"),
  mutation: text("mutation"),
  symptoms: text("symptoms"),
  supplementProtocol: text("supplement_protocol"),
  peptideSupport: text("peptide_support"),
  dietStrategy: text("diet_strategy"),
  lifestyleStrategy: text("lifestyle_strategy"),
  labTests: text("lab_tests"),
  clinicalPriority: varchar("clinical_priority", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("genetic_markers_profile_idx").on(t.profileId),
  index("genetic_markers_client_idx").on(t.clientId),
]);

export const geneticPathwayScores = pgTable("genetic_pathway_scores", {
  id: uuid("id").primaryKey().defaultRandom(),
  profileId: uuid("profile_id").notNull().references(() => geneticProfiles.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  pathway: varchar("pathway", { length: 100 }).notNull(),
  genesInPathway: text("genes_in_pathway"),
  genesAffected: integer("genes_affected").default(0),
  homozygousCount: integer("homozygous_count").default(0),
  heterozygousCount: integer("heterozygous_count").default(0),
  priorityLevel: varchar("priority_level", { length: 20 }),
  createdAt: timestamp("created_at").notNull().defaultNow(),
}, (t) => [
  index("genetic_pathway_scores_profile_idx").on(t.profileId),
  index("genetic_pathway_scores_client_idx").on(t.clientId),
]);

// ======================== CONTENT MANAGEMENT ========================
export const contentCategoryEnum = pgEnum("content_category", ["protocols", "articles", "videos", "guides"]);
export const contentStatusEnum = pgEnum("content_status", ["published", "draft", "review", "archived"]);

export const contentItems = pgTable("content_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  title: varchar("title", { length: 500 }).notNull(),
  category: contentCategoryEnum("category").notNull(),
  authorId: uuid("author_id").references(() => users.id),
  authorName: varchar("author_name", { length: 200 }),
  status: contentStatusEnum("status").default("draft").notNull(),
  thumbnail: varchar("thumbnail", { length: 500 }),
  viewCount: integer("view_count").default(0).notNull(),
  body: text("body"),
  publishDate: timestamp("publish_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ======================== KNOWLEDGE BASE ========================
export const referenceCategoryEnum = pgEnum("reference_category", ["clinical_studies", "supplement_database", "lab_ranges", "protocol_templates", "dosage_guidelines"]);

export const referenceItems = pgTable("reference_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  title: varchar("title", { length: 500 }).notNull(),
  source: varchar("source", { length: 300 }).notNull(),
  year: integer("year").notNull(),
  category: referenceCategoryEnum("category").notNull(),
  relevanceTags: jsonb("relevance_tags").$type<string[]>().default([]),
  summary: text("summary"),
  citationCount: integer("citation_count").default(0).notNull(),
  url: varchar("url", { length: 1000 }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

// ======================== PLATFORM SETTINGS ========================
export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  key: varchar("key", { length: 100 }).notNull(),
  value: jsonb("value").$type<Record<string, unknown>>().notNull(),
  updatedBy: uuid("updated_by").references(() => users.id),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("platform_settings_company_key_idx").on(t.companyId, t.key)]);

// ======================== MARKETPLACE ========================
export const marketplaceItemTypeEnum = pgEnum("marketplace_item_type", ["protocol", "program", "supplement_stack", "assessment"]);
export const marketplaceStatusEnum = pgEnum("marketplace_status", ["active", "draft", "archived"]);

export const marketplaceItems = pgTable("marketplace_items", {
  id: uuid("id").primaryKey().defaultRandom(),
  companyId: uuid("company_id").references(() => companies.id),
  createdBy: uuid("created_by").references(() => users.id),
  title: varchar("title", { length: 300 }).notNull(),
  description: text("description"),
  type: marketplaceItemTypeEnum("type").notNull(),
  status: marketplaceStatusEnum("status").default("draft").notNull(),
  priceInCents: integer("price_in_cents").default(0).notNull(),
  currency: varchar("currency", { length: 3 }).default("USD").notNull(),
  imageUrl: varchar("image_url", { length: 500 }),
  metadata: jsonb("metadata").$type<Record<string, unknown>>().default({}),
  purchaseCount: integer("purchase_count").default(0).notNull(),
  rating: real("rating"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});
