/** A provider's temporary refusal: rate limited (429, RESOURCE_EXHAUSTED) or briefly unavailable (503). */
export function isRateLimited(error: unknown): boolean {
  const status =
    error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
  if (status === 429 || status === 503) return true;
  return error instanceof Error && error.message.includes('RESOURCE_EXHAUSTED');
}

interface RetryOptions {
  deadlineMs: number;
  baseMs?: number;
  maxWaitMs?: number;
  random?: () => number;
  now?: () => number;
  sleep?: (ms: number) => Promise<void>;
  /** Once aborted, the last error is rethrown instead of waiting. */
  signal?: AbortSignal;
}

async function retryWithBackoff<T>(
  call: () => Promise<T>,
  options: RetryOptions,
  shouldRetry: (error: unknown) => boolean,
  onRetry?: (error: unknown) => void,
): Promise<T> {
  const {
    deadlineMs,
    baseMs = 1000,
    maxWaitMs = 16000,
    random = Math.random,
    now = Date.now,
    sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms)),
  } = options;
  const start = now();
  for (let attempt = 0; ; attempt++) {
    try {
      return await call();
    } catch (error) {
      if (!shouldRetry(error)) throw error;
      const wait = Math.round(Math.min(maxWaitMs, baseMs * 2 ** attempt) * (0.5 + random()));
      if (options.signal?.aborted) throw error;
      if (now() + wait - start > deadlineMs) throw error;
      onRetry?.(error);
      await sleep(wait);
    }
  }
}

/**
 * Retries rate-limited calls with exponential backoff and jitter, as Vertex AI recommends for
 * its shared capacity. Other errors fail at once, and no wait starts that would end after
 * `deadlineMs` from the first attempt; the last rate-limit error is rethrown instead.
 */
export function withBackoff<T>(call: () => Promise<T>, options: RetryOptions): Promise<T> {
  return retryWithBackoff(call, options, isRateLimited);
}

/**
 * The same backoff, but for every transient provider error (rate limit, timeout, 5xx). A
 * deliberate abort is never retried: once `signal` is aborted the error is rethrown at once.
 */
export function withTransientRetry<T>(
  call: () => Promise<T>,
  options: RetryOptions,
  onRetry?: (error: unknown) => void,
): Promise<T> {
  return retryWithBackoff(call, options, isTransientProviderError, onRetry);
}

/** Lets at most `limit` tasks run at once; the rest wait in arrival order. */
export function concurrencyLimit(limit: number) {
  let active = 0;
  const waiting: (() => void)[] = [];
  return async <T>(task: () => Promise<T>): Promise<T> => {
    if (active >= limit) await new Promise<void>((resolve) => waiting.push(resolve));
    active++;
    try {
      return await task();
    } finally {
      active--;
      waiting.shift()?.();
    }
  };
}

/** Worth one more try: a rate limit, a timeout, or a server-side failure (408, 429, 5xx). */
export function isTransientProviderError(error: unknown): boolean {
  if (isRateLimited(error)) return true;
  const status =
    error && typeof error === 'object' && 'status' in error ? Number(error.status) : undefined;
  if (status === 408 || (status !== undefined && status >= 500)) return true;
  if (!(error instanceof Error)) return false;
  return (
    error.name === 'TimeoutError' ||
    error.name === 'AbortError' ||
    /timed? ?out|aborted/i.test(error.message)
  );
}
