import { describe, it, expect, vi, afterEach } from 'vitest';
import { createHaptics, haptics } from '../lib/haptics';

describe('haptics', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('is a no-op when the navigator has no vibrate', () => {
    const h = createHaptics({});
    expect(h.tap()).toBe(false);
    expect(h.impact(1)).toBe(false);
    expect(h.success()).toBe(false);
  });

  it('taps with one short pulse', () => {
    const vibrate = vi.fn<(pattern: number | number[]) => boolean>(() => true);
    const h = createHaptics({ vibrate });
    expect(h.tap()).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
    const [pattern] = vibrate.mock.calls[0]!;
    expect(typeof pattern).toBe('number');
    expect(pattern).toBeGreaterThan(0);
    expect(pattern).toBeLessThanOrEqual(20);
  });

  it('scales impact length with strength and clamps the range', () => {
    const vibrate = vi.fn<(pattern: number | number[]) => boolean>(() => true);
    const h = createHaptics({ vibrate });
    for (const strength of [0, 0.5, 1, 5, -2, Number.NaN]) h.impact(strength);
    const calls = vibrate.mock.calls.map(([pattern]) => pattern as number);
    expect(calls[0]).toBeLessThan(calls[1]!);
    expect(calls[1]).toBeLessThan(calls[2]!);
    expect(calls[3]).toBe(calls[2]);
    expect(calls[4]).toBe(calls[0]);
    expect(calls[5]).toBe(calls[0]);
    expect(calls[2]).toBeLessThanOrEqual(50);
  });

  it('plays a short celebratory pattern on success', () => {
    const vibrate = vi.fn<(pattern: number | number[]) => boolean>(() => true);
    const h = createHaptics({ vibrate });
    expect(h.success()).toBe(true);
    const [pattern] = vibrate.mock.calls[0]!;
    expect(Array.isArray(pattern)).toBe(true);
    expect((pattern as number[]).length).toBeGreaterThanOrEqual(3);
    expect((pattern as number[]).reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(250);
  });

  it('does nothing while disabled and resumes when enabled again', () => {
    const vibrate = vi.fn<(pattern: number | number[]) => boolean>(() => true);
    const h = createHaptics({ vibrate });
    h.setEnabled(false);
    expect(h.isEnabled()).toBe(false);
    expect(h.tap()).toBe(false);
    expect(h.impact(1)).toBe(false);
    expect(h.success()).toBe(false);
    expect(vibrate).not.toHaveBeenCalled();
    h.setEnabled(true);
    expect(h.tap()).toBe(true);
  });

  it('reports false when vibrate throws or refuses', () => {
    const h = createHaptics({
      vibrate: () => {
        throw new Error('not allowed');
      },
    });
    expect(h.tap()).toBe(false);
    const refused = createHaptics({ vibrate: () => false });
    expect(refused.tap()).toBe(false);
  });

  it('the default instance reads the global navigator at call time', () => {
    expect(haptics.tap()).toBe(false);
    const vibrate = vi.fn<(pattern: number | number[]) => boolean>(() => true);
    vi.stubGlobal('navigator', { vibrate });
    expect(haptics.tap()).toBe(true);
    expect(vibrate).toHaveBeenCalledTimes(1);
  });
});
