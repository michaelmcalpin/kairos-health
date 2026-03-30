"use client";

import { useMemo } from "react";
import { trpc } from "@/lib/trpc";
import { DateRange } from "@/utils/dateRange";

export interface MeasurementRecord {
  id: string;
  date: string;
  weight: number;
  bodyFat: number;
  bmi: number;
  leanMass: number;
  waistCircumference: number;
  restingHR: number;
  systolic: number;
  diastolic: number;
  vo2Max: number;
  weightLbs: number | null;
  bodyFatPct: number | null;
  waistInches: number | null;
  chestInches: number | null;
  hipsInches: number | null;
  rightBicepInches: number | null;
  rightThighInches: number | null;
  source: string;
}

export interface UseMeasurementsReturn {
  records: MeasurementRecord[];
  latest: MeasurementRecord | null;
  isLoading: boolean;
}

export function useMeasurements(dateRange: DateRange): UseMeasurementsReturn {
  const startDate = dateRange.startDate.toISOString().split("T")[0];
  const endDate = dateRange.endDate.toISOString().split("T")[0];

  const { data: rawRecords, isLoading } = trpc.clientPortal.measurements.list.useQuery({
    startDate,
    endDate,
  });

  const records = useMemo<MeasurementRecord[]>(() => {
    if (!rawRecords) return [];
    return rawRecords.map((r) => ({
      id: r.id,
      date: r.date,
      weight: r.weightLbs ?? 0,
      bodyFat: r.bodyFatPct ?? 0,
      bmi: r.weightLbs ? Math.round(((r.weightLbs / 2.205) / Math.pow(1.75, 2)) * 10) / 10 : 0,
      leanMass: r.weightLbs && r.bodyFatPct ? Math.round(r.weightLbs * (1 - r.bodyFatPct / 100) * 10) / 10 : 0,
      waistCircumference: r.waistInches ?? 0,
      restingHR: (r as Record<string, unknown>).restingHr as number ?? 0,
      systolic: (r as Record<string, unknown>).systolic as number ?? 0,
      diastolic: (r as Record<string, unknown>).diastolic as number ?? 0,
      vo2Max: (r as Record<string, unknown>).vo2Max as number ?? 0,
      weightLbs: r.weightLbs,
      bodyFatPct: r.bodyFatPct,
      waistInches: r.waistInches,
      chestInches: r.chestInches,
      hipsInches: r.hipsInches,
      rightBicepInches: r.rightBicepInches,
      rightThighInches: r.rightThighInches,
      source: r.source ?? "manual",
    }));
  }, [rawRecords]);

  const latest = useMemo<MeasurementRecord | null>(() => {
    return records.length > 0 ? records[0] : null;
  }, [records]);

  return { records, latest, isLoading };
}
