"use client";

import { useMemo } from "react";
import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import { generateNutritionData, NutritionRecord } from "@/utils/mockDataGenerator";

export interface NutritionStats {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  water: number;
}

export interface UseNutritionReturn {
  records: NutritionRecord[];
  stats: NutritionStats;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for nutrition data – tRPC procedures:
 *   trpc.client.nutrition.listMeals     → records
 *   trpc.client.nutrition.dailySummary  → stats aggregation
 */
export function useNutrition(dateRange: DateRange): UseNutritionReturn {
  const { data: records, isLoading, isMock } = useMockQuery(
    () => generateNutritionData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const stats = useMemo<NutritionStats>(() => {
    if (records.length === 0)
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 };
    const len = records.length;
    return {
      calories: Math.round(records.reduce((s, r) => s + r.calories, 0) / len),
      protein: Math.round(records.reduce((s, r) => s + r.protein, 0) / len),
      carbs: Math.round(records.reduce((s, r) => s + r.carbs, 0) / len),
      fat: Math.round(records.reduce((s, r) => s + r.fat, 0) / len),
      fiber: Math.round(records.reduce((s, r) => s + r.fiber, 0) / len),
      water: Math.round(records.reduce((s, r) => s + r.water, 0) / len),
    };
  }, [records]);

  return { records, stats, isLoading, isMock };
}
