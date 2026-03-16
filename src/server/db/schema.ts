import {
  pgTable, uuid, text, varchar, integer, boolean, timestamp, date, real, jsonb, pgEnum, decimal, index,
} from "drizzle-orm/pg-core";

// ======================== ENUMS ========================
export const userRoleEnum = pgEnum("user_role", ["client", "coach", "admin"]);
export const userStatusEnum = pgEnum("user_status", ["active", "inactive", "suspended", "onboarding"]);
export const tierEnum = pgEnum("tier", ["tier1", "tier2", "tier3"]);
export const alertPriorityEnum = pgEnum("alert_priority", ["urgent", "action", "info"]);
export const alertStatusEnum = pgEnum("alert_status", ["active", "acknowledged", "resolved", "dismissed"]);
export const protocolStatusEnum = pgEnum("protocol_status", ["active", "proposed", "archived"]);
export const protocolItemCategoryEnum = pgEnum("protocol_item_category", ["supplement", "medication", "peptide", "injection"]);
export const deviceProviderEnum = pgEnum("device_provider", ["oura", "apple_health", "dexcom", "garmin", "whoop", "withings"]);
export const deviceStatusEnum = pgEnum("device_status", ["connected", "disconnected", "error", "syncing"]);
export const transferStatusEnum = pgEnum("transfer_status", ["pending", "accepted", "declined", "completed"]);
export const subscriptionStatusEnum = pgEnum("subscription_status", ["active", "past_due", "canceled", "trialing"]);
export const mealTypeEnum = pgEnum("meal_type", ["breakfast", "lunch", "dinner", "snack"]);
export const fastingTypeEnum = pgEnum("fasting_type", ["16_8", "20_4", "36hr", "omad", "custom"]);

// ======================== CORE: USERS & ROLES ========================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  clerkId: varchar("clerk_id", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  firstName: varchar("first_name", { length: 100 }),
  lastName: varchar("last_name", { length: 100 }),
  avatarUrl: text("avatar_url"),
  role: userRoleEnum("role").notNull().default("client"),
  status: userStatusEnum("status").notNull().default("onboarding"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
}, (t) => [index("users_clerk_idx").on(t.clerkId)]);

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

export const coachProfiles = pgTable("coach_profiles", {
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

export const coachClientRelationships = pgTable("coach_client_relationships", {
  id: uuid("id").primaryKey().defaultRandom(),
  coachId: uuid("coach_id").notNull().references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  startedAt: timestamp("started_at").notNull().defaultNow(),
  transferredFrom: uuid("transferred_from"),
}, (t) => [
  index("ccr_coach_idx").on(t.coachId),
  index("ccr_client_idx").on(t.clientId),
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
  source: varchar("source", { length: 50 }),
});

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
  coachId: uuid("coach_id").references(() => users.id),
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
  coachId: uuid("coach_id").references(() => users.id),
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
  coachId: uuid("coach_id").references(() => users.id),
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
  coachId: uuid("coach_id").references(() => users.id),
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
  coachId: uuid("coach_id").references(() => users.id),
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
  weight: real("weight"),
  proteinG: real("protein_g"),
  carbsG: real("carbs_g"),
  fatG: real("fat_g"),
  fiberG: real("fiber_g"),
  waterOz: real("water_oz"),
  trainingType: varchar("training_type", { length: 50 }),
  stress: integer("stress"),
  hunger: integer("hunger"),
  energy: integer("energy"),
  sleepQuality: integer("sleep_quality"),
  bmCount: integer("bm_count"),
  deviations: text("deviations"),
  notes: text("notes"),
  submittedAt: timestamp("submitted_at").defaultNow(),
}, (t) => [index("checkin_client_date_idx").on(t.clientId, t.date)]);

export const symptomAssessments = pgTable("symptom_assessments", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  weekStart: date("week_start").notNull(),
  responses: jsonb("responses").$type<Record<string, number>>(),
  submittedAt: timestamp("submitted_at").defaultNow(),
});

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
  coachId: uuid("coach_id").references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  isAiCoach: boolean("is_ai_coach").default(false),
  lastMessageAt: timestamp("last_message_at"),
  unreadCountCoach: integer("unread_count_coach").default(0),
  unreadCountClient: integer("unread_count_client").default(0),
});

export const messages = pgTable("messages", {
  id: uuid("id").primaryKey().defaultRandom(),
  conversationId: uuid("conversation_id").notNull().references(() => conversations.id),
  senderId: uuid("sender_id").references(() => users.id),
  isAiMessage: boolean("is_ai_message").default(false),
  body: text("body").notNull(),
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
export const coachReviews = pgTable("coach_reviews", {
  id: uuid("id").primaryKey().defaultRandom(),
  clientId: uuid("client_id").notNull().references(() => users.id),
  coachId: uuid("coach_id").notNull().references(() => users.id),
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
  fromCoachId: uuid("from_coach_id").notNull().references(() => users.id),
  toCoachId: uuid("to_coach_id").notNull().references(() => users.id),
  clientId: uuid("client_id").notNull().references(() => users.id),
  status: transferStatusEnum("status").notNull().default("pending"),
  revenueSharePct: real("revenue_share_pct").default(25),
  initiatedAt: timestamp("initiated_at").notNull().defaultNow(),
  completedAt: timestamp("completed_at"),
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
