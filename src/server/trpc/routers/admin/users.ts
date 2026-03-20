import { z } from "zod";
import { router, superAdminProcedure as adminProcedure } from "@/server/trpc";
import {
  createUser,
  getUser,
  updateUser,
  performUserAction,
  listUsers,
  getAuditLog,
  getAuditLogForUser,
  getPlatformUserStats,
} from "@/lib/admin/engine";

export const adminUsersRouter = router({
  // List users with pagination and filters
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional().default(""),
        role: z.enum(["client", "trainer", "company_admin", "super_admin", "all"]).optional().default("all"),
        status: z.enum(["active", "inactive", "suspended", "onboarding", "all"]).optional().default("all"),
        tier: z.enum(["tier1", "tier2", "tier3", "all"]).optional().default("all"),
        sortBy: z.enum(["name", "email", "createdAt", "lastLogin", "status"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      return listUsers(input ?? {});
    }),

  // Get single user detail
  get: adminProcedure
    .input(z.object({ userId: z.string() }))
    .query(async ({ input }) => {
      const user = getUser(input.userId);
      if (!user) throw new Error("User not found");
      return user;
    }),

  // Create a new user
  create: adminProcedure
    .input(
      z.object({
        email: z.string().email(),
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        role: z.enum(["client", "trainer", "company_admin", "super_admin"]).optional().default("client"),
      })
    )
    .mutation(async ({ input }) => {
      return createUser(input.email, input.firstName, input.lastName, input.role);
    }),

  // Update user profile
  update: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        firstName: z.string().min(1).optional(),
        lastName: z.string().min(1).optional(),
        email: z.string().email().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const { userId, ...updates } = input;
      return updateUser(userId, updates);
    }),

  // Perform user action (suspend, reactivate, change role, etc.)
  performAction: adminProcedure
    .input(
      z.object({
        userId: z.string(),
        action: z.enum(["suspend", "reactivate", "change_role", "change_tier", "reset_onboarding", "delete"]),
        reason: z.string().optional(),
        newRole: z.enum(["client", "trainer", "company_admin", "super_admin"]).optional(),
        newTier: z.enum(["tier1", "tier2", "tier3"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return performUserAction(input.userId, {
        type: input.action,
        reason: input.reason,
        newRole: input.newRole,
        newTier: input.newTier,
      }, ctx.dbUserId);
    }),

  // Get platform user stats
  getStats: adminProcedure
    .query(async () => {
      return getPlatformUserStats();
    }),

  // Get audit log
  getAuditLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        offset: z.number().min(0).optional().default(0),
        action: z.string().optional(),
        userId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getAuditLog(
        input?.limit ?? 50,
        input?.offset ?? 0,
        {
          action: input?.action as "user.created" | undefined,
          userId: input?.userId,
        },
      );
    }),

  // Get audit log for a specific user
  getUserAuditLog: adminProcedure
    .input(z.object({ userId: z.string(), limit: z.number().optional().default(20) }))
    .query(async ({ input }) => {
      return getAuditLogForUser(input.userId, input.limit);
    }),
});
