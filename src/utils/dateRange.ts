export type DatePeriod = "day" | "week" | "month" | "quarter" | "year";

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

/** Get the start and end dates for a period containing the given date */
export function getDateRange(anchorDate: Date, period: DatePeriod): DateRange {
  const d = new Date(anchorDate);
  d.setHours(0, 0, 0, 0);

  switch (period) {
    case "day":
      return {
        startDate: new Date(d),
        endDate: new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999),
      };

    case "week": {
      // ISO week: Monday = start
      const day = d.getDay();
      const mondayOffset = day === 0 ? -6 : 1 - day;
      const monday = new Date(d);
      monday.setDate(d.getDate() + mondayOffset);
      monday.setHours(0, 0, 0, 0);
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);
      sunday.setHours(23, 59, 59, 999);
      return { startDate: monday, endDate: sunday };
    }

    case "month":
      return {
        startDate: new Date(d.getFullYear(), d.getMonth(), 1),
        endDate: new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999),
      };

    case "quarter": {
      const qMonth = Math.floor(d.getMonth() / 3) * 3;
      return {
        startDate: new Date(d.getFullYear(), qMonth, 1),
        endDate: new Date(d.getFullYear(), qMonth + 3, 0, 23, 59, 59, 999),
      };
    }

    case "year":
      return {
        startDate: new Date(d.getFullYear(), 0, 1),
        endDate: new Date(d.getFullYear(), 11, 31, 23, 59, 59, 999),
      };
  }
}

/** Navigate to the previous or next period */
export function navigatePeriod(
  anchorDate: Date,
  period: DatePeriod,
  direction: "back" | "forward"
): Date {
  const d = new Date(anchorDate);
  const delta = direction === "back" ? -1 : 1;

  switch (period) {
    case "day":
      d.setDate(d.getDate() + delta);
      break;
    case "week":
      d.setDate(d.getDate() + delta * 7);
      break;
    case "month":
      d.setMonth(d.getMonth() + delta);
      break;
    case "quarter":
      d.setMonth(d.getMonth() + delta * 3);
      break;
    case "year":
      d.setFullYear(d.getFullYear() + delta);
      break;
  }
  return d;
}

/** Format a date range for display */
export function formatDateRange(startDate: Date, endDate: Date, period: DatePeriod): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const fullMonths = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];

  switch (period) {
    case "day":
      return `${months[startDate.getMonth()]} ${startDate.getDate()}, ${startDate.getFullYear()}`;

    case "week": {
      const sameMonth = startDate.getMonth() === endDate.getMonth();
      if (sameMonth) {
        return `${months[startDate.getMonth()]} ${startDate.getDate()}–${endDate.getDate()}, ${startDate.getFullYear()}`;
      }
      return `${months[startDate.getMonth()]} ${startDate.getDate()} – ${months[endDate.getMonth()]} ${endDate.getDate()}, ${endDate.getFullYear()}`;
    }

    case "month":
      return `${fullMonths[startDate.getMonth()]} ${startDate.getFullYear()}`;

    case "quarter": {
      const q = Math.floor(startDate.getMonth() / 3) + 1;
      return `Q${q} ${startDate.getFullYear()}`;
    }

    case "year":
      return `${startDate.getFullYear()}`;
  }
}

/** Check if the given range contains today */
export function isCurrentPeriod(startDate: Date, endDate: Date): boolean {
  const now = new Date();
  now.setHours(12, 0, 0, 0);
  return now >= startDate && now <= endDate;
}

/** Check if navigating forward would go past today */
export function canGoForward(anchorDate: Date, period: DatePeriod): boolean {
  const nextDate = navigatePeriod(anchorDate, period, "forward");
  const nextRange = getDateRange(nextDate, period);
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  return nextRange.startDate <= today;
}

/** Get number of days in a date range */
export function getDaysInRange(startDate: Date, endDate: Date): number {
  return Math.round((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
}

/** Generate array of dates between start and end */
export function getDatesBetween(startDate: Date, endDate: Date): Date[] {
  const dates: Date[] = [];
  const current = new Date(startDate);
  current.setHours(0, 0, 0, 0);

  while (current <= endDate) {
    dates.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }
  return dates;
}

/** Format a single date as short string */
export function formatShortDate(date: Date): string {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${months[date.getMonth()]} ${date.getDate()}`;
}

/** Get day label (Mon, Tue, etc.) */
export function getDayLabel(date: Date): string {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return days[date.getDay()];
}
