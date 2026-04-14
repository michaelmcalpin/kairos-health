import { z } from "zod";

// Shared pagination constants
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 20,
  MAX_PAGE_SIZE: 100,
  DEFAULT_LIMIT: 20,
  DEFAULT_OFFSET: 0,
  MIN_PAGE: 1,
  LIST_DEFAULT: 50,
  RECENT_DEFAULT: 10,
} as const;

// Shared date range input used across all time-series queries
export const dateRangeInput = z.object({
  startDate: z.string().describe("ISO date string (YYYY-MM-DD)"),
  endDate: z.string().describe("ISO date string (YYYY-MM-DD)"),
});

// Shared pagination input
export const paginationInput = z.object({
  limit: z.number().min(1).max(PAGINATION.MAX_PAGE_SIZE).default(PAGINATION.DEFAULT_LIMIT),
  offset: z.number().min(0).default(PAGINATION.DEFAULT_OFFSET),
});

// Combined date range + pagination
export const dateRangePaginatedInput = dateRangeInput.merge(paginationInput);
