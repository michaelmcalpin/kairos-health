/**
 * KAIROS Database Seed Script
 *
 * Usage: npx tsx src/server/db/seed.ts
 *
 * Seeds the database with realistic demo data:
 *   - 2 admins, 3 coaches, 8 clients
 *   - 30 days of glucose, sleep, heart rate, HRV data per client
 *   - Supplement protocols with adherence logs
 *   - Fasting protocols with daily logs
 *   - Meal logs, workout logs, daily check-ins
 *   - Lab orders with biomarker results
 *   - Coach-client relationships, subscriptions
 *   - Alerts, conversations, audit logs
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("DATABASE_URL environment variable is required");
  process.exit(1);
}

const client = postgres(connectionString, { max: 1 });
const db = drizzle(client, { schema });

// ─── Helpers ─────────────────────────────────────────────

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(0, 0, 0, 0);
  return d;
}

function dateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function pick<T>(arr: T[], seed?: number): T {
  const idx = Math.floor(seed !== undefined ? seededRandom(seed) * arr.length : Math.random() * arr.length);
  return arr[idx];
}

// ─── User Data ───────────────────────────────────────────

const ADMINS = [
  { firstName: "Michael", lastName: "McAlpin", email: "michael@kairos.health" },
  { firstName: "Admin", lastName: "System", email: "admin@kairos.health" },
];

const COACHES = [
  { firstName: "Sarah", lastName: "Williams", email: "sarah.williams@kairos.health", bio: "Board-certified naturopathic physician specializing in metabolic health and longevity medicine.", specialties: ["Metabolic Health", "Longevity", "Hormone Optimization"], credentials: ["ND", "CNS", "IFMCP"], rate: 499 },
  { firstName: "Mike", lastName: "Torres", email: "mike.torres@kairos.health", bio: "Former professional athlete turned performance health coach with 15 years of experience in strength training and nutrition.", specialties: ["Performance", "Strength Training", "Sports Nutrition"], credentials: ["CSCS", "PN-L2", "CPT"], rate: 349 },
  { firstName: "Jennifer", lastName: "Chang", email: "jennifer.chang@kairos.health", bio: "Functional medicine practitioner focused on gut health, autoimmunity, and stress resilience.", specialties: ["Gut Health", "Autoimmunity", "Stress Management"], credentials: ["MD", "IFMCP", "RYT-200"], rate: 499 },
];

const CLIENTS = [
  { firstName: "Sarah", lastName: "Chen", email: "sarah.chen@demo.com", tier: "tier1" as const, coachIdx: 0, gender: "female", heightInches: 65, goals: ["Optimize metabolic health", "Improve sleep quality"] },
  { firstName: "James", lastName: "Miller", email: "james.miller@demo.com", tier: "tier1" as const, coachIdx: 0, gender: "male", heightInches: 72, goals: ["Build lean muscle", "Reduce inflammation"] },
  { firstName: "Emily", lastName: "Rodriguez", email: "emily.rodriguez@demo.com", tier: "tier2" as const, coachIdx: 1, gender: "female", heightInches: 64, goals: ["Weight management", "Energy optimization"] },
  { firstName: "Michael", lastName: "Park", email: "michael.park@demo.com", tier: "tier2" as const, coachIdx: 1, gender: "male", heightInches: 70, goals: ["Athletic performance", "Recovery"] },
  { firstName: "Lisa", lastName: "Thompson", email: "lisa.thompson@demo.com", tier: "tier1" as const, coachIdx: 2, gender: "female", heightInches: 66, goals: ["Hormone balance", "Gut health"] },
  { firstName: "David", lastName: "Kim", email: "david.kim@demo.com", tier: "tier3" as const, coachIdx: 1, gender: "male", heightInches: 68, goals: ["General health", "Stress reduction"] },
  { firstName: "Anna", lastName: "Wright", email: "anna.wright@demo.com", tier: "tier2" as const, coachIdx: 2, gender: "female", heightInches: 63, goals: ["Longevity", "Brain health"] },
  { firstName: "Robert", lastName: "Lee", email: "robert.lee@demo.com", tier: "tier3" as const, coachIdx: 0, gender: "male", heightInches: 71, goals: ["Weight loss", "Blood sugar control"] },
];

const SUPPLEMENTS = [
  { name: "Vitamin D3", category: "supplement" as const, dosage: "5000", unit: "IU", form: "softgel", frequency: "daily", timeOfDay: "morning" },
  { name: "Omega-3 Fish Oil", category: "supplement" as const, dosage: "2000", unit: "mg", form: "softgel", frequency: "daily", timeOfDay: "morning" },
  { name: "Magnesium Glycinate", category: "supplement" as const, dosage: "400", unit: "mg", form: "capsule", frequency: "daily", timeOfDay: "evening" },
  { name: "NAC", category: "supplement" as const, dosage: "600", unit: "mg", form: "capsule", frequency: "daily", timeOfDay: "morning" },
  { name: "CoQ10", category: "supplement" as const, dosage: "200", unit: "mg", form: "softgel", frequency: "daily", timeOfDay: "morning" },
  { name: "Ashwagandha", category: "supplement" as const, dosage: "600", unit: "mg", form: "capsule", frequency: "daily", timeOfDay: "evening" },
  { name: "Vitamin K2 MK-7", category: "supplement" as const, dosage: "200", unit: "mcg", form: "softgel", frequency: "daily", timeOfDay: "morning" },
  { name: "Creatine Monohydrate", category: "supplement" as const, dosage: "5", unit: "g", form: "powder", frequency: "daily", timeOfDay: "morning" },
  { name: "Melatonin", category: "supplement" as const, dosage: "0.5", unit: "mg", form: "sublingual", frequency: "daily", timeOfDay: "bedtime" },
];

const BIOMARKERS = [
  { code: "GLUCOSE_FASTING", name: "Fasting Glucose", category: "metabolic", unit: "mg/dL", refLow: 70, refHigh: 100 },
  { code: "HBA1C", name: "Hemoglobin A1C", category: "metabolic", unit: "%", refLow: 4.0, refHigh: 5.6 },
  { code: "TOTAL_CHOL", name: "Total Cholesterol", category: "lipids", unit: "mg/dL", refLow: 125, refHigh: 200 },
  { code: "LDL", name: "LDL Cholesterol", category: "lipids", unit: "mg/dL", refLow: 0, refHigh: 100 },
  { code: "HDL", name: "HDL Cholesterol", category: "lipids", unit: "mg/dL", refLow: 40, refHigh: 100 },
  { code: "TRIGLYCERIDES", name: "Triglycerides", category: "lipids", unit: "mg/dL", refLow: 0, refHigh: 150 },
  { code: "TESTOSTERONE", name: "Total Testosterone", category: "hormones", unit: "ng/dL", refLow: 300, refHigh: 1000 },
  { code: "TSH", name: "Thyroid Stimulating Hormone", category: "hormones", unit: "mIU/L", refLow: 0.4, refHigh: 4.0 },
  { code: "CRP", name: "C-Reactive Protein", category: "inflammation", unit: "mg/L", refLow: 0, refHigh: 3.0 },
  { code: "VITAMIN_D", name: "Vitamin D (25-OH)", category: "vitamins", unit: "ng/mL", refLow: 30, refHigh: 100 },
  { code: "B12", name: "Vitamin B12", category: "vitamins", unit: "pg/mL", refLow: 200, refHigh: 900 },
  { code: "FERRITIN", name: "Ferritin", category: "minerals", unit: "ng/mL", refLow: 20, refHigh: 300 },
  { code: "FASTING_INSULIN", name: "Fasting Insulin", category: "metabolic", unit: "uIU/mL", refLow: 2.6, refHigh: 24.9 },
  { code: "HOMOCYSTEINE", name: "Homocysteine", category: "inflammation", unit: "umol/L", refLow: 0, refHigh: 15 },
  { code: "DHEA_S", name: "DHEA-Sulfate", category: "hormones", unit: "ug/dL", refLow: 100, refHigh: 400 },
  { code: "FREE_T3", name: "Free T3", category: "hormones", unit: "pg/mL", refLow: 2.0, refHigh: 4.4 },
];

const WORKOUT_TYPES = ["Strength Training", "Running", "HIIT", "Yoga", "Cycling", "Swimming"];
const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;

// ─── Seed Functions ──────────────────────────────────────

async function seedUsers() {
  console.log("  Seeding users...");
  const userIds: { admins: string[]; coaches: string[]; clients: string[] } = { admins: [], coaches: [], clients: [] };

  for (const admin of ADMINS) {
    const id = uuid();
    await db.insert(schema.users).values({
      id,
      clerkId: `clerk_superadmin_${admin.email.split("@")[0]}`,
      email: admin.email,
      firstName: admin.firstName,
      lastName: admin.lastName,
      role: "super_admin",
      status: "active",
      createdAt: daysAgo(90),
    });
    userIds.admins.push(id);
  }

  for (const coach of COACHES) {
    const id = uuid();
    await db.insert(schema.users).values({
      id,
      clerkId: `clerk_trainer_${coach.email.split("@")[0]}`,
      email: coach.email,
      firstName: coach.firstName,
      lastName: coach.lastName,
      role: "trainer",
      status: "active",
      createdAt: daysAgo(60),
    });
    await db.insert(schema.trainerProfiles).values({
      userId: id,
      bio: coach.bio,
      specialties: coach.specialties,
      credentials: coach.credentials,
      capacity: 15,
      marketplaceVisible: true,
      acceptingClients: true,
      monthlyRate: coach.rate.toString(),
      rating: 4.7 + Math.random() * 0.3,
      reviewCount: Math.floor(8 + Math.random() * 20),
    });
    userIds.coaches.push(id);
  }

  for (const client of CLIENTS) {
    const id = uuid();
    const signupDays = Math.floor(30 + Math.random() * 60);
    await db.insert(schema.users).values({
      id,
      clerkId: `clerk_client_${client.email.split("@")[0]}`,
      email: client.email,
      firstName: client.firstName,
      lastName: client.lastName,
      role: "client",
      status: "active",
      createdAt: daysAgo(signupDays),
    });
    await db.insert(schema.clientProfiles).values({
      userId: id,
      tier: client.tier,
      dateOfBirth: `${1975 + Math.floor(Math.random() * 20)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, "0")}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, "0")}`,
      gender: client.gender,
      heightInches: client.heightInches,
      goals: client.goals,
      onboardingStep: 5,
      onboardingCompleted: true,
    });
    await db.insert(schema.trainerClientRelationships).values({
      trainerId: userIds.coaches[client.coachIdx],
      clientId: id,
      status: "active",
      startedAt: daysAgo(signupDays - 2),
    });
    await db.insert(schema.subscriptions).values({
      userId: id,
      tier: client.tier,
      stripeSubscriptionId: `sub_demo_${id.slice(0, 8)}`,
      stripeCustomerId: `cus_demo_${id.slice(0, 8)}`,
      status: "active",
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    });
    userIds.clients.push(id);
  }

  return userIds;
}

async function seedBiometrics(clientIds: string[]) {
  console.log("  Seeding biometrics (30 days per client)...");
  const DAYS = 30;

  for (let ci = 0; ci < clientIds.length; ci++) {
    const clientId = clientIds[ci];
    const glucoseRows = [];
    const sleepRows = [];
    const hrRows = [];
    const hrvRows = [];
    const bodyRows = [];

    for (let d = 0; d < DAYS; d++) {
      const day = daysAgo(DAYS - 1 - d);
      const seed = ci * 10000 + d * 100;

      // Glucose: 288 readings/day (every 5 min)
      for (let i = 0; i < 288; i++) {
        const hour = (i * 5) / 60;
        const base = 88 + seededRandom(seed + 1) * 12;
        const spike8 = Math.max(0, (30 + seededRandom(seed + 2) * 20) * Math.exp(-0.5 * Math.pow(hour - 8, 2)));
        const spike12 = Math.max(0, (25 + seededRandom(seed + 3) * 20) * Math.exp(-0.5 * Math.pow(hour - 12.5, 2)));
        const spike19 = Math.max(0, (35 + seededRandom(seed + 4) * 20) * Math.exp(-0.5 * Math.pow(hour - 19, 2)));
        const noise = (seededRandom(seed + i * 7) - 0.5) * 8;
        const ts = new Date(day);
        ts.setMinutes(i * 5);
        glucoseRows.push({
          clientId,
          timestamp: ts,
          valueMgdl: Math.round(base + spike8 + spike12 + spike19 + noise),
          source: "dexcom",
          trendDirection: pick(["rising", "stable", "falling"], seed + i),
        });
      }

      // Sleep session
      const totalMin = Math.round(360 + seededRandom(seed + 10) * 150);
      const deepMin = Math.round(60 + seededRandom(seed + 11) * 70);
      const remMin = Math.round(50 + seededRandom(seed + 12) * 60);
      const awakeMin = Math.round(10 + seededRandom(seed + 13) * 30);
      const lightMin = totalMin - deepMin - remMin - awakeMin;
      sleepRows.push({
        clientId,
        date: dateStr(day),
        totalMinutes: totalMin,
        deepMinutes: deepMin,
        remMinutes: remMin,
        lightMinutes: Math.max(lightMin, 60),
        awakeMinutes: awakeMin,
        score: Math.round(55 + seededRandom(seed + 14) * 40),
        source: "oura",
      });

      // Heart rate: 4 readings per day
      for (let h = 0; h < 4; h++) {
        const ts = new Date(day);
        ts.setHours(6 + h * 4);
        hrRows.push({
          clientId,
          timestamp: ts,
          bpm: Math.round(60 + seededRandom(seed + 20 + h) * 30),
          source: "apple_health",
          activityContext: h === 2 ? "exercise" : "resting",
        });
      }

      // HRV: 1 reading per day (morning)
      const hrvTs = new Date(day);
      hrvTs.setHours(7);
      hrvRows.push({
        clientId,
        timestamp: hrvTs,
        rmssd: parseFloat((30 + seededRandom(seed + 30) * 50).toFixed(1)),
        source: "oura",
      });

      // Body measurement: weekly
      if (d % 7 === 0) {
        const baseWeight = 155 + ci * 8;
        bodyRows.push({
          clientId,
          date: dateStr(day),
          weightLbs: parseFloat((baseWeight + (seededRandom(seed + 40) - 0.5) * 4 - d * 0.15).toFixed(1)),
          bodyFatPct: parseFloat((18 + ci * 1.5 + (seededRandom(seed + 41) - 0.5) * 2 - d * 0.05).toFixed(1)),
          waistInches: parseFloat((32 + ci * 0.5 + (seededRandom(seed + 42) - 0.5) * 1 - d * 0.02).toFixed(1)),
          source: "manual",
        });
      }
    }

    // Batch insert
    for (let i = 0; i < glucoseRows.length; i += 500) {
      await db.insert(schema.glucoseReadings).values(glucoseRows.slice(i, i + 500));
    }
    await db.insert(schema.sleepSessions).values(sleepRows);
    for (let i = 0; i < hrRows.length; i += 200) {
      await db.insert(schema.heartRateReadings).values(hrRows.slice(i, i + 200));
    }
    await db.insert(schema.hrvReadings).values(hrvRows);
    if (bodyRows.length > 0) await db.insert(schema.bodyMeasurements).values(bodyRows);
  }
}

async function seedProtocols(clientIds: string[], coachIds: string[]) {
  console.log("  Seeding supplement protocols & adherence...");
  const DAYS = 30;

  for (let ci = 0; ci < clientIds.length; ci++) {
    const clientId = clientIds[ci];
    const trainerId = coachIds[CLIENTS[ci].coachIdx];

    // Create protocol
    const protocolId = uuid();
    await db.insert(schema.supplementProtocols).values({
      id: protocolId,
      clientId,
      trainerId,
      version: 1,
      status: "active",
      createdAt: daysAgo(28),
    });

    // Assign 5-7 supplements
    const numSupps = 5 + Math.floor(seededRandom(ci * 99) * 3);
    const shuffled = [...SUPPLEMENTS].sort(() => seededRandom(ci * 77) - 0.5).slice(0, numSupps);
    const itemIds: string[] = [];

    for (const supp of shuffled) {
      const itemId = uuid();
      await db.insert(schema.protocolItems).values({
        id: itemId,
        protocolId,
        name: supp.name,
        category: supp.category,
        dosage: supp.dosage,
        unit: supp.unit,
        form: supp.form,
        frequency: supp.frequency,
        timeOfDay: supp.timeOfDay,
        rationale: `Prescribed based on lab results and health goals.`,
      });
      itemIds.push(itemId);
    }

    // Adherence logs: 30 days
    const adherenceRows = [];
    for (let d = 0; d < DAYS; d++) {
      const day = daysAgo(DAYS - 1 - d);
      for (let si = 0; si < itemIds.length; si++) {
        const taken = seededRandom(ci * 1000 + d * 10 + si) > 0.12;
        adherenceRows.push({
          clientId,
          protocolItemId: itemIds[si],
          date: dateStr(day),
          takenAt: taken ? new Date(day.getTime() + 8 * 3600000) : null,
          skipped: !taken,
        });
      }
    }
    for (let i = 0; i < adherenceRows.length; i += 200) {
      await db.insert(schema.adherenceLogs).values(adherenceRows.slice(i, i + 200));
    }
  }
}

async function seedFasting(clientIds: string[], coachIds: string[]) {
  console.log("  Seeding fasting protocols & logs...");
  const DAYS = 30;

  for (let ci = 0; ci < clientIds.length; ci++) {
    const clientId = clientIds[ci];
    const trainerId = coachIds[CLIENTS[ci].coachIdx];
    const fastType = pick(["16_8", "20_4", "omad"] as const, ci * 33);
    const feedingStart = fastType === "omad" ? 17 : fastType === "20_4" ? 14 : 12;
    const feedingEnd = fastType === "omad" ? 18 : fastType === "20_4" ? 18 : 20;

    await db.insert(schema.fastingProtocols).values({
      clientId,
      trainerId,
      type: fastType,
      feedingStartHour: feedingStart,
      feedingEndHour: feedingEnd,
      status: "active",
    });

    const fastingRows = [];
    for (let d = 0; d < DAYS; d++) {
      const day = daysAgo(DAYS - 1 - d);
      const started = new Date(day);
      started.setHours(20, 0, 0, 0);
      const targetHours = fastType === "omad" ? 23 : fastType === "20_4" ? 20 : 16;
      const actualHours = targetHours - 3 + seededRandom(ci * 500 + d) * 5;
      const ended = new Date(started.getTime() + actualHours * 3600000);
      const completed = actualHours >= targetHours;

      fastingRows.push({
        clientId,
        date: dateStr(day),
        startedAt: started,
        endedAt: ended,
        completed,
      });
    }
    await db.insert(schema.fastingLogs).values(fastingRows);
  }
}

async function seedNutritionAndWorkouts(clientIds: string[]) {
  console.log("  Seeding meals & workouts...");
  const DAYS = 30;

  for (let ci = 0; ci < clientIds.length; ci++) {
    const clientId = clientIds[ci];
    const mealRows = [];
    const workoutRows = [];

    for (let d = 0; d < DAYS; d++) {
      const day = daysAgo(DAYS - 1 - d);
      const seed = ci * 5000 + d * 50;

      // 3 meals + snack
      for (const mealType of MEAL_TYPES) {
        const cals = mealType === "snack" ? 150 + seededRandom(seed + 1) * 200 : 400 + seededRandom(seed + 2) * 400;
        const protein = Math.round(cals * 0.3 / 4);
        const carbs = Math.round(cals * 0.35 / 4);
        const fat = Math.round(cals * 0.35 / 9);
        mealRows.push({
          clientId,
          date: dateStr(day),
          mealType,
          totalCalories: Math.round(cals),
          totalProtein: protein,
          totalCarbs: carbs,
          totalFat: fat,
          totalFiber: Math.round(5 + seededRandom(seed + 3) * 10),
        });
      }

      // Workout: ~70% of days
      if (seededRandom(seed + 10) > 0.3) {
        const type = pick(WORKOUT_TYPES, seed + 11);
        const duration = Math.round(25 + seededRandom(seed + 12) * 50);
        workoutRows.push({
          clientId,
          date: dateStr(day),
          exercisesCompleted: [{
            exerciseId: uuid(),
            sets: Array.from({ length: 3 + Math.floor(seededRandom(seed + 13) * 3) }, (_, si) => ({
              weight: Math.round(50 + seededRandom(seed + 14 + si) * 100),
              reps: Math.round(6 + seededRandom(seed + 15 + si) * 10),
              rpe: Math.round(6 + seededRandom(seed + 16 + si) * 3),
            })),
          }],
          notes: `${type} - ${duration} min`,
        });
      }
    }

    for (let i = 0; i < mealRows.length; i += 200) {
      await db.insert(schema.mealLogs).values(mealRows.slice(i, i + 200));
    }
    if (workoutRows.length > 0) {
      await db.insert(schema.workoutLogs).values(workoutRows);
    }
  }
}

async function seedCheckins(clientIds: string[]) {
  console.log("  Seeding daily check-ins...");
  const DAYS = 30;

  for (let ci = 0; ci < clientIds.length; ci++) {
    const clientId = clientIds[ci];
    const rows = [];

    for (let d = 0; d < DAYS; d++) {
      // ~85% check-in rate
      if (seededRandom(ci * 3000 + d) < 0.85) {
        const day = daysAgo(DAYS - 1 - d);
        const seed = ci * 7000 + d * 70;
        rows.push({
          clientId,
          date: dateStr(day),
          weight: parseFloat((155 + ci * 8 - d * 0.15 + (seededRandom(seed) - 0.5) * 2).toFixed(1)),
          proteinG: Math.round(120 + seededRandom(seed + 1) * 60),
          carbsG: Math.round(80 + seededRandom(seed + 2) * 80),
          fatG: Math.round(50 + seededRandom(seed + 3) * 40),
          fiberG: Math.round(15 + seededRandom(seed + 4) * 20),
          waterOz: Math.round(48 + seededRandom(seed + 5) * 48),
          trainingType: pick(["strength", "cardio", "yoga", "rest"], seed + 6),
          stress: Math.round(1 + seededRandom(seed + 7) * 4),
          hunger: Math.round(1 + seededRandom(seed + 8) * 4),
          energy: Math.round(1 + seededRandom(seed + 9) * 4),
          sleepQuality: Math.round(1 + seededRandom(seed + 10) * 4),
          notes: d % 7 === 0 ? "Great week overall" : null,
        });
      }
    }
    if (rows.length > 0) await db.insert(schema.dailyCheckins).values(rows);
  }
}

async function seedLabs(clientIds: string[], coachIds: string[]) {
  console.log("  Seeding biomarker definitions, lab orders & results...");

  // Biomarker definitions
  for (const bm of BIOMARKERS) {
    await db.insert(schema.biomarkerDefinitions).values({
      code: bm.code,
      name: bm.name,
      category: bm.category,
      defaultRefLow: bm.refLow,
      defaultRefHigh: bm.refHigh,
      unit: bm.unit,
      description: `Standard reference range for ${bm.name}.`,
    });
  }

  // Lab orders for each client (1-2 per client)
  for (let ci = 0; ci < clientIds.length; ci++) {
    const clientId = clientIds[ci];
    const trainerId = coachIds[CLIENTS[ci].coachIdx];
    const numOrders = ci < 4 ? 2 : 1;

    for (let o = 0; o < numOrders; o++) {
      const orderId = uuid();
      const orderedAt = daysAgo(o === 0 ? 7 : 45);
      await db.insert(schema.labOrders).values({
        id: orderId,
        clientId,
        trainerId,
        provider: "Quest Diagnostics",
        panelName: "Comprehensive Metabolic & Hormone Panel",
        status: o === 0 ? "results_ready" : "results_ready",
        orderedAt,
      });

      const resultId = uuid();
      await db.insert(schema.labResults).values({
        id: resultId,
        orderId,
        clientId,
        receivedAt: new Date(orderedAt.getTime() + 5 * 24 * 3600000),
        ocrStatus: "completed",
      });

      // Biomarker values
      for (let bi = 0; bi < BIOMARKERS.length; bi++) {
        const bm = BIOMARKERS[bi];
        const seed = ci * 9000 + o * 100 + bi;
        const midpoint = (bm.refLow + bm.refHigh) / 2;
        const range = bm.refHigh - bm.refLow;
        const value = midpoint + (seededRandom(seed) - 0.5) * range * 0.8;
        await db.insert(schema.biomarkerValues).values({
          resultId,
          biomarkerCode: bm.code,
          value: parseFloat(value.toFixed(1)),
          unit: bm.unit,
          refLow: bm.refLow,
          refHigh: bm.refHigh,
          status: value >= bm.refLow && value <= bm.refHigh ? "normal" : value < bm.refLow ? "low" : "high",
        });
      }
    }
  }
}

async function seedAlerts(clientIds: string[]) {
  console.log("  Seeding alerts...");
  const alertTemplates = [
    { type: "glucose_spike", priority: "urgent" as const, title: "Glucose spike detected" },
    { type: "sleep_low", priority: "action" as const, title: "Sleep score below threshold" },
    { type: "adherence_miss", priority: "action" as const, title: "Supplement protocol missed" },
    { type: "checkin_overdue", priority: "info" as const, title: "Weekly check-in overdue" },
    { type: "lab_ready", priority: "info" as const, title: "Lab results available" },
    { type: "weight_trend", priority: "action" as const, title: "Weight trend change detected" },
  ];

  for (let ci = 0; ci < clientIds.length; ci++) {
    const numAlerts = 1 + Math.floor(seededRandom(ci * 111) * 4);
    for (let a = 0; a < numAlerts; a++) {
      const tmpl = alertTemplates[Math.floor(seededRandom(ci * 222 + a) * alertTemplates.length)];
      await db.insert(schema.alerts).values({
        clientId: clientIds[ci],
        type: tmpl.type,
        priority: tmpl.priority,
        title: tmpl.title,
        message: `Automated alert for ${CLIENTS[ci].firstName} ${CLIENTS[ci].lastName}.`,
        status: a === 0 ? "active" : pick(["active", "acknowledged", "resolved"], ci * 333 + a),
        createdAt: daysAgo(Math.floor(seededRandom(ci * 444 + a) * 7)),
      });
    }
  }
}

async function seedNotifications(clientIds: string[], coachIds: string[], adminIds: string[]) {
  console.log("  Seeding notifications & preferences...");

  const allUserIds = [...adminIds, ...coachIds, ...clientIds];

  // Notification templates by category
  const templates: { category: "health_alert" | "insight" | "weekly_report" | "coach_message" | "appointment" | "lab_result" | "supplement" | "fasting" | "streak" | "billing" | "system" | "onboarding"; priority: "low" | "normal" | "high" | "urgent"; title: string; body: string; actionUrl?: string }[] = [
    { category: "health_alert", priority: "urgent", title: "Glucose spike detected", body: "Your glucose exceeded 180 mg/dL for over 30 minutes. Review your recent meals and activity.", actionUrl: "/glucose" },
    { category: "health_alert", priority: "high", title: "Low sleep score", body: "Your sleep score was 42 last night, well below your 7-day average of 72.", actionUrl: "/sleep" },
    { category: "insight", priority: "normal", title: "Weekly health insight", body: "Your average HRV improved by 12% this week. Keep up the great work with your recovery routine.", actionUrl: "/dashboard" },
    { category: "weekly_report", priority: "normal", title: "Your weekly report is ready", body: "Review your health metrics summary for the past 7 days.", actionUrl: "/dashboard" },
    { category: "coach_message", priority: "normal", title: "Message from your coach", body: "Your coach has shared updated supplement recommendations. Check your protocol page.", actionUrl: "/supplements" },
    { category: "lab_result", priority: "high", title: "Lab results available", body: "Your comprehensive metabolic panel results are ready for review.", actionUrl: "/labs" },
    { category: "supplement", priority: "low", title: "Supplement reminder", body: "Don't forget your evening supplements: Magnesium Glycinate, Ashwagandha.", actionUrl: "/supplements" },
    { category: "fasting", priority: "low", title: "Fasting window starting", body: "Your 16:8 fasting window begins now. Stay hydrated!", actionUrl: "/fasting" },
    { category: "streak", priority: "normal", title: "7-day check-in streak!", body: "Congratulations! You've completed daily check-ins for 7 consecutive days.", actionUrl: "/dashboard" },
    { category: "billing", priority: "normal", title: "Subscription renewed", body: "Your Tier 1 subscription has been successfully renewed.", actionUrl: "/settings" },
    { category: "system", priority: "low", title: "New feature available", body: "Dark mode is now available! Enable it in your settings.", actionUrl: "/settings" },
    { category: "onboarding", priority: "normal", title: "Complete your profile", body: "You're 80% done with onboarding. Add your health goals to get personalized recommendations.", actionUrl: "/onboarding" },
  ];

  // Seed 3-6 notifications per client
  for (let ci = 0; ci < clientIds.length; ci++) {
    const numNotifs = 3 + Math.floor(seededRandom(ci * 6000) * 4);
    const rows = [];
    for (let n = 0; n < numNotifs; n++) {
      const tmpl = templates[Math.floor(seededRandom(ci * 6100 + n) * templates.length)];
      const dAgo = Math.floor(seededRandom(ci * 6200 + n) * 14);
      const isRead = seededRandom(ci * 6300 + n) > 0.4;
      const createdAt = daysAgo(dAgo);
      rows.push({
        userId: clientIds[ci],
        category: tmpl.category,
        priority: tmpl.priority,
        title: tmpl.title,
        body: tmpl.body,
        actionUrl: tmpl.actionUrl || null,
        channels: ["in_app", "email"] as string[],
        deliveryStatus: { in_app: "delivered", email: "sent" } as Record<string, string>,
        read: isRead,
        readAt: isRead ? new Date(createdAt.getTime() + 3600000 * (1 + seededRandom(ci * 6400 + n) * 12)) : null,
        archived: dAgo > 10 && seededRandom(ci * 6500 + n) > 0.7,
        createdAt,
      });
    }
    await db.insert(schema.notifications).values(rows);
  }

  // Seed 1-2 notifications for coaches (system/billing)
  for (let i = 0; i < coachIds.length; i++) {
    await db.insert(schema.notifications).values({
      userId: coachIds[i],
      category: "system",
      priority: "normal",
      title: "New client assigned",
      body: "A new client has been assigned to your roster. Review their profile and health goals.",
      actionUrl: "/trainer/clients",
      channels: ["in_app"],
      deliveryStatus: { in_app: "delivered" },
      read: i === 0,
      readAt: i === 0 ? daysAgo(2) : null,
      createdAt: daysAgo(3),
    });
  }

  // Notification preferences for all users
  for (const userId of allUserIds) {
    await db.insert(schema.notificationPreferences).values({
      userId,
      enabled: true,
      quietHoursStart: "22:00",
      quietHoursEnd: "07:00",
      categories: {
        health_alert: { in_app: true, email: true, push: true, sms: false },
        insight: { in_app: true, email: true, push: false, sms: false },
        weekly_report: { in_app: true, email: true, push: false, sms: false },
        coach_message: { in_app: true, email: true, push: true, sms: false },
        appointment: { in_app: true, email: true, push: true, sms: true },
        lab_result: { in_app: true, email: true, push: true, sms: false },
        supplement: { in_app: true, email: false, push: false, sms: false },
        fasting: { in_app: true, email: false, push: false, sms: false },
        streak: { in_app: true, email: false, push: false, sms: false },
        billing: { in_app: true, email: true, push: false, sms: false },
        system: { in_app: true, email: false, push: false, sms: false },
        onboarding: { in_app: true, email: true, push: false, sms: false },
      },
    });
  }
}

async function seedAuditLog(adminIds: string[], coachIds: string[]) {
  console.log("  Seeding audit logs...");
  const actions = [
    "user.created", "user.updated", "subscription.created", "subscription.upgraded",
    "protocol.created", "protocol.updated", "alert.acknowledged", "lab_order.created",
    "coach.capacity_updated", "system.sync_completed",
  ];

  for (let i = 0; i < 50; i++) {
    await db.insert(schema.auditLogs).values({
      userId: pick([...adminIds, ...coachIds], i * 77),
      action: pick(actions, i * 88),
      resourceType: pick(["user", "subscription", "protocol", "alert", "lab_order"], i * 99),
      resourceId: uuid(),
      createdAt: daysAgo(Math.floor(seededRandom(i * 55) * 30)),
    });
  }
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("🏛️  KAIROS Database Seeder");
  console.log("━".repeat(40));

  try {
    console.log("\n📦 Seeding data...\n");

    const userIds = await seedUsers();
    console.log(`  ✓ ${userIds.admins.length} admins, ${userIds.coaches.length} coaches, ${userIds.clients.length} clients`);

    await seedBiometrics(userIds.clients);
    console.log("  ✓ 30 days of glucose, sleep, HR, HRV, body measurements");

    await seedProtocols(userIds.clients, userIds.coaches);
    console.log("  ✓ Supplement protocols with adherence logs");

    await seedFasting(userIds.clients, userIds.coaches);
    console.log("  ✓ Fasting protocols with daily logs");

    await seedNutritionAndWorkouts(userIds.clients);
    console.log("  ✓ Meal logs and workout logs");

    await seedCheckins(userIds.clients);
    console.log("  ✓ Daily check-ins");

    await seedLabs(userIds.clients, userIds.coaches);
    console.log("  ✓ Biomarker definitions, lab orders & results");

    await seedAlerts(userIds.clients);
    console.log("  ✓ Health alerts");

    await seedNotifications(userIds.clients, userIds.coaches, userIds.admins);
    console.log("  ✓ Notifications & preferences");

    await seedAuditLog(userIds.admins, userIds.coaches);
    console.log("  ✓ Audit logs");

    console.log("\n━".repeat(40));
    console.log("✅ Seed complete!");
    console.log(`\n   Total records seeded (estimated):`);
    console.log(`   • Users: 13 (2 admin + 3 coach + 8 client)`);
    console.log(`   • Glucose readings: ~69,120 (288/day × 30 days × 8 clients)`);
    console.log(`   • Sleep sessions: ~240`);
    console.log(`   • Heart rate: ~960`);
    console.log(`   • HRV: ~240`);
    console.log(`   • Body measurements: ~40`);
    console.log(`   • Supplement adherence: ~10,000+`);
    console.log(`   • Fasting logs: ~240`);
    console.log(`   • Meal logs: ~960`);
    console.log(`   • Workout logs: ~168`);
    console.log(`   • Daily check-ins: ~204`);
    console.log(`   • Lab results: ~192 biomarker values`);
    console.log(`   • Alerts: ~20`);
    console.log(`   • Notifications: ~40+ (clients) + 3 (coaches)`);
    console.log(`   • Notification preferences: 13 (all users)`);
    console.log(`   • Audit logs: 50`);
  } catch (error) {
    console.error("\n❌ Seed failed:", error);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main();
