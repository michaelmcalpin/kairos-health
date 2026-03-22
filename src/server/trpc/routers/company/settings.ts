import { z } from "zod";
import { router, companyAdminProcedure } from "@/server/trpc";
import {
  getCompany,
  updateCompany,
} from "@/lib/company-ops/engine";

export const companySettingsRouter = router({
  // Get company settings
  get: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      const company = getCompany(input.companyId);
      if (!company) throw new Error("Company not found");
      return {
        name: company.name,
        slug: company.slug,
        website: company.website,
        brandColor: company.brandColor,
        logoUrl: company.logoUrl,
        emailFromName: company.emailFromName,
        emailFooter: company.emailFooter,
        maxTrainers: company.maxTrainers,
        maxClients: company.maxClients,
      };
    }),

  // Update company settings (company admin can edit their own company)
  update: companyAdminProcedure
    .input(
      z.object({
        companyId: z.string(),
        name: z.string().min(1).max(255).optional(),
        website: z.string().max(500).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        emailFromName: z.string().max(255).optional(),
        emailFooter: z.string().max(1000).optional(),
        logoUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { companyId, ...updates } = input;
      return updateCompany(companyId, updates, ctx.dbUserId);
    }),
});
