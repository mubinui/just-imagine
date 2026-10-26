import { describe, expect, it } from 'vitest';
import {
  concurrencyLimit,
  isRateLimited,
  isTransientProviderError,
  withBackoff,
  withTransientRetry,
} from '../src/rate-limit';

const limited = () => Object.assign(new Error('Resource has been exhausted'), { status: 429 });

function clock() {
  let now = 0;
  const waits: number[] = [];
  return {
    waits,
    now: () => now,
    sleep: async (ms: number) => {
      waits.push(ms);
      now += ms;
    },
  };
}

describe('isRateLimited', () => {
  it('recognises 429, 503 and RESOURCE_EXHAUSTED, and nothing else', () => {
    expect(isRateLimited(limited())).toBe(true);
    expect(isRateLimited({ status: 503 })).toBe(true);
    expect(isRateLimited(new Error('{"status":"RESOURCE_EXHAUSTED"}'))).toBe(true);
    expect(isRateLimited(Object.assign(new Error('bad request'), { status: 400 }))).toBe(false);
    expect(isRateLimited(new Error('Model returned no image'))).toBe(false);
  });
});

describe('withBackoff', () => {
  it('retries rate-limited calls with growing waits until one succeeds', async () => {
    const c = clock();
    let calls = 0;
    const result = await withBackoff(
      async () => {
        if (++calls < 3) throw limited();
        return 'image';
      },
      { deadlineMs: 60000, random: () => 0.5, ...c },
    );
    expect(result).toBe('image');
    expect(calls).toBe(3);
    expect(c.waits[1]!).toBeGreaterThan(c.waits[0]!);
  });

  it('stops backing off when the signal is aborted', async () => {
    const c = clock();
    const controller = new AbortController();
    let calls = 0;
    await expect(
      withBackoff(
        async () => {
          calls++;
          controller.abort();
          throw limited();
        },
        { deadlineMs: 60000, signal: controller.signal, ...c },
      ),
    ).rejects.toThrow('exhausted');
    expect(calls).toBe(1);
    expect(c.waits).toEqual([]);
  });

  it('does not retry other errors', async () => {
    const c = clock();
    let calls = 0;
    await expect(
      withBackoff(
        async () => {
          calls++;
          throw new Error('Model returned no image');
        },
        { deadlineMs: 60000, ...c },
      ),
    ).rejects.toThrow('no image');
    expect(calls).toBe(1);
    expect(c.waits).toEqual([]);
  });

  it('stops before a wait would pass the deadline and rethrows the rate limit', async () => {
    const c = clock();
    let calls = 0;
    await expect(
      withBackoff(
        async () => {
          calls++;
          throw limited();
        },
        { deadlineMs: 10000, random: () => 0.5, ...c },
      ),
    ).rejects.toMatchObject({ status: 429 });
    expect(c.now()).toBeLessThanOrEqual(10000);
    expect(calls).toBeGreaterThan(1);
  });
});

describe('concurrencyLimit', () => {
  it('runs at most the limit at once and queues the rest in order', async () => {
    const run = concurrencyLimit(2);
    let active = 0,
      peak = 0;
    const order: number[] = [];
    const releases: (() => void)[] = [];
    const tasks = [0, 1, 2, 3].map((i) =>
      run(async () => {
        active++;
        peak = Math.max(peak, active);
        await new Promise<void>((resolve) => releases.push(resolve));
        order.push(i);
        active--;
        return i;
      }),
    );
    for (let i = 0; i < 4; i++) {
      await new Promise((r) => setTimeout(r, 0));
      releases.shift()?.();
    }
    expect(await Promise.all(tasks)).toEqual([0, 1, 2, 3]);
    expect(peak).toBe(2);
    expect(order).toEqual([0, 1, 2, 3]);
  });

  it('frees the slot when a task fails', async () => {
    const run = concurrencyLimit(1);
    await expect(run(async () => Promise.reject(new Error('boom')))).rejects.toThrow('boom');
    expect(await run(async () => 'next')).toBe('next');
  });
});

describe('isTransientProviderError', () => {
  it('accepts rate limits, timeouts and server errors but not rejections', () => {
    expect(isTransientProviderError(limited())).toBe(true);
    expect(isTransientProviderError({ status: 500 })).toBe(true);
    expect(isTransientProviderError({ status: 408 })).toBe(true);
    expect(isTransientProviderError(Object.assign(new Error('x'), { name: 'TimeoutError' }))).toBe(
      true,
    );
    expect(isTransientProviderError(new Error('request timed out'))).toBe(true);
    expect(isTransientProviderError(Object.assign(new Error('bad'), { status: 400 }))).toBe(false);
    expect(isTransientProviderError(new Error('unavailable'))).toBe(false);
  });
});

describe('withTransientRetry', () => {
  const gateway = () => Object.assign(new Error('DEADLINE_EXCEEDED'), { status: 504 });

  it('retries a transient error with backoff and never a client abort', async () => {
    const c = clock();
    let calls = 0;
    const result = await withTransientRetry(
      async () => {
        if (++calls < 3) throw gateway();
        return 'ok';
      },
      { deadlineMs: 120000, random: () => 0.5, now: c.now, sleep: c.sleep },
    );
    expect(result).toBe('ok');
    expect(calls).toBe(3);
    expect(c.waits).toEqual([1000, 2000]);

    const controller = new AbortController();
    controller.abort();
    let aborted = 0;
    await expect(
      withTransientRetry(
        async () => {
          aborted++;
          throw gateway();
        },
        { deadlineMs: 120000, signal: controller.signal, now: c.now, sleep: c.sleep },
      ),
    ).rejects.toMatchObject({ status: 504 });
    expect(aborted).toBe(1);
    expect(c.waits).toHaveLength(2);
  });

  it('fails at once on an error that is not transient', async () => {
    const c = clock();
    let calls = 0;
    await expect(
      withTransientRetry(
        async () => {
          calls++;
          throw Object.assign(new Error('bad request'), { status: 400 });
        },
        { deadlineMs: 120000, now: c.now, sleep: c.sleep },
      ),
    ).rejects.toThrow('bad request');
    expect(calls).toBe(1);
  });
});
