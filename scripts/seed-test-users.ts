/**
 * Seed Test Users for Each Role
 *
 * Creates 4 Clerk test accounts and syncs them to the database.
 *
 * Usage:
 *   npx tsx scripts/seed-test-users.ts
 *
 * Requires CLERK_SECRET_KEY in .env.local
 *
 * Test Credentials:
 *   ┌────────────────┬──────────────────────────┬──────────────────┐
 *   │ Role           │ Email                    │ Password         │
 *   ├────────────────┼──────────────────────────┼──────────────────┤
 *   │ Client         │ client@kairos-dev.com    │ TestClient123!   │
 *   │ Trainer        │ trainer@kairos-dev.com   │ TestTrainer123!  │
 *   │ Company Admin  │ company@kairos-dev.com   │ TestCompany123!  │
 *   │ Super Admin    │ admin@kairos-dev.com     │ TestAdmin123!    │
 *   └────────────────┴──────────────────────────┴──────────────────┘
 */

import "dotenv/config";

const CLERK_SECRET_KEY = process.env.CLERK_SECRET_KEY;
if (!CLERK_SECRET_KEY) {
  console.error("❌ CLERK_SECRET_KEY not found in environment. Add it to .env.local");
  process.exit(1);
}

const CLERK_API = "https://api.clerk.com/v1";

interface TestUser {
  role: string;
  email: string;
  firstName: string;
  lastName: string;
  password: string;
}

const TEST_USERS: TestUser[] = [
  {
    role: "client",
    email: "client@kairos-dev.com",
    firstName: "Sarah",
    lastName: "Chen",
    password: "TestClient123!",
  },
  {
    role: "trainer",
    email: "trainer@kairos-dev.com",
    firstName: "Sarah",
    lastName: "Mitchell",
    password: "TestTrainer123!",
  },
  {
    role: "company_admin",
    email: "company@kairos-dev.com",
    firstName: "Maria",
    lastName: "Torres",
    password: "TestCompany123!",
  },
  {
    role: "super_admin",
    email: "admin@kairos-dev.com",
    firstName: "Platform",
    lastName: "Admin",
    password: "TestAdmin123!",
  },
];

async function clerkFetch(path: string, options: RequestInit = {}) {
  const res = await fetch(`${CLERK_API}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${CLERK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  return res.json();
}

async function findExistingUser(email: string): Promise<string | null> {
  const result = await clerkFetch(`/users?email_address=${encodeURIComponent(email)}`);
  if (Array.isArray(result) && result.length > 0) {
    return result[0].id;
  }
  return null;
}

async function createClerkUser(user: TestUser): Promise<string> {
  // Check if already exists
  const existingId = await findExistingUser(user.email);
  if (existingId) {
    console.log(`  ⏩ Already exists (${existingId}), updating metadata...`);
    // Update public metadata with role
    await clerkFetch(`/users/${existingId}`, {
      method: "PATCH",
      body: JSON.stringify({
        public_metadata: { role: user.role },
      }),
    });
    return existingId;
  }

  const result = await clerkFetch("/users", {
    method: "POST",
    body: JSON.stringify({
      email_address: [user.email],
      first_name: user.firstName,
      last_name: user.lastName,
      password: user.password,
      skip_password_checks: true,
      public_metadata: { role: user.role },
    }),
  });

  if (result.errors) {
    throw new Error(`Clerk error: ${JSON.stringify(result.errors)}`);
  }

  return result.id;
}

async function main() {
  console.log("🔑 Seeding KAIROS test users...\n");

  const results: { role: string; email: string; password: string; clerkId: string }[] = [];

  for (const user of TEST_USERS) {
    console.log(`👤 ${user.role}: ${user.email}`);
    try {
      const clerkId = await createClerkUser(user);
      console.log(`  ✅ Clerk ID: ${clerkId}`);
      results.push({
        role: user.role,
        email: user.email,
        password: user.password,
        clerkId,
      });
    } catch (err) {
      console.error(`  ❌ Failed:`, err);
    }
    console.log();
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  TEST CREDENTIALS");
  console.log("════════════════════════════════════════════════════════════\n");

  for (const r of results) {
    console.log(`  ${r.role.padEnd(15)} ${r.email.padEnd(28)} ${r.password}`);
  }

  console.log("\n════════════════════════════════════════════════════════════");
  console.log("  IMPORTANT: After signing in with each account for the");
  console.log("  first time, the syncUser mutation will create the DB");
  console.log("  record. You may need to manually set the role in the");
  console.log("  database if syncUser defaults to 'client'.");
  console.log("");
  console.log("  For quick local testing without Clerk, visit:");
  console.log("  http://localhost:3000/dev/login");
  console.log("════════════════════════════════════════════════════════════\n");
}

main().catch(console.error);
