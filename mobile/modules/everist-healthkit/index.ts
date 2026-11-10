/**
 * JS bindings for the EveristHealthKit native module (ios/EveristHealthKitModule.swift).
 * Returns null-safe fallbacks when the module isn't in the build (Android,
 * Expo Go, or an old binary), so callers never crash.
 */
import { Platform } from "react-native";
import { requireOptionalNativeModule } from "expo-modules-core";

export interface DailyStat { date: string; value: number }
export interface CategorySample { start: number; end: number; value: number; source: string; sourceId: string }
export interface WorkoutSample {
  id: string;
  activityType: number;
  start: number;
  end: number;
  durationMin: number;
  energyKcal?: number;
  distanceM?: number;
  avgHr?: number;
  maxHr?: number;
  source: string;
}

interface NativeModule {
  isAvailable(): boolean;
  requestAuthorization(quantity: string[], category: string[]): Promise<boolean>;
  dailyStatistics(id: string, unit: string, agg: string, startMs: number, endMs: number): Promise<DailyStat[]>;
  categorySamples(id: string, startMs: number, endMs: number, limit: number): Promise<CategorySample[]>;
  workouts(startMs: number, endMs: number, limit: number): Promise<WorkoutSample[]>;
}

const Native: NativeModule | null =
  Platform.OS === "ios" ? requireOptionalNativeModule<NativeModule>("EveristHealthKit") : null;

/** True when this build includes the module and the device has Apple Health. */
export function isAvailable(): boolean {
  try { return !!Native && Native.isAvailable(); } catch { return false; }
}

export async function requestAuthorization(quantity: string[], category: string[]): Promise<boolean> {
  if (!Native) return false;
  return Native.requestAuthorization(quantity, category);
}

export async function dailyStatistics(id: string, unit: string, agg: string, start: Date, end: Date): Promise<DailyStat[]> {
  if (!Native) return [];
  try { return await Native.dailyStatistics(id, unit, agg, start.getTime(), end.getTime()); } catch { return []; }
}

export async function categorySamples(id: string, start: Date, end: Date, limit = 0): Promise<CategorySample[]> {
  if (!Native) return [];
  try { return await Native.categorySamples(id, start.getTime(), end.getTime(), limit); } catch { return []; }
}

export async function workouts(start: Date, end: Date, limit = 100): Promise<WorkoutSample[]> {
  if (!Native) return [];
  try { return await Native.workouts(start.getTime(), end.getTime(), limit); } catch { return []; }
}
