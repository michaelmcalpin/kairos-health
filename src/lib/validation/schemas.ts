/**
 * KAIROS Zod Validation Schemas
 *
 * Shared validation schemas used in both client-side forms
 * and server-side tRPC input validation.
 */

import { z } from "zod";

// ─── Common Field Validators ────────────────────────────────────────────────

export const emailSchema = z.string().email("Please enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(128, "Password must be less than 128 characters")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number");

export const nameSchema = z
  .string()
  .min(1, "Name is required")
  .max(100, "Name must be less than 100 characters")
  .trim();

export const phoneSchema = z
  .string()
  .regex(/^\+?[1-9]\d{7,14}$/, "Please enter a valid phone number")
  .optional();

export const dateStringSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format");

export const uuidSchema = z.string().uuid("Invalid ID format");

// ─── Health Metric Schemas ──────────────────────────────────────────────────

export const glucoseReadingSchema = z.object({
  value: z.number().min(20, "Glucose too low to be valid").max(600, "Glucose too high to be valid"),
  unit: z.enum(["mg/dL", "mmol/L"]).default("mg/dL"),
  timestamp: z.string().datetime("Invalid timestamp"),
  source: z.string().max(50).default("manual"),
  notes: z.string().max(500).optional(),
});

export const sleepRecordSchema = z.object({
  date: dateStringSchema,
  bedtime: z.string().datetime("Invalid bedtime"),
  wakeTime: z.string().datetime("Invalid wake time"),
  totalMinutes: z.number().min(0).max(1440),
  deepMinutes: z.number().min(0).max(720).optional(),
  remMinutes: z.number().min(0).max(720).optional(),
  lightMinutes: z.number().min(0).max(720).optional(),
  awakeMinutes: z.number().min(0).max(480).optional(),
  score: z.number().min(0).max(100).optional(),
  source: z.string().max(50).default("manual"),
});

export const measurementSchema = z.object({
  date: dateStringSchema,
  weight: z.number().min(50, "Weight seems too low").max(1000, "Weight seems too high").optional(),
  bodyFat: z.number().min(1).max(80).optional(),
  muscleMass: z.number().min(10).max(300).optional(),
  waistCircumference: z.number().min(15).max(80).optional(),
  systolicBP: z.number().min(60).max(250).optional(),
  diastolicBP: z.number().min(30).max(150).optional(),
  restingHR: z.number().min(25).max(220).optional(),
  hrv: z.number().min(1).max(300).optional(),
});

export const nutritionLogSchema = z.object({
  date: dateStringSchema,
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  description: z.string().min(1).max(500),
  calories: z.number().min(0).max(10000),
  protein: z.number().min(0).max(500).optional(),
  carbs: z.number().min(0).max(1000).optional(),
  fat: z.number().min(0).max(500).optional(),
  fiber: z.number().min(0).max(200).optional(),
  water: z.number().min(0).max(20).optional(), // liters
});

export const workoutLogSchema = z.object({
  date: dateStringSchema,
  type: z.enum([
    "strength", "cardio", "hiit", "yoga", "pilates",
    "swimming", "cycling", "running", "walking", "other",
  ]),
  name: z.string().min(1).max(200),
  durationMinutes: z.number().min(1).max(600),
  caloriesBurned: z.number().min(0).max(5000).optional(),
  avgHeartRate: z.number().min(30).max(220).optional(),
  maxHeartRate: z.number().min(30).max(250).optional(),
  notes: z.string().max(1000).optional(),
  exercises: z.array(z.object({
    name: z.string().min(1).max(200),
    sets: z.array(z.object({
      reps: z.number().min(0).max(1000).optional(),
      weight: z.number().min(0).max(2000).optional(),
      duration: z.number().min(0).max(3600).optional(), // seconds
      rpe: z.number().min(1).max(10).optional(),
    })),
  })).optional(),
});

export const supplementLogSchema = z.object({
  date: dateStringSchema,
  items: z.array(z.object({
    name: z.string().min(1).max(200),
    dosage: z.string().max(100),
    taken: z.boolean(),
    timeOfDay: z.enum(["morning", "afternoon", "evening", "bedtime"]),
  })),
});

export const fastingLogSchema = z.object({
  date: dateStringSchema,
  protocol: z.enum(["16:8", "18:6", "20:4", "OMAD", "36h", "custom"]),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  targetHours: z.number().min(4).max(72),
  completed: z.boolean().default(false),
  notes: z.string().max(500).optional(),
});

export const checkinSchema = z.object({
  date: dateStringSchema,
  energyLevel: z.number().min(1).max(10),
  stressLevel: z.number().min(1).max(10),
  moodScore: z.number().min(1).max(10),
  sleepQuality: z.number().min(1).max(10),
  digestiveHealth: z.number().min(1).max(10).optional(),
  painLevel: z.number().min(0).max(10).optional(),
  notes: z.string().max(2000).optional(),
  symptoms: z.array(z.string().max(100)).optional(),
});

// ─── Profile & Settings Schemas ─────────────────────────────────────────────

export const profileUpdateSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: phoneSchema,
  dateOfBirth: dateStringSchema.optional(),
  timezone: z.string().max(50).optional(),
  units: z.enum(["imperial", "metric"]).default("imperial"),
});

export const clientGoalsSchema = z.object({
  glucoseTarget: z.object({
    low: z.number().min(50).max(100).default(70),
    high: z.number().min(100).max(200).default(140),
  }).optional(),
  sleepTarget: z.number().min(300).max(720).default(480), // minutes
  stepsTarget: z.number().min(1000).max(50000).default(10000),
  waterTarget: z.number().min(0.5).max(10).default(3), // liters
  calorieTarget: z.number().min(800).max(8000).optional(),
  proteinTarget: z.number().min(20).max(500).optional(),
  weightGoal: z.object({
    target: z.number().min(50).max(1000),
    unit: z.enum(["lbs", "kg"]).default("lbs"),
  }).optional(),
});

// ─── Coach Schemas ──────────────────────────────────────────────────────────

export const coachNoteSchema = z.object({
  clientId: uuidSchema,
  content: z.string().min(1, "Note content is required").max(5000),
  category: z.enum(["general", "nutrition", "training", "labs", "supplement", "followup"]),
  isPrivate: z.boolean().default(false),
});

export const appointmentSchema = z.object({
  clientId: uuidSchema,
  startTime: z.string().datetime(),
  endTime: z.string().datetime(),
  type: z.enum(["initial_consultation", "followup", "lab_review", "nutrition_review", "ad_hoc"]),
  location: z.enum(["video", "phone", "in_person"]).default("video"),
  notes: z.string().max(2000).optional(),
});

// ─── Type Exports ───────────────────────────────────────────────────────────

export type GlucoseReadingInput = z.infer<typeof glucoseReadingSchema>;
export type SleepRecordInput = z.infer<typeof sleepRecordSchema>;
export type MeasurementInput = z.infer<typeof measurementSchema>;
export type NutritionLogInput = z.infer<typeof nutritionLogSchema>;
export type WorkoutLogInput = z.infer<typeof workoutLogSchema>;
export type SupplementLogInput = z.infer<typeof supplementLogSchema>;
export type FastingLogInput = z.infer<typeof fastingLogSchema>;
export type CheckinInput = z.infer<typeof checkinSchema>;
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type ClientGoalsInput = z.infer<typeof clientGoalsSchema>;
export type CoachNoteInput = z.infer<typeof coachNoteSchema>;
export type AppointmentInput = z.infer<typeof appointmentSchema>;
