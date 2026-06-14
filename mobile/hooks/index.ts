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

// Notifications
export {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllRead,
  useDismissNotification,
} from "./useNotifications";

// Connected Devices
export {
  useConnectedDevices,
  useAvailableDevices,
  useSyncDevice,
  useDisconnectDevice,
} from "./useDevices";

// Manual Data Entry
export {
  useRecentEntries,
  useLogEntry,
  useEntryTypes,
} from "./useDataEntry";

// Global Search
export {
  useGlobalSearch,
  useRecentSearches,
} from "./useSearch";

// AI Insights
export {
  useHealthAnalysis,
  useAnalysisHistory,
  useAskQuestion,
} from "./useInsights";
