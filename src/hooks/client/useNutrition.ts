"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface NutritionRecord {
  id: string;
  date: string;
  dateLabel: string;
  mealType: string;
  items: Array<{
    foodId: string;
    name: string;
    quantity: number;
    unit: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }>;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber: number;
  photoUrl: string | null;
  createdAt: Date;
}

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
}

export function useNutrition(dateRange: DateRange): UseNutritionReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: rawMeals, isLoading: mealsLoading } = trpc.clientPortal.nutrition.listMeals.useQuery({
    startDate,
    endDate,
  });

  const { data: rawDailySummaries, isLoading: summariesLoading } = trpc.clientPortal.nutrition.dailySummary.useQuery({
    startDate,
    endDate,
  });

  const records = useMemo<NutritionRecord[]>(() => {
    if (!rawMeals) return [];
    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    return rawMeals.map((m) => ({
      id: m.id,
      date: m.date,
      dateLabel: days[new Date(m.date + "T12:00:00").getDay()],
      mealType: m.mealType as string,
      items: m.items ?? [],
      calories: m.totalCalories ?? 0,
      protein: m.totalProtein ?? 0,
      carbs: m.totalCarbs ?? 0,
      fat: m.totalFat ?? 0,
      fiber: 0,
      photoUrl: m.photoUrl,
      createdAt: new Date(m.createdAt),
    }));
  }, [rawMeals]);

  const stats = useMemo<NutritionStats>(() => {
    if (!rawDailySummaries || rawDailySummaries.length === 0) {
      return { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, water: 0 };
    }

    const len = rawDailySummaries.length;
    return {
      calories: Math.round(rawDailySummaries.reduce((s, r) => s + r.totalCalories, 0) / len),
      protein: Math.round(rawDailySummaries.reduce((s, r) => s + r.totalProtein, 0) / len),
      carbs: Math.round(rawDailySummaries.reduce((s, r) => s + r.totalCarbs, 0) / len),
      fat: Math.round(rawDailySummaries.reduce((s, r) => s + r.totalFat, 0) / len),
      fiber: Math.round(rawDailySummaries.reduce((s, r) => s + r.totalFiber, 0) / len),
      water: 0,
    };
  }, [rawDailySummaries]);

  return { records, stats, isLoading: mealsLoading || summariesLoading };
}
