/**
 * Retry wrapper for Anthropic API calls with exponential backoff.
 *
 * Retries on transient errors:
 *   - 529 Overloaded
 *   - 500 Internal Server Error
 *   - 502 Bad Gateway
 *   - 503 Service Unavailable
 */

const RETRYABLE_STATUS_CODES = new Set([529, 500, 502, 503]);
const MAX_RETRIES = 3;
const BASE_DELAY_MS = 2000; // 2s, 4s, 8s

/**
 * Extract an HTTP status code from an Anthropic SDK error.
 * The SDK throws an `APIError` with a `.status` property,
 * but we also check the error message as a fallback.
 */
function getStatusCode(err: unknown): number | null {
  if (err && typeof err === "object") {
    // Anthropic SDK APIError has a `status` property
    if ("status" in err && typeof (err as Record<string, unknown>).status === "number") {
      return (err as Record<string, unknown>).status as number;
    }
  }
  // Fallback: extract status from error message like "529 {...}"
  if (err instanceof Error) {
    const match = err.message.match(/\b(429|500|502|503|529)\b/);
    if (match) return parseInt(match[1], 10);
  }
  return null;
}

function isRetryableError(err: unknown): boolean {
  const status = getStatusCode(err);
  return status !== null && RETRYABLE_STATUS_CODES.has(status);
}

/**
 * Calls `fn` and retries up to `MAX_RETRIES` times on transient Anthropic API errors.
 *
 * @param fn        - An async function that makes the Anthropic API call.
 * @param label     - A human-readable label for log messages (e.g. "Report Generation").
 * @returns         - The resolved value of `fn`.
 * @throws          - The original error if all retries are exhausted or the error is not retryable.
 */
export async function callWithRetry<T>(
  fn: () => T | Promise<T>,
  label: string = "Anthropic API call",
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (!isRetryableError(err) || attempt === MAX_RETRIES) {
        throw err;
      }

      const delayMs = BASE_DELAY_MS * Math.pow(2, attempt); // 2s, 4s, 8s
      const status = getStatusCode(err);
      console.warn(
        `[${label}] Anthropic API error (status ${status}), retrying in ${delayMs}ms (attempt ${attempt + 1}/${MAX_RETRIES})...`,
      );

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  // Should not reach here, but just in case
  throw lastError;
}
