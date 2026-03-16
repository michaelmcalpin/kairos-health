"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { DatePeriod } from "@/utils/dateRange";

export interface DateRangeNavigatorProps {
  availablePeriods: DatePeriod[];
  selectedPeriod: DatePeriod;
  onPeriodChange: (period: DatePeriod) => void;
  formattedRange: string;
  isCurrent: boolean;
  canForward: boolean;
  onBack: () => void;
  onForward: () => void;
  onToday: () => void;
}

const periodLabels: Record<DatePeriod, string> = {
  day: "Day",
  week: "Week",
  month: "Month",
  quarter: "Quarter",
  year: "Year",
};

export function DateRangeNavigator({
  availablePeriods,
  selectedPeriod,
  onPeriodChange,
  formattedRange,
  isCurrent,
  canForward,
  onBack,
  onForward,
  onToday,
}: DateRangeNavigatorProps) {
  return (
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      {/* Period tabs */}
      <div className="flex gap-1 bg-kairos-card rounded-kairos-sm p-1">
        {availablePeriods.map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`px-3 py-1.5 text-xs font-heading font-semibold rounded-kairos-sm transition-colors ${
              selectedPeriod === p
                ? "bg-kairos-gold text-kairos-royal-dark"
                : "text-kairos-silver-dark hover:text-white"
            }`}
          >
            {periodLabels[p]}
          </button>
        ))}
      </div>

      {/* Navigation arrows + date label */}
      <div className="flex items-center gap-2">
        <button
          onClick={onBack}
          className="p-1.5 rounded-kairos-sm hover:bg-kairos-card transition-colors text-kairos-silver-dark hover:text-white"
          aria-label="Previous period"
        >
          <ChevronLeft size={18} />
        </button>

        <span className="text-sm font-heading font-semibold text-white min-w-[140px] text-center">
          {formattedRange}
        </span>

        <button
          onClick={onForward}
          disabled={!canForward}
          className={`p-1.5 rounded-kairos-sm transition-colors ${
            canForward
              ? "hover:bg-kairos-card text-kairos-silver-dark hover:text-white"
              : "text-kairos-silver-dark/30 cursor-not-allowed"
          }`}
          aria-label="Next period"
        >
          <ChevronRight size={18} />
        </button>

        {!isCurrent && (
          <button
            onClick={onToday}
            className="ml-1 px-2.5 py-1 text-xs font-heading font-semibold rounded-kairos-sm bg-kairos-gold/10 text-kairos-gold hover:bg-kairos-gold/20 transition-colors"
          >
            Today
          </button>
        )}
      </div>
    </div>
  );
}
