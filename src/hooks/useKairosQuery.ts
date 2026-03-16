"use client";

/**
 * useKairosQuery – a thin wrapper around tRPC's React Query hooks that
 * gracefully falls back to mock data when the tRPC endpoint errors (e.g.
 * when no database is connected yet).
 *
 * Pattern:
 *   const { data, isLoading } = useKairosQuery(
 *     trpc.client.glucose.list,           // tRPC procedure
 *     { startDate, endDate },             // input
 *     () => generateGlucoseData(start, end), // mock fallback
 *   );
 *
 * Once a real DB is live, the mock fallback is never reached and can be
 * removed in a cleanup pass.
 */

import { useMemo } from "react";

interface QueryResult<T> {
  data: T;
  isLoading: boolean;
  isError: boolean;
  isMock: boolean;
  error: unknown;
  refetch: () => void;
}

/**
 * Simple hook that provides mock data directly.
 * Used during development when tRPC backend has no live database.
 * When the DB is connected, replace useMockQuery calls with direct trpc.useQuery calls.
 */
export function useMockQuery<T>(
  mockFn: () => T,
  deps: unknown[] = []
): QueryResult<T> {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const data = useMemo(() => mockFn(), deps);

  return {
    data,
    isLoading: false,
    isError: false,
    isMock: true,
    error: null,
    refetch: () => {},
  };
}

/**
 * Hook for mutations that currently only operate on local state.
 * When the DB is connected, replace with trpc.useMutation.
 */
export function useMockMutation<TInput, TOutput>(
  mutationFn: (input: TInput) => TOutput
): {
  mutate: (input: TInput) => void;
  mutateAsync: (input: TInput) => Promise<TOutput>;
  isLoading: boolean;
  isPending: boolean;
} {
  return {
    mutate: (input: TInput) => { mutationFn(input); },
    mutateAsync: async (input: TInput) => mutationFn(input),
    isLoading: false,
    isPending: false,
  };
}
