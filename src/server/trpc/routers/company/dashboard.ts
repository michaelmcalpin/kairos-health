import { z } from "zod";
import { router, companyAdminProcedure } from "@/server/trpc";
import {
  getCompany,
  getCompanyTrainers,
  getCompanyClients,
} from "@/lib/company-ops/engine";

export const companyDashboardRouter = router({
  // Get company overview for the logged-in company admin
  getOverview: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      const company = getCompany(input.companyId);
      if (!company) throw new Error("Company not found");

      const trainers = getCompanyTrainers(input.companyId);
      const clients = getCompanyClients(input.companyId);

      const totalCapacity = trainers.reduce((s, t) => s + t.capacity, 0);
      const totalClientSlots = trainers.reduce((s, t) => s + t.clientCount, 0);
      const avgRating = trainers.length > 0
        ? trainers.reduce((s, t) => s + t.rating, 0) / trainers.length
        : 0;

      return {
        company,
        stats: {
          trainerCount: trainers.length,
          clientCount: clients.length,
          totalCapacity,
          utilization: totalCapacity > 0 ? Math.round((totalClientSlots / totalCapacity) * 100) : 0,
          avgRating: parseFloat(avgRating.toFixed(1)),
          estMrr: clients.length * 200,
        },
        topTrainers: trainers
          .sort((a, b) => b.rating - a.rating)
          .slice(0, 5),
        recentClients: clients.slice(0, 10),
      };
    }),

  // Get trainers for this company
  getTrainers: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      return getCompanyTrainers(input.companyId);
    }),

  // Get clients for this company
  getClients: companyAdminProcedure
    .input(z.object({ companyId: z.string() }))
    .query(async ({ input }) => {
      return getCompanyClients(input.companyId);
    }),
});
