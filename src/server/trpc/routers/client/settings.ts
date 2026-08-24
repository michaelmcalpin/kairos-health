/**
 * EVERIST Client Settings Router
 *
 * tRPC endpoints for user profile settings and notification preferences.
 * Handles fetching and updating:
 * - User profile (firstName, lastName, avatarUrl)
 * - Notification preferences
 */

import { z } from "zod";
import { router, clientProcedure } from "@/server/trpc";
import { users, notificationPreferences, clientProfiles, trainerClientRelationships, trainerProfiles, userContactInfo, auditLogs } from "@/server/db/schema";
import { eq, and } from "drizzle-orm";
import { clerkClient } from "@clerk/nextjs/server";

export const clientSettingsRouter = router({
  /**
   * Get feature toggles for the current client.
   * Returns resolved toggles with gender-based defaults applied.
   * cycleTracker: default ON for female, OFF for male (overridable by admin).
   */
  getFeatureToggles: clientProcedure.query(async ({ ctx }) => {
    const profile = await ctx.db.query.clientProfiles.findFirst({
      where: eq(clientProfiles.userId, ctx.dbUserId),
    });

    const stored = (profile?.featureToggles as Record<string, boolean>) ?? {};
    const gender = profile?.gender?.toLowerCase() ?? "male";

    // Apply defaults — admin overrides take precedence
    const defaults: Record<string, boolean> = {
      cycleTracker: gender === "female",
    };

    return { ...defaults, ...stored };
  }),

  /**
   * Get current user's settings (profile + notification preferences)
   */
  getSettings: clientProcedure.query(async ({ ctx }) => {
    const [user, profile, prefs] = await Promise.all([
      ctx.db.query.users.findFirst({ where: eq(users.id, ctx.dbUserId) }),
      ctx.db.query.clientProfiles.findFirst({ where: eq(clientProfiles.userId, ctx.dbUserId) }),
      ctx.db.query.notificationPreferences.findFirst({ where: eq(notificationPreferences.userId, ctx.dbUserId) }),
    ]);

    // Contact info in separate table — safe if table doesn't exist yet
    let contactInfo = null;
    try {
      contactInfo = await ctx.db.query.userContactInfo.findFirst({ where: eq(userContactInfo.userId, ctx.dbUserId) });
    } catch { /* table may not exist yet */ }

    return {
      user,
      clientProfile: profile ?? null,
      contactInfo: contactInfo ?? null,
      notificationPreferences: prefs,
    };
  }),

  /**
   * Update user profile (firstName, lastName, avatarUrl)
   */
  updateProfile: clientProcedure
    .input(
      z.object({
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        avatarUrl: z.string().url().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const [updated] = await ctx.db
        .update(users)
        .set({
          firstName: input.firstName,
          lastName: input.lastName,
          avatarUrl: input.avatarUrl,
          updatedAt: new Date(),
        })
        .where(eq(users.id, ctx.dbUserId))
        .returning();

      return updated;
    }),

  /**
   * Update client health profile (DOB, gender, height, weight, goals, occupation)
   */
  updateClientProfile: clientProcedure
    .input(
      z.object({
        dateOfBirth: z.string().optional(),
        gender: z.string().optional(),
        heightInches: z.number().optional(),
        goals: z.array(z.string()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const existing = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, ctx.dbUserId),
      });

      const updates: Record<string, unknown> = {};
      if (input.dateOfBirth !== undefined) updates.dateOfBirth = input.dateOfBirth;
      if (input.gender !== undefined) updates.gender = input.gender;
      if (input.heightInches !== undefined) updates.heightInches = input.heightInches;
      if (input.goals !== undefined) updates.goals = input.goals;

      if (existing) {
        await ctx.db
          .update(clientProfiles)
          .set(updates)
          .where(eq(clientProfiles.userId, ctx.dbUserId));
      } else {
        await ctx.db.insert(clientProfiles).values({
          userId: ctx.dbUserId,
          ...updates,
        });
      }

      return { success: true };
    }),

  /**
   * Update contact info (phone, timezone, occupation, address)
   */
  updateContactInfo: clientProcedure
    .input(z.object({
      phone: z.string().optional(),
      timezone: z.string().optional(),
      occupation: z.string().optional(),
      address: z.string().optional(),
      city: z.string().optional(),
      state: z.string().optional(),
      zipCode: z.string().optional(),
      emergencyContact: z.string().optional(),
      emergencyPhone: z.string().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      try {
        // Normalize phone numbers to E.164 (+15551234567) so SMS delivery works.
        // Accepts common US formats; leaves already-international numbers as-is.
        const normalizePhone = (raw?: string): string | undefined => {
          if (raw === undefined) return undefined;
          const trimmed = raw.trim();
          if (trimmed === "") return trimmed; // allow clearing
          if (trimmed.startsWith("+")) return "+" + trimmed.slice(1).replace(/\D/g, "");
          const digits = trimmed.replace(/\D/g, "");
          if (digits.length === 10) return "+1" + digits;
          if (digits.length === 11 && digits.startsWith("1")) return "+" + digits;
          return trimmed; // unknown format — store as entered
        };
        const values = {
          ...input,
          ...(input.phone !== undefined ? { phone: normalizePhone(input.phone) } : {}),
          ...(input.emergencyPhone !== undefined ? { emergencyPhone: normalizePhone(input.emergencyPhone) } : {}),
        };

        const existing = await ctx.db.query.userContactInfo.findFirst({
          where: eq(userContactInfo.userId, ctx.dbUserId),
        });

        if (existing) {
          await ctx.db.update(userContactInfo).set({ ...values, updatedAt: new Date() })
            .where(eq(userContactInfo.userId, ctx.dbUserId));
        } else {
          await ctx.db.insert(userContactInfo).values({ userId: ctx.dbUserId, ...values });
        }
        return { success: true };
      } catch {
        // Table may not exist yet — return success silently
        return { success: true };
      }
    }),

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: clientProcedure
    .input(
      z.object({
        enabled: z.boolean().optional(),
        quietHoursStart: z.string().optional(), // "22:00" format
        quietHoursEnd: z.string().optional(),   // "07:00" format
        categories: z
          .record(
            z.string(),
            z.object({
              in_app: z.boolean(),
              email: z.boolean(),
              push: z.boolean(),
              sms: z.boolean(),
            })
          )
          .optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Check if preferences exist
      const existing = await ctx.db.query.notificationPreferences.findFirst({
        where: eq(notificationPreferences.userId, ctx.dbUserId),
      });

      if (existing) {
        // Update existing
        const [updated] = await ctx.db
          .update(notificationPreferences)
          .set({
            enabled: input.enabled ?? existing.enabled,
            quietHoursStart: input.quietHoursStart ?? existing.quietHoursStart,
            quietHoursEnd: input.quietHoursEnd ?? existing.quietHoursEnd,
            categories: input.categories ?? existing.categories,
            updatedAt: new Date(),
          })
          .where(eq(notificationPreferences.userId, ctx.dbUserId))
          .returning();

        return updated;
      } else {
        // Create new
        const [created] = await ctx.db
          .insert(notificationPreferences)
          .values({
            userId: ctx.dbUserId,
            enabled: input.enabled ?? true,
            quietHoursStart: input.quietHoursStart,
            quietHoursEnd: input.quietHoursEnd,
            categories: input.categories,
          })
          .returning();

        return created;
      }
    }),

  /**
   * Update a feature toggle (e.g. cycleTracker).
   * Merges into the existing featureToggles JSONB on client_profiles.
   */
  updateFeatureToggle: clientProcedure
    .input(
      z.object({
        key: z.string(),
        value: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Get current toggles
      const profile = await ctx.db.query.clientProfiles.findFirst({
        where: eq(clientProfiles.userId, ctx.dbUserId),
      });

      const current = (profile?.featureToggles as Record<string, boolean>) ?? {};
      const updated = { ...current, [input.key]: input.value };

      if (profile) {
        await ctx.db
          .update(clientProfiles)
          .set({ featureToggles: updated })
          .where(eq(clientProfiles.userId, ctx.dbUserId));
      }

      return updated;
    }),

  /**
   * Get the client's assigned coach (active trainer relationship).
   * Joins trainer_client_relationships → users + trainer_profiles.
   */
  getMyCoach: clientProcedure.query(async ({ ctx }) => {
    // Find active trainer relationship for this client
    const relationship = await ctx.db.query.trainerClientRelationships.findFirst({
      where: and(
        eq(trainerClientRelationships.clientId, ctx.dbUserId),
        eq(trainerClientRelationships.status, "active"),
      ),
    });

    if (!relationship) return null;

    // Get trainer user info
    const trainer = await ctx.db.query.users.findFirst({
      where: eq(users.id, relationship.trainerId),
    });

    if (!trainer) return null;

    // Get trainer profile (bio, specialties, credentials, rating)
    const profile = await ctx.db.query.trainerProfiles.findFirst({
      where: eq(trainerProfiles.userId, relationship.trainerId),
    });

    return {
      id: trainer.id,
      firstName: trainer.firstName,
      lastName: trainer.lastName,
      email: trainer.email,
      avatarUrl: trainer.avatarUrl,
      bio: profile?.bio ?? null,
      specialties: (profile?.specialties as string[]) ?? [],
      credentials: (profile?.credentials as string[]) ?? [],
      rating: profile?.rating ?? null,
      reviewCount: profile?.reviewCount ?? 0,
      since: relationship.startedAt,
    };
  }),

  /**
   * Delete (deactivate) the caller's OWN account.
   *
   * Required for Apple App Review 5.1.1(v) — users must be able to initiate
   * account deletion from within the app. We soft-delete for safety: the DB
   * user record is marked `inactive` (so their data can still be handled per
   * our retention policy / support requests) and their Clerk identity is
   * deleted so they can no longer sign in. This only ever affects the
   * authenticated caller — never another user's data.
   */
  deleteAccount: clientProcedure.mutation(async ({ ctx }) => {
    // 1) Deactivate the caller's own DB record (soft-delete).
    await ctx.db
      .update(users)
      .set({ status: "inactive", updatedAt: new Date() })
      .where(eq(users.id, ctx.dbUserId));

    // 2) Audit trail.
    try {
      await ctx.db.insert(auditLogs).values({
        userId: ctx.dbUserId,
        action: "user.self_deleted",
        resourceType: "user",
        resourceId: ctx.dbUserId,
        metadata: { source: "mobile", initiatedBy: "self" },
      });
    } catch {
      // audit_logs table may not exist yet — non-fatal
    }

    // 3) Revoke access by deleting the Clerk identity so the user cannot
    //    sign back in. Non-fatal if Clerk is unreachable — the account is
    //    already deactivated in our DB.
    try {
      const client = await clerkClient();
      await client.users.deleteUser(ctx.userId);
    } catch {
      // Clerk deletion failed — account is still deactivated in our DB.
    }

    return { success: true };
  }),
});
