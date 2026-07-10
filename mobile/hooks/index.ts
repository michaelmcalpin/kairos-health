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

// Device Connection (OAuth lifecycle)
export { useDeviceConnection } from "./useDeviceConnection";
export type { DeviceProvider } from "./useDeviceConnection";

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

// Goals
export {
  useGoals,
  useGoalDetail,
  useCreateGoal,
  useAddCheckpoint,
  useUpdateGoalStatus,
  useDeleteGoal,
} from "./useGoals";

// Check-in / Daily Log
export {
  useTodayCheckin,
  useSubmitCheckin,
  useUpdateCheckin,
  useCheckinHistory,
} from "./useCheckin";

// AI Insights
export {
  useHealthAnalysis,
  useAnalysisHistory,
  useAskQuestion,
} from "./useInsights";

// HealthKit / Health Sync
export {
  useHealthKitStatus,
  useHealthSync,
} from "./useHealthSync";
