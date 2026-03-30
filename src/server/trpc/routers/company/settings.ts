import { z } from "zod";
import { router, companyAdminProcedure } from "@/server/trpc";
import { companies } from "@/server/db/schema";
import { eq } from "drizzle-orm";

export const companySettingsRouter = router({
  // Get company settings from the real DB
  get: companyAdminProcedure.query(async ({ ctx }) => {
    const companyId = ctx.companyId;
    if (!companyId) throw new Error("No company assigned");

    const company = await ctx.db.query.companies.findFirst({
      where: eq(companies.id, companyId),
    });
    if (!company) throw new Error("Company not found");

    return {
      id: company.id,
      name: company.name,
      slug: company.slug,
      website: company.website ?? "",
      brandColor: company.brandColor ?? "#D4AF37",
      logoUrl: company.logoUrl,
      emailFromName: company.emailFromName ?? "",
      emailFooter: company.emailFooter ?? "",
      maxTrainers: company.maxTrainers ?? 10,
      maxClients: company.maxClients ?? 100,
    };
  }),

  // Update company settings (company admin can edit their own company)
  update: companyAdminProcedure
    .input(
      z.object({
        name: z.string().min(1).max(255).optional(),
        website: z.string().max(500).optional(),
        brandColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/).optional(),
        emailFromName: z.string().max(255).optional(),
        emailFooter: z.string().max(1000).optional(),
        logoUrl: z.string().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const companyId = ctx.companyId;
      if (!companyId) throw new Error("No company assigned");

      const [updated] = await ctx.db
        .update(companies)
        .set({ ...input, updatedAt: new Date() })
        .where(eq(companies.id, companyId))
        .returning();

      return updated;
    }),
});
