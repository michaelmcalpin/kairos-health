/**
 * Seed script for KAIROS Neon database.
 *
 * Usage:
 *   source .env.neon
 *   npx tsx scripts/seed.ts
 *
 * This creates demo data: a company, users (coach + clients),
 * trainer-client relationships, conversations, messages,
 * biometric readings, protocols, and notifications.
 */

import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { randomUUID } from "crypto";
import * as schema from "../src/server/db/schema";

// ─── Connect ────────────────────────────────────────────────────────
const url = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL_UNPOOLED or DATABASE_URL must be set");
  process.exit(1);
}

const client = postgres(url, { ssl: "require", max: 1, prepare: false });
const db = drizzle(client, { schema });

// ─── Helpers ────────────────────────────────────────────────────────
function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}
function hoursAgo(n: number) {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
}
function dateStr(d: Date) {
  return d.toISOString().split("T")[0];
}

// ─── Fixed IDs so re-runs are idempotent ────────────────────────────
const COMPANY_ID = "00000000-0000-4000-a000-000000000001";
const COACH_ID   = "00000000-0000-4000-a000-000000000010";
const CLIENT1_ID = "00000000-0000-4000-a000-000000000020";
const CLIENT2_ID = "00000000-0000-4000-a000-000000000030";
const CLIENT3_ID = "00000000-0000-4000-a000-000000000040";

