/**
 * Barrel exports for all custom hooks.
 *
 * Usage:
 *   import { useHealthScore, useActiveProtocol, useAppointments } from "@/hooks";
 */

// Health / Biometrics
export {
  useHealthScore,
  useDashboardOverview,
  useSparklines,
  useAlerts,
  useBiometricCategories,
} from "./useHealthData";

// Protocols / Supplements
export {
  useActiveProtocol,
  useProtocolAdherence,
  useLogAdherence,
  useDashboardProtocol,
  useWeeklyAdherence,
} from "./useProtocols";

// Appointments / Scheduling
export {
  useAppointments,
  useUpcomingAppointments,
  usePastAppointments,
  useAppointmentDetail,
  useSessionTypes,
  useCancelAppointment,
  useTodaySchedule,
} from "./useAppointments";
