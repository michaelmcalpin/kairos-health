import { describe, it, expect } from "vitest";
import {
  glucoseReadingSchema,
  sleepRecordSchema,
  nutritionLogSchema,
  workoutLogSchema,
  checkinSchema,
  profileUpdateSchema,
  emailSchema,
  passwordSchema,
  measurementSchema,
} from "../schemas";

describe("Email Validation", () => {
  it("accepts valid emails", () => {
    expect(emailSchema.safeParse("user@example.com").success).toBe(true);
    expect(emailSchema.safeParse("user+tag@example.co.uk").success).toBe(true);
  });

  it("rejects invalid emails", () => {
    expect(emailSchema.safeParse("not-an-email").success).toBe(false);
    expect(emailSchema.safeParse("@missing.com").success).toBe(false);
    expect(emailSchema.safeParse("").success).toBe(false);
  });
});

describe("Password Validation", () => {
  it("accepts strong passwords", () => {
    expect(passwordSchema.safeParse("SecurePass1").success).toBe(true);
    expect(passwordSchema.safeParse("MyStr0ngP@ss").success).toBe(true);
  });

  it("rejects weak passwords", () => {
    expect(passwordSchema.safeParse("short1A").success).toBe(false); // too short
    expect(passwordSchema.safeParse("nouppercase1").success).toBe(false);
    expect(passwordSchema.safeParse("NOLOWERCASE1").success).toBe(false);
    expect(passwordSchema.safeParse("NoNumbers").success).toBe(false);
  });
});

describe("Glucose Reading Schema", () => {
  it("validates correct glucose reading", () => {
    const result = glucoseReadingSchema.safeParse({
      value: 105,
      unit: "mg/dL",
      timestamp: "2024-03-15T10:30:00Z",
      source: "dexcom",
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range values", () => {
    expect(glucoseReadingSchema.safeParse({ value: 10, timestamp: "2024-03-15T10:00:00Z" }).success).toBe(false);
    expect(glucoseReadingSchema.safeParse({ value: 700, timestamp: "2024-03-15T10:00:00Z" }).success).toBe(false);
  });

  it("applies default values", () => {
    const result = glucoseReadingSchema.parse({
      value: 100,
      timestamp: "2024-03-15T10:00:00Z",
    });
    expect(result.unit).toBe("mg/dL");
    expect(result.source).toBe("manual");
  });
});

describe("Sleep Record Schema", () => {
  it("validates correct sleep record", () => {
    const result = sleepRecordSchema.safeParse({
      date: "2024-03-15",
      bedtime: "2024-03-14T22:30:00Z",
      wakeTime: "2024-03-15T06:30:00Z",
      totalMinutes: 480,
      deepMinutes: 96,
      remMinutes: 108,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid duration", () => {
    expect(
      sleepRecordSchema.safeParse({
        date: "2024-03-15",
        bedtime: "2024-03-14T22:30:00Z",
        wakeTime: "2024-03-15T06:30:00Z",
        totalMinutes: 2000, // > 1440
      }).success
    ).toBe(false);
  });
});

describe("Nutrition Log Schema", () => {
  it("validates correct nutrition entry", () => {
    const result = nutritionLogSchema.safeParse({
      date: "2024-03-15",
      mealType: "lunch",
      description: "Grilled chicken salad with quinoa",
      calories: 650,
      protein: 45,
      carbs: 55,
      fat: 22,
    });
    expect(result.success).toBe(true);
  });

  it("rejects invalid meal type", () => {
    expect(
      nutritionLogSchema.safeParse({
        date: "2024-03-15",
        mealType: "brunch",
        description: "Test",
        calories: 500,
      }).success
    ).toBe(false);
  });
});

describe("Workout Log Schema", () => {
  it("validates workout with exercises", () => {
    const result = workoutLogSchema.safeParse({
      date: "2024-03-15",
      type: "strength",
      name: "Upper Body Push",
      durationMinutes: 60,
      exercises: [
        {
          name: "Bench Press",
          sets: [
            { reps: 8, weight: 185, rpe: 7 },
            { reps: 8, weight: 185, rpe: 8 },
          ],
        },
      ],
    });
    expect(result.success).toBe(true);
  });
});

describe("Check-in Schema", () => {
  it("validates daily check-in", () => {
    const result = checkinSchema.safeParse({
      date: "2024-03-15",
      energyLevel: 7,
      stressLevel: 4,
      moodScore: 8,
      sleepQuality: 7,
      notes: "Felt great today",
    });
    expect(result.success).toBe(true);
  });

  it("rejects out-of-range scores", () => {
    expect(
      checkinSchema.safeParse({
        date: "2024-03-15",
        energyLevel: 11, // max 10
        stressLevel: 5,
        moodScore: 5,
        sleepQuality: 5,
      }).success
    ).toBe(false);
  });
});

describe("Profile Update Schema", () => {
  it("validates profile update", () => {
    const result = profileUpdateSchema.safeParse({
      firstName: "Sarah",
      lastName: "Chen",
      email: "sarah@example.com",
    });
    expect(result.success).toBe(true);
  });

  it("trims whitespace from names", () => {
    const result = profileUpdateSchema.parse({
      firstName: "  Sarah  ",
      lastName: "  Chen  ",
      email: "sarah@example.com",
    });
    expect(result.firstName).toBe("Sarah");
    expect(result.lastName).toBe("Chen");
  });
});

describe("Measurement Schema", () => {
  it("validates body measurements", () => {
    const result = measurementSchema.safeParse({
      date: "2024-03-15",
      weight: 175.5,
      bodyFat: 18.5,
      restingHR: 62,
      hrv: 52,
      systolicBP: 118,
      diastolicBP: 76,
    });
    expect(result.success).toBe(true);
  });

  it("rejects unrealistic values", () => {
    expect(
      measurementSchema.safeParse({
        date: "2024-03-15",
        weight: 10, // too low
      }).success
    ).toBe(false);
  });
});
