import { z } from "zod";

// Shared date range input used across all time-series queries
export const dateRangeInput = z.object({
  startDate: z.string().describe("ISO date string (YYYY-MM-DD)"),
  endDate: z.string().describe("ISO date string (YYYY-MM-DD)"),
});

// Shared pagination input
export const paginationInput = z.object({
  limit: z.number().min(1).max(100).default(20),
  offset: z.number().min(0).default(0),
});

// Combined date range + pagination
export const dateRangePaginatedInput = dateRangeInput.merge(paginationInput);
