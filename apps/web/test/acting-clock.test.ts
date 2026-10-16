import { it, expect, vi, afterEach } from 'vitest';
import { watchActor } from '../components/acting/clock';
afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});
it('shares one clock, pauses offscreen/hidden actors and releases it after the last portrait leaves', () => {
  vi.useFakeTimers();
  const docListeners = new Map<string, () => void>();
  const doc = {
    hidden: false,
    addEventListener: (s: string, f: () => void) => docListeners.set(s, f),
    removeEventListener: (s: string) => docListeners.delete(s),
  };
  let report: (entries: { target: Element; isIntersecting: boolean }[]) => void = () => {};
  const observe = vi.fn(),
    unobserve = vi.fn(),
    disconnect = vi.fn();
  vi.stubGlobal('document', doc);
  vi.stubGlobal('window', {
    matchMedia: () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }),
  });
  vi.stubGlobal(
    'IntersectionObserver',
    class {
      constructor(callback: typeof report) {
        report = callback;
      }
      observe = observe;
      unobserve = unobserve;
      disconnect = disconnect;
    },
  );
  const a = {} as Element,
    b = {} as Element,
    first = vi.fn(),
    second = vi.fn();
  const offA = watchActor(a, first),
    offB = watchActor(b, second);
  expect(vi.getTimerCount()).toBe(0);
  report([
    { target: a, isIntersecting: true },
    { target: b, isIntersecting: true },
  ]);
  expect(vi.getTimerCount()).toBe(1);
  vi.advanceTimersByTime(400);
  expect(first).toHaveBeenCalled();
  expect(second).toHaveBeenCalled();
  report([{ target: b, isIntersecting: false }]);
  const before = second.mock.calls.length;
  vi.advanceTimersByTime(400);
  expect(second).toHaveBeenCalledTimes(before);
  doc.hidden = true;
  docListeners.get('visibilitychange')!();
  expect(vi.getTimerCount()).toBe(0);
  const paused = first.mock.calls.length;
  vi.advanceTimersByTime(20000);
  expect(first).toHaveBeenCalledTimes(paused);
  doc.hidden = false;
  docListeners.get('visibilitychange')!();
  expect(vi.getTimerCount()).toBe(1);
  offA();
  offB();
  expect(vi.getTimerCount()).toBe(0);
  expect(disconnect).toHaveBeenCalled();
  expect(docListeners.size).toBe(0);
});
