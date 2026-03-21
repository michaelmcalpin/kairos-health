import { router } from "@/server/trpc";
import { authRouter } from "./auth";

// Client routers
import { clientDashboardRouter } from "./client/dashboard";
import { clientAlertsRouter } from "./client/alerts";
import { clientGlucoseRouter } from "./client/glucose";
import { clientSleepRouter } from "./client/sleep";
import { clientMeasurementsRouter } from "./client/measurements";
import { clientNutritionRouter } from "./client/nutrition";
import { clientWorkoutsRouter } from "./client/workouts";
import { clientSupplementsRouter } from "./client/supplements";
import { clientFastingRouter } from "./client/fasting";
import { clientCheckinRouter } from "./client/checkin";
import { clientLabsRouter } from "./client/labs";
import { clientPaymentsRouter } from "./client/payments";
import { clientInsightsRouter } from "./client/insights";
import { clientNotificationsRouter } from "./client/notifications";
import { clientOnboardingRouter } from "./client/onboarding";
import { clientImportsRouter } from "./client/imports";
import { clientGoalsRouter } from "./client/goals";
import { clientMessagingRouter } from "./client/messaging";
import { clientSchedulingRouter } from "./client/scheduling";

// Coach routers
import { coachDashboardRouter } from "./coach/dashboard";
import { coachClientsRouter } from "./coach/clients";
import { coachAlertsRouter } from "./coach/alerts";
import { coachScheduleRouter } from "./coach/schedule";
import { coachRevenueRouter } from "./coach/revenue";
import { coachMessagingRouter } from "./coach/messaging";

// Admin routers
import { adminDashboardRouter } from "./admin/dashboard";
import { adminAnalyticsRouter } from "./admin/analytics";
import { adminRevenueRouter } from "./admin/revenue";
import { adminPlatformRouter } from "./admin/platform";
import { adminUsersRouter } from "./admin/users";
import { adminCompaniesRouter } from "./admin/companies";

export const appRouter = router({
  auth: authRouter,
  client: router({
    dashboard: clientDashboardRouter,
    alerts: clientAlertsRouter,
    glucose: clientGlucoseRouter,
    sleep: clientSleepRouter,
    measurements: clientMeasurementsRouter,
    nutrition: clientNutritionRouter,
    workouts: clientWorkoutsRouter,
    supplements: clientSupplementsRouter,
    fasting: clientFastingRouter,
    checkin: clientCheckinRouter,
    labs: clientLabsRouter,
    payments: clientPaymentsRouter,
    insights: clientInsightsRouter,
    notifications: clientNotificationsRouter,
    onboarding: clientOnboardingRouter,
    imports: clientImportsRouter,
    goals: clientGoalsRouter,
    messaging: clientMessagingRouter,
    scheduling: clientSchedulingRouter,
  }),
  coach: router({
    dashboard: coachDashboardRouter,
    clients: coachClientsRouter,
    alerts: coachAlertsRouter,
    schedule: coachScheduleRouter,
    revenue: coachRevenueRouter,
    messaging: coachMessagingRouter,
  }),
  admin: router({
    dashboard: adminDashboardRouter,
    analytics: adminAnalyticsRouter,
    revenue: adminRevenueRouter,
    platform: adminPlatformRouter,
    users: adminUsersRouter,
    companies: adminCompaniesRouter,
  }),
});

export type AppRouter = typeof appRouter;
