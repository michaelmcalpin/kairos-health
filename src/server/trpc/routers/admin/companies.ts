import { z } from "zod";
import { router, superAdminProcedure as adminProcedure } from "@/server/trpc";
import {
  listCompanies,
  getCompany,
  getCompanyStats,
  getCompanyTrainers,
  getCompanyClients,
  createCompany,
  updateCompany,
  performCompanyAction,
  getCompanyAuditLog,
} from "@/lib/company-ops/engine";

export const adminCompaniesRouter = router({
  // List companies with pagination and filters
  list: adminProcedure
    .input(
      z.object({
        search: z.string().optional().default(""),
        status: z.enum(["all", "active", "inactive", "suspended", "onboarding"]).optional().default("all"),
        sortBy: z.enum(["name", "createdAt", "trainerCount", "clientCount"]).optional().default("createdAt"),
        sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
        page: z.number().min(1).optional().default(1),
        pageSize: z.number().min(1).max(100).optional().default(20),
      }).optional()
    )
    .query(async ({ input }) => {
      return listCompanies(input ?? {});
    }),

  // Get single company detail
  get: adminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      const company = getCompany(input.companyId);
      if (!company) throw new Error("Company not found");
      return company;
    }),

  // Get platform-wide company stats
  getStats: adminProcedure
    .query(async () => {
      return getCompanyStats();
    }),

  // Get trainers for a company
  getTrainers: adminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      return getCompanyTrainers(input.companyId);
    }),

  // Get clients for a company
  getClients: adminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      return getCompanyClients(input.companyId);
    }),

  // Create a new company
  create: adminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        website: z.string().max(500).optional(),
        emailFromName: z.string().max(255).optional(),
        emailFooter: z.string().max(1000).optional(),
        maxTrainers: z.number().min(1).max(1000).optional(),
        maxClients: z.number().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return createCompany(input, ctx.dbUserId);
    }),

  // Update an existing company
  update: adminProcedure
    .input(
      z.object({
        companyId: z.string(),
        name: z.string().min(1).max(255).optional(),
        slug: z.string().min(1).max(100).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        website: z.string().max(500).optional(),
        emailFromName: z.string().max(255).optional(),
        emailFooter: z.string().max(1000).optional(),
        logoUrl: z.string().nullable().optional(),
        maxTrainers: z.number().min(1).max(1000).optional(),
        maxClients: z.number().min(1).max(10000).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, ...updates } = input;
      return updateCompany(companyId, updates, ctx.dbUserId);
    }),

  // Perform company action (suspend, reactivate, delete)
  performAction: adminProcedure
    .input(
      z.object({
        companyId: z.string(),
        action: z.enum(["suspend", "reactivate", "delete"]),
        reason: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return performCompanyAction(input.companyId, input.action, input.reason, ctx.dbUserId);
    }),

  // Get audit log for companies
  getAuditLog: adminProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).optional().default(50),
        companyId: z.string().optional(),
      }).optional()
    )
    .query(async ({ input }) => {
      return getCompanyAuditLog(input?.limit ?? 50, input?.companyId);
    }),
});
