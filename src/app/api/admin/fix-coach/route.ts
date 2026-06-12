import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { users, trainerClientRelationships, trainerProfiles } from "@/server/db/schema";
import { eq, and, sql } from "drizzle-orm";

// Temporary admin endpoint to fix coach assignment data
// DELETE THIS FILE after use
export async function GET(req: Request) {
  const url = new URL(req.url);
  const secret = url.searchParams.get("secret");

  // Simple auth guard
  if (secret !== "fix-coach-2026") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // 1. Get all users
    const allUsers = await db.select({
      id: users.id,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      role: users.role,
    }).from(users);

    // 2. Get all relationships
    const allRels = await db.select().from(trainerClientRelationships);

    // 3. Find Walid (trainer) and Michael (admin/client)
    const walid = allUsers.find(u =>
      u.firstName?.toLowerCase().includes("walid") ||
      u.email?.toLowerCase().includes("walid")
    );
    const michael = allUsers.find(u =>
      u.email?.toLowerCase().includes("michael.mcalpin")
    );

    if (!walid || !michael) {
      return NextResponse.json({
        error: "Could not find Walid or Michael",
        users: allUsers.map(u => ({ id: u.id, name: `${u.firstName} ${u.lastName}`, email: u.email, role: u.role })),
        relationships: allRels,
      });
    }

    // 4. Find self-referencing relationship where Michael is both trainer and client
    const selfRef = allRels.find(r =>
      r.trainerId === michael.id && r.clientId === michael.id
    );

    // 5. Check if Michael already has Walid as trainer
    const existingCorrect = allRels.find(r =>
      r.trainerId === walid.id && r.clientId === michael.id && r.status === "active"
    );

    const actions: string[] = [];

    if (existingCorrect) {
      actions.push("Michael already has Walid as trainer (correct relationship exists)");
    }

    if (selfRef) {
      // Delete or update the self-referencing relationship
      if (!existingCorrect) {
        // Update self-ref to point to Walid as trainer
        await db.update(trainerClientRelationships)
          .set({ trainerId: walid.id })
          .where(eq(trainerClientRelationships.id, selfRef.id));
        actions.push(`Updated self-referencing relationship ${selfRef.id}: trainerId changed from ${michael.id} to ${walid.id}`);
      } else {
        // Delete the self-ref since correct relationship already exists
        await db.delete(trainerClientRelationships)
          .where(eq(trainerClientRelationships.id, selfRef.id));
        actions.push(`Deleted self-referencing relationship ${selfRef.id}`);
      }
    } else if (!existingCorrect) {
      // No self-ref and no correct relationship — create one
      const [created] = await db.insert(trainerClientRelationships).values({
        trainerId: walid.id,
        clientId: michael.id,
        status: "active",
      }).returning();
      actions.push(`Created new relationship: Walid (${walid.id}) → Michael (${michael.id}), id: ${created.id}`);
    }

    // 6. Ensure Walid has a trainer profile
    const walidProfile = await db.query.trainerProfiles.findFirst({
      where: eq(trainerProfiles.userId, walid.id),
    });
    if (!walidProfile) {
      await db.insert(trainerProfiles).values({
        userId: walid.id,
        bio: "Health optimization coach and personal trainer",
        specialties: ["Strength Training", "Nutrition", "Recovery"],
        credentials: ["Certified Personal Trainer", "Nutrition Coach"],
        capacity: 20,
        acceptingClients: true,
      });
      actions.push("Created trainer profile for Walid");
    }

    // 7. Ensure Walid has role=trainer
    if (walid.role !== "trainer") {
      await db.update(users)
        .set({ role: "trainer" })
        .where(eq(users.id, walid.id));
      actions.push(`Updated Walid's role from '${walid.role}' to 'trainer'`);
    }

    // Final state
    const finalRels = await db.select().from(trainerClientRelationships);

    return NextResponse.json({
      success: true,
      walid: { id: walid.id, name: `${walid.firstName} ${walid.lastName}`, email: walid.email, role: walid.role },
      michael: { id: michael.id, name: `${michael.firstName} ${michael.lastName}`, email: michael.email, role: michael.role },
      actions,
      relationships: finalRels.map(r => ({
        id: r.id,
        trainerId: r.trainerId,
        clientId: r.clientId,
        status: r.status,
        trainerName: allUsers.find(u => u.id === r.trainerId)?.firstName + " " + allUsers.find(u => u.id === r.trainerId)?.lastName,
        clientName: allUsers.find(u => u.id === r.clientId)?.firstName + " " + allUsers.find(u => u.id === r.clientId)?.lastName,
      })),
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
