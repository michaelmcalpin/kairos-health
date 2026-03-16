"use client";

import { useState, useCallback, useMemo } from "react";
import {
  DatePeriod,
  DateRange,
  getDateRange,
  navigatePeriod,
  canGoForward,
  formatDateRange,
  isCurrentPeriod,
  getDaysInRange,
} from "@/utils/dateRange";

export interface UseDateRangeOptions {
  initialPeriod?: DatePeriod;
  initialDate?: Date;
}

export interface UseDateRangeReturn {
  period: DatePeriod;
  setPeriod: (period: DatePeriod) => void;
  anchorDate: Date;
  dateRange: DateRange;
  formattedRange: string;
  isCurrent: boolean;
  canForward: boolean;
  daysInRange: number;
  goBack: () => void;
  goForward: () => void;
  goToToday: () => void;
}

export function useDateRange(options: UseDateRangeOptions = {}): UseDateRangeReturn {
  const { initialPeriod = "day", initialDate } = options;
  const [period, setPeriodState] = useState<DatePeriod>(initialPeriod);
  const [anchorDate, setAnchorDate] = useState<Date>(initialDate ?? new Date());

  const dateRange = useMemo(() => getDateRange(anchorDate, period), [anchorDate, period]);

  const formattedRange = useMemo(
    () => formatDateRange(dateRange.startDate, dateRange.endDate, period),
    [dateRange, period]
  );

  const isCurrent = useMemo(
    () => isCurrentPeriod(dateRange.startDate, dateRange.endDate),
    [dateRange]
  );

  const canForward = useMemo(() => canGoForward(anchorDate, period), [anchorDate, period]);

  const daysInRange = useMemo(
    () => getDaysInRange(dateRange.startDate, dateRange.endDate),
    [dateRange]
  );

  const goBack = useCallback(() => {
    setAnchorDate((prev) => navigatePeriod(prev, period, "back"));
  }, [period]);

  const goForward = useCallback(() => {
    if (canGoForward(anchorDate, period)) {
      setAnchorDate((prev) => navigatePeriod(prev, period, "forward"));
    }
  }, [anchorDate, period]);

  const goToToday = useCallback(() => {
    setAnchorDate(new Date());
  }, []);

  const setPeriod = useCallback((newPeriod: DatePeriod) => {
    setPeriodState(newPeriod);
    // Reset to today when switching periods
    setAnchorDate(new Date());
  }, []);

  return {
    period,
    setPeriod,
    anchorDate,
    dateRange,
    formattedRange,
    isCurrent,
    canForward,
    daysInRange,
    goBack,
    goForward,
    goToToday,
  };
}
