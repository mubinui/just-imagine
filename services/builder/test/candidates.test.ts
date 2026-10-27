import { describe, it, expect } from 'vitest';
import { raceCandidates, type Candidate } from '../src/candidates';

describe('raceCandidates', () => {
  it('returns the first passing candidate and aborts the other', async () => {
    const aborted: number[] = [];
    const result = await raceCandidates<number>(
      2,
      (signal, i) =>
        new Promise((resolve) => {
          signal.addEventListener('abort', () => aborted.push(i));
          setTimeout(
            () =>
              resolve(
                i === 1
                  ? { ok: true, value: i }
                  : { ok: false, failure: 'x', diagnostic: { code: 'SCRIPT_OUTPUT' } },
              ),
            i === 1 ? 5 : 50,
          );
        }),
    );
    expect(result).toEqual({ ok: true, value: 1 });
    expect(aborted).toEqual([0]);
  });

  it('returns every failure in index order when nobody passes', async () => {
    const result = await raceCandidates<number>(
      2,
      (_signal, i) =>
        new Promise((resolve) =>
          // The second candidate fails first; the order still follows the index.
          setTimeout(
            () =>
              resolve({
                ok: false,
                failure: `failure ${i}`,
                diagnostic: { code: 'SCRIPT_STATIC', attempt: i + 1 },
              }),
            i === 0 ? 30 : 5,
          ),
        ),
    );
    expect(Array.isArray(result)).toBe(true);
    const failures = result as Candidate<number>[];
    expect(failures).toHaveLength(2);
    expect(failures.map((f) => !f.ok && f.failure)).toEqual(['failure 0', 'failure 1']);
  });

  it('waits for a slower winner after an early failure', async () => {
    const aborted: number[] = [];
    const result = await raceCandidates<string>(2, (signal, i) => {
      signal.addEventListener('abort', () => aborted.push(i));
      return new Promise((resolve) =>
        setTimeout(
          () =>
            resolve(
              i === 0
                ? { ok: false, failure: 'early', diagnostic: { code: 'SCRIPT_RUNTIME' } }
                : { ok: true, value: 'late' },
            ),
          i === 0 ? 5 : 20,
        ),
      );
    });
    expect(result).toEqual({ ok: true, value: 'late' });
    expect(aborted).toEqual([0]);
  });

  it('turns a rejected candidate into a failure instead of rejecting the race', async () => {
    const result = await raceCandidates<number>(1, async () => {
      throw new Error('boom');
    });
    expect(result).toEqual([{ ok: false, failure: 'boom', diagnostic: { code: 'SCRIPT_OUTPUT' } }]);
  });
});
