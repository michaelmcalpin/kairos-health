/**
 * EVERIST Coach Access Control
 *
 * Central helper for determining what level of access a coach has to a
 * client's data. Two sources of access:
 *
 *  1. PRIMARY relationship (trainer_client_relationships, status=active):
 *     the assigned coach — full write access to all categories.
 *  2. CLIENT-GRANTED access (client_coach_access, status=active): the
 *     client explicitly shares specific categories (diet, exercise, labs,
 *     health data) at read or write level with any coach.
 *
 * Categories:
 *  - diet: nutrition, meals, fasting
 *  - exercise: workouts, programs, activity
 *  - labs: lab results, clinical docs, biomarkers
 *  - healthData: wearables/vitals (glucose, sleep, HRV, BP, weight)
 */

import { eq, and } from "drizzle-orm";
import { trainerClientRelationships, clientCoachAccess } from "@/server/db/schema";
import type { db as Database } from "@/server/db";

export type AccessLevel = "none" | "read" | "write";

export interface CoachAccess {
  /** True when this coach is the client's assigned primary coach */
  isPrimary: boolean;
  /** True when the coach has ANY access at all (primary or granted) */
  hasAnyAccess: boolean;
  diet: AccessLevel;
  exercise: AccessLevel;
  labs: AccessLevel;
  healthData: AccessLevel;
}

const NO_ACCESS: CoachAccess = {
  isPrimary: false,
  hasAnyAccess: false,
  diet: "none",
  exercise: "none",
  labs: "none",
  healthData: "none",
};

const FULL_ACCESS: CoachAccess = {
  isPrimary: true,
  hasAnyAccess: true,
  diet: "write",
  exercise: "write",
  labs: "write",
  healthData: "write",
};

/**
 * Resolve the access a coach has to a client's data.
 */
export async function getCoachAccess(
  db: typeof Database,
  coachId: string,
  clientId: string,
): Promise<CoachAccess> {
  // Primary relationship → full access
  const primary = await db.query.trainerClientRelationships.findFirst({
    where: and(
      eq(trainerClientRelationships.trainerId, coachId),
      eq(trainerClientRelationships.clientId, clientId),
      eq(trainerClientRelationships.status, "active"),
    ),
  });
  if (primary) return FULL_ACCESS;

  // Client-granted access
  const grant = await db.query.clientCoachAccess.findFirst({
    where: and(
      eq(clientCoachAccess.coachId, coachId),
      eq(clientCoachAccess.clientId, clientId),
      eq(clientCoachAccess.status, "active"),
    ),
  });
  if (!grant) return NO_ACCESS;

  const access: CoachAccess = {
    isPrimary: false,
    hasAnyAccess:
      grant.dietAccess !== "none" ||
      grant.exerciseAccess !== "none" ||
      grant.labsAccess !== "none" ||
      grant.healthDataAccess !== "none",
    diet: grant.dietAccess,
    exercise: grant.exerciseAccess,
    labs: grant.labsAccess,
    healthData: grant.healthDataAccess,
  };
  return access;
}

/**
 * Convenience assertion: throws if the coach has no access at all to
 * the client. Returns the access object otherwise.
 */
export async function requireCoachAccess(
  db: typeof Database,
  coachId: string,
  clientId: string,
): Promise<CoachAccess> {
  const access = await getCoachAccess(db, coachId, clientId);
  if (!access.hasAnyAccess) {
    const { TRPCError } = await import("@trpc/server");
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "This client has not granted you access to their data.",
    });
  }
  return access;
}

/**
 * Check a specific category at a minimum level ("read" accepts read or
 * write; "write" requires write).
 */
export function hasCategoryAccess(
  access: CoachAccess,
  category: "diet" | "exercise" | "labs" | "healthData",
  minLevel: "read" | "write",
): boolean {
  const level = access[category];
  if (minLevel === "read") return level === "read" || level === "write";
  return level === "write";
}
