import { describe, it, expect, vi } from 'vitest';
import { FakeWorldSource, progressiveScript } from '../src/fake-world-source';

describe('FakeWorldSource', () => {
  it('emits the scripted steps in order on the fake clock and stops after unsubscribe', () => {
    vi.useFakeTimers();
    const script = progressiveScript('jellyDragon');
    const source = new FakeWorldSource(script);
    const seen: string[] = [];
    const unsubscribe = source.subscribe('w_fixture_jelly_dragon', (w) =>
      seen.push(`${w.status}:${w.doc.entities[2]?.asset?.status ?? 'none'}`),
    );

    vi.advanceTimersByTime(0);
    expect(seen).toEqual(['building:none']);
    vi.advanceTimersByTime(400);
    expect(seen).toEqual(['building:none', 'building:ready']);
    unsubscribe();
    vi.advanceTimersByTime(1000);
    expect(seen.length).toBe(2);
    vi.useRealTimers();
  });

  it('ignores subscriptions for other world ids', () => {
    vi.useFakeTimers();
    const source = new FakeWorldSource(progressiveScript('moonBounce'));
    const cb = vi.fn();
    source.subscribe('w_other', cb);
    vi.advanceTimersByTime(2000);
    expect(cb).not.toHaveBeenCalled();
    vi.useRealTimers();
  });
});
