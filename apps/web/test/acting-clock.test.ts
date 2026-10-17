import { it, expect, vi, afterEach } from 'vitest';
import { watchActor } from '../components/acting/clock';
afterEach(() => vi.unstubAllGlobals());
it('shares one 30Hz display clock, pauses hidden/offscreen actors and releases every listener', () => {
  const docListeners = new Map<string, () => void>();
  const doc = {
    hidden: false,
    addEventListener: (s: string, f: () => void) => docListeners.set(s, f),
    removeEventListener: (s: string) => docListeners.delete(s),
  };
  let report: (entries: { target: Element; isIntersecting: boolean }[]) => void = () => {};
  const preferences = { matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() };
  const disconnect = vi.fn(),
    pending = new Map<number, FrameRequestCallback>();
  let requestId = 0,
    now = 0;
  const advance = (milliseconds: number) => {
    now += milliseconds;
    const scheduled = [...pending.values()];
    pending.clear();
    scheduled.forEach((callback) => callback(now));
  };
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', { matchMedia: () => preferences });
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    pending.set(++requestId, callback);
    return requestId;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => pending.delete(id));
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof report) {
        report = callback;
      }
      observe = vi.fn();
      unobserve = vi.fn();
      disconnect = disconnect;
    },
  );
  const a = {} as Element,
    b = {} as Element,
    first = vi.fn(),
    second = vi.fn();
  const offA = watchActor(a, first),
    offB = watchActor(b, second);
  expect(pending.size).toBe(0);
  report([
    { target: a, isIntersecting: true },
    { target: b, isIntersecting: true },
  ]);
  expect(pending.size).toBe(1);
  advance(0);
  for (let frame = 0; frame < 120; frame++) advance(1000 / 120);
  expect(first).toHaveBeenCalledTimes(31); // Initial pose +30 playback-envelope updates.
  expect(second).toHaveBeenCalledTimes(31);
  expect(first.mock.calls.at(-1)![0]).toBeCloseTo(1000);
  report([{ target: b, isIntersecting: false }]);
  const before = second.mock.calls.length,
    elapsed = second.mock.calls.at(-1)![0];
  for (let frame = 0; frame < 30; frame++) advance(1000 / 30);
  expect(second).toHaveBeenCalledTimes(before);
  report([{ target: b, isIntersecting: true }]);
  expect(second.mock.calls.at(-1)![0]).toBe(elapsed);
  doc.hidden = true;
  docListeners.get('visibilitychange')!();
  expect(pending.size).toBe(0);
  const paused = first.mock.calls.length;
  advance(20000);
  expect(first).toHaveBeenCalledTimes(paused);
  doc.hidden = false;
  docListeners.get('visibilitychange')!();
  advance(0);
  advance(1000 / 30);
  expect(first.mock.calls.at(-1)![0]).toBeCloseTo(2033.333333);
  preferences.matches = true;
  preferences.addEventListener.mock.calls[0]![1]();
  expect(first.mock.calls.at(-1)![1]).toBe(true);
  const beforeGap = first.mock.calls.at(-1)![0];
  advance(1000);
  expect(first.mock.calls.at(-1)![0]).toBe(beforeGap);
  offA();
  offB();
  expect(pending.size).toBe(0);
  expect(disconnect).toHaveBeenCalled();
  expect(docListeners.size).toBe(0);
  expect(preferences.removeEventListener).toHaveBeenCalled();
});
