"use client";

import { useMockQuery } from "@/hooks/useKairosQuery";
import { DateRange } from "@/utils/dateRange";
import { generateMeasurementData, MeasurementRecord } from "@/utils/mockDataGenerator";

export interface UseMeasurementsReturn {
  records: MeasurementRecord[];
  latest: MeasurementRecord | null;
  isLoading: boolean;
  isMock: boolean;
}

/**
 * Hook for body measurements – tRPC procedures:
 *   trpc.client.measurements.list   → records
 *   trpc.client.measurements.latest → latest
 */
export function useMeasurements(dateRange: DateRange): UseMeasurementsReturn {
  const { data: records, isLoading, isMock } = useMockQuery(
    () => generateMeasurementData(dateRange.startDate, dateRange.endDate),
    [dateRange.startDate.getTime(), dateRange.endDate.getTime()]
  );

  const latest = records.length > 0 ? records[0] : null;

  return { records, latest, isLoading, isMock };
}
