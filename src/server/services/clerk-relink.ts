/**
 * Link a new Clerk account to an existing Everist user by verified email.
 *
 * Why: moving from Clerk's development instance to production gives every
 * person a NEW Clerk user ID. Users are stored by Clerk ID, so without this
 * everyone would land in a brand-new empty account. When someone signs in
 * with a Clerk ID we don't know, and their email is verified and matches an
 * existing user, we move that user to the new Clerk ID instead of creating a
 * duplicate.
 *
 * Safety checks before re-linking:
 *  - the email must be verified by Clerk;
 *  - the matched user must not be an invite stub ("pending-…", handled
 *    separately) and must not already be this Clerk ID;
 *  - the matched user's OLD Clerk ID must no longer exist in this Clerk
 *    instance (true after a dev → prod move). If it still exists, a live
 *    account already owns that user and we refuse, so changing an email can
 *    never take over someone else's record.
 * Every re-link is written to the audit log, and the user's role/company is
 * copied into the new Clerk account's public metadata so portal gating keeps
 * working.
 */
import { and, ne, sql } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

import { db as defaultDb } from "@/server/db";
import { users, auditLogs } from "@/server/db/schema";
import { logger } from "@/lib/middleware/logger";

type Database = typeof defaultDb;
type UserRow = typeof users.$inferSelect;

/** Does this Clerk user ID exist in the current Clerk instance? */
async function clerkUserExists(clerkId: string): Promise<boolean> {
  try {
    const client = await clerkClient();
    await client.users.getUser(clerkId);
    return true;
  } catch (e) {
    const status = (e as { status?: number })?.status;
    // 404 = not in this instance. Any other error: be safe and say it exists.
    return status !== 404;
  }
}

export async function relinkByVerifiedEmail(
  db: Database,
  newClerkId: string,
  email: string,
  emailVerified: boolean,
): Promise<UserRow | null> {
  if (!emailVerified || !email) return null;

  const match = await db.query.users.findFirst({
    where: and(
      sql`lower(${users.email}) = lower(${email})`,
      ne(users.clerkId, newClerkId),
      sql`${users.clerkId} NOT LIKE 'pending-%'`,
    ),
  });
  if (!match) return null;

  if (await clerkUserExists(match.clerkId)) {
    logger.warn("auth", "Email matches a user still linked to a live Clerk account; not re-linking", {
      userId: match.id,
    });
    return null;
  }

  const [updated] = await db.update(users)
    .set({ clerkId: newClerkId, updatedAt: new Date() })
    .where(sql`${users.id} = ${match.id}`)
    .returning();

  await db.insert(auditLogs).values({
    userId: match.id,
    action: "auth.clerk_relinked",
    resourceType: "user",
    resourceId: match.id,
    metadata: { oldClerkId: match.clerkId, newClerkId, reason: "verified email match" },
  }).catch(() => {});

  // Carry the role/company into the new Clerk account so middleware portal checks work.
  try {
    const client = await clerkClient();
    await client.users.updateUserMetadata(newClerkId, {
      publicMetadata: { role: match.role, ...(match.companyId ? { companyId: match.companyId } : {}) },
    });
  } catch (e) {
    logger.error("auth", "Re-linked user but failed to copy role to Clerk", { error: e instanceof Error ? e.message : "Unknown" });
  }

  logger.info("auth", "Re-linked existing user to new Clerk account", { userId: match.id });
  return updated ?? null;
}
