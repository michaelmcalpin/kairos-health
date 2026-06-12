/**
 * One-time script: Assign Walid as trainer for jeffkearl@gmail.com
 *
 * Run from kairos-app root:
 *   npx tsx scripts/assign-trainer.ts
 */

import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import { eq, and, ilike, or } from "drizzle-orm";
import * as schema from "../src/server/db/schema";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("DATABASE_URL not set. Run with: DATABASE_URL=... npx tsx scripts/assign-trainer.ts");
  process.exit(1);
}

const sql = neon(DATABASE_URL);
const db = drizzle(sql, { schema });

async function main() {
  // Find Walid (trainer)
  const walid = await db.query.users.findFirst({
    where: or(
      ilike(schema.users.firstName, "%walid%"),
      ilike(schema.users.email, "%walid%"),
    ),
  });

  if (!walid) {
    console.error("Could not find a user named Walid. Users with trainer role:");
    const trainers = await db.query.users.findMany({
      where: eq(schema.users.role, "trainer"),
    });
    trainers.forEach((t) => console.log(`  - ${t.firstName} ${t.lastName} (${t.email}) [${t.id}]`));
    process.exit(1);
  }
  console.log(`Found trainer: ${walid.firstName} ${walid.lastName} (${walid.email}) [${walid.id}]`);

  // Find Jeff (client)
  const jeff = await db.query.users.findFirst({
    where: eq(schema.users.email, "jeffkearl@gmail.com"),
  });

  if (!jeff) {
    console.error("Could not find user with email jeffkearl@gmail.com");
    process.exit(1);
  }
  console.log(`Found client: ${jeff.firstName} ${jeff.lastName} (${jeff.email}) [${jeff.id}]`);

  // Check if relationship already exists
  const existing = await db.query.trainerClientRelationships.findFirst({
    where: and(
      eq(schema.trainerClientRelationships.trainerId, walid.id),
      eq(schema.trainerClientRelationships.clientId, jeff.id),
    ),
  });

  if (existing) {
    if (existing.status === "active") {
      console.log("Relationship already exists and is active!");
      return;
    }
    // Reactivate
    await db
      .update(schema.trainerClientRelationships)
      .set({ status: "active" })
      .where(eq(schema.trainerClientRelationships.id, existing.id));
    console.log("Reactivated existing relationship.");
    return;
  }

  // Create new relationship
  const [rel] = await db
    .insert(schema.trainerClientRelationships)
    .values({
      trainerId: walid.id,
      clientId: jeff.id,
      status: "active",
    })
    .returning();

  console.log(`Created trainer-client relationship: ${rel.id}`);

  // Also ensure Jeff has client role
  if (jeff.role !== "client") {
    console.log(`Note: Jeff's current role is "${jeff.role}", not "client". Updating...`);
    await db.update(schema.users).set({ role: "client" }).where(eq(schema.users.id, jeff.id));
    console.log("Updated Jeff's role to client.");
  }

  console.log("Done! Walid is now the trainer for jeffkearl@gmail.com");
}

main().catch(console.error);