// ─── Main ───────────────────────────────────────────────────────────
async function seed() {
  console.log("🌱 Seeding KAIROS database...\n");

  // ── 1. Company ──────────────────────────────────────────────────
  console.log("  → Company");
  await db
    .insert(schema.companies)
    .values({
      id: COMPANY_ID,
      name: "KAIROS Health",
      slug: "kairos-health",
      brandColor: "#C9A87C",
      website: "https://kairos.health",
      status: "active",
      maxTrainers: 10,
      maxClients: 100,
    })
    .onConflictDoNothing();

  // ── 2. Users ────────────────────────────────────────────────────
  console.log("  → Users");
  const usersData = [
    {
      id: COACH_ID,
      clerkId: "demo_coach_001",
      email: "coach@kairos.health",
      firstName: "Dr. Sarah",
      lastName: "Mitchell",
      role: "trainer" as const,
      companyId: COMPANY_ID,
      status: "active" as const,
    },
    {
      id: CLIENT1_ID,
      clerkId: "demo_client_001",
      email: "michael@example.com",
      firstName: "Michael",
      lastName: "McAlpin",
      role: "client" as const,
      companyId: COMPANY_ID,
      status: "active" as const,
    },
    {
      id: CLIENT2_ID,
      clerkId: "demo_client_002",
      email: "alex@example.com",
      firstName: "Alex",
      lastName: "Rivera",
      role: "client" as const,
      companyId: COMPANY_ID,
      status: "active" as const,
    },
    {
      id: CLIENT3_ID,
      clerkId: "demo_client_003",
      email: "jordan@example.com",
      firstName: "Jordan",
      lastName: "Chen",
      role: "client" as const,
      companyId: COMPANY_ID,
      status: "onboarding" as const,
    },
  ];

  for (const u of usersData) {
    await db.insert(schema.users).values(u).onConflictDoNothing();
  }

  // ── 3. Profiles ──────────────────────────────────────────────────
  console.log("  → Profiles");
  await db
    .insert(schema.trainerProfiles)
    .values({
      userId: COACH_ID,
      bio: "Board-certified longevity physician specializing in metabolic optimization, peptide therapy, and biometric-guided health protocols.",
      specialties: ["Metabolic Health", "Peptide Therapy", "Longevity Protocols", "Hormone Optimization"],
      credentials: ["MD", "Board Certified Internal Medicine", "A4M Fellowship"],
      capacity: 25,
      acceptingClients: true,
      monthlyRate: "1500.00",
      rating: 4.9,
      reviewCount: 47,
    })
    .onConflictDoNothing();

  await db
    .insert(schema.clientProfiles)
    .values([
      {
        userId: CLIENT1_ID,
        tier: "tier1" as const,
        dateOfBirth: "1985-06-15",
        gender: "male",
        heightInches: 72,
        goals: ["Optimize metabolic health", "Increase HRV", "Improve body composition"],
        onboardingStep: 5,
        onboardingCompleted: true,
      },
      {
        userId: CLIENT2_ID,
        tier: "tier2" as const,
        dateOfBirth: "1990-03-22",
        gender: "female",
        heightInches: 65,
        goals: ["Hormone balance", "Better sleep", "Reduce inflammation"],
        onboardingStep: 5,
        onboardingCompleted: true,
      },
      {
        userId: CLIENT3_ID,
        tier: "tier3" as const,
        dateOfBirth: "1988-11-08",
        gender: "male",
        heightInches: 70,
        goals: ["General longevity"],
        onboardingStep: 2,
        onboardingCompleted: false,
      },
    ])
    .onConflictDoNothing();

  // ── 4. Trainer-Client Relationships ──────────────────────────────
  console.log("  → Trainer-Client relationships");
  await db
    .insert(schema.trainerClientRelationships)
    .values([
      { trainerId: COACH_ID, clientId: CLIENT1_ID, status: "active" },
      { trainerId: COACH_ID, clientId: CLIENT2_ID, status: "active" },
    ])
    .onConflictDoNothing();

  // ── 5. Conversations & Messages ──────────────────────────────────
  console.log("  → Conversations & Messages");

  // Client 1 <-> Coach conversation
  const conv1Id = "00000000-0000-4000-b000-000000000001";
  await db
    .insert(schema.conversations)
    .values({
      id: conv1Id,
      trainerId: COACH_ID,
      clientId: CLIENT1_ID,
      isAiTrainer: false,
      lastMessageAt: hoursAgo(1),
      unreadCountTrainer: 1,
      unreadCountClient: 0,
    })
    .onConflictDoNothing();

  const conv1Messages = [
    { senderId: null, senderRole: "system" as const, body: "Conversation started.", isAi: false, ago: 72 },
    { senderId: COACH_ID, senderRole: "coach" as const, body: "Hi Michael! I've reviewed your latest labs. Your fasting insulin is trending nicely at 4.2 — right in the optimal zone. Let's discuss your next steps.", isAi: false, ago: 48 },
    { senderId: CLIENT1_ID, senderRole: "client" as const, body: "That's great to hear! I've been following the 16:8 fasting protocol strictly. Should I continue with the current supplement stack?", isAi: false, ago: 47 },
    { senderId: COACH_ID, senderRole: "coach" as const, body: "Yes, keep the current stack. I'm going to add Berberine 500mg with your largest meal. It'll help maintain that insulin sensitivity. I've updated your protocol.", isAi: false, ago: 46 },
    { senderId: CLIENT1_ID, senderRole: "client" as const, body: "Perfect. Also, my Oura ring shows my HRV has been averaging 62ms this week — up from 48ms last month. The cold plunge protocol seems to be working!", isAi: false, ago: 24 },
    { senderId: COACH_ID, senderRole: "coach" as const, body: "That's a 29% improvement — excellent! Your parasympathetic response is really strengthening. Keep the cold exposure at 2-3 min and 50°F. I'd like to see you hit 70ms by end of month.", isAi: false, ago: 23 },
    { senderId: CLIENT1_ID, senderRole: "client" as const, body: "Will do. One more thing — I've been having some trouble sleeping the last few nights. Any adjustments you'd recommend?", isAi: false, ago: 1 },
  ];

  for (const m of conv1Messages) {
    await db
      .insert(schema.messages)
      .values({
        conversationId: conv1Id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        isAiMessage: m.isAi,
        body: m.body,
        createdAt: hoursAgo(m.ago),
      })
      .onConflictDoNothing();
  }

  // Client 1 <-> AI Coach conversation
  const conv2Id = "00000000-0000-4000-b000-000000000002";
  await db
    .insert(schema.conversations)
    .values({
      id: conv2Id,
      trainerId: null,
      clientId: CLIENT1_ID,
      isAiTrainer: true,
      lastMessageAt: hoursAgo(3),
      unreadCountTrainer: 0,
      unreadCountClient: 2,
    })
    .onConflictDoNothing();

  const conv2Messages = [
    { senderId: null, senderRole: "system" as const, body: "Welcome! Your AI health coach is ready to help.", isAi: false, ago: 120 },
    { senderId: CLIENT1_ID, senderRole: "client" as const, body: "What supplements should I take before my morning workout?", isAi: false, ago: 6 },
    { senderId: null, senderRole: "ai_coach" as const, body: "Based on your current protocol, I'd suggest taking your creatine monohydrate (5g) and caffeine (200mg) 30 minutes before training. Your L-citrulline (6g) would also be beneficial for blood flow during exercise. Avoid your magnesium pre-workout as it can be relaxing — save that for evening.", isAi: true, ago: 6 },
    { senderId: CLIENT1_ID, senderRole: "client" as const, body: "What about my glucose levels during exercise? I noticed spikes.", isAi: false, ago: 4 },
    { senderId: null, senderRole: "ai_coach" as const, body: "Exercise-induced glucose spikes are normal and actually healthy — they indicate your liver is releasing glycogen to fuel your muscles. Looking at your Dexcom data, your post-exercise glucose returns to baseline within 45 minutes, which is excellent. If you want to minimize the spike, try having 10g of protein 20 minutes before training.", isAi: true, ago: 3 },
  ];

  for (const m of conv2Messages) {
    await db
      .insert(schema.messages)
      .values({
        conversationId: conv2Id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        isAiMessage: m.isAi,
        body: m.body,
        createdAt: hoursAgo(m.ago),
      })
      .onConflictDoNothing();
  }

  // Client 2 <-> Coach conversation
  const conv3Id = "00000000-0000-4000-b000-000000000003";
  await db
    .insert(schema.conversations)
    .values({
      id: conv3Id,
      trainerId: COACH_ID,
      clientId: CLIENT2_ID,
      isAiTrainer: false,
      lastMessageAt: hoursAgo(12),
      unreadCountTrainer: 0,
      unreadCountClient: 1,
    })
    .onConflictDoNothing();

  const conv3Messages = [
    { senderId: null, senderRole: "system" as const, body: "Conversation started.", isAi: false, ago: 168 },
    { senderId: CLIENT2_ID, senderRole: "client" as const, body: "Hi Dr. Mitchell! My new lab results came in. Should I upload them here?", isAi: false, ago: 36 },
    { senderId: COACH_ID, senderRole: "coach" as const, body: "Yes please! Upload them and I'll review everything. How are you feeling on the current hormone protocol?", isAi: false, ago: 35 },
    { senderId: CLIENT2_ID, senderRole: "client" as const, body: "Much better! Energy is way up and I'm sleeping through the night now. The progesterone cream has been a game-changer.", isAi: false, ago: 14 },
    { senderId: COACH_ID, senderRole: "coach" as const, body: "Wonderful to hear! I've reviewed your labs — your estradiol/progesterone ratio has normalized beautifully. Let's keep the current dosing and recheck in 8 weeks. I'm also adding a DUTCH test for your next round to get a more complete hormone picture.", isAi: false, ago: 12 },
  ];

  for (const m of conv3Messages) {
    await db
      .insert(schema.messages)
      .values({
        conversationId: conv3Id,
        senderId: m.senderId,
        senderRole: m.senderRole,
        isAiMessage: m.isAi,
        body: m.body,
        createdAt: hoursAgo(m.ago),
      })
      .onConflictDoNothing();
  }

  // ── 6. Biometric Data (Client 1 — last 14 days) ────────────────
  console.log("  → Biometric data (14 days)");
  for (let i = 13; i >= 0; i--) {
    const d = daysAgo(i);
    const ds = dateStr(d);

    // Sleep
    await db.insert(schema.sleepSessions).values({
      clientId: CLIENT1_ID,
      date: ds,
      totalMinutes: 420 + Math.round(Math.random() * 60 - 30),
      deepMinutes: 80 + Math.round(Math.random() * 20),
      remMinutes: 90 + Math.round(Math.random() * 20),
      lightMinutes: 200 + Math.round(Math.random() * 30),
      awakeMinutes: 15 + Math.round(Math.random() * 15),
      score: 75 + Math.round(Math.random() * 20),
      source: "oura",
    });

    // Activity
    await db.insert(schema.activitySummaries).values({
      clientId: CLIENT1_ID,
      date: ds,
      steps: 8000 + Math.round(Math.random() * 6000),
      caloriesActive: 300 + Math.round(Math.random() * 400),
      exerciseMinutes: 30 + Math.round(Math.random() * 60),
      standHours: 8 + Math.round(Math.random() * 4),
      source: "apple_health",
    });

    // HRV (morning reading)
    await db.insert(schema.hrvReadings).values({
      clientId: CLIENT1_ID,
      timestamp: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 7, 0),
      rmssd: 55 + Math.round(Math.random() * 20),
      source: "oura",
    });

    // Body measurement (every 3rd day)
    if (i % 3 === 0) {
      await db.insert(schema.bodyMeasurements).values({
        clientId: CLIENT1_ID,
        date: ds,
        weightLbs: 182 - i * 0.15 + Math.random() * 0.5,
        bodyFatPct: 16.5 - i * 0.05 + Math.random() * 0.3,
        source: "withings",
      });
    }
  }

  // ── 7. Glucose readings (last 3 days, every 5 min) ──────────────
  console.log("  → Glucose readings (3 days)");
  for (let i = 2; i >= 0; i--) {
    const dayStart = daysAgo(i);
    dayStart.setHours(0, 0, 0, 0);
    for (let minute = 0; minute < 24 * 60; minute += 5) {
      const ts = new Date(dayStart.getTime() + minute * 60 * 1000);
      const hour = ts.getHours();
      // Simulate realistic glucose: baseline ~90, meal spikes at 8am, 12pm, 7pm
      let base = 88 + Math.random() * 6;
      if ((hour >= 8 && hour < 10) || (hour >= 12 && hour < 14) || (hour >= 19 && hour < 21)) {
        base += 20 + Math.random() * 25; // meal spike
      }
      if (hour >= 2 && hour <= 5) {
        base -= 5; // dawn dip
      }
      await db.insert(schema.glucoseReadings).values({
        clientId: CLIENT1_ID,
        timestamp: ts,
        valueMgdl: Math.round(base * 10) / 10,
        source: "dexcom",
        trendDirection: "flat",
      });
    }
  }

  // ── 8. Supplement Protocol ──────────────────────────────────────
  console.log("  → Supplement protocol");
  const protocolId = "00000000-0000-4000-c000-000000000001";
  await db
    .insert(schema.supplementProtocols)
    .values({
      id: protocolId,
      clientId: CLIENT1_ID,
      trainerId: COACH_ID,
      status: "active",
      version: 3,
    })
    .onConflictDoNothing();

  const supplements = [
    { name: "Vitamin D3 + K2", category: "supplement" as const, dosage: "5000", unit: "IU", form: "softgel", frequency: "daily", timeOfDay: "morning", rationale: "Maintain serum 25(OH)D between 60-80 ng/mL for immune and bone health" },
    { name: "Magnesium L-Threonate", category: "supplement" as const, dosage: "2000", unit: "mg", form: "capsule", frequency: "daily", timeOfDay: "evening", rationale: "Brain-permeable magnesium for sleep quality and cognitive function" },
    { name: "Omega-3 Fish Oil", category: "supplement" as const, dosage: "2400", unit: "mg EPA/DHA", form: "softgel", frequency: "daily", timeOfDay: "morning", rationale: "Anti-inflammatory, cardiovascular protection, optimal omega-3 index >8%" },
    { name: "Creatine Monohydrate", category: "supplement" as const, dosage: "5", unit: "g", form: "powder", frequency: "daily", timeOfDay: "morning", rationale: "Lean mass maintenance, cognitive support, cellular energy" },
    { name: "Berberine HCl", category: "supplement" as const, dosage: "500", unit: "mg", form: "capsule", frequency: "daily", timeOfDay: "with meals", rationale: "Insulin sensitivity, glucose metabolism optimization" },
    { name: "BPC-157", category: "peptide" as const, dosage: "250", unit: "mcg", form: "injection", route: "subcutaneous", frequency: "daily", timeOfDay: "morning", rationale: "Gut healing, tissue repair, joint recovery", injectionSites: ["abdomen", "deltoid"] },
  ];

  for (const s of supplements) {
    await db.insert(schema.protocolItems).values({
      protocolId,
      ...s,
    });
  }

  // ── 9. Daily Check-ins (last 7 days for Client 1) ───────────────
  console.log("  → Daily check-ins");
  for (let i = 6; i >= 0; i--) {
    await db.insert(schema.dailyCheckins).values({
      clientId: CLIENT1_ID,
      date: dateStr(daysAgo(i)),
      weight: 182 - i * 0.15,
      proteinG: 160 + Math.round(Math.random() * 30),
      carbsG: 120 + Math.round(Math.random() * 40),
      fatG: 70 + Math.round(Math.random() * 20),
      fiberG: 30 + Math.round(Math.random() * 10),
      waterOz: 80 + Math.round(Math.random() * 40),
      trainingType: i % 2 === 0 ? "resistance" : "cardio",
      stress: 2 + Math.round(Math.random() * 3),
      hunger: 3 + Math.round(Math.random() * 2),
      energy: 6 + Math.round(Math.random() * 3),
      sleepQuality: 7 + Math.round(Math.random() * 2),
      notes: i === 0 ? "Feeling great today, solid workout" : undefined,
    });
  }

  // ── 10. Notifications ──────────────────────────────────────────
  console.log("  → Notifications");
  const notifications = [
    { userId: CLIENT1_ID, category: "health_alert" as const, priority: "high" as const, title: "HRV Trending Up", body: "Your 7-day HRV average has increased by 29%. Your recovery is improving significantly.", actionUrl: "/dashboard", read: true },
    { userId: CLIENT1_ID, category: "coach_message" as const, priority: "normal" as const, title: "New message from Dr. Mitchell", body: "Dr. Mitchell sent you a new message about your lab results.", actionUrl: "/messaging", read: false },
    { userId: CLIENT1_ID, category: "supplement" as const, priority: "normal" as const, title: "Protocol Updated", body: "Your supplement protocol has been updated with Berberine HCl 500mg.", actionUrl: "/protocols", read: false },
    { userId: CLIENT1_ID, category: "weekly_report" as const, priority: "low" as const, title: "Weekly Health Report Ready", body: "Your weekly summary is available. Sleep: 92 score avg, Steps: 11.2k avg, HRV: 62ms avg.", actionUrl: "/dashboard", read: false },
    { userId: CLIENT2_ID, category: "lab_result" as const, priority: "high" as const, title: "Lab Results Available", body: "Your comprehensive metabolic panel results are ready for review.", actionUrl: "/labs", read: false },
    { userId: CLIENT2_ID, category: "coach_message" as const, priority: "normal" as const, title: "New message from Dr. Mitchell", body: "Dr. Mitchell has reviewed your latest labs and left comments.", actionUrl: "/messaging", read: false },
  ];

  for (const n of notifications) {
    await db.insert(schema.notifications).values({
      ...n,
      channels: ["in_app"],
      createdAt: hoursAgo(Math.round(Math.random() * 48)),
    });
  }

  // ── 11. Coach Notes ─────────────────────────────────────────────
  console.log("  → Coach notes");
  await db.insert(schema.coachNotes).values([
    {
      clientId: CLIENT1_ID,
      coachId: COACH_ID,
      content: "Michael is responding very well to the current protocol. HRV up 29% in 4 weeks. Continue current stack, monitor sleep with Oura. Consider adding GlyNAC if oxidative stress markers don't improve by next labs.",
      pinned: true,
      createdAt: daysAgo(3),
      updatedAt: daysAgo(3),
    },
    {
      clientId: CLIENT1_ID,
      coachId: COACH_ID,
      content: "Discussed cold exposure protocol. Started at 1 min, now at 2-3 min at 50°F. Excellent compliance. Target: 3 min consistent by end of month.",
      pinned: false,
      createdAt: daysAgo(10),
      updatedAt: daysAgo(10),
    },
    {
      clientId: CLIENT2_ID,
      coachId: COACH_ID,
      content: "Alex's hormone panel shows great improvement. E2/P4 ratio normalized after 6 weeks on progesterone cream. Schedule DUTCH test for comprehensive metabolite analysis. Patient reports significant improvement in sleep and energy.",
      pinned: true,
      createdAt: daysAgo(1),
      updatedAt: daysAgo(1),
    },
  ]);

  // ── Done ────────────────────────────────────────────────────────
  console.log("\n✅ Seed complete! Created:");
  console.log("   • 1 company (KAIROS Health)");
  console.log("   • 4 users (1 coach + 3 clients)");
  console.log("   • 3 conversations with realistic messages");
  console.log("   • 14 days of sleep, activity, HRV, body measurements");
  console.log("   • 3 days of continuous glucose data (~864 readings)");
  console.log("   • 1 supplement protocol with 6 items");
  console.log("   • 7 daily check-ins");
  console.log("   • 6 notifications");
  console.log("   • 3 coach notes");

  await client.end();
}

seed().catch((err) => {
  console.error("❌ Seed failed:", err);
  client.end();
  process.exit(1);
});
